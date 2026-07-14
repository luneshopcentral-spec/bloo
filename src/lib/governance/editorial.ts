import { STATIC_CASES } from "@/lib/cases/static-cases";

export type EditorialApprovalStatus = "review_required" | "approved";

export interface CaseEditorialRecord {
  caseId: string;
  version: string;
  jurisdiction: string;
  contentUpdatedAt: string;
  nextReviewDue: string;
  clinicalReview: {
    status: EditorialApprovalStatus;
    reviewer: string | null;
    reviewedAt: string | null;
  };
  legalReview: {
    status: EditorialApprovalStatus;
    reviewer: string | null;
    reviewedAt: string | null;
  };
  references: Array<{
    title: string;
    url: string;
    sourceVersion: string;
  }>;
}

const CONTENT_DATE = "2026-07-15";
const DRAFT_REVIEW = {
  status: "review_required" as const,
  reviewer: null,
  reviewedAt: null,
};

const CASE_REFERENCES: Record<string, CaseEditorialRecord["references"]> = {
  "case-1": [
    { title: "TGA PI/CMI repository — erythromycin", url: "https://www.ebs.tga.gov.au/ebs/picmi/picmirepository.nsf/PICMI?OpenForm=&q=erythromycin", sourceVersion: "checked 2026-07-15" },
    { title: "PBS item 1404X", url: "https://www.pbs.gov.au/medicine/item/1404X", sourceVersion: "checked 2026-07-15" },
  ],
  "case-2": [
    { title: "TGA PI/CMI repository — Coumadin", url: "https://www.ebs.tga.gov.au/ebs/picmi/picmirepository.nsf/PICMI?OpenForm=&q=Coumadin", sourceVersion: "checked 2026-07-15" },
    { title: "PBS warfarin 5 mg listing", url: "https://www.pbs.gov.au/medicine/item/2211J-2843P-2844Q", sourceVersion: "checked 2026-07-15" },
  ],
  "case-3": [
    { title: "TGA PI/CMI repository — amoxicillin", url: "https://www.ebs.tga.gov.au/ebs/picmi/picmirepository.nsf/PICMI?OpenForm=&q=amoxicillin", sourceVersion: "checked 2026-07-15" },
    { title: "PBS amoxicillin 250 mg/5 mL listing", url: "https://www.pbs.gov.au/medicine/item/3393N", sourceVersion: "checked 2026-07-15" },
  ],
  "case-4": [
    { title: "TGA PI/CMI repository — Temtabs", url: "https://www.ebs.tga.gov.au/ebs/picmi/picmirepository.nsf/PICMI?OpenForm=&q=Temtabs", sourceVersion: "checked 2026-07-15" },
    { title: "Victoria SafeScript monitored medicines", url: "https://www.health.vic.gov.au/drugs-and-poisons/medicines-monitored-in-safescript", sourceVersion: "updated 2026-02-11; checked 2026-07-15" },
    { title: "Victoria SafeScript professional requirements", url: "https://www.health.vic.gov.au/safescript/safescript-for-prescribers-and-pharmacists", sourceVersion: "updated 2026-05-11; checked 2026-07-15" },
  ],
  "case-5": [
    { title: "TGA PI/CMI repository — metformin", url: "https://www.ebs.tga.gov.au/ebs/picmi/picmirepository.nsf/PICMI?OpenForm=&q=metformin", sourceVersion: "checked 2026-07-15" },
    { title: "PBS medicine search — metformin", url: "https://www.pbs.gov.au/pbs/search?search-type=medicines&term=metformin", sourceVersion: "checked 2026-07-15" },
  ],
  "case-6": [
    { title: "TGA PI repository — doxycycline", url: "https://www.ebs.tga.gov.au/ebs/picmi/picmirepository.nsf/PICMI?OpenForm=&q=doxycycline&t=pi", sourceVersion: "last updated 2025-07-28; checked 2026-07-15" },
    { title: "PBS medicine search — doxycycline", url: "https://www.pbs.gov.au/pbs/search?search-type=medicines&term=doxycycline", sourceVersion: "checked 2026-07-15" },
  ],
};

export const CASE_EDITORIAL_RECORDS: CaseEditorialRecord[] = STATIC_CASES.map((caseData) => ({
  caseId: caseData.id,
  version: "0.3.0-draft",
  jurisdiction: "Victoria, Australia",
  contentUpdatedAt: CONTENT_DATE,
  nextReviewDue: "Before paid release or any source change",
  clinicalReview: { ...DRAFT_REVIEW },
  legalReview: { ...DRAFT_REVIEW },
  references: CASE_REFERENCES[caseData.id] ?? [],
}));

export function getCaseEditorialRecord(caseId: string): CaseEditorialRecord {
  const record = CASE_EDITORIAL_RECORDS.find((candidate) => candidate.caseId === caseId);
  if (!record) throw new Error(`Missing editorial record for ${caseId}`);
  return record;
}

export function getPaidReleaseReadiness(): {
  ready: boolean;
  blockers: string[];
} {
  const blockers = CASE_EDITORIAL_RECORDS.flatMap((record) => {
    const caseBlockers: string[] = [];
    if (record.references.length === 0) caseBlockers.push(`${record.caseId}: no references`);
    if (record.clinicalReview.status !== "approved") caseBlockers.push(`${record.caseId}: pharmacist clinical review required`);
    if (record.legalReview.status !== "approved") caseBlockers.push(`${record.caseId}: legal/jurisdiction review required`);
    return caseBlockers;
  });

  return { ready: blockers.length === 0, blockers };
}
