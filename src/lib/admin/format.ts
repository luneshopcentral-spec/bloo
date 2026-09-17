// Shared, dependency-free formatting for the admin portal. Dates render in the
// Sydney time consistently on server and browser, avoiding hydration drift.
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return "—";
  return new Date(ms).toLocaleDateString("en-AU", { timeZone: "Australia/Sydney", day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return "—";
  return new Date(ms).toLocaleString("en-AU", {
    timeZone: "Australia/Sydney",
    timeZoneName: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function isFuture(iso: string | null | undefined): boolean {
  if (!iso) return false;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) && ms > Date.now();
}
