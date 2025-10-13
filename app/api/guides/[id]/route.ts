import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/session";

import { NextRequest } from "next/server";

export async function PUT(req: NextRequest, { params }: { params: { id: string }}) {
  try {
    const session = await getServerSession();
    if (!session || session.role !== 'ADMIN') return new Response('Forbidden', { status: 403 });
    const body = await req.json();
    const { name, email, rank, active } = body;

  // If email provided, check if guide with this email already exists
  if (email) {
    const normalizedEmail = email.toLowerCase().trim();

    // Check for ANY guide (active or inactive) with this email, excluding current guide
    const existingGuide = await prisma.guide.findFirst({
      where: {
        email: normalizedEmail,
        id: { not: params.id }  // Exclude the guide we're updating
      }
    });

    if (existingGuide) {
      if (existingGuide.active) {
        // Active guide with this email already exists
        return new Response(`A guide with email ${email} already exists: ${existingGuide.name}`, { status: 400 });
      } else {
        // Inactive guide with this email - clear it so we can reuse
        await prisma.guide.update({
          where: { id: existingGuide.id },
          data: { email: null }
        });
      }
    }
  }

  // Update the guide
  const guide = await prisma.guide.update({
    where: { id: params.id },
    data: {
      name,
      email: email || null,
      rank,
      active
    }
  });

  // If there's a linked user account, update their credentials too
  const linkedUser = await prisma.user.findFirst({
    where: { guideId: params.id }
  });

  if (linkedUser) {
    await prisma.user.update({
      where: { id: linkedUser.id },
      data: {
        name: name,
        email: email ? email.toLowerCase().trim() : linkedUser.email
      }
    });
  } else if (email) {
    // No linked user but email was provided - create or link a user account
    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (!existingUser) {
      // Create new user account linked to this guide
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
          active: true,
          email: normalizedEmail
        }
      });
    } else {
      // User already linked to another ACTIVE guide
      return new Response(`Email ${email} is already linked to another active guide`, { status: 400 });
    }
  }

  return Response.json({ guide });
  } catch (error: any) {
    console.error('Error updating guide:', error);
    return new Response(error.message || 'Failed to update guide', { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string }}) {
  const session = await getServerSession();
  if (!session || session.role !== 'ADMIN') return new Response('Forbidden', { status: 403 });

  // Deactivate guide and clear email so it can be reused
  await prisma.guide.update({
    where: { id: params.id },
    data: {
      active: false,
      email: null  // Clear email to allow linking to different guide
    }
  });

  // Also deactivate any linked user account and clear email
  const linkedUser = await prisma.user.findFirst({
    where: { guideId: params.id }
  });

  if (linkedUser) {
    // Generate a unique placeholder email to free up the original email
    const placeholderEmail = `deactivated_${linkedUser.id}@placeholder.local`;

    await prisma.user.update({
      where: { id: linkedUser.id },
      data: {
        active: false,
        guideId: null,  // Unlink from guide
        email: placeholderEmail  // Replace email with placeholder to free it up
      }
    });
  }

  return new Response(null, { status: 204 });
}

