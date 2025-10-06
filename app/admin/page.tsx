import Link from "next/link";
import { getServerSession } from "@/lib/session";

export default async function AdminHome() {
  const user = await getServerSession();
  if (user?.role !== 'ADMIN') return <div>Admins only.</div>;
  return (
    <div className="stack">
      <h2>Admin</h2>
      <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
        <Link className="btn" href="/admin/guides">Manage Guides</Link>
        <Link className="btn" href="/admin/reports">Reports</Link>
        <Link className="btn" href="/admin/trips">All Trips</Link>
        <Link className="btn" href="/admin/test-email">Test Email Reports</Link>
        <a className="btn ghost" href="/api/audit-logs">Download Audit Logs</a>
      </div>
    </div>
  );
}
