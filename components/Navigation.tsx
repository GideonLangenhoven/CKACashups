"use client";
import Link from "next/link";
import { useSession } from "@/lib/session-context";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

export function Navigation() {
  const { user, loading, signOut } = useSession();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || loading) {
    return (
      <nav style={{
        padding: "1rem",
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
      padding: "1rem",
      borderBottom: "1px solid #e5e5e5",
      background: "#fff",
      position: "relative"
    }}
    className="main-nav">
      {/* Mobile and Desktop Header */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}>
        {/* Logo */}
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.5rem", textDecoration: "none", color: "#333" }}>
          <img src="/CKAlogo.png" alt="CKA Logo" style={{ height: "32px", width: "auto" }} />
          <span style={{ fontWeight: "bold", fontSize: "1rem" }}>CKA Cashups</span>
        </Link>

        {/* Desktop Navigation */}
        <div style={{ display: "none" }} className="desktop-nav">
          <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
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
            <span style={{ color: "#666", fontSize: "0.9rem" }}>{user.email}</span>
            <button onClick={signOut} className="btn ghost">
              Sign Out
            </button>
          </div>
        </div>

        {/* Mobile Burger Menu Button */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="mobile-menu-btn"
          style={{
            background: "none",
            border: "none",
            fontSize: "1.5rem",
            cursor: "pointer",
            padding: "0.5rem",
            display: "none"
          }}
          aria-label="Toggle menu"
        >
          {menuOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {menuOpen && (
        <div
          className="mobile-menu"
          style={{
            display: "none",
            flexDirection: "column",
            gap: "0.5rem",
            marginTop: "1rem",
            padding: "1rem",
            background: "#f9f9f9",
            borderRadius: "8px"
          }}
        >
          <Link
            href="/trips"
            className={isActive("/trips") ? "btn" : "btn ghost"}
            style={{ textDecoration: "none", width: "100%" }}
            onClick={() => setMenuOpen(false)}
          >
            My Trips
          </Link>
          {(user.email === "gidslang89@gmail.com" || user.email === "info@kayak.co.za") && (
            <Link
              href="/admin"
              className={isActive("/admin") ? "btn" : "btn ghost"}
              style={{ textDecoration: "none", width: "100%" }}
              onClick={() => setMenuOpen(false)}
            >
              Admin
            </Link>
          )}
          <div style={{ padding: "0.5rem", color: "#666", fontSize: "0.85rem", borderTop: "1px solid #ddd", marginTop: "0.5rem", paddingTop: "0.75rem" }}>
            {user.email}
          </div>
          <button onClick={() => { signOut(); setMenuOpen(false); }} className="btn ghost" style={{ width: "100%" }}>
            Sign Out
          </button>
        </div>
      )}

      <style jsx>{`
        @media (min-width: 769px) {
          .desktop-nav {
            display: block !important;
          }
        }
        @media (max-width: 768px) {
          .mobile-menu-btn {
            display: block !important;
          }
          .mobile-menu {
            display: flex !important;
            margin-left: 0;
            margin-right: 0;
            padding: 0.75rem 5px;
          }
          :global(.main-nav) {
            padding: 0.5rem 5px !important;
          }
        }
      `}</style>
    </nav>
  );
}
