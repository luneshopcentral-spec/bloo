"use client";

import { useState } from "react";
import Link from "next/link";
import { Cross, Menu, Pill, X } from "lucide-react";

const links = [
  { href: "/#features", label: "Features" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#faq", label: "FAQ" },
  { href: "/support", label: "Support" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <nav aria-label="Primary navigation" className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#061513]/95 text-white backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between gap-3 px-4 sm:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-2" onClick={() => setOpen(false)}>
          <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-300 text-[#06201b] shadow-[0_0_24px_rgba(110,231,183,.2)]">
            <Pill className="h-5 w-5 -rotate-45" aria-hidden="true" />
            <Cross className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-[#06201b] p-0.5 text-emerald-300" aria-hidden="true" />
          </span>
          <span className="whitespace-nowrap text-base font-bold tracking-tight text-white sm:text-lg">
            DispenseRx<span className="hidden font-medium text-emerald-300 sm:inline"> Practice</span>
          </span>
        </Link>

        <div className="hidden items-center gap-5 md:flex">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="text-sm font-medium text-slate-300 transition hover:text-white">
              {link.label}
            </Link>
          ))}
          <Link href="/sign-in" className="text-sm font-medium text-slate-200 hover:text-white">Sign in</Link>
          <Link href="/sign-up" className="inline-flex h-9 items-center rounded-full bg-emerald-300 px-5 text-sm font-bold text-[#06201b] transition hover:bg-emerald-200">
            Start free
          </Link>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <Link href="/sign-up" className="inline-flex h-9 items-center rounded-full bg-emerald-300 px-4 text-sm font-bold text-[#06201b] transition hover:bg-emerald-200">
            Start free
          </Link>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="mobile-navigation"
            aria-label={open ? "Close navigation" : "Open navigation"}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/15 text-white hover:bg-white/10"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div id="mobile-navigation" className="border-t border-white/10 bg-[#061513] px-4 py-4 md:hidden">
          <div className="container grid gap-1 px-0">
            {links.map((link) => (
              <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className="rounded-lg px-3 py-3 text-sm font-medium text-slate-200 hover:bg-white/10 hover:text-white">
                {link.label}
              </Link>
            ))}
            <Link href="/sign-in" onClick={() => setOpen(false)} className="rounded-lg px-3 py-3 text-sm font-medium text-slate-200 hover:bg-white/10 hover:text-white">
              Sign in
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
