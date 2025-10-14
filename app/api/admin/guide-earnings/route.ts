import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/session";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const user = await getServerSession();
    if (!user?.id || user.role !== 'ADMIN') {
      return new Response('Forbidden', { status: 403 });
    }

    // Get all active guides
    const guides = await prisma.guide.findMany({
      where: { active: true },
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

        // Filter trips for this week
        const weekTrips = monthTrips.filter(trip => {
          const tripDate = new Date(trip.tripDate);
          return tripDate >= startOfWeek;
        });

        // Calculate totals
        const thisWeekTotal = weekTrips.reduce((sum, trip) => {
          const earnings = parseFloat(trip.guides[0]?.feeAmount?.toString() || '0');
          return sum + earnings;
        }, 0);

        const thisMonthTotal = monthTrips.reduce((sum, trip) => {
          const earnings = parseFloat(trip.guides[0]?.feeAmount?.toString() || '0');
          return sum + earnings;
        }, 0);

        return {
          guide,
          thisWeekTrips: weekTrips,
          thisMonthTrips: monthTrips,
          thisWeekTotal,
          thisMonthTotal
        };
      })
    );

    // Sort by this week's total (highest first)
    guideEarnings.sort((a, b) => b.thisWeekTotal - a.thisWeekTotal);

    return Response.json({ guides: guideEarnings });
  } catch (error: any) {
    console.error('Error fetching guide earnings:', error);
    return new Response(error.message || 'Failed to fetch guide earnings', { status: 500 });
  }
}
