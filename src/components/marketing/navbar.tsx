import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Pill } from "lucide-react";

export function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Pill className="h-6 w-6 text-emerald-600" />
          <span className="text-lg font-bold text-slate-900">
            DispenseRx<span className="text-emerald-600"> Practice</span>
          </span>
        </Link>

        <div className="flex items-center gap-4">
          <Link
            href="#features"
            className="hidden text-sm font-medium text-slate-600 hover:text-slate-900 sm:block"
          >
            Features
          </Link>
          <Link
            href="#pricing"
            className="hidden text-sm font-medium text-slate-600 hover:text-slate-900 sm:block"
          >
            Pricing
          </Link>
          <Link
            href="#faq"
            className="hidden text-sm font-medium text-slate-600 hover:text-slate-900 sm:block"
          >
            FAQ
          </Link>
          <Button variant="outline" size="sm" asChild>
            <Link href="/sign-in">Sign in</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/sign-up">Start free trial</Link>
          </Button>
        </div>
      </div>
    </nav>
  );
}
