import type { WarningLabel } from "@/lib/types/case";

export function normalizeWarningLabel(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function resolveWarningLabelInput(
  warnings: WarningLabel[],
  input: string
): WarningLabel | null {
  const normalized = normalizeWarningLabel(input);
  if (!normalized) return null;

  return warnings.find((warning) => {
    const candidates = [warning.text, warning.lbl, warning.sig, ...(warning.aliases ?? [])];
    return candidates.some((candidate) => normalizeWarningLabel(candidate) === normalized);
  }) ?? null;
}
