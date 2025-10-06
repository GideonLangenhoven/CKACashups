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
  let user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  if (user && user.active) {
    // Verify name matches for existing users
    if (user.name && normalizedName && user.name.toLowerCase() !== normalizedName.toLowerCase()) {
      throw new Error('Incorrect name for this email address');
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

  // Try to find matching guide by name or email
  let matchingGuide = null;
  if (normalizedName) {
    // Try exact name match first
    matchingGuide = await prisma.guide.findFirst({
      where: {
        OR: [
          { name: { equals: normalizedName, mode: 'insensitive' } },
          { email: normalizedEmail }
        ],
        active: true
      }
    });
  }

  // If guide found, update their email if not set
  if (matchingGuide && !matchingGuide.email) {
    await prisma.guide.update({
      where: { id: matchingGuide.id },
      data: { email: normalizedEmail }
    });
  }

  // Allow anyone to sign in - create user if they don't exist
  const isNewUser = !user;
  const finalName = normalizedName || normalizedEmail.split('@')[0];
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
