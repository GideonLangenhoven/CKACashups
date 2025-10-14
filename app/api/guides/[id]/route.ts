import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/session";

import { NextRequest } from "next/server";

export async function PUT(req: NextRequest, { params }: { params: { id: string }}) {
  const EMAIL_IN_USE_ERROR = 'EMAIL_IN_USE_BY_ACTIVE_GUIDE';

  try {
    const session = await getServerSession();
    if (!session || session.role !== 'ADMIN') return new Response('Forbidden', { status: 403 });
    const body = await req.json();
    const { name, email, rank, active } = body;
    const normalizedEmail = typeof email === 'string' && email.trim().length > 0
      ? email.toLowerCase().trim()
      : null;

    const guidesToClear = normalizedEmail
      ? await prisma.guide.findMany({
          where: {
            id: { not: params.id },
            email: {
              equals: normalizedEmail,
              mode: 'insensitive'
            }
          }
        })
      : [];

    if (normalizedEmail) {
      const activeGuide = guidesToClear.find(g => g.active);
      if (activeGuide) {
        return new Response(`A guide with email ${email} already exists: ${activeGuide.name}`, { status: 400 });
      }
    }

    const guide = await prisma.$transaction(async (tx) => {
      if (normalizedEmail && guidesToClear.length > 0) {
        for (const guideToClear of guidesToClear) {
          await tx.guide.update({
            where: { id: guideToClear.id },
            data: { email: null }
          });
        }
      }

      if (normalizedEmail) {
        const usersWithEmail = await tx.user.findMany({
          where: {
            email: {
              equals: normalizedEmail,
              mode: 'insensitive'
            }
          }
        });

        for (const user of usersWithEmail) {
          if (!user.active || !user.guideId) {
            const tripCount = await tx.trip.count({ where: { createdById: user.id } });
            if (tripCount === 0) {
              await tx.user.delete({ where: { id: user.id } });
            } else {
              await tx.user.update({
                where: { id: user.id },
                data: { email: `placeholder_${user.id}@removed.local`, guideId: null }
              });
            }
          }
        }
      }

      const updatedGuide = await tx.guide.update({
        where: { id: params.id },
        data: {
          name,
          email: normalizedEmail,
          rank,
          active
        }
      });

      const linkedUser = await tx.user.findFirst({
        where: { guideId: params.id }
      });

      if (linkedUser) {
        await tx.user.update({
          where: { id: linkedUser.id },
          data: {
            name: name,
            email: normalizedEmail ?? linkedUser.email
          }
        });
      } else if (normalizedEmail) {
        const existingUser = await tx.user.findFirst({
          where: {
            email: {
              equals: normalizedEmail,
              mode: 'insensitive'
            }
          }
        });

        if (!existingUser) {
          await tx.user.create({
            data: {
              email: normalizedEmail,
              name: name,
              role: 'USER',
              guideId: updatedGuide.id
            }
          });
        } else if (!existingUser.guideId || !existingUser.active) {
          await tx.user.update({
            where: { id: existingUser.id },
            data: {
              guideId: updatedGuide.id,
              name: name,
              active: true,
              email: normalizedEmail
            }
          });
        } else if (existingUser.guideId !== updatedGuide.id) {
          throw new Error(EMAIL_IN_USE_ERROR);
        }
      }

      return updatedGuide;
    });

    return Response.json({ guide });
  } catch (error: any) {
    if (error?.message === EMAIL_IN_USE_ERROR) {
      return new Response('Email is already linked to another active guide', { status: 400 });
    }

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
