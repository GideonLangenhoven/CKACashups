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
    const normalizedEmail = typeof email === 'string' && email.trim().length > 0
      ? email.toLowerCase().trim()
      : null;

    console.log(`[Guide Create] Starting creation for: ${name}, rank: ${rank}, email: ${email || 'none'}`);

    // If email provided, check if guide with this email already exists
    if (normalizedEmail) {
      console.log(`[Guide Create] Checking for existing email: ${normalizedEmail}`);

      try {
        // Check for ALL guides (active or inactive) with this email
        const existingGuides = await prisma.guide.findMany({
          where: { email: normalizedEmail }
        });
        console.log(`[Guide Create] Found ${existingGuides.length} guides with this email`);

        if (existingGuides.length > 0) {
          // Check if any ACTIVE guide has this email
          const activeGuide = existingGuides.find(g => g.active);
          if (activeGuide) {
            console.log(`[Guide Create] Active guide found: ${activeGuide.name}`);
            return new Response(`A guide with email ${email} already exists: ${activeGuide.name}`, { status: 400 });
          }

          // Clear email from ALL inactive guides
          console.log(`[Guide Create] Clearing email from ${existingGuides.length} inactive guides`);
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
        console.log(`[Guide Create] Found ${existingUsers.length} users with this email`);

        for (const user of existingUsers) {
          // If user is inactive or not linked to a guide, delete them
          if (!user.active || !user.guideId) {
            const tripCount = await prisma.trip.count({ where: { createdById: user.id } });
            if (tripCount === 0) {
              console.log(`[Guide Create] Deleting user: ${user.name}`);
              await prisma.user.delete({ where: { id: user.id } });
            } else {
              // Has trips, replace email with placeholder
              console.log(`[Guide Create] Replacing email for user with trips: ${user.name}`);
              await prisma.user.update({
                where: { id: user.id },
                data: { email: `placeholder_${user.id}@removed.local`, guideId: null }
              });
            }
          }
        }
      } catch (cleanupError: any) {
        console.error('[Guide Create] Cleanup error:', cleanupError);
        return new Response(JSON.stringify({
          error: 'Failed during email cleanup',
          details: cleanupError.message,
          code: cleanupError.code
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Create the guide
    console.log(`[Guide Create] Creating guide...`);
    let guide;
    try {
      guide = await prisma.guide.create({ data: { name, rank, email: normalizedEmail } });
      console.log(`[Guide Create] Guide created successfully: ${guide.id}`);
    } catch (createError: any) {
      console.error('[Guide Create] Guide creation error:', createError);
      return new Response(JSON.stringify({
        error: 'Failed to create guide',
        details: createError.message,
        code: createError.code,
        meta: createError.meta
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Auto-create user account for this guide if email provided
    if (normalizedEmail) {
      // After cleanup, check if user still exists
      const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });

      if (!existingUser) {
        // No user exists - create new one
        try {
          await prisma.user.create({
            data: {
              email: normalizedEmail,
              name: name,
              role: 'USER',
              guideId: guide.id
            }
          });
        } catch (userCreateError: any) {
          console.error('Error creating user:', userCreateError);
          // Don't fail guide creation if user creation fails
          // The guide is already created, just log the error
        }
      } else if (!existingUser.guideId || !existingUser.active) {
        // User exists but not linked or inactive - reactivate and link
        try {
          await prisma.user.update({
            where: { id: existingUser.id },
            data: {
              guideId: guide.id,
              name: name,
              active: true,
              email: normalizedEmail
            }
          });
        } catch (userUpdateError: any) {
          console.error('Error updating user:', userUpdateError);
        }
      } else if (existingUser.guideId !== guide.id) {
        // User already linked to a DIFFERENT active guide
        console.warn(`Email ${email} is already linked to guide ${existingUser.guideId}`);
        // Don't fail - guide is already created
      }
    }

    return Response.json({ guide });
  } catch (error: any) {
    console.error('Error creating guide:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
      stack: error.stack
    });
    return new Response(JSON.stringify({
      error: error.message || 'Failed to create guide',
      details: error.code || 'UNKNOWN_ERROR',
      meta: error.meta
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
