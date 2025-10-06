import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { token, name } = await req.json();

    if (!token || !name) {
      return NextResponse.json(
        { error: "Token and name are required" },
        { status: 400 }
      );
    }

    const normalizedName = name.trim();

    // Find the reset token
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
    });

    if (!resetToken) {
      return NextResponse.json(
        { error: "Invalid reset token" },
        { status: 400 }
      );
    }

    // Check if token has been used
    if (resetToken.used) {
      return NextResponse.json(
        { error: "This reset link has already been used" },
        { status: 400 }
      );
    }

    // Check if token has expired
    if (new Date() > resetToken.expiresAt) {
      return NextResponse.json(
        { error: "This reset link has expired" },
        { status: 400 }
      );
    }

    // Find the user
    const user = await prisma.user.findUnique({
      where: { email: resetToken.email },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Update the user's name and mark token as used
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { name: normalizedName },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { used: true },
      }),
      prisma.auditLog.create({
        data: {
          entityType: "User",
          entityId: user.id,
          action: "NAME_RESET",
          beforeJSON: { name: user.name },
          afterJSON: { name: normalizedName },
          actorUserId: user.id,
        },
      }),
    ]);

    return NextResponse.json(
      { success: true, message: "Name updated successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
