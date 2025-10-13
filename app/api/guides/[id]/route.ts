import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/session";

import { NextRequest } from "next/server";

export async function PUT(req: NextRequest, { params }: { params: { id: string }}) {
  const session = await getServerSession();
  if (!session || session.role !== 'ADMIN') return new Response('Forbidden', { status: 403 });
  const body = await req.json();
  const { name, email, rank, active } = body;

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
  }

  return Response.json({ guide });
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

