"use client";
import useSWR from 'swr';
import { useState } from 'react';
import { AdminNav } from '@/components/AdminNav';

const fetcher = (url: string) => fetch(url).then(r=>r.json());

export default function GuidesPage() {
  const { data, mutate } = useSWR('/api/guides', fetcher);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [rank, setRank] = useState("SENIOR");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRank, setEditRank] = useState("");
  const guides = data?.guides || [];

  async function addGuide() {
    const res = await fetch('/api/guides', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, rank, email: email || undefined }) });
    if (res.ok) { setName(""); setEmail(""); mutate(); } else { alert(await res.text()); }
  }

  async function deactivate(id: string, name: string) {
    if (!confirm(`Are you sure you want to deactivate this guide?\n\nGuide: ${name}\n\nThis will remove them from the active guides list.`)) {
      return;
    }
    const res = await fetch(`/api/guides/${id}`, { method: 'DELETE' });
    if (res.ok) mutate(); else alert(await res.text());
  }

  async function updateRank(id: string, newRank: string) {
    const res = await fetch(`/api/guides/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rank: newRank })
    });
    if (res.ok) {
      setEditingId(null);
      mutate();
    } else {
      alert(await res.text());
    }
  }

  function startEdit(id: string, currentRank: string) {
    setEditingId(id);
    setEditRank(currentRank);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditRank("");
  }

  return (
    <div className="stack">
      <AdminNav />
      <style jsx>{`
        .deactivate-btn {
          border-color: #dc2626 !important;
          color: #dc2626 !important;
        }
        .deactivate-btn:hover {
          background: #dc2626 !important;
          color: white !important;
          border-color: #dc2626 !important;
        }
        .deactivate-btn:active {
          background: #b91c1c !important;
          color: white !important;
        }
      `}</style>
      <div className="card">
        <div className="stack">
          <div className="row">
            <input className="input" placeholder="Guide name *" value={name} onChange={e=>setName(e.target.value)} />
            <input className="input" type="email" placeholder="Email (optional)" value={email} onChange={e=>setEmail(e.target.value)} />
            <select className="input" value={rank} onChange={e=>setRank(e.target.value)}>
              <option value="SENIOR">Senior</option>
              <option value="INTERMEDIATE">Intermediate</option>
              <option value="JUNIOR">Junior</option>
            </select>
            <button className="btn" onClick={addGuide} disabled={!name}>Add</button>
          </div>
          <div style={{ fontSize: '0.85rem', color: '#666' }}>
            💡 Adding an email will auto-create a user account for this guide
          </div>
        </div>
      </div>
      <div className="card">
        {guides.map((g: any) => (
          <div className="row" key={g.id} style={{ justifyContent: 'space-between', padding: '0.5rem 0', alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              {g.name}
            </div>
            {editingId === g.id ? (
              <>
                <select className="input" value={editRank} onChange={e=>setEditRank(e.target.value)} style={{ width: '150px', marginRight: '0.5rem' }}>
                  <option value="SENIOR">Senior</option>
                  <option value="INTERMEDIATE">Intermediate</option>
                  <option value="JUNIOR">Junior</option>
                </select>
                <button className="btn" onClick={()=>updateRank(g.id, editRank)} style={{ marginRight: '0.5rem' }}>Save</button>
                <button className="btn ghost" onClick={cancelEdit}>Cancel</button>
              </>
            ) : (
              <>
                <span style={{ marginRight: '1rem', color: '#666' }}>{g.rank}</span>
                <button className="btn" onClick={()=>startEdit(g.id, g.rank)} style={{ marginRight: '0.5rem' }}>Change Rank</button>
                <button className="btn ghost deactivate-btn" onClick={()=>deactivate(g.id, g.name)}>Deactivate</button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

