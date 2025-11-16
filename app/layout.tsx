import "./globals.css";
import { ReactNode } from "react";
import { ClientLayout } from "@/components/ClientLayout";

export const metadata = {
  title: "CKA Cashups",
  description: "Cash ups tracking and reporting for CKA guides",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "CKA Cashups",
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
  icons: {
    icon: "/CKAlogo.png",
    apple: "/CKAlogo.png",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content={process.env.BRAND_PRIMARY || "#0A66C2"} />
        <link rel="apple-touch-icon" href="/CKAlogo.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/CKAlogo.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/CKAlogo.png" />
        <link rel="apple-touch-icon" sizes="167x167" href="/CKAlogo.png" />
      </head>
      <body>
        <ClientLayout>{children}</ClientLayout>
        <script dangerouslySetInnerHTML={{__html:`if('serviceWorker' in navigator){window.addEventListener('load',()=>{navigator.serviceWorker.register('/service-worker.js').catch(()=>{});});}`}} />
      </body>
    </html>
  );
}
