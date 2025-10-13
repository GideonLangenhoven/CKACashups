import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/session";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || session.role !== 'ADMIN') return new Response('Forbidden', { status: 403 });

    const body = await req.json();
    const { email } = body;

    if (!email) return new Response('Email required', { status: 400 });

    const normalizedEmail = email.toLowerCase().trim();

    console.log(`\n=== Checking email: ${normalizedEmail} ===\n`);

    // Find all guides with this email
    const guides = await prisma.guide.findMany({
      where: { email: normalizedEmail },
      select: {
        id: true,
        name: true,
        email: true,
        active: true,
        rank: true
      }
    });

    // Find all users with this email
    const users = await prisma.user.findMany({
      where: { email: normalizedEmail },
      select: {
        id: true,
        name: true,
        email: true,
        active: true,
        guideId: true,
        role: true
      }
    });

    const result = {
      email: normalizedEmail,
      guides: {
        count: guides.length,
        active: guides.filter(g => g.active).length,
        inactive: guides.filter(g => !g.active).length,
        list: guides
      },
      users: {
        count: users.length,
        active: users.filter(u => u.active).length,
        inactive: users.filter(u => !u.active).length,
        list: users
      }
    };

    console.log('Check result:', JSON.stringify(result, null, 2));

    return Response.json(result);
  } catch (error: any) {
    console.error('Error checking email:', error);
    return new Response(JSON.stringify({
      error: error.message,
      code: error.code,
      meta: error.meta
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
