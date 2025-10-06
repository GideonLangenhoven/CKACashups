import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user exists
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    // Always return success even if user doesn't exist (security best practice)
    if (!user) {
      return NextResponse.json({ success: true }, { status: 200 });
    }

    // Generate a secure random token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    // Store the reset token
    await prisma.passwordResetToken.create({
      data: {
        email: normalizedEmail,
        token: resetToken,
        expiresAt
      }
    });

    // Log the reset request
    await prisma.auditLog.create({
      data: {
        entityType: "User",
        entityId: user.id,
        action: "PASSWORD_RESET_REQUESTED",
        afterJSON: { email: user.email },
        actorUserId: user.id,
      }
    });

    // Send email with reset link
    const resetUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3001'}/auth/reset-password?token=${resetToken}`;

    // Log the URL to console (in production, this should send an email)
    console.log(`\n=== PASSWORD RESET LINK ===`);
    console.log(`Email: ${email}`);
    console.log(`Reset URL: ${resetUrl}`);
    console.log(`Expires: ${expiresAt.toLocaleString()}`);
    console.log(`===========================\n`);

    // TODO: Implement email sending using SMTP settings from .env
    // await sendResetEmail(email, resetUrl);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
