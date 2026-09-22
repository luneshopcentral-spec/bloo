"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";

export interface ActiveAnnouncement {
  id: string;
  title: string;
  body: string;
  level: string;
}

const STYLE: Record<string, string> = {
  info: "bg-blue-50 text-blue-900 border-blue-200",
  success: "bg-emerald-50 text-emerald-900 border-emerald-200",
  warning: "bg-amber-50 text-amber-900 border-amber-200",
  critical: "bg-red-50 text-red-900 border-red-200",
};

const STORAGE_KEY = "dismissed-announcements";

export function AnnouncementBanner({ announcements }: { announcements: ActiveAnnouncement[] }) {
  const pathname = usePathname();
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      setDismissed(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
      setDismissed([]);
    }
    setReady(true);
  }, []);

  function dismiss(id: string) {
    const next = [...new Set([...dismissed, id])];
    setDismissed(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Per-viewer convenience only; safe to ignore storage failures.
    }
  }

  if (!ready) return null;
  // The simulator is a fixed 100vh surface with its own chrome; a banner above it
  // would push the action bar off-screen. Suppress it there (like the app nav).
  if (pathname === "/practice") return null;
  const visible = announcements.filter((a) => !dismissed.includes(a.id));
  if (visible.length === 0) return null;

  return (
    <div className="space-y-px">
      {visible.map((a) => (
        <div key={a.id} className={`border-b px-4 py-3 text-sm ${STYLE[a.level] ?? STYLE.info}`}>
          <div className="mx-auto flex max-w-6xl items-start gap-3">
            <div className="flex-1">
              <span className="font-semibold">{a.title}</span>{" "}
              <span className="opacity-90">{a.body}</span>
            </div>
            <button
              onClick={() => dismiss(a.id)}
              aria-label="Dismiss announcement"
              className="shrink-0 rounded p-0.5 opacity-60 hover:opacity-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
