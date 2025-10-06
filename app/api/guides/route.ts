import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/session";

import { NextRequest } from "next/server";

export async function GET() {
  const guides = await prisma.guide.findMany({ where: { active: true }, orderBy: { name: 'asc' } });
  return Response.json({ guides });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session || session.role !== 'ADMIN') return new Response('Forbidden', { status: 403 });
  const body = await req.json();
  const { name, rank } = body;
  if (!name || !rank) return new Response('Name and rank required', { status: 400 });
  const guide = await prisma.guide.create({ data: { name, rank } });
  return Response.json({ guide });
}

