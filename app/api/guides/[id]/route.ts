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
  await prisma.guide.update({ where: { id: params.id }, data: { active: false } });
  return new Response(null, { status: 204 });
}

