import { DRUG_LIBRARY } from "../../../supabase/seeds/drug-library";
import type { MedicinePackOption } from "./case1";

/** What a carton prints. Every product row — bundled library or directory — has these. */
export interface ShelfProduct {
  seed_id: string;
  generic_name: string;
  brand_name: string | null;
  manufacturer_full: string | null;
  strength: string;
  form: string;
  pack_size: string;
}

/**
 * Physical stock beside the directory products: erythromycin lookalikes that
 * differ by strength and form, kept from the original Case 1 shelf.
 */
const SHELF_EXTRAS: ShelfProduct[] = [
  { seed_id: "erythromycin-mayne-500-tab-20", generic_name: "ERYTHROMYCIN", brand_name: "MAYNE PHARMA", manufacturer_full: null, strength: "500MG", form: "TAB", pack_size: "20" },
  { seed_id: "erythromycin-250-suspension-100", generic_name: "ERYTHROMYCIN", brand_name: "ERYTHROCARE", manufacturer_full: null, strength: "250MG/5ML", form: "SUSP", pack_size: "100mL" },
];

const SHELF: ShelfProduct[] = [...DRUG_LIBRARY, ...SHELF_EXTRAS];

/** Pack ids saved by the original hand-made Case 1 shelf. */
const LEGACY_PACK_IDS: Record<string, string> = {
  "erythromycin-mayne-250-cap-25": "erythromycin-mayne-cap-250",
  "erythromycin-generic-250-cap-25": "erythromycin-base-cap-250",
};

export function currentPackId(id: string): string {
  return LEGACY_PACK_IDS[id] ?? id;
}

const FORMS: Record<string, { name: string; one: string; many: string }> = {
  CAP: { name: "Capsules", one: "capsule", many: "capsules" },
  TAB: { name: "Tablets", one: "tablet", many: "tablets" },
  "MR TAB": { name: "Modified-release tablets", one: "tablet", many: "tablets" },
  "ER TAB": { name: "Extended-release tablets", one: "tablet", many: "tablets" },
  "SR TAB": { name: "Sustained-release tablets", one: "tablet", many: "tablets" },
  SUSP: { name: "Oral suspension", one: "bottle", many: "bottles" },
  PATCH: { name: "Transdermal patches", one: "patch", many: "patches" },
};

const COLOURS: MedicinePackOption["colour"][] = ["blue", "coral", "green", "purple", "amber"];

/** FNV-1a: a stable, well-spread order without randomness. */
function hash(value: string): number {
  let result = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 0x01000193) >>> 0;
  }
  return result;
}

/** "MAYNE PHARMA" → "Mayne Pharma"; short codes such as "AN" and "APO" stay as printed. */
function titleCase(value: string): string {
  return value.split(/(\s+|-)/).map((word) =>
    /^[A-Z]{2,3}$/.test(word) ? word : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join("");
}

function strengthLabel(strength: string): string {
  return strength
    .replace(/(\d)([A-Z])/gi, "$1 $2")
    .replace(/\bMCG\b/gi, "mcg").replace(/\bMG\b/gi, "mg").replace(/\bML\b/gi, "mL")
    .replace(/\/H\b/i, "/h");
}

function packSizeLabel(size: string, form: string): string {
  const volume = /^(\d+(?:\.\d+)?)\s*ml$/i.exec(size.trim());
  if (volume) return `${volume[1]} mL`;
  const count = Number(size);
  const units = FORMS[form];
  return units && Number.isFinite(count) ? `${count} ${count === 1 ? units.one : units.many}` : size;
}

export function packFromProduct(product: ShelfProduct): MedicinePackOption {
  const maker = product.manufacturer_full?.replace(/\s+pty\.?(?:\s+ltd\.?)?$|\s+ltd\.?$/i, "");
  return {
    id: product.seed_id,
    brand: titleCase(product.brand_name ?? maker ?? "Generic"),
    generic: titleCase(product.generic_name),
    strength: strengthLabel(product.strength),
    form: FORMS[product.form]?.name ?? titleCase(product.form),
    packSize: packSizeLabel(product.pack_size, product.form),
    colour: COLOURS[hash(product.seed_id) % COLOURS.length],
  };
}

export function shelfProductById(id: string): ShelfProduct | undefined {
  const current = currentPackId(id);
  return SHELF.find((product) => product.seed_id === current);
}

let everyPack: MedicinePackOption[] | null = null;
/** Every carton the shelf can hold, for describing any submitted pack. */
export function allPacks(): MedicinePackOption[] {
  everyPack ??= SHELF.map(packFromProduct);
  return everyPack;
}

/**
 * The shelf around the product the student dispensed: that product and the
 * lookalikes it could be confused with. It is built only from the student's
 * own choice — never from the case answer — so it gives nothing away: a wrong
 * product brings its own carton and its own lookalikes.
 */
export function shelfAround(dispensed: ShelfProduct): MedicinePackOption[] {
  const order = (product: ShelfProduct) => hash(`${dispensed.seed_id}:${product.seed_id}`);
  const others = SHELF.filter((product) => product.seed_id !== dispensed.seed_id);
  // A different strength or form is the more dangerous lookalike, so it comes first.
  const differsInUse = (product: ShelfProduct) => Number(product.strength !== dispensed.strength || product.form !== dispensed.form);
  const sameMedicine = others
    .filter((product) => product.generic_name === dispensed.generic_name)
    .sort((a, b) => differsInUse(b) - differsInUse(a) || order(a) - order(b));
  const otherMedicine = others
    .filter((product) => product.generic_name !== dispensed.generic_name && product.form === dispensed.form)
    .sort((a, b) => Number(b.strength === dispensed.strength) - Number(a.strength === dispensed.strength) || order(a) - order(b));
  // The dispensed product may come from the directory rather than the bundled
  // library; it still goes on the shelf, exactly once.
  return [dispensed, ...sameMedicine.slice(0, 3), ...otherMedicine.slice(0, 2)]
    .slice(0, 5)
    .sort((a, b) => order(a) - order(b))
    .map(packFromProduct);
}
