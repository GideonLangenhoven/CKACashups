import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/session";
import { hash } from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const user = await getServerSession();
    if (!user?.id) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { password } = await req.json();

    let hashedPassword = null;
    if (password && password.trim()) {
      hashedPassword = await hash(password, 10);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        needsPasswordReset: false,
      },
    });

    return Response.json({ success: true });
  } catch (error: any) {
    console.error("Set password error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
