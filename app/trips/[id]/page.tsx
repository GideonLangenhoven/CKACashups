import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

export default async function TripDetail({ params }: { params: { id: string }}) {
  const trip = await prisma.trip.findUnique({
    where: { id: params.id },
    include: {
      payments: true,
      discounts: true,
      guides: { include: { guide: true } }
    }
  });
  if (!trip) return notFound();
  return (
    <div className="stack">
      <h2>Trip on {new Date(trip.tripDate).toLocaleDateString()}</h2>
      <div className="row" style={{ marginBottom: 8 }}>
        <a className="btn" href={`/api/trips/${trip.id}/pdf`}>Download PDF</a>
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
