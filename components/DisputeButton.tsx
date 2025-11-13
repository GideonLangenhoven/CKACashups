"use client";
import { useState } from "react";
import { csrfFetch } from "@/lib/client/csrfFetch";

interface DisputeButtonProps {
  guideName: string;
  month: string;
  tripCount: number;
  totalEarnings: number;
}

export function DisputeButton({ guideName, month, tripCount, totalEarnings }: DisputeButtonProps) {
  const [showForm, setShowForm] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reason.trim()) {
      alert("Please provide a reason for the dispute");
      return;
    }

    setLoading(true);

    try {
      const res = await csrfFetch('/api/guides/dispute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month,
          reason: reason.trim()
        })
      });

      const data = await res.json();

      if (res.ok) {
        alert(`✓ Dispute submitted successfully!\n\nYour dispute has been sent to the admin. They will review and contact you shortly.`);
        setShowForm(false);
        setReason("");
      } else {
        alert(`Error: ${data.error || 'Failed to submit dispute'}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message || 'Failed to submit dispute'}`);
    } finally {
      setLoading(false);
    }
  };

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="btn ghost"
        style={{
          color: '#dc2626',
          borderColor: '#dc2626'
        }}
      >
        ⚠️ Dispute Trips
      </button>
    );
  }

  return (
    <div className="card" style={{ background: '#fef2f2', border: '2px solid #dc2626' }}>
      <div style={{ marginBottom: 12 }}>
        <strong style={{ fontSize: '1.1rem', color: '#dc2626' }}>Dispute Trip Count</strong>
      </div>
      <div style={{ marginBottom: 16, fontSize: '0.9rem', color: '#991b1b' }}>
        <p style={{ margin: '0 0 8px 0' }}>
          <strong>Current Summary:</strong>
        </p>
        <ul style={{ margin: '0 0 0 20px', padding: 0 }}>
          <li>Month: {month}</li>
          <li>Total Trips: {tripCount}</li>
          <li>Total Earnings: R {totalEarnings.toFixed(2)}</li>
        </ul>
      </div>

      <form onSubmit={handleSubmit}>
        <label className="label" style={{ marginBottom: 6, color: '#7c2d12' }}>
          Reason for Dispute *
        </label>
        <textarea
          className="input"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          disabled={loading}
          placeholder="Explain why you believe the trip count or earnings are incorrect..."
          rows={4}
          style={{ resize: 'vertical', minHeight: 80 }}
          required
        />

        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button
            type="submit"
            disabled={loading}
            className="btn"
            style={{ background: '#dc2626', color: 'white' }}
          >
            {loading ? 'Submitting...' : 'Submit Dispute'}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowForm(false);
              setReason("");
            }}
            disabled={loading}
            className="btn ghost"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
