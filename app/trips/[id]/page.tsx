import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "@/lib/session";
import Link from "next/link";

export default async function TripDetail({ params }: { params: { id: string }}) {
  const session = await getServerSession();
  if (!session?.id) {
    redirect("/auth/signin");
  }

  const trip = await prisma.trip.findUnique({
    where: { id: params.id },
    include: {
      payments: true,
      discounts: true,
      guides: { include: { guide: true } },
      tripLeader: true
    }
  });
  if (!trip) return notFound();

  const isAdmin = session.role === 'ADMIN';
  const isCreator = session.id === trip.createdById;
  let isAssignedGuide = false;

  let viewerGuideId: string | null = null;
  if (!isAdmin && !isCreator) {
    const viewer = await prisma.user.findUnique({
      where: { id: session.id },
      select: { guideId: true }
    });
    viewerGuideId = viewer?.guideId ?? null;
    if (viewerGuideId) {
      isAssignedGuide = trip.guides.some((g: any) => g.guideId === viewerGuideId);
    }
  }

  if (!isAdmin && !isCreator && !isAssignedGuide) {
    redirect("/auth/error?error=AccessDenied");
  }

  // Check if user can edit (admin or trip creator)
  const canEdit = isAdmin || isCreator;
  const showFullDetail = isAdmin || isCreator;
  const myAssignment =
    viewerGuideId ? trip.guides.find((g: any) => g.guideId === viewerGuideId) : null;

  if (!showFullDetail && isAssignedGuide) {
    return (
      <div className="stack">
        <div className="card">
          <h2>{new Date(trip.tripDate).toLocaleDateString()} — {trip.leadName}</h2>
          <p style={{ color: '#64748b', marginTop: 4 }}>
            Trip status: <strong>{trip.status}</strong>
          </p>
        </div>
        <div className="card">
          <div className="section-title">Your Earnings</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#f97316' }}>
            R {parseFloat(myAssignment?.feeAmount?.toString() || '0').toFixed(2)}
          </div>
          <p style={{ marginTop: 8, color: '#475569' }}>
            {trip.tripLeaderId === viewerGuideId ? 'You were the trip leader.' : 'Logged as guide.'}
          </p>
        </div>
        <div className="card">
          <div className="section-title">Trip Snapshot</div>
          <ul style={{ paddingLeft: '1rem', color: '#475569' }}>
            <li>Total pax: {trip.totalPax}</li>
            <li>Guides assigned: {trip.guides.length}</li>
            <li>Trip notes: {(trip as any).paxGuideNote || '—'}</li>
          </ul>
          <p style={{ fontSize: '0.9rem', color: '#94a3b8', marginTop: 12 }}>
            Full trip details are available to the trip creator or admins to keep payment data private.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="stack">
      <h2>Trip on {new Date(trip.tripDate).toLocaleDateString()}</h2>
      <div className="row" style={{ marginBottom: 8, gap: '0.5rem' }}>
        <a className="btn" href={`/api/trips/${trip.id}/pdf`}>Download PDF</a>
        {canEdit && (
          <Link className="btn" href={`/trips/${trip.id}/edit`}>Edit Trip</Link>
        )}
      </div>
      <div className="card">
        <div>Lead: {trip.leadName}</div>
        <div>Status: {trip.status}</div>
        <div>Pax total: {trip.totalPax}</div>
        <div>Pax Guide notes: {trip as any && (trip as any).paxGuideNote}</div>
      </div>
      <div className="card">
        <div className="section-title">Additional Checks</div>
        <div>All payments in Activitar: {trip.paymentsMadeYN ? 'Yes' : 'No'}</div>
        <div>Facebook pictures uploaded: {trip.picsUploadedYN ? 'Yes' : 'No'}</div>
        <div>Trip email sent: {trip.tripEmailSentYN ? 'Yes' : 'No'}</div>
      </div>
      {(trip as any).tripReport && (
        <div className="card">
          <div className="section-title">Trip Report</div>
          <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{(trip as any).tripReport}</div>
        </div>
      )}
      <div className="card">
        <div className="section-title">Guides</div>
        {trip.guides.map((g: any) => (<div key={g.id}>{g.guide.name} ({g.guide.rank}) — pax {g.paxCount}</div>))}
      </div>
      <div className="card">
        <div className="section-title">Payments</div>
        {trip.payments && (
          <div className="stack">
            <div>Cash received: R {trip.payments.cashReceived.toString()}</div>
            <div>Credit cards: R {trip.payments.creditCards.toString()}</div>
            <div>Online EFTs: R {trip.payments.onlineEFTs.toString()}</div>
            <div>Vouchers: R {trip.payments.vouchers.toString()}</div>
            <div>Members: R {trip.payments.members.toString()}</div>
            <div>Agents to invoice: R {trip.payments.agentsToInvoice.toString()}</div>
            <div>Discounts total: R {trip.payments.discountsTotal.toString()}</div>
          </div>
        )}
        <div className="section-title">Discount lines</div>
        {trip.discounts.map((d: any) => (<div key={d.id}>R {d.amount.toString()} — {d.reason}</div>))}
      </div>
    </div>
  );
}
