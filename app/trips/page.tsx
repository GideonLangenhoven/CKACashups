import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/session";
import Link from "next/link";

export default async function TripsListPage() {
  const user = await getServerSession();
  if (!user?.id) return <div>Please <Link href="/auth/signin">sign in</Link>.</div>;

  // Get user's guide ID if they are linked to a guide
  const userWithGuide = await prisma.user.findUnique({
    where: { id: user.id },
    select: { guideId: true, role: true }
  });

  const where: any = {};

  // If admin, show all trips
  // Otherwise, show trips where user created OR was a guide
  if (userWithGuide?.role !== 'ADMIN') {
    where.OR = [
      { createdById: user.id },
      ...(userWithGuide?.guideId ? [{ guides: { some: { guideId: userWithGuide.guideId } } }] : [])
    ];
  }

  const trips = await prisma.trip.findMany({
    where,
    orderBy: { tripDate: "desc" },
    include: { payments: true, guides: { include: { guide: true } }, tripLeader: true }
  });
  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h2>My Trips</h2>
        <Link className="btn" href="/trips/new">New Cash Up</Link>
      </div>
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

