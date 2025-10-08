import "./globals.css";
import { ReactNode } from "react";
import { ClientLayout } from "@/components/ClientLayout";

export const metadata = {
  title: "CKA Cashups",
  description: "Cash ups tracking and reporting for CKA guides",
  manifest: "/manifest.json",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "CKA Cashups",
  },
  icons: {
    icon: "/wave.png",
    apple: "/wave.png",
  },
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content={process.env.BRAND_PRIMARY || "#0A66C2"} />
        <link rel="apple-touch-icon" href="/wave.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/wave.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/wave.png" />
        <link rel="apple-touch-icon" sizes="167x167" href="/wave.png" />
      </head>
      <body>
        <ClientLayout>{children}</ClientLayout>
        <script dangerouslySetInnerHTML={{__html:`if('serviceWorker' in navigator){window.addEventListener('load',()=>{navigator.serviceWorker.register('/service-worker.js').catch(()=>{});});}`}} />
      </body>
    </html>
  );
}
