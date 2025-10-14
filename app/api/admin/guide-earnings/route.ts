import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/session";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const user = await getServerSession();
    if (!user?.id || user.role !== 'ADMIN') {
      return new Response('Forbidden', { status: 403 });
    }

    // Get all guides (active and inactive to see complete picture)
    const guides = await prisma.guide.findMany({
      orderBy: { name: 'asc' }
    });

    // Calculate date ranges
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    startOfMonth.setHours(0, 0, 0, 0);

    // Get trips for each guide
    const guideEarnings = await Promise.all(
      guides.map(async (guide) => {
        // Get all trips for this guide this month
        const monthTrips = await prisma.trip.findMany({
          where: {
            guides: {
              some: { guideId: guide.id }
            },
            tripDate: {
              gte: startOfMonth
            }
          },
          include: {
            guides: {
              where: { guideId: guide.id }
            }
          },
          orderBy: { tripDate: 'desc' }
        });

        // Convert trips to plain objects with numbers
        const monthTripsPlain = monthTrips.map(trip => ({
          ...trip,
          guides: trip.guides.map(g => ({
            ...g,
            feeAmount: parseFloat(g.feeAmount?.toString() || '0')
          }))
        }));

        // Filter trips for this week
        const weekTripsPlain = monthTripsPlain.filter(trip => {
          const tripDate = new Date(trip.tripDate);
          return tripDate >= startOfWeek;
        });

        // Calculate totals
        const thisWeekTotal = weekTripsPlain.reduce((sum, trip) => {
          const earnings = trip.guides[0]?.feeAmount || 0;
          return sum + earnings;
        }, 0);

        const thisMonthTotal = monthTripsPlain.reduce((sum, trip) => {
          const earnings = trip.guides[0]?.feeAmount || 0;
          return sum + earnings;
        }, 0);

        return {
          guide,
          thisWeekTrips: weekTripsPlain,
          thisMonthTrips: monthTripsPlain,
          thisWeekTotal,
          thisMonthTotal
        };
      })
    );

    // Filter out guides with no trips at all and sort by activity
    const activeGuideEarnings = guideEarnings.filter(g =>
      g.thisMonthTrips.length > 0 || g.guide.active
    );

    // Sort by: 1) Has trips this week, 2) Has trips this month, 3) Weekly total (highest first)
    activeGuideEarnings.sort((a, b) => {
      if (a.thisWeekTrips.length > 0 && b.thisWeekTrips.length === 0) return -1;
      if (b.thisWeekTrips.length > 0 && a.thisWeekTrips.length === 0) return 1;
      if (a.thisMonthTrips.length > 0 && b.thisMonthTrips.length === 0) return -1;
      if (b.thisMonthTrips.length > 0 && a.thisMonthTrips.length === 0) return 1;
      return b.thisWeekTotal - a.thisWeekTotal;
    });

    return Response.json({ guides: activeGuideEarnings });
  } catch (error: any) {
    console.error('Error fetching guide earnings:', error);
    return new Response(error.message || 'Failed to fetch guide earnings', { status: 500 });
  }
}
