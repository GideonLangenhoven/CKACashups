import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/session";
import { NextRequest } from "next/server";
import { logEvent } from "@/lib/log";

export async function GET(_: NextRequest, { params }: { params: { id: string }}) {
  const trip = await prisma.trip.findUnique({ where: { id: params.id }, include: { payments: true, discounts: true, guides: { include: { guide: true } } } });
  if (!trip) return new Response('Not found', { status: 404 });
  return Response.json({ trip });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string }}) {
  const user = await getServerSession();
  if (!user?.id) return new Response('Unauthorized', { status: 401 });
  if (user.role !== 'ADMIN') return new Response('Forbidden', { status: 403 });
  const trip = await prisma.trip.findUnique({ where: { id: params.id }, include: { payments: true, discounts: true, guides: true } });
  if (!trip) return new Response('Not found', { status: 404 });
  const body = await req.json();
  // Simple override for core fields and status
  const { tripDate, leadName, paxGuideNote, totalPax, paymentsMadeYN, picsUploadedYN, tripEmailSentYN, status } = body;
  const updated = await prisma.trip.update({ where: { id: params.id }, data: { tripDate: tripDate ? new Date(tripDate) : undefined, leadName, paxGuideNote, totalPax, paymentsMadeYN, picsUploadedYN, tripEmailSentYN, status } });
  await prisma.auditLog.create({ data: { entityType: 'Trip', entityId: trip.id, action: 'PATCH', beforeJSON: trip as any, afterJSON: updated as any, actorUserId: user.id } });
  logEvent('trip_updated', { tripId: trip.id, userId: user.id });
  return Response.json({ trip: updated });
}
