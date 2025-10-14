import { prisma } from "@/lib/prisma";

// Simple session management without OAuth
export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  role: "ADMIN" | "USER";
  active: boolean;
}

export async function createUserSession(email: string, name?: string): Promise<SessionUser | null> {
  const normalizedEmail = email.toLowerCase().trim();
  const normalizedName = name?.trim();

  // Allow empty name; will default to email local part for new users

  // Check if user exists and is active
  let user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    include: { guide: true }
  });

  if (user && user.active) {
    // If user is linked to a guide, ensure name matches the guide's name exactly
    if (user.guide) {
      // Sync user name to guide name if different
      if (user.name !== user.guide.name) {
        await prisma.user.update({
          where: { id: user.id },
          data: { name: user.guide.name }
        });
        // Update the local user object with the new name
        user.name = user.guide.name;
      }

      // For guides, require exact name match to avoid conflicts (e.g., "Josh" vs "Josh T")
      if (normalizedName) {
        const guideName = user.guide.name.toLowerCase();
        const enteredName = normalizedName.toLowerCase();

        // Require exact match for guides
        if (guideName !== enteredName) {
          throw new Error(`Incorrect name for this email address. Please use exactly: ${user.guide.name}`);
        }
      }
    } else {
      // For non-guide users, also require exact name match for consistency
      if (user.name && normalizedName) {
        const storedName = user.name.toLowerCase();
        const enteredName = normalizedName.toLowerCase();

        // Require exact match
        if (storedName !== enteredName) {
          throw new Error(`Incorrect name for this email address. Please use exactly: ${user.name}`);
        }
      }
    }

    // Log the sign-in
    await prisma.auditLog.create({
      data: {
        entityType: "User",
        entityId: user.id,
        action: "SIGN_IN",
        afterJSON: { email: user.email, name: user.name },
        actorUserId: user.id,
      }
    });
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      active: user.active,
    };
  }

  // Admin emails: explicit list or fallback to two requested emails
  const adminEmails = (process.env.ADMIN_EMAILS || 'gidslang89@gmail.com,info@kayak.co.za')
    .split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
  const isAdmin = adminEmails.includes(normalizedEmail);

  // Try to find matching guide by email first, then by name
  let matchingGuide = null;

  // First, try to find guide by email (most reliable)
  matchingGuide = await prisma.guide.findFirst({
    where: {
      email: normalizedEmail,
      active: true
    }
  });

  // If not found by email and name is provided, try by name
  // IMPORTANT: Only link to guide if email is not already set on another guide
  if (!matchingGuide && normalizedName) {
    const guideByName = await prisma.guide.findFirst({
      where: {
        name: { equals: normalizedName, mode: 'insensitive' },
        active: true
      }
    });

    // Only use this guide if they don't have an email set, or if their email matches
    if (guideByName && (!guideByName.email || guideByName.email === normalizedEmail)) {
      matchingGuide = guideByName;

      // Set the email on the guide if not already set
      if (!matchingGuide.email) {
        matchingGuide = await prisma.guide.update({
          where: { id: matchingGuide.id },
          data: { email: normalizedEmail }
        });
      }
    }
  }

  // Determine the final name to use - use exact guide name if available
  const isNewUser = !user;
  const finalName = matchingGuide?.name || normalizedName || normalizedEmail.split('@')[0];

  // Create or update user account
  const updatedUser = await prisma.user.upsert({
    where: { email: normalizedEmail },
    create: {
      email: normalizedEmail,
      name: finalName,
      role: isAdmin ? 'ADMIN' : 'USER',
      guideId: matchingGuide?.id
    },
    update: {
      role: isAdmin ? 'ADMIN' : undefined,
      active: true,
      name: matchingGuide?.name || undefined,  // Update name to match guide
      guideId: matchingGuide?.id || undefined
    }
  });

  // Log account creation for new users
  if (isNewUser) {
    await prisma.auditLog.create({
      data: {
        entityType: "User",
        entityId: updatedUser.id,
        action: "ACCOUNT_CREATED",
        afterJSON: { email: updatedUser.email, name: updatedUser.name, role: updatedUser.role, guideId: updatedUser.guideId, createdBy: isAdmin ? "ADMIN_EMAIL_LIST" : "OPEN_SIGNUP" },
        actorUserId: updatedUser.id,
      }
    });
  }

  // Log the sign-in
  await prisma.auditLog.create({
    data: {
      entityType: "User",
      entityId: updatedUser.id,
      action: "SIGN_IN",
      afterJSON: { email: updatedUser.email, name: updatedUser.name },
      actorUserId: updatedUser.id,
    }
  });

  return {
    id: updatedUser.id,
    email: updatedUser.email,
    name: updatedUser.name,
    role: updatedUser.role,
    active: updatedUser.active,
  };
}
