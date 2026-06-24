import { ABBREVS } from "@/lib/cases/static-cases";

export function expandAbbrevs(text: string): string {
  if (!text.trim()) return text;
  let result = text.toLowerCase();
  for (const [abbr, full] of Object.entries(ABBREVS)) {
    result = result.replace(new RegExp(`\\b${abbr}\\b`, "gi"), full);
  }
  return result;
}
