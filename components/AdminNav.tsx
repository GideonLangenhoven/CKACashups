"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function AdminNav() {
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  return (
    <div style={{
      position: "sticky",
      top: 0,
      background: "#fff",
      zIndex: 10,
      padding: "1rem 0",
      borderBottom: "2px solid #e5e5e5",
      marginBottom: "1rem"
    }}>
      <h2 style={{ marginTop: 0, marginBottom: "1rem" }}>Admin</h2>
      <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
        <Link
          className={isActive("/admin/guides") ? "btn" : "btn ghost"}
          href="/admin/guides"
        >
          Manage Guides
        </Link>
        <Link
          className={isActive("/admin/guide-earnings") ? "btn" : "btn ghost"}
          href="/admin/guide-earnings"
        >
          Guide Earnings
        </Link>
        <Link
          className={isActive("/admin/reports") ? "btn" : "btn ghost"}
          href="/admin/reports"
        >
          Reports
        </Link>
        <Link
          className={isActive("/admin/trips") ? "btn" : "btn ghost"}
          href="/admin/trips"
        >
          All Trips
        </Link>
        <a className="btn ghost" href="/api/audit-logs">Download Audit Logs</a>
      </div>
    </div>
  );
}
