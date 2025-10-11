import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/session";

import { NextRequest } from "next/server";

export async function GET() {
  const guides = await prisma.guide.findMany({ where: { active: true }, orderBy: { name: 'asc' } });
  return Response.json({ guides });
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || session.role !== 'ADMIN') return new Response('Forbidden', { status: 403 });
    const body = await req.json();
    const { name, rank, email } = body;
    if (!name || !rank) return new Response('Name and rank required', { status: 400 });

    // If email provided, check if guide with this email already exists
    if (email) {
      const normalizedEmail = email.toLowerCase().trim();
      const existingGuide = await prisma.guide.findFirst({
        where: { email: normalizedEmail, active: true }
      });
      if (existingGuide) {
        return new Response(`A guide with email ${email} already exists: ${existingGuide.name}`, { status: 400 });
      }
    }

    // Create the guide
    const guide = await prisma.guide.create({ data: { name, rank, email: email || null } });

    // Auto-create user account for this guide if email provided
    if (email) {
      const normalizedEmail = email.toLowerCase().trim();

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });

      if (!existingUser) {
        // Create user account linked to this guide
        await prisma.user.create({
          data: {
            email: normalizedEmail,
            name: name,
            role: 'USER',
            guideId: guide.id
          }
        });
      } else if (!existingUser.guideId) {
        // Link existing user to guide
        await prisma.user.update({
          where: { id: existingUser.id },
          data: { guideId: guide.id, name: name }
        });
      } else {
        // User already linked to another guide
        return new Response(`Email ${email} is already linked to another guide`, { status: 400 });
      }
    }

    return Response.json({ guide });
  } catch (error: any) {
    console.error('Error creating guide:', error);
    return new Response(error.message || 'Failed to create guide', { status: 500 });
  }
}

