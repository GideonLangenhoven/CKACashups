"use client";
import { useState } from "react";
import { csrfFetch } from "@/lib/client/csrfFetch";

export function SubmitInvoiceButton() {
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const handleSubmit = async () => {
    if (!confirm(`Submit invoice for ${selectedMonth}?\n\nThis will send your invoice to the admin email.`)) {
      return;
    }

    setLoading(true);
    try {
      const res = await csrfFetch('/api/guides/submit-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: selectedMonth })
      });

      const data = await res.json();

      if (res.ok) {
        alert(`✓ Invoice submitted successfully!\n\nTrips: ${data.tripCount}\nTotal Earnings: R ${data.totalEarnings?.toFixed(2)}\n\nThe invoice has been sent to the admin email.`);
      } else {
        alert(`Error: ${data.error || 'Failed to submit invoice'}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message || 'Failed to submit invoice'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ background: 'rgba(240, 249, 255, 0.9)', border: '1px solid rgba(10, 102, 194, 0.2)' }}>
      <div style={{ marginBottom: 12, fontWeight: 600, color: '#0A66C2', fontSize: '1.1rem' }}>
        Submit Invoice
      </div>
      <p style={{ margin: '0 0 16px 0', fontSize: '0.9rem', color: '#475569' }}>
        Generate and submit your monthly invoice to admin. The invoice will include all trips, weekly breakdowns, and total earnings for the selected month.
      </p>
      <div className="row" style={{ alignItems: 'flex-end' }}>
        <div style={{ flex: '1', minWidth: 200 }}>
          <label className="label" style={{ marginBottom: 6 }}>Select Month</label>
          <input
            type="month"
            className="input"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            disabled={loading}
            max={`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`}
          />
        </div>
        <div style={{ minWidth: 180 }}>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="btn sunset mobile-full"
            style={{ marginTop: 22 }}
          >
            {loading ? 'Submitting...' : '📧 Submit Invoice'}
          </button>
        </div>
      </div>
    </div>
  );
}
