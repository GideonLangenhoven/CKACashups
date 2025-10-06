"use client";
import { useState } from 'react';

export default function TestEmailPage() {
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState('');

  async function sendWeekly() {
    setSending(true);
    setResult('');
    try {
      const res = await fetch('/api/reports/weekly-email');
      if (res.ok) {
        setResult('✓ Weekly report email sent successfully!');
      } else {
        const text = await res.text();
        setResult(`✗ Failed: ${text}`);
      }
    } catch (error: any) {
      setResult(`✗ Error: ${error.message}`);
    } finally {
      setSending(false);
    }
  }

  async function sendMonthly() {
    setSending(true);
    setResult('');
    try {
      const res = await fetch('/api/reports/monthly-email');
      if (res.ok) {
        setResult('✓ Monthly report email sent successfully!');
      } else {
        const text = await res.text();
        setResult(`✗ Failed: ${text}`);
      }
    } catch (error: any) {
      setResult(`✗ Error: ${error.message}`);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="stack">
      <h2>Test Email Reports</h2>
      <div className="card">
        <div className="stack">
          <p style={{ color: '#666', marginBottom: '1rem' }}>
            Test the email reporting system. Emails will be sent to: {process.env.NEXT_PUBLIC_ADMIN_EMAILS || 'ADMIN_EMAILS from env'}
          </p>

          <div className="section-title">Weekly Report</div>
          <p style={{ fontSize: '0.9rem', color: '#666' }}>
            Contains:<br/>
            • Guide Summary: Name, Rank, Trip Count, Total Cash<br/>
            • Trip Details by Guide: Date, Time, Cash for each trip<br/>
            • Sent as PDF and Excel attachments
          </p>
          <button
            className="btn"
            onClick={sendWeekly}
            disabled={sending}
          >
            {sending ? 'Sending...' : 'Send Weekly Report (Current Week)'}
          </button>

          <div className="section-title" style={{ marginTop: '2rem' }}>Monthly Report</div>
          <p style={{ fontSize: '0.9rem', color: '#666' }}>
            Contains:<br/>
            • All trips for the month<br/>
            • Date, Lead, Pax, Guide counts (S/I/J)<br/>
            • Payment details: Cash, Cards, EFTs, Vouchers, Members, Agents, Discounts<br/>
            • Sent as PDF and Excel attachments
          </p>
          <button
            className="btn"
            onClick={sendMonthly}
            disabled={sending}
          >
            {sending ? 'Sending...' : 'Send Monthly Report (Current Month)'}
          </button>

          {result && (
            <div
              className="card"
              style={{
                marginTop: '1rem',
                padding: '1rem',
                background: result.startsWith('✓') ? '#d4edda' : '#f8d7da',
                color: result.startsWith('✓') ? '#155724' : '#721c24',
                border: `1px solid ${result.startsWith('✓') ? '#c3e6cb' : '#f5c6cb'}`
              }}
            >
              {result}
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: '1rem' }}>
        <div className="section-title">About Automated Sending</div>
        <p style={{ fontSize: '0.9rem', color: '#666' }}>
          To set up automatic weekly and monthly emails, you'll need to configure a cron job or use Vercel Cron Jobs.<br/><br/>

          <strong>Recommended schedule:</strong><br/>
          • Weekly: Every Monday at 8am<br/>
          • Monthly: Last day of month at 8am<br/><br/>

          These endpoints can be triggered:<br/>
          • <code>GET /api/reports/weekly-email</code><br/>
          • <code>GET /api/reports/monthly-email</code>
        </p>
      </div>
    </div>
  );
}
