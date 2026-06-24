import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "DispenseRx Practice — Fred Dispense Simulator for Pharmacy Students",
  description:
    "Practise Fred Dispense workflows from home. Realistic PBS dispensing scenarios for Australian pharmacy students. 3 free cases, no card needed.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
