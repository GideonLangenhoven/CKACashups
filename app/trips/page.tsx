import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/session";
import Link from "next/link";
import { redirect } from "next/navigation";

// Ensure this page is never cached and always shows fresh data
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function TripsListPage() {
  const user = await getServerSession();
  if (!user?.id) return <div>Please <Link href="/auth/signin">sign in</Link>.</div>;

  // Get user's guide info
  const userWithGuide = await prisma.user.findUnique({
    where: { id: user.id },
    select: { guideId: true, role: true, guide: { select: { name: true, rank: true } } }
  });

  // "My Trips" shows only trips where the user created OR was a guide
  const where: any = {
    OR: [
      { createdById: user.id },
      ...(userWithGuide?.guideId ? [{ guides: { some: { guideId: userWithGuide.guideId } } }] : [])
    ]
  };

  const trips = await prisma.trip.findMany({
    where,
    orderBy: { tripDate: "desc" },
    include: {
      payments: true,
      guides: { include: { guide: true } },
      tripLeader: true
    }
  });

  // Calculate earnings by period if user is a guide
  let earningsByPeriod = null;
  if (userWithGuide?.guideId) {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthNum = now.getMonth();

    earningsByPeriod = {
      today: 0,
      thisMonth: 0,
      thisYear: 0,
      allTime: 0,
      tripCountToday: 0,
      tripCountThisMonth: 0,
      tripCountThisYear: 0,
      tripCountAllTime: 0,
    };

    for (const trip of trips) {
      const myGuideAssignment = trip.guides.find((g: any) => g.guideId === userWithGuide.guideId);
      if (!myGuideAssignment) continue;

      const tripDate = new Date(trip.tripDate);
      const earnings = parseFloat(myGuideAssignment.feeAmount?.toString() || '0');

      earningsByPeriod.allTime += earnings;
      earningsByPeriod.tripCountAllTime++;

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
  }

  return (
    <div className="stack">
      <h2>My Trips{userWithGuide?.guide ? ` - ${userWithGuide.guide.name}` : ''}</h2>

      {/* Earnings Summary for Guides */}
      {earningsByPeriod && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 16 }}>
          <div className="card">
            <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: 4 }}>Today</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#059669' }}>
              R {earningsByPeriod.today.toFixed(2)}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 4 }}>
              {earningsByPeriod.tripCountToday} {earningsByPeriod.tripCountToday === 1 ? 'trip' : 'trips'}
            </div>
          </div>

          <div className="card">
            <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: 4 }}>This Month</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#059669' }}>
              R {earningsByPeriod.thisMonth.toFixed(2)}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 4 }}>
              {earningsByPeriod.tripCountThisMonth} {earningsByPeriod.tripCountThisMonth === 1 ? 'trip' : 'trips'}
            </div>
          </div>

          <div className="card">
            <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: 4 }}>This Year</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#059669' }}>
              R {earningsByPeriod.thisYear.toFixed(2)}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 4 }}>
              {earningsByPeriod.tripCountThisYear} {earningsByPeriod.tripCountThisYear === 1 ? 'trip' : 'trips'}
            </div>
          </div>

          <div className="card">
            <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: 4 }}>All Time</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#059669' }}>
              R {earningsByPeriod.allTime.toFixed(2)}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 4 }}>
              {earningsByPeriod.tripCountAllTime} {earningsByPeriod.tripCountAllTime === 1 ? 'trip' : 'trips'}
            </div>
          </div>
        </div>
      )}

      {/* Trip List */}
      {trips.length === 0 && (
        <div className="card">
          <p style={{ color: '#64748b', textAlign: 'center' }}>No trips found</p>
        </div>
      )}

      {trips.map((t: any) => {
        // Find this guide's earnings if user is linked to a guide
        const myGuideAssignment = userWithGuide?.guideId
          ? t.guides.find((g: any) => g.guideId === userWithGuide.guideId)
          : null;

        return (
          <div className="card" key={t.id}>
            <div className="row" style={{ justifyContent:'space-between' }}>
              <div>
                <div><strong>{new Date(t.tripDate).toLocaleDateString()}</strong> — {t.leadName}</div>
                <div>Status: {t.status}</div>
                <div>Pax: {t.totalPax} | Guides: {t.guides.map((g: any)=>g.guide.name).join(', ')}</div>
                {myGuideAssignment && (
                  <div style={{ marginTop: 8, color: '#059669', fontWeight: 500 }}>
                    My Earnings: R {parseFloat(myGuideAssignment.feeAmount?.toString() || '0').toFixed(2)}
                    {t.tripLeaderId === userWithGuide?.guideId && ' (Trip Leader)'}
                  </div>
                )}
              </div>
              <div className="row" style={{ gap: 8 }}>
                <Link className="btn ghost" href={`/trips/${t.id}`}>View</Link>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

