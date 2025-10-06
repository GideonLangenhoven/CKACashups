import "./globals.css";
import { ReactNode } from "react";
import { ClientLayout } from "@/components/ClientLayout";

export const metadata = {
  title: "CSK Cash Ups",
  description: "Cash ups tracking and reporting",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content={process.env.BRAND_PRIMARY || "#0A66C2"} />
      </head>
      <body>
        <ClientLayout>{children}</ClientLayout>
        <script dangerouslySetInnerHTML={{__html:`if('serviceWorker' in navigator){window.addEventListener('load',()=>{navigator.serviceWorker.register('/service-worker.js').catch(()=>{});});}`}} />
      </body>
    </html>
  );
}
