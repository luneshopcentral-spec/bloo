"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminPost } from "@/lib/admin/client-api";
import type { AdminSettings } from "@/lib/admin/settings";

function Toggle({
  label,
  description,
  value,
  onChange,
  disabled,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-4 last:border-0">
      <div>
        <p className="font-medium">{label}</p>
        <p className="text-sm text-slate-600">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-label={label}
        disabled={disabled}
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={`relative mt-1 h-6 w-11 shrink-0 rounded-full transition ${value ? "bg-slate-900" : "bg-slate-300"}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${value ? "left-[22px]" : "left-0.5"}`} />
      </button>
    </div>
  );
}

export function SettingsForm({ settings }: { settings: AdminSettings }) {
  const router = useRouter();
  const [state, setState] = useState(settings);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [saving, setSaving] = useState(false);

  async function save(key: keyof AdminSettings, value: boolean | string) {
    setSaving(true);
    setMessage(null);
    const result = await adminPost("/api/admin/settings", { key, value });
    setSaving(false);
    if (result.ok) {
      setState((prev) => ({ ...prev, [key]: value }));
      setMessage({ text: "Saved.", ok: true });
      router.refresh();
    } else {
      setMessage({ text: result.error ?? "Save failed", ok: false });
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">Platform controls</h2>
        {message && <span role="status" className={`text-sm ${message.ok ? "text-emerald-700" : "text-red-600"}`}>{message.text}</span>}
      </div>

      <div className="mt-2">
        <Toggle
          label="Maintenance mode"
          description="Non-admin users see a maintenance notice instead of the app. Admins are unaffected."
          value={state.maintenance_mode}
          disabled={saving}
          onChange={(value) => save("maintenance_mode", value)}
        />
      </div>

      <div className="mt-4">
        <label htmlFor="maintenance-message" className="mb-1 block text-sm font-medium">Maintenance message</label>
        <div className="flex gap-2">
          <Input
            id="maintenance-message"
            disabled={saving}
            value={state.maintenance_message}
            onChange={(event) => setState((prev) => ({ ...prev, maintenance_message: event.target.value }))}
            maxLength={500}
          />
          <Button
            variant="outline"
            disabled={saving || !state.maintenance_message.trim()}
            onClick={() => save("maintenance_message", state.maintenance_message)}
          >
            Save
          </Button>
        </div>
      </div>
    </section>
  );
}
