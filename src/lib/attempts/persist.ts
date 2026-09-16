import type { AttemptSubmission } from "./grade";
import type { AttemptResult } from "@/lib/conversation/types";
export async function persistCompletedAttempt(input: AttemptSubmission): Promise<{ saved: boolean; result?: AttemptResult; message?: string }> {
  try {
    const response = await fetch("/api/attempts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
    const data = await response.json();
    return response.ok ? data : { saved: false, message: data.error ?? "Progress could not be saved." };
  } catch {
    return { saved: false, message: "You appear to be offline. Your attempt is queued on this device." };
  }
}
