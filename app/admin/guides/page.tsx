"use client";
import useSWR from 'swr';
import { useState } from 'react';

const fetcher = (url: string) => fetch(url).then(r=>r.json());

export default function GuidesPage() {
  const { data, mutate } = useSWR('/api/guides', fetcher);
  const [name, setName] = useState("");
  const [rank, setRank] = useState("SENIOR");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRank, setEditRank] = useState("");
  const guides = data?.guides || [];

  async function addGuide() {
    const res = await fetch('/api/guides', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, rank }) });
    if (res.ok) { setName(""); mutate(); } else { alert(await res.text()); }
  }

  async function deactivate(id: string) {
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
      <h2>Guides</h2>
      <div className="card">
        <div className="row">
          <input className="input" placeholder="Guide name" value={name} onChange={e=>setName(e.target.value)} />
          <select className="input" value={rank} onChange={e=>setRank(e.target.value)}>
            <option value="SENIOR">Senior</option>
            <option value="INTERMEDIATE">Intermediate</option>
            <option value="JUNIOR">Junior</option>
          </select>
          <button className="btn" onClick={addGuide}>Add</button>
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
                <button className="btn ghost" onClick={()=>deactivate(g.id)}>Deactivate</button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

