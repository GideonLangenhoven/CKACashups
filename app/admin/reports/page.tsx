"use client";
import { useMemo, useState, useEffect } from 'react';

function ym(d: Date) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; }
function ymd(d: Date) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function y(d: Date) { return `${d.getFullYear()}`; }
function getWeek(d: Date): string {
  const jan1 = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const dayOfWeek = jan1.getUTCDay();
  const daysToMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek);
  const week1Start = new Date(Date.UTC(d.getUTCFullYear(), 0, 1 + daysToMonday));
  const diffMs = d.getTime() - week1Start.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const weekNum = Math.floor(diffDays / 7) + 1;
  return `${d.getUTCFullYear()}-W${weekNum.toString().padStart(2, '0')}`;
}

export default function ReportsPage() {
  const [mounted, setMounted] = useState(false);
  const [reportType, setReportType] = useState<'daily'|'weekly'|'monthly'|'yearly'>('monthly');
  const [date, setDate] = useState<string>('');
  const [week, setWeek] = useState<string>('');
  const [month, setMonth] = useState<string>('');
  const [year, setYear] = useState<string>('');

  useEffect(() => {
    const now = new Date();
    setDate(ymd(now));
    setWeek(getWeek(now));
    setMonth(ym(now));
    setYear(y(now));
    setMounted(true);
  }, []);

  const pdfUrl = useMemo(() => {
    if (reportType === 'daily') return `/api/reports/daily?date=${date}&format=pdf`;
    if (reportType === 'weekly') return `/api/reports/weekly?week=${week}&format=pdf`;
    if (reportType === 'monthly') return `/api/reports/monthly?month=${month}&format=pdf`;
    return `/api/reports/yearly?year=${year}&format=pdf`;
  }, [reportType, date, week, month, year]);

  const xlsUrl = useMemo(() => {
    if (reportType === 'daily') return `/api/reports/daily?date=${date}&format=xlsx`;
    if (reportType === 'weekly') return `/api/reports/weekly?week=${week}&format=xlsx`;
    if (reportType === 'monthly') return `/api/reports/monthly?month=${month}&format=xlsx`;
    return `/api/reports/yearly?year=${year}&format=xlsx`;
  }, [reportType, date, week, month, year]);

  if (!mounted) {
    return (
      <div className="stack">
        <h2>Reports</h2>
        <div className="card">Loading...</div>
      </div>
    );
  }

  return (
    <div className="stack">
      <h2>Reports</h2>
      <div className="card">
        <label className="label">Report Type</label>
        <select className="input" value={reportType} onChange={e=>setReportType(e.target.value as any)}>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="yearly">Yearly</option>
        </select>

        {reportType === 'daily' && (
          <>
            <label className="label" style={{ marginTop: 12 }}>Date</label>
            <input className="input" type="date" value={date} onChange={e=>setDate(e.target.value)} />
          </>
        )}

        {reportType === 'weekly' && (
          <>
            <label className="label" style={{ marginTop: 12 }}>Week (YYYY-Wnn)</label>
            <input className="input" type="week" value={week} onChange={e=>setWeek(e.target.value)} />
          </>
        )}

        {reportType === 'monthly' && (
          <>
            <label className="label" style={{ marginTop: 12 }}>Month (YYYY-MM)</label>
            <input className="input" type="month" value={month} onChange={e=>setMonth(e.target.value)} />
          </>
        )}

        {reportType === 'yearly' && (
          <>
            <label className="label" style={{ marginTop: 12 }}>Year</label>
            <input className="input" type="number" min="2020" max="2100" value={year} onChange={e=>setYear(e.target.value)} />
          </>
        )}

        <div className="row" style={{ gap: 8, marginTop: 12 }}>
          <a className="btn" href={pdfUrl} target="_blank" rel="noopener noreferrer">Download PDF</a>
          <a className="btn secondary" href={xlsUrl} target="_blank" rel="noopener noreferrer">Download Excel</a>
        </div>
      </div>
      <div className="card">
        <div style={{ marginBottom: 12 }}>
          <strong style={{ fontSize: '1.1rem' }}>Test Email Reports</strong>
        </div>
        <p style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: '#64748b' }}>
          Send a test email report to verify formatting and delivery before setting up automation.
        </p>
        <div className="row" style={{ gap: 8, marginBottom: 16 }}>
          {reportType === 'weekly' && (
            <button
              className="btn secondary"
              onClick={async () => {
                if (confirm(`Send weekly report for ${week} via email?`)) {
                  try {
                    const res = await fetch(`/api/reports/weekly-email?week=${week}`);
                    if (res.ok) alert('Email sent successfully! Check your inbox.');
                    else alert('Failed to send email. Check console for errors.');
                  } catch (err) {
                    alert('Error sending email: ' + err);
                  }
                }
              }}
            >
              📧 Send Weekly Email
            </button>
          )}
          {reportType === 'monthly' && (
            <button
              className="btn secondary"
              onClick={async () => {
                if (confirm(`Send monthly report for ${month} via email?`)) {
                  try {
                    const res = await fetch(`/api/reports/monthly-email?month=${month}`);
                    if (res.ok) alert('Email sent successfully! Check your inbox.');
                    else alert('Failed to send email. Check console for errors.');
                  } catch (err) {
                    alert('Error sending email: ' + err);
                  }
                }
              }}
            >
              📧 Send Monthly Email
            </button>
          )}
        </div>
      </div>

      <div className="card">
        <div style={{ marginBottom: 8 }}>
          <strong>Automated Email Reports:</strong>
        </div>
        <div style={{ marginBottom: 4 }}>
          • Weekly: <code>/api/reports/weekly-email?week=YYYY-Wnn</code>
        </div>
        <div>
          • Monthly: <code>/api/reports/monthly-email?month=YYYY-MM</code>
        </div>
        <div style={{ marginTop: 8, fontSize: '0.9em', color: '#666' }}>
          Set up Vercel Cron jobs to automatically send these reports via email. See DEPLOYMENT.md for details.
        </div>
      </div>
    </div>
  );
}

