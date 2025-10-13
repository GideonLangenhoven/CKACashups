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

      // Check for ALL guides (active or inactive) with this email
      const existingGuides = await prisma.guide.findMany({
        where: { email: normalizedEmail }
      });

      if (existingGuides.length > 0) {
        // Check if any ACTIVE guide has this email
        const activeGuide = existingGuides.find(g => g.active);
        if (activeGuide) {
          return new Response(`A guide with email ${email} already exists: ${activeGuide.name}`, { status: 400 });
        }

        // Clear email from ALL inactive guides
        for (const guide of existingGuides) {
          await prisma.guide.update({
            where: { id: guide.id },
            data: { email: null }
          });
        }
      }

      // Also clear this email from any users that might have it
      const existingUsers = await prisma.user.findMany({
        where: { email: normalizedEmail }
      });

      for (const user of existingUsers) {
        // If user is inactive or not linked to a guide, delete them
        if (!user.active || !user.guideId) {
          const tripCount = await prisma.trip.count({ where: { createdById: user.id } });
          if (tripCount === 0) {
            await prisma.user.delete({ where: { id: user.id } });
          } else {
            // Has trips, replace email with placeholder
            await prisma.user.update({
              where: { id: user.id },
              data: { email: `placeholder_${user.id}@removed.local`, guideId: null }
            });
          }
        }
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
      } else if (!existingUser.guideId || !existingUser.active) {
        // Link existing user to guide (or reactivate if deactivated)
        await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            guideId: guide.id,
            name: name,
            active: true,  // Reactivate if was deactivated
            email: normalizedEmail  // Restore proper email if was placeholder
          }
        });
      } else {
        // User already linked to another ACTIVE guide
        return new Response(`Email ${email} is already linked to another active guide`, { status: 400 });
      }
    }

    return Response.json({ guide });
  } catch (error: any) {
    console.error('Error creating guide:', error);
    return new Response(error.message || 'Failed to create guide', { status: 500 });
  }
}

