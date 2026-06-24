import Link from "next/link";
import { Pill } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
        <Link
          href="/"
          className="mb-8 flex items-center gap-2 text-slate-900 hover:opacity-80"
        >
          <Pill className="h-7 w-7 text-emerald-600" />
          <span className="text-xl font-bold">
            DispenseRx<span className="text-emerald-600"> Practice</span>
          </span>
        </Link>
        {children}
      </div>
    </div>
  );
}
