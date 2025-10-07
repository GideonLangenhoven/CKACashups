"use client";
import { ReactNode } from "react";
import { SessionProvider } from "@/lib/session-context";
import { Navigation } from "@/components/Navigation";

export function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <Navigation />
      <main style={{ padding: "1rem", width: "100%", maxWidth: "1200px", margin: "0 auto" }}>{children}</main>
    </SessionProvider>
  );
}
