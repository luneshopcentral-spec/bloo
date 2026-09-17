"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function AccountSettings({ userId, name, university }: { userId: string; name: string; university: string }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  return <form className="space-y-4" onSubmit={async (event) => {
    event.preventDefault(); setBusy(true); const fields = new FormData(event.currentTarget);
    try {
      const { error } = await createClient().from("profiles").update({ full_name: String(fields.get("name")).trim(), university: String(fields.get("university")).trim() || null }).eq("id", userId);
      setMessage(error ? "Your changes could not be saved. Please retry." : "Profile saved.");
    } catch { setMessage("Connection unavailable. Please retry."); } finally { setBusy(false); }
  }}>
    <label className="block text-sm font-medium">Name<input name="name" required maxLength={120} defaultValue={name} className="mt-1 block w-full rounded-md border p-3" autoComplete="name" /></label>
    <label className="block text-sm font-medium">University or training provider (optional)<input name="university" maxLength={200} defaultValue={university} className="mt-1 block w-full rounded-md border p-3" /></label>
    <button disabled={busy} className="rounded-lg bg-emerald-800 px-4 py-2 text-white">{busy ? "Saving…" : "Save profile"}</button><p role="status" className="text-sm">{message}</p>
  </form>;
}

export function FeedbackForm() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  return <form className="space-y-4" onSubmit={async (event) => {
    event.preventDefault(); const form = event.currentTarget; const values = new FormData(form); setBusy(true);
    try {
      const response = await fetch("/api/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: values.get("kind"), caseId: values.get("case"), message: values.get("message") }) });
      const data = await response.json(); setMessage(response.ok ? "Report saved for the operator to review. This is not an emergency support service." : data.error);
      if (response.ok) form.reset();
    } catch { setMessage("Connection unavailable. Your message has been kept in this form."); } finally { setBusy(false); }
  }}>
    <label className="block text-sm font-medium">Report type<select name="kind" className="mt-1 block w-full rounded-md border p-3"><option value="content">Case content or marking</option><option value="bug">Software problem</option><option value="privacy">Privacy or account deletion request</option><option value="other">Other feedback</option></select></label>
    <label className="block text-sm font-medium">Case number (optional)<input name="case" maxLength={40} className="mt-1 block w-full rounded-md border p-3" /></label>
    <label className="block text-sm font-medium">What happened?<textarea name="message" required minLength={10} maxLength={4000} rows={5} className="mt-1 block w-full rounded-md border p-3" /></label>
    <p className="text-sm text-slate-600">Use fictional training details only. Do not include real patient information. The operator can review your report and account identity.</p>
    <button disabled={busy} className="rounded-lg bg-emerald-800 px-4 py-2 text-white">{busy ? "Sending…" : "Submit report"}</button><p role="status" className="text-sm">{message}</p>
  </form>;
}
