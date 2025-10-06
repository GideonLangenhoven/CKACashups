import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/session";

import { NextRequest } from "next/server";

export async function PUT(req: NextRequest, { params }: { params: { id: string }}) {
  const session = await getServerSession();
  if (!session || session.role !== 'ADMIN') return new Response('Forbidden', { status: 403 });
  const body = await req.json();
  const { name, rank, active } = body;
  const guide = await prisma.guide.update({ where: { id: params.id }, data: { name, rank, active } });
  return Response.json({ guide });
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string }}) {
  const session = await getServerSession();
  if (!session || session.role !== 'ADMIN') return new Response('Forbidden', { status: 403 });
  await prisma.guide.update({ where: { id: params.id }, data: { active: false } });
  return new Response(null, { status: 204 });
}

