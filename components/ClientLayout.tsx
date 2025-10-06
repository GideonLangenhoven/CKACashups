"use client";
import { ReactNode } from "react";
import { SessionProvider } from "@/lib/session-context";
import { Navigation } from "@/components/Navigation";

export function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <Navigation />
      <main style={{ padding: "1rem" }}>{children}</main>
    </SessionProvider>
  );
}
