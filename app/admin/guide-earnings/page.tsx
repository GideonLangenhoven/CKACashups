"use client";
import { useState, useEffect } from "react";
import { AdminNav } from "@/components/AdminNav";
import { EditTripFeeButton } from "@/components/EditTripFeeButton";

interface Guide {
  id: string;
  name: string;
  rank: string;
  active: boolean;
}

interface Trip {
  id: string;
  tripDate: string;
  leadName: string;
  totalPax: number;
  status: string;
  guides: Array<{
    id: string;
    guideId: string;
    feeAmount: number;
  }>;
}

interface GuideEarnings {
  guide: Guide;
  thisWeekTrips: Trip[];
  thisMonthTrips: Trip[];
  thisWeekTotal: number;
  thisMonthTotal: number;
}

export default function AdminGuideEarningsPage() {
  const [guides, setGuides] = useState<GuideEarnings[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGuide, setExpandedGuide] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    loadGuideEarnings();
  }, [refreshKey]);

  async function loadGuideEarnings() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/guide-earnings');
      if (!res.ok) throw new Error('Failed to load guide earnings');
      const data = await res.json();
      setGuides(data.guides || []);
    } catch (error: any) {
      alert('Error loading guide earnings: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  function handleFeeUpdated() {
    setRefreshKey(prev => prev + 1);
  }

  if (loading) {
    return (
      <div className="stack">
        <AdminNav />
        <div className="card">Loading guide earnings...</div>
      </div>
    );
  }

  return (
    <div className="stack">
      <AdminNav />

      <div className="card">
        <h2 style={{ marginBottom: 16 }}>Guide Earnings Overview</h2>
        <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
          View and manage guide earnings by week and month. Click on a guide to see detailed trip breakdown.
        </p>
      </div>

      {guides.length === 0 ? (
        <div className="card">No active guides found.</div>
      ) : (
        guides.map((guideEarnings) => {
          const isExpanded = expandedGuide === guideEarnings.guide.id;

          return (
            <div key={guideEarnings.guide.id} className="card">
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer'
                }}
                onClick={() => setExpandedGuide(isExpanded ? null : guideEarnings.guide.id)}
              >
                <div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 4 }}>
                    {guideEarnings.guide.name}
                    <span style={{
                      marginLeft: 12,
                      fontSize: '0.75rem',
                      padding: '2px 8px',
                      backgroundColor: '#f3f4f6',
                      borderRadius: 4,
                      fontWeight: 500
                    }}>
                      {guideEarnings.guide.rank}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                    {guideEarnings.thisWeekTrips.length} trip(s) this week • {guideEarnings.thisMonthTrips.length} trip(s) this month
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: 4 }}>This Week</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#059669' }}>
                    R {guideEarnings.thisWeekTotal.toFixed(2)}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4 }}>This Month</div>
                  <div style={{ fontSize: '1rem', fontWeight: 600, color: '#64748b' }}>
                    R {guideEarnings.thisMonthTotal.toFixed(2)}
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid #e5e5e5' }}>
                  <div style={{ marginBottom: 16 }}>
                    <h4 style={{ marginBottom: 12, fontSize: '1rem' }}>This Week's Trips</h4>
                    {guideEarnings.thisWeekTrips.length === 0 ? (
                      <p style={{ color: '#64748b', fontSize: '0.9rem' }}>No trips this week</p>
                    ) : (
                      <div className="stack" style={{ gap: 8 }}>
                        {guideEarnings.thisWeekTrips.map((trip) => {
                          const myGuide = trip.guides.find(g => g.guideId === guideEarnings.guide.id);
                          const earnings = myGuide?.feeAmount || 0;

                          return (
                            <div
                              key={trip.id}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: 10,
                                backgroundColor: '#f9fafb',
                                borderRadius: 6,
                                border: '1px solid #e5e5e5'
                              }}
                            >
                              <div>
                                <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>
                                  {new Date(trip.tripDate).toLocaleDateString()} — {trip.leadName}
                                </div>
                                <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 2 }}>
                                  {trip.totalPax} pax • {trip.status}
                                </div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '1rem', fontWeight: 600, color: '#059669' }}>
                                  R {earnings.toFixed(2)}
                                </div>
                                {myGuide && (
                                  <EditTripFeeButton
                                    tripId={trip.id}
                                    tripGuideId={myGuide.id}
                                    currentFee={earnings}
                                    tripDate={trip.tripDate}
                                    leadName={trip.leadName}
                                    onFeeUpdated={handleFeeUpdated}
                                  />
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 style={{ marginBottom: 12, fontSize: '1rem' }}>This Month's Trips</h4>
                    {guideEarnings.thisMonthTrips.length === 0 ? (
                      <p style={{ color: '#64748b', fontSize: '0.9rem' }}>No trips this month</p>
                    ) : (
                      <div className="stack" style={{ gap: 8 }}>
                        {guideEarnings.thisMonthTrips.map((trip) => {
                          const myGuide = trip.guides.find(g => g.guideId === guideEarnings.guide.id);
                          const earnings = myGuide?.feeAmount || 0;

                          return (
                            <div
                              key={trip.id}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: 10,
                                backgroundColor: '#f9fafb',
                                borderRadius: 6,
                                border: '1px solid #e5e5e5'
                              }}
                            >
                              <div>
                                <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>
                                  {new Date(trip.tripDate).toLocaleDateString()} — {trip.leadName}
                                </div>
                                <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 2 }}>
                                  {trip.totalPax} pax • {trip.status}
                                </div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '1rem', fontWeight: 600, color: '#059669' }}>
                                  R {earnings.toFixed(2)}
                                </div>
                                {myGuide && (
                                  <EditTripFeeButton
                                    tripId={trip.id}
                                    tripGuideId={myGuide.id}
                                    currentFee={earnings}
                                    tripDate={trip.tripDate}
                                    leadName={trip.leadName}
                                    onFeeUpdated={handleFeeUpdated}
                                  />
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
