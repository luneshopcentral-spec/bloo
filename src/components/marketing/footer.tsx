import Link from "next/link";
import { Pill } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white py-12">
      <div className="container">
        <div className="flex flex-col items-start justify-between gap-8 md:flex-row">
          {/* Brand */}
          <div className="max-w-xs">
            <Link href="/" className="flex items-center gap-2">
              <Pill className="h-5 w-5 text-emerald-600" />
              <span className="font-bold text-slate-900">
                DispenseRx Practice
              </span>
            </Link>
            <p className="mt-3 text-sm text-slate-500">
              An independent study tool for Australian pharmacy students. Not
              affiliated with Fred IT Group Pty Ltd.
            </p>
          </div>

          {/* Links */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                Product
              </p>
              <ul className="space-y-2 text-sm text-slate-600">
                <li>
                  <a href="#features" className="hover:text-slate-900">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="hover:text-slate-900">
                    Pricing
                  </a>
                </li>
                <li>
                  <a href="#faq" className="hover:text-slate-900">
                    FAQ
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                Account
              </p>
              <ul className="space-y-2 text-sm text-slate-600">
                <li>
                  <Link href="/sign-up" className="hover:text-slate-900">
                    Sign up
                  </Link>
                </li>
                <li>
                  <Link href="/sign-in" className="hover:text-slate-900">
                    Sign in
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                Legal
              </p>
              <ul className="space-y-2 text-sm text-slate-600">
                <li>
                  <span className="cursor-default text-slate-400">
                    Privacy Policy
                  </span>
                </li>
                <li>
                  <span className="cursor-default text-slate-400">
                    Terms of Service
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <Separator className="my-8" />

        <div className="flex flex-col items-center justify-between gap-2 text-xs text-slate-400 sm:flex-row">
          <p>
            &copy; {new Date().getFullYear()} DispenseRx Practice. All rights
            reserved.
          </p>
          <p>
            Independent study tool — not affiliated with Fred IT Group Pty Ltd.
          </p>
        </div>
      </div>
    </footer>
  );
}
