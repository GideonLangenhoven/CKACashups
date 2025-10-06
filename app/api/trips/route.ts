import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/session";
import { NextRequest } from "next/server";
import { logEvent } from "@/lib/log";

export async function GET(req: NextRequest) {
  const user = await getServerSession();
  if (!user?.id) return new Response('Unauthorized', { status: 401 });

  const { searchParams } = new URL(req.url);
  const lead = searchParams.get('lead')?.trim();
  const status = searchParams.get('status')?.trim();
  const start = searchParams.get('start');
  const end = searchParams.get('end');
  const adminFlag = searchParams.get('admin');
  const note = searchParams.get('note')?.trim();

  // Get user's guide ID if they are linked to a guide
  const userWithGuide = await prisma.user.findUnique({
    where: { id: user.id },
    select: { guideId: true, role: true }
  });

  const where: any = {};

  // If admin with admin flag, show all trips
  // Otherwise, show trips where user created OR was a guide
  if (!(userWithGuide?.role === 'ADMIN' && adminFlag === '1')) {
    where.OR = [
      { createdById: user.id },
      ...(userWithGuide?.guideId ? [{ guides: { some: { guideId: userWithGuide.guideId } } }] : [])
    ];
  }

  if (lead) where.leadName = { contains: lead, mode: 'insensitive' };
  if (status) where.status = status as any;
  if (note) where.paxGuideNote = { contains: note, mode: 'insensitive' };
  if (start || end) {
    where.tripDate = {};
    if (start) (where.tripDate as any).gte = new Date(start);
    if (end) (where.tripDate as any).lte = new Date(end + 'T23:59:59.999Z');
  }

  const trips = await prisma.trip.findMany({ where, orderBy: { tripDate: 'desc' } });
  return Response.json({ trips });
}

export async function POST(req: NextRequest) {
  const user = await getServerSession();
  if (!user?.id) return new Response('Unauthorized', { status: 401 });
  const body = await req.json();
  const { tripDate, leadName, paxGuideNote, totalPax, paymentsMadeYN, picsUploadedYN, tripEmailSentYN, tripReport, suggestions, status, guides, payments, discounts } = body;
  if (!tripDate || !leadName) return new Response('tripDate and leadName required', { status: 400 });

  const guideIds: string[] = (guides || []).map((g: any) => g.guideId);
  const dbGuides = await prisma.guide.findMany({ where: { id: { in: guideIds } } });

  const trip = await prisma.trip.create({
    data: {
      tripDate: new Date(tripDate),
      leadName,
      paxGuideNote,
      totalPax,
      paymentsMadeYN: !!paymentsMadeYN,
      picsUploadedYN: !!picsUploadedYN,
      tripEmailSentYN: !!tripEmailSentYN,
      tripReport,
      suggestions,
      status: status || 'DRAFT',
      createdById: user.id,
      payments: payments ? { create: payments } : undefined,
      discounts: discounts && discounts.length ? { create: discounts.map((d: any) => ({ amount: d.amount, reason: d.reason })) } : undefined,
      guides: guides && guides.length ? { create: guides.map((g: any) => {
        const guide = dbGuides.find((x: any) => x.id === g.guideId);
        const paxCount = g.pax || 0;
        const feeAmount = 0; // Fee rates removed
        return { guideId: g.guideId, paxCount, feeAmount };
      }) } : undefined,
    }
  });
  logEvent('trip_created', { tripId: trip.id, userId: user.id, leadName });
  return Response.json({ trip });
}
