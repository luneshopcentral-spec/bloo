import { DRUG_LIBRARY, type SeedDrug } from "../../../supabase/seeds/drug-library";
import type { PracticeCase } from "@/lib/types/case";
import type { DispenseResult } from "@/lib/scoring/types";
import {
  addPackAssemblyChecks,
  CASE1_CORRECT_PACK_ID,
  CASE1_PACK_OPTIONS,
  type AssemblySubmission,
  type Case1AssemblySubmission,
  type MedicinePackOption,
} from "./case1";

export function emptyAssemblyItem(): Case1AssemblySubmission {
  return { packId: "", mainLabelPlacement: null, warningLabels: [], warningPlacements: {} };
}

export function assemblyItems(value: AssemblySubmission | Case1AssemblySubmission | null | undefined): Case1AssemblySubmission[] {
  if (!value) return [];
  return "items" in value ? value.items : [value];
}

function packOption(drug: SeedDrug, colour: MedicinePackOption["colour"]): MedicinePackOption {
  return {
    id: drug.seed_id,
    brand: drug.brand_name ?? drug.manufacturer_full ?? "Generic",
    generic: drug.generic_name,
    strength: drug.strength,
    form: drug.form,
    packSize: drug.pack_size,
    colour,
  };
}

/** Options come from the same bundled product directory used by dispensing. */
export function packOptionsFor(caseData: PracticeCase, itemIndex: number): MedicinePackOption[] {
  if (caseData.id === "case-1") return CASE1_PACK_OPTIONS;
  const item = caseData.items[itemIndex];
  if (!item) return [];
  const correct = DRUG_LIBRARY.find((drug) => drug.seed_id === item.correctDrugSeedId);
  if (!correct) return [];
  const sameMedicine = DRUG_LIBRARY.filter((drug) => drug.seed_id !== correct.seed_id && drug.generic_name === correct.generic_name);
  const differentMedicine = DRUG_LIBRARY.filter((drug) => drug.generic_name !== correct.generic_name && drug.form === correct.form)
    .sort((a, b) => Number(b.strength === correct.strength) - Number(a.strength === correct.strength));
  const candidates = [correct, ...sameMedicine.slice(0, 3), ...differentMedicine.slice(0, 2)]
    .filter((drug, index, all) => all.findIndex((entry) => entry.seed_id === drug.seed_id) === index)
    .slice(0, 5);
  const colours: MedicinePackOption["colour"][] = ["blue", "coral", "green", "purple", "amber"];
  return candidates.map((drug, index) => packOption(drug, colours[index]));
}

export function correctPackIdFor(caseData: PracticeCase, itemIndex: number): string {
  return caseData.id === "case-1" ? CASE1_CORRECT_PACK_ID : caseData.items[itemIndex].correctDrugSeedId;
}

export function addAssemblyChecks(
  result: DispenseResult,
  caseData: PracticeCase,
  submission: AssemblySubmission | Case1AssemblySubmission | null | undefined,
  selectedWarnings?: string[][]
): DispenseResult {
  const items = assemblyItems(submission);
  return caseData.items.reduce((current, _item, itemIndex) => addPackAssemblyChecks(
    current,
    items[itemIndex] ?? emptyAssemblyItem(),
    correctPackIdFor(caseData, itemIndex),
    packOptionsFor(caseData, itemIndex),
    caseData.items.length > 1 ? itemIndex : undefined,
    selectedWarnings?.[itemIndex]
  ), result);
}
