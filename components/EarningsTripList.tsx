"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { EditTripFeeButton } from "./EditTripFeeButton";

interface Trip {
  id: string;
  tripDate: string;
  leadName: string;
  totalPax: number;
  status: string;
  tripLeaderId: string | null;
  guides: Array<{
    id: string;
    guideId: string;
    feeAmount: number;
  }>;
}

interface EarningsTripListProps {
  trips: Trip[];
  guideId: string;
}

export function EarningsTripList({ trips: initialTrips, guideId }: EarningsTripListProps) {
  const router = useRouter();
  const [, setRefreshKey] = useState(0);

  function handleFeeUpdated() {
    setRefreshKey(prev => prev + 1);
    router.refresh();
  }

  return (
    <div className="card">
      <h3 style={{ marginBottom: 16 }}>Recent Trips</h3>
      {initialTrips.length === 0 ? (
        <p style={{ color: '#64748b' }}>No trips found.</p>
      ) : (
        <div className="trip-list">
          {initialTrips.slice(0, 10).map((trip) => {
            const myEarnings = parseFloat(trip.guides[0]?.feeAmount?.toString() || '0');
            const isTripLeader = trip.tripLeaderId === guideId;
            const statusClass =
              trip.status === 'APPROVED' ? 'pill success' :
              trip.status === 'SUBMITTED' ? 'pill info' :
              trip.status === 'REJECTED' ? 'pill warning' :
              'pill';

            return (
              <div className="trip-item" key={trip.id}>
                <div className="trip-meta">
                  <div style={{ fontWeight: 600 }}>
                    {new Date(trip.tripDate).toLocaleDateString()} — {trip.leadName}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center' }}>
                    <span className="pill info">{trip.totalPax} pax</span>
                    <span className={statusClass}>{trip.status}</span>
                    {isTripLeader && <span className="pill success">Trip Leader</span>}
                  </div>
                </div>
                <div>
                  <div className="trip-amount">R {myEarnings.toFixed(2)}</div>
                  {trip.status === 'SUBMITTED' && (
                    <div style={{ fontSize: '0.75rem', color: '#1d4ed8', marginTop: 4, textAlign: 'right' }}>
                      Pending Approval
                    </div>
                  )}
                  <EditTripFeeButton
                    tripId={trip.id}
                    tripGuideId={trip.guides[0].id}
                    currentFee={myEarnings}
                    tripDate={trip.tripDate}
                    leadName={trip.leadName}
                    onFeeUpdated={handleFeeUpdated}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
