"use client";

/** POST JSON to an admin API route and return {ok, error}. Centralises error
 * handling so every admin form behaves the same way. */
export async function adminPost(
  url: string,
  body: unknown
): Promise<{ ok: boolean; error?: string; data?: unknown }> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return { ok: false, error: (data as { error?: string }).error ?? "Request failed" };
    return { ok: true, data };
  } catch {
    return { ok: false, error: "Network error" };
  }
}
