import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/session";
import Link from "next/link";

export default async function TripsListPage() {
  const user = await getServerSession();
  if (!user?.id) return <div>Please <Link href="/auth/signin">sign in</Link>.</div>;
  const where = user.role === 'ADMIN' ? {} : { createdById: user.id };
  const trips = await prisma.trip.findMany({
    where,
    orderBy: { tripDate: "desc" },
    include: { payments: true, guides: { include: { guide: true } } }
  });
  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h2>My Trips</h2>
        <Link className="btn" href="/trips/new">New Cash Up</Link>
      </div>
      {trips.map(t => (
        <div className="card" key={t.id}>
          <div className="row" style={{ justifyContent:'space-between' }}>
            <div>
              <div><strong>{new Date(t.tripDate).toLocaleDateString()}</strong> — {t.leadName}</div>
              <div>Status: {t.status}</div>
              <div>Pax: {t.totalPax} | Guides: {t.guides.map((g: any)=>g.guide.name).join(', ')}</div>
            </div>
            <div className="row" style={{ gap: 8 }}>
              <Link className="btn ghost" href={`/trips/${t.id}`}>View</Link>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

