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
        user = await prisma.user.update({
          where: { id: user.id },
          data: { name: user.guide.name }
        });
      }

      // For guides, verify the entered name matches the guide name
      if (normalizedName) {
        const guideName = user.guide.name.toLowerCase();
        const enteredName = normalizedName.toLowerCase();

        // Check if names match exactly, or if one contains the other
        const namesMatch = guideName === enteredName ||
                          guideName.includes(enteredName) ||
                          enteredName.includes(guideName);

        if (!namesMatch) {
          throw new Error(`Incorrect name for this email address. Please use: ${user.guide.name}`);
        }
      }
    } else {
      // For non-guide users, verify name matches
      if (user.name && normalizedName) {
        const storedName = user.name.toLowerCase();
        const enteredName = normalizedName.toLowerCase();

        // Check if names match exactly, or if one contains the other
        const namesMatch = storedName === enteredName ||
                          storedName.includes(enteredName) ||
                          enteredName.includes(storedName);

        if (!namesMatch) {
          throw new Error(`Incorrect name for this email address. Please use: ${user.name}`);
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

  // If not found by email, try by name
  if (!matchingGuide && normalizedName) {
    matchingGuide = await prisma.guide.findFirst({
      where: {
        name: { equals: normalizedName, mode: 'insensitive' },
        active: true
      }
    });
  }

  // If guide found, update their email if not set
  if (matchingGuide && !matchingGuide.email) {
    matchingGuide = await prisma.guide.update({
      where: { id: matchingGuide.id },
      data: { email: normalizedEmail }
    });
  }

  // Determine the final name to use - use exact guide name if available
  const isNewUser = !user;
  const finalName = matchingGuide?.name || normalizedName || normalizedEmail.split('@')[0];

  // Create or update user account
  user = await prisma.user.upsert({
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
        entityId: user.id,
        action: "ACCOUNT_CREATED",
        afterJSON: { email: user.email, name: user.name, role: user.role, guideId: user.guideId, createdBy: isAdmin ? "ADMIN_EMAIL_LIST" : "OPEN_SIGNUP" },
        actorUserId: user.id,
      }
    });
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
