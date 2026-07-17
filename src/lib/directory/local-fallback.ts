// Bundled copies of the drug, patient and prescriber directories.
//
// The directory modals query Supabase, but a deployment whose database is
// missing rows (a migration not yet applied, or no database at all in local
// dev) would otherwise make cases impossible to complete — case 13 was
// undispensable because its medicines only existed in an unapplied migration.
// Every search merges the bundled library underneath the database results, so
// the simulator always knows its own case data. Database rows win on conflict
// because they carry real row ids.

import { DRUG_LIBRARY, type SeedDrug } from "../../../supabase/seeds/drug-library";
import { ALL_PATIENTS, type SeedPatient } from "../../../supabase/seeds/patient-library";
import { PRESCRIBER_LIBRARY, type SeedPrescriber } from "../../../supabase/seeds/prescriber-library";
import type { DrugRow } from "@/lib/types/drug";
import type { Patient } from "@/lib/types/patient";
import type { Prescriber } from "@/lib/types/prescriber";

function drugRowFromSeed(seed: SeedDrug): DrugRow {
  return {
    id: `local-${seed.seed_id}`,
    created_at: "",
    ...seed,
  };
}

function patientFromSeed(seed: SeedPatient): Patient {
  return {
    id: `local-${seed.seed_id}`,
    ...seed,
  };
}

function prescriberFromSeed(seed: SeedPrescriber): Prescriber {
  return {
    id: `local-${seed.seed_id}`,
    ...seed,
  };
}

function normalise(value: string): string {
  return value.toUpperCase().trim();
}

export function searchLocalDrugs(query: string, limit = 25): DrugRow[] {
  const q = normalise(query.replace(/[^a-zA-Z0-9 ]/g, ""));
  if (!q) return [];
  return DRUG_LIBRARY
    .filter((drug) =>
      drug.generic_name.toUpperCase().startsWith(q) ||
      (drug.brand_name ?? "").toUpperCase().startsWith(q) ||
      drug.full_display_name.toUpperCase().includes(q)
    )
    .sort((a, b) =>
      a.generic_name.localeCompare(b.generic_name) ||
      Number(a.is_generic) - Number(b.is_generic) ||
      (a.brand_name ?? "").localeCompare(b.brand_name ?? "")
    )
    .slice(0, limit)
    .map(drugRowFromSeed);
}

export function searchLocalPatients(surname: string, limit = 25): Patient[] {
  const q = normalise(surname);
  if (!q) return [];
  return ALL_PATIENTS
    .filter((patient) => patient.surname.toUpperCase().startsWith(q))
    .sort((a, b) => a.surname.localeCompare(b.surname) || a.firstname.localeCompare(b.firstname))
    .slice(0, limit)
    .map(patientFromSeed);
}

export function searchLocalPrescribers(query: string, limit = 30): Prescriber[] {
  const q = normalise(query.replace(/[^a-zA-Z0-9 '-]/g, ""));
  const matches = q
    ? PRESCRIBER_LIBRARY.filter((prescriber) =>
        prescriber.surname.toUpperCase().startsWith(q) ||
        prescriber.firstname.toUpperCase().startsWith(q) ||
        prescriber.practice_name.toUpperCase().includes(q) ||
        prescriber.prescriber_number.startsWith(q)
      )
    : PRESCRIBER_LIBRARY;
  return matches
    .slice()
    .sort((a, b) => a.surname.localeCompare(b.surname) || a.firstname.localeCompare(b.firstname))
    .slice(0, limit)
    .map(prescriberFromSeed);
}

export function findLocalDrugBySeedId(seedId: string): DrugRow | null {
  const seed = DRUG_LIBRARY.find((drug) => drug.seed_id === seedId);
  return seed ? drugRowFromSeed(seed) : null;
}

export function findLocalPrescriberByNumber(prescriberNumber: string): Prescriber | null {
  const seed = PRESCRIBER_LIBRARY.find(
    (prescriber) => prescriber.prescriber_number === prescriberNumber
  );
  return seed ? prescriberFromSeed(seed) : null;
}

/**
 * Merge database rows with bundled rows. Database rows win on seed_id conflict;
 * bundled rows fill in anything the database is missing.
 */
export function mergeWithLocal<T extends { seed_id?: string | null }>(
  databaseRows: T[],
  localRows: T[],
  limit: number
): T[] {
  const seen = new Set(
    databaseRows.map((row) => row.seed_id).filter((seedId): seedId is string => Boolean(seedId))
  );
  const merged = [
    ...databaseRows,
    ...localRows.filter((row) => !row.seed_id || !seen.has(row.seed_id)),
  ];
  return merged.slice(0, limit);
}
