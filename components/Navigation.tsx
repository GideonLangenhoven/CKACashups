"use client";
import Link from "next/link";
import { useSession } from "@/lib/session-context";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

export function Navigation() {
  const { user, loading, signOut } = useSession();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || loading) {
    return (
      <nav style={{
        padding: "1rem 2rem",
        borderBottom: "1px solid #e5e5e5",
        background: "#fff"
      }}>
        <div>Loading...</div>
      </nav>
    );
  }

  if (!user) {
    return null;
  }

  const isActive = (path: string) => pathname?.startsWith(path);

  return (
    <nav style={{
      padding: "1rem 2rem",
      borderBottom: "1px solid #e5e5e5",
      background: "#fff",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center"
    }}>
      <div style={{ display: "flex", gap: "1.5rem", alignItems: "center" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.75rem", textDecoration: "none", color: "#333" }}>
          <img src="/CKAlogo.png" alt="CKA Logo" style={{ height: "40px", width: "auto" }} />
          <span style={{ fontWeight: "bold", fontSize: "1.2rem" }}>CKA Cashups</span>
        </Link>
        <Link
          href="/trips"
          className={isActive("/trips") ? "btn" : "btn ghost"}
          style={{ textDecoration: "none" }}
        >
          My Trips
        </Link>
        {(user.email === "gidslang89@gmail.com" || user.email === "info@kayak.co.za") && (
          <Link
            href="/admin"
            className={isActive("/admin") ? "btn" : "btn ghost"}
            style={{ textDecoration: "none" }}
          >
            Admin
          </Link>
        )}
      </div>
      <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
        <span style={{ color: "#666" }}>{user.email}</span>
        <button onClick={signOut} className="btn ghost">
          Sign Out
        </button>
      </div>
    </nav>
  );
}
