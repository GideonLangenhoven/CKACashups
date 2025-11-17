"use client";
import { useState } from "react";
import { csrfFetch } from "@/lib/client/csrfFetch";

export function SubmitInvoiceButton() {
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [tipsReceived, setTipsReceived] = useState<string>("");

  const handleSubmit = async () => {
    const tips = parseFloat(tipsReceived || "0");
    if (!confirm(`Submit invoice for ${selectedMonth}?\n${tips > 0 ? `Tips: R ${tips.toFixed(2)}\n` : ''}This will send your invoice to the admin email.`)) {
      return;
    }

    console.log('[INVOICE SUBMIT] Starting invoice submission for month:', selectedMonth);
    setLoading(true);
    try {
      const res = await csrfFetch('/api/guides/submit-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: selectedMonth, tipsReceived: tips })
      });

      console.log('[INVOICE SUBMIT] Response status:', res.status);

      const data = await res.json();
      console.log('[INVOICE SUBMIT] Response data:', data);

      if (res.ok) {
        console.log('[INVOICE SUBMIT] ✓ Success!');
        alert(`✓ Invoice submitted successfully!\n\nTrips: ${data.tripCount}\nTotal Earnings: R ${data.totalEarnings?.toFixed(2)}\n\nThe invoice has been sent to the admin email.`);
      } else {
        console.error('[INVOICE SUBMIT] ✗ Failed:', data);
        const errorDetails = data.details ? JSON.stringify(data.details, null, 2) : '';
        alert(`Error: ${data.error || 'Failed to submit invoice'}\n\nCode: ${data.code || 'N/A'}\n${errorDetails ? '\nDetails:\n' + errorDetails : ''}\n\nCheck browser console for full error details.`);
      }
    } catch (err: any) {
      console.error('[INVOICE SUBMIT] ✗ Exception:', err);
      alert(`Error: ${err.message || 'Failed to submit invoice'}\n\nCheck browser console for full error details.`);
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
      <div className="stack" style={{ gap: '16px' }}>
        <div className="row" style={{ gap: '16px', flexWrap: 'wrap' }}>
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
          <div style={{ flex: '1', minWidth: 200 }}>
            <label className="label" style={{ marginBottom: 6 }}>Tips Received (optional)</label>
            <input
              type="number"
              className="input"
              value={tipsReceived}
              onChange={(e) => setTipsReceived(e.target.value)}
              disabled={loading}
              placeholder="0.00"
              min="0"
              step="0.01"
            />
          </div>
        </div>
        <div>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="btn sunset mobile-full"
          >
            {loading ? 'Submitting...' : '📧 Submit Invoice'}
          </button>
        </div>
      </div>
    </div>
  );
}
