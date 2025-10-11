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
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRank, setEditRank] = useState("");

  // Sort guides by rank: SENIOR, INTERMEDIATE, JUNIOR, TRAINEE
  const rankOrder: Record<string, number> = {
    'SENIOR': 1,
    'INTERMEDIATE': 2,
    'JUNIOR': 3,
    'TRAINEE': 4
  };

  const guides = (data?.guides || []).sort((a: any, b: any) => {
    return (rankOrder[a.rank] || 99) - (rankOrder[b.rank] || 99);
  });

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

  async function updateGuide(id: string) {
    const res = await fetch(`/api/guides/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: editName,
        email: editEmail || undefined,
        rank: editRank
      })
    });
    if (res.ok) {
      setEditingId(null);
      mutate();
    } else {
      alert(await res.text());
    }
  }

  function startEdit(guide: any) {
    setEditingId(guide.id);
    setEditName(guide.name);
    setEditEmail(guide.email || "");
    setEditRank(guide.rank);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditEmail("");
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
              <option value="TRAINEE">Trainee</option>
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
          <div key={g.id} style={{ padding: '0.5rem 0', borderBottom: '1px solid #eee' }}>
            {editingId === g.id ? (
              <div className="stack" style={{ gap: '0.5rem' }}>
                <div className="row" style={{ gap: '0.5rem' }}>
                  <input
                    className="input"
                    placeholder="Name"
                    value={editName}
                    onChange={e=>setEditName(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <input
                    className="input"
                    type="email"
                    placeholder="Email (optional)"
                    value={editEmail}
                    onChange={e=>setEditEmail(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <select className="input" value={editRank} onChange={e=>setEditRank(e.target.value)} style={{ width: '150px' }}>
                    <option value="SENIOR">Senior</option>
                    <option value="INTERMEDIATE">Intermediate</option>
                    <option value="JUNIOR">Junior</option>
                    <option value="TRAINEE">Trainee</option>
                  </select>
                </div>
                <div className="row" style={{ gap: '0.5rem', justifyContent: 'flex-end' }}>
                  <button className="btn" onClick={()=>updateGuide(g.id)}>Save Changes</button>
                  <button className="btn ghost" onClick={cancelEdit}>Cancel</button>
                </div>
              </div>
            ) : (
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <div><strong>{g.name}</strong></div>
                  {g.email && <div style={{ fontSize: '0.85rem', color: '#666' }}>{g.email}</div>}
                </div>
                <span style={{ marginRight: '1rem', color: '#666' }}>{g.rank}</span>
                <button className="btn" onClick={()=>startEdit(g)} style={{ marginRight: '0.5rem' }}>Edit</button>
                <button className="btn ghost deactivate-btn" onClick={()=>deactivate(g.id, g.name)}>Deactivate</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

