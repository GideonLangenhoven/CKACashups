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
  try {
    const session = await getServerSession();
    if (!session || session.role !== 'ADMIN') return new Response('Forbidden', { status: 403 });

    // Check if guide has any trip associations
    const tripGuides = await prisma.tripGuide.findMany({
      where: { guideId: params.id }
    });

    const ledTrips = await prisma.trip.findMany({
      where: { tripLeaderId: params.id }
    });

    // If guide has trip history, prevent deletion
    if (tripGuides.length > 0 || ledTrips.length > 0) {
      return new Response(
        `Cannot delete guide: they have ${tripGuides.length + ledTrips.length} trip(s) in the system. Please deactivate instead or remove trip associations first.`,
        { status: 400 }
      );
    }

    // Find linked user account
    const linkedUser = await prisma.user.findFirst({
      where: { guideId: params.id }
    });

    // If user has created trips, invites, or audit logs, prevent deletion
    if (linkedUser) {
      const userTrips = await prisma.trip.count({
        where: { createdById: linkedUser.id }
      });

      const userInvites = await prisma.invite.count({
        where: { invitedById: linkedUser.id }
      });

      const userAuditLogs = await prisma.auditLog.count({
        where: { actorUserId: linkedUser.id }
      });

      if (userTrips > 0 || userInvites > 0 || userAuditLogs > 0) {
        return new Response(
          `Cannot delete user: they have ${userTrips} trip(s), ${userInvites} invite(s), or ${userAuditLogs} audit log(s). Please deactivate instead.`,
          { status: 400 }
        );
      }

      // Safe to delete user
      await prisma.user.delete({
        where: { id: linkedUser.id }
      });
    }

    // Safe to delete guide
    await prisma.guide.delete({
      where: { id: params.id }
    });

    return new Response(null, { status: 204 });
  } catch (error: any) {
    console.error('Error deleting guide:', error);
    return new Response(error.message || 'Failed to delete guide', { status: 500 });
  }
}

