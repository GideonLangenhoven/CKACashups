"use client";
import useSWR from 'swr';
import { useMemo, useState } from 'react';
import { AdminNav } from '@/components/AdminNav';

const fetcher = (url: string) => fetch(url).then(r=>r.json());

export default function AdminTripsPage() {
  const [lead, setLead] = useState('');
  const [status, setStatusFilter] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [note, setNote] = useState('');

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (lead) p.set('lead', lead);
    if (status) p.set('status', status);
    if (start) p.set('start', start);
    if (end) p.set('end', end);
    if (note) p.set('note', note);
    p.set('admin', '1');
    return p.toString();
  }, [lead, status, start, end, note]);

  const { data, mutate, isLoading } = useSWR(`/api/trips?${qs}`, fetcher);
  const trips = data?.trips || [];
  const [updating, setUpdating] = useState<string | null>(null);

  async function setStatus(id: string, status: string) {
    setUpdating(id);
    try {
      const res = await fetch(`/api/trips/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
      if (!res.ok) throw new Error(await res.text());
      mutate();
    } catch (e: any) { alert(e.message); }
    finally { setUpdating(null); }
  }

  return (
    <div className="stack">
      <AdminNav />
      <div className="card">
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <input className="input" placeholder="Search lead name" value={lead} onChange={e=>setLead(e.target.value)} style={{ maxWidth: 240 }} />
          <select className="input" value={status} onChange={e=>setStatusFilter(e.target.value)} style={{ maxWidth: 200 }}>
            <option value="">All statuses</option>
            {['DRAFT','SUBMITTED','APPROVED','REJECTED','LOCKED'].map(s=> <option key={s} value={s}>{s}</option>)}
          </select>
          <input className="input" type="date" value={start} onChange={e=>setStart(e.target.value)} style={{ maxWidth: 180 }} />
          <input className="input" type="date" value={end} onChange={e=>setEnd(e.target.value)} style={{ maxWidth: 180 }} />
          <input className="input" placeholder="Search notes" value={note} onChange={e=>setNote(e.target.value)} style={{ maxWidth: 260 }} />
        </div>
      </div>
      {isLoading ? <div className="card">Loading...</div> : trips.map((t: any) => (
        <div key={t.id} className="card">
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div><strong>{new Date(t.tripDate).toLocaleDateString()}</strong> — {t.leadName}</div>
              <div>Status: {t.status} | Pax: {t.totalPax}</div>
            </div>
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              {['DRAFT','SUBMITTED','APPROVED','REJECTED','LOCKED'].map(s => (
                <button key={s} className="btn ghost" disabled={updating===t.id} onClick={()=>setStatus(t.id, s)}>{s}</button>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
