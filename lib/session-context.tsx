"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { SessionUser } from "./auth";
import { csrfFetch } from "@/lib/client/csrfFetch";

interface SessionContextType {
  user: SessionUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSession = async () => {
    try {
      const res = await fetch("/api/auth/session");
      const data = await res.json();
      setUser(data.user || null);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await csrfFetch("/api/auth/signout", { method: "POST" });
      // Clear any cached form data from localStorage
      localStorage.removeItem('cashup-draft');
      setUser(null);
      window.location.href = "/auth/signin";
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  const refreshSession = async () => {
    setLoading(true);
    await fetchSession();
  };

  useEffect(() => {
    fetchSession();
  }, []);

  return (
    <SessionContext.Provider value={{ user, loading, signOut, refreshSession }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
}
