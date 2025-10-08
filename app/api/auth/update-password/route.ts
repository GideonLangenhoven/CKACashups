import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { logEvent } from "@/lib/log";

export async function POST(req: NextRequest) {
  try {
    const { email, name, newPassword } = await req.json();

    if (!email || !name) {
      return new Response(JSON.stringify({ error: "Email and name are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedName = name.trim();

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (!user) {
      return new Response(JSON.stringify({ error: "No account found with this email" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Verify name matches (case insensitive)
    if (user.name && user.name.toLowerCase() !== normalizedName.toLowerCase()) {
      return new Response(JSON.stringify({ error: "Name does not match the account" }), {
        status: 403,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Update password
    let hashedPassword = null;
    if (newPassword && newPassword.trim()) {
      if (newPassword.length < 6) {
        return new Response(JSON.stringify({ error: "Password must be at least 6 characters" }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
      hashedPassword = await hash(newPassword, 10);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        needsPasswordReset: false
      }
    });

    logEvent("password_reset", {
      userId: user.id,
      email: user.email,
      passwordSet: !!hashedPassword
    });

    return Response.json({
      success: true,
      message: hashedPassword ? "Password updated successfully" : "Password removed successfully"
    });
  } catch (error: any) {
    console.error("Update password error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
