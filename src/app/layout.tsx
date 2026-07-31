import type { Metadata } from "next";
import "./globals.css";
import { SITE_CONFIG } from "@/lib/site-config";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_CONFIG.url),
  title: {
    default: "Australian Dispensing Workflow Practice | DispenseRx Practice",
    template: "%s | DispenseRx Practice",
  },
  description: SITE_CONFIG.description,
  applicationName: SITE_CONFIG.name,
  keywords: [
    "Australian pharmacy student",
    "dispensing practice",
    "pharmacy placement preparation",
    "dispensing simulator",
  ],
  openGraph: {
    type: "website",
    locale: "en_AU",
    siteName: SITE_CONFIG.name,
    title: "Practise Australian dispensing workflows before placement",
    description: SITE_CONFIG.description,
  },
  twitter: {
    card: "summary_large_image",
    title: "Practise Australian dispensing workflows before placement",
    description: SITE_CONFIG.description,
  },
  icons: {
    icon: "/icon",
    apple: "/apple-icon",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
