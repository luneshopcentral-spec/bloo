import type { PracticeCase } from "@/lib/types/case";
import type { DispenseResult } from "@/lib/scoring/types";
import {
  addPackAssemblyChecks,
  type AssemblySubmission,
  type Case1AssemblySubmission,
  type MedicinePackOption,
} from "./case1";
import { allPacks, currentPackId, shelfAround, shelfProductById, type ShelfProduct } from "./packs";

export function emptyAssemblyItem(): Case1AssemblySubmission {
  return { packId: "", mainLabelPlacement: null, warningLabels: [], warningPlacements: {} };
}

export function assemblyItems(value: AssemblySubmission | Case1AssemblySubmission | null | undefined): Case1AssemblySubmission[] {
  if (!value) return [];
  return "items" in value ? value.items : [value];
}

/**
 * The shelf for one prescribed item, built around the product the student
 * dispensed — so picking the wrong medicine puts the wrong carton on the
 * bench, as it would in a real pharmacy. Only a draft saved without a
 * dispensed product falls back to the prescription.
 */
export function packOptionsFor(caseData: PracticeCase, itemIndex: number, dispensed?: ShelfProduct | null): MedicinePackOption[] {
  const item = caseData.items[itemIndex];
  if (!item) return [];
  const centre = dispensed ?? shelfProductById(item.correctDrugSeedId);
  return centre ? shelfAround(centre) : [];
}

export function correctPackIdFor(caseData: PracticeCase, itemIndex: number): string {
  return caseData.items[itemIndex].correctDrugSeedId;
}

export function addAssemblyChecks(
  result: DispenseResult,
  caseData: PracticeCase,
  submission: AssemblySubmission | Case1AssemblySubmission | null | undefined,
  selectedWarnings?: string[][]
): DispenseResult {
  const items = assemblyItems(submission);
  return caseData.items.reduce((current, _item, itemIndex) => {
    const item = items[itemIndex] ?? emptyAssemblyItem();
    return addPackAssemblyChecks(
      current,
      { ...item, packId: currentPackId(item.packId) },
      correctPackIdFor(caseData, itemIndex),
      allPacks(),
      caseData.items.length > 1 ? itemIndex : undefined,
      selectedWarnings?.[itemIndex]
    );
  }, result);
}
