import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/session";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SubmitInvoiceButton } from "@/components/SubmitInvoiceButton";
import { DisputeButton } from "@/components/DisputeButton";
import { EarningsTripList } from "@/components/EarningsTripList";
import { headers } from "next/headers";

// Ensure this page is never cached and always shows fresh data
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Add response headers to prevent ANY caching
export async function generateMetadata() {
  return {
    other: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0',
    }
  };
}

export default async function TripsListPage() {
  const user = await getServerSession();
  if (!user?.id) return <div>Please <Link href="/auth/signin">sign in</Link>.</div>;

  // Get user's guide info and role
  const userWithGuide = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      role: true,
      guideId: true,
      guide: { select: { name: true, rank: true } }
    }
  });

  // Admins should use the admin dashboard, not the trips page
  if (userWithGuide?.role === 'ADMIN') {
    redirect('/admin');
  }

  if (!userWithGuide?.guideId) {
    return <div className="stack"><div className="card">You are not linked to a guide profile.</div></div>;
  }

  // Get all trips for this guide
  const trips = await prisma.trip.findMany({
    where: {
      guides: {
        some: {
          guideId: userWithGuide.guideId
        }
      }
    },
    include: {
      guides: {
        where: { guideId: userWithGuide.guideId },
        include: { guide: true }
      },
      tripLeader: true
    },
    orderBy: { tripDate: 'desc' }
  });

  // Calculate earnings by period
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthNum = now.getMonth();

  const earningsByPeriod = {
    today: 0,
    thisMonth: 0,
    thisYear: 0,
    allTime: 0,
    tripCountToday: 0,
    tripCountThisMonth: 0,
    tripCountThisYear: 0,
    tripCountAllTime: trips.length,
  };

  for (const trip of trips) {
    const tripDate = new Date(trip.tripDate);
    const earnings = parseFloat(trip.guides[0]?.feeAmount?.toString() || '0');

    earningsByPeriod.allTime += earnings;

    if (tripDate.getFullYear() === currentYear) {
      earningsByPeriod.thisYear += earnings;
      earningsByPeriod.tripCountThisYear++;

      if (tripDate.getMonth() === currentMonthNum) {
        earningsByPeriod.thisMonth += earnings;
        earningsByPeriod.tripCountThisMonth++;

        if (tripDate.getDate() === now.getDate()) {
          earningsByPeriod.today += earnings;
          earningsByPeriod.tripCountToday++;
        }
      }
    }
  }

  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  return (
    <div className="stack">
      <h2>My Earnings - {userWithGuide.guide?.name}</h2>

      <div className="row mobile-align-start" style={{ alignItems: 'stretch' }}>
        <div style={{ flex: 1, minWidth: 280 }}>
          <SubmitInvoiceButton />
        </div>
        <DisputeButton
          guideName={userWithGuide.guide?.name || ''}
          month={currentMonth}
          tripCount={earningsByPeriod.tripCountThisMonth}
          totalEarnings={earningsByPeriod.thisMonth}
        />
      </div>

      <div className="metrics-grid">
        <div className="metric-card" data-variant="sunset">
          <div className="metric-label">Today</div>
          <div className="metric-value">R {earningsByPeriod.today.toFixed(2)}</div>
          <div className="metric-subtext">
            {earningsByPeriod.tripCountToday} {earningsByPeriod.tripCountToday === 1 ? 'trip' : 'trips'}
          </div>
        </div>

        <div className="metric-card" data-variant="sunset">
          <div className="metric-label">This Month</div>
          <div className="metric-value">R {earningsByPeriod.thisMonth.toFixed(2)}</div>
          <div className="metric-subtext">
            {earningsByPeriod.tripCountThisMonth} {earningsByPeriod.tripCountThisMonth === 1 ? 'trip' : 'trips'}
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-label">This Year</div>
          <div className="metric-value">R {earningsByPeriod.thisYear.toFixed(2)}</div>
          <div className="metric-subtext">
            {earningsByPeriod.tripCountThisYear} {earningsByPeriod.tripCountThisYear === 1 ? 'trip' : 'trips'}
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-label">All Time</div>
          <div className="metric-value">R {earningsByPeriod.allTime.toFixed(2)}</div>
          <div className="metric-subtext">
            {earningsByPeriod.tripCountAllTime} {earningsByPeriod.tripCountAllTime === 1 ? 'trip' : 'trips'}
          </div>
        </div>
      </div>

      <EarningsTripList trips={trips as any} guideId={userWithGuide.guideId} />
    </div>
  );
}
