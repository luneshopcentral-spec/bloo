import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DispenseRx Practice — Fred-style Simulator for Pharmacy Students",
  description:
    "Laptop-first Fred-style dispensing practice for Australian pharmacy students — realistic PBS scenarios, critical-safety feedback and simulated patient counselling.",
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
