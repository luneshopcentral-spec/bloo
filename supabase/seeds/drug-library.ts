// All drug data is fictional/representative for dispensing practice only.
// Prices and PBS codes are approximate — not for real clinical use.

export interface SeedDrug {
  seed_id: string;
  generic_name: string;
  brand_name: string | null;
  full_display_name: string;
  form: string;
  strength: string;
  pack_size: string;
  qty_default: number;
  repeats_default: number;
  supply_type: string;   // "NHS" | "Private"
  schedule: string | null;
  pbs_code: string | null;
  ws_cost: number | null;
  retail_price: number | null;
  manufacturer_code: string | null;
  manufacturer_full: string | null;
  is_generic: boolean;
  cmi_available: boolean;
}

function d(o: SeedDrug): SeedDrug { return o; }

// ── GROUP 1: ERYTHROMYCIN (Case 1 correct = erythromycin-mayne-cap-250) ────────

const ERYTHROMYCIN: SeedDrug[] = [
  d({ seed_id: "erythromycin-mayne-cap-250", generic_name: "ERYTHROMYCIN", brand_name: "MAYNE PHARMA",
      full_display_name: "ERYTHROMYCIN (MAYNE PHARMA) CAP 250MG",
      form: "CAP", strength: "250MG", pack_size: "25", qty_default: 25, repeats_default: 1,
      supply_type: "NHS", schedule: "S4", pbs_code: "1404X", ws_cost: 4.78, retail_price: 15.34,
      manufacturer_code: "MP", manufacturer_full: "Mayne Products Pty Ltd", is_generic: false, cmi_available: true }),
  d({ seed_id: "erythromycin-an-cap-250", generic_name: "ERYTHROMYCIN", brand_name: "AN",
      full_display_name: "ERYTHROMYCIN (AN) CAP 250MG",
      form: "CAP", strength: "250MG", pack_size: "25", qty_default: 25, repeats_default: 1,
      supply_type: "NHS", schedule: "S4", pbs_code: "1404X", ws_cost: 3.90, retail_price: 13.01,
      manufacturer_code: "EA", manufacturer_full: "Alphapharm Pty Ltd", is_generic: false, cmi_available: true }),
  d({ seed_id: "erythromycin-apo-cap-250", generic_name: "ERYTHROMYCIN", brand_name: "APO",
      full_display_name: "ERYTHROMYCIN (APO) CAP 250MG",
      form: "CAP", strength: "250MG", pack_size: "25", qty_default: 25, repeats_default: 1,
      supply_type: "NHS", schedule: "S4", pbs_code: "1404X", ws_cost: 3.80, retail_price: 13.01,
      manufacturer_code: "TX", manufacturer_full: "Apotex Pty Ltd", is_generic: false, cmi_available: true }),
  d({ seed_id: "erythromycin-erymax-cap-250", generic_name: "ERYTHROMYCIN", brand_name: "ERYMAX",
      full_display_name: "ERYMAX CAP 250MG",
      form: "CAP", strength: "250MG", pack_size: "25", qty_default: 25, repeats_default: 1,
      supply_type: "NHS", schedule: "S4", pbs_code: "1404X", ws_cost: 8.50, retail_price: 19.50,
      manufacturer_code: "EA", manufacturer_full: "Alphapharm Pty Ltd", is_generic: false, cmi_available: true }),
  d({ seed_id: "erythromycin-eryc-cap-250", generic_name: "ERYTHROMYCIN", brand_name: "ERYC",
      full_display_name: "ERYC CAP 250MG",
      form: "CAP", strength: "250MG", pack_size: "25", qty_default: 25, repeats_default: 1,
      supply_type: "NHS", schedule: "S4", pbs_code: "1404X", ws_cost: 8.20, retail_price: 18.80,
      manufacturer_code: "PF", manufacturer_full: "Pfizer Australia Pty Ltd", is_generic: false, cmi_available: true }),
  d({ seed_id: "erythromycin-base-cap-250", generic_name: "ERYTHROMYCIN", brand_name: null,
      full_display_name: "ERYTHROMYCIN CAP 250MG",
      form: "CAP", strength: "250MG", pack_size: "25", qty_default: 25, repeats_default: 1,
      supply_type: "NHS", schedule: "S4", pbs_code: "1404X", ws_cost: 3.50, retail_price: 12.50,
      manufacturer_code: "GN", manufacturer_full: "Generic Health Pty Ltd", is_generic: true, cmi_available: true }),
];

// ── GROUP 2: WARFARIN (Case 2 correct = warfarin-coumadin-tab-5) ────────────────

const WARFARIN: SeedDrug[] = [
  d({ seed_id: "warfarin-coumadin-tab-5", generic_name: "WARFARIN", brand_name: "COUMADIN",
      full_display_name: "WARFARIN (COUMADIN) TAB 5MG",
      form: "TAB", strength: "5MG", pack_size: "50", qty_default: 30, repeats_default: 0,
      supply_type: "NHS", schedule: "S4", pbs_code: "1055C", ws_cost: 3.20, retail_price: 6.50,
      manufacturer_code: "PF", manufacturer_full: "Pfizer Australia Pty Ltd", is_generic: false, cmi_available: true }),
  d({ seed_id: "warfarin-marevan-tab-5", generic_name: "WARFARIN", brand_name: "MAREVAN",
      full_display_name: "WARFARIN (MAREVAN) TAB 5MG",
      form: "TAB", strength: "5MG", pack_size: "50", qty_default: 30, repeats_default: 0,
      supply_type: "NHS", schedule: "S4", pbs_code: "1055C", ws_cost: 3.00, retail_price: 6.50,
      manufacturer_code: "AS", manufacturer_full: "Aspen Pharmacare Australia", is_generic: false, cmi_available: true }),
  d({ seed_id: "warfarin-sandoz-tab-5", generic_name: "WARFARIN", brand_name: "SANDOZ",
      full_display_name: "WARFARIN (SANDOZ) TAB 5MG",
      form: "TAB", strength: "5MG", pack_size: "50", qty_default: 30, repeats_default: 0,
      supply_type: "NHS", schedule: "S4", pbs_code: "1055C", ws_cost: 2.80, retail_price: 6.50,
      manufacturer_code: "SZ", manufacturer_full: "Sandoz Pty Ltd", is_generic: false, cmi_available: true }),
  d({ seed_id: "warfarin-apo-tab-5", generic_name: "WARFARIN", brand_name: "APO",
      full_display_name: "WARFARIN (APO) TAB 5MG",
      form: "TAB", strength: "5MG", pack_size: "50", qty_default: 30, repeats_default: 0,
      supply_type: "NHS", schedule: "S4", pbs_code: "1055C", ws_cost: 2.70, retail_price: 6.50,
      manufacturer_code: "TX", manufacturer_full: "Apotex Pty Ltd", is_generic: false, cmi_available: true }),
  d({ seed_id: "warfarin-base-tab-5", generic_name: "WARFARIN", brand_name: null,
      full_display_name: "WARFARIN TAB 5MG",
      form: "TAB", strength: "5MG", pack_size: "50", qty_default: 30, repeats_default: 0,
      supply_type: "NHS", schedule: "S4", pbs_code: "1055C", ws_cost: 2.50, retail_price: 6.50,
      manufacturer_code: "GN", manufacturer_full: "Generic Health Pty Ltd", is_generic: true, cmi_available: true }),
];

// ── GROUP 3: AMOXYCILLIN (Case 3 correct = amoxycillin-an-susp-250) ─────────────
// Includes suspension variants (for the paediatric case) + cap variants as decoys,
// mimicking the reference Fred Dispense screenshot with many AMOX entries.

const AMOXYCILLIN: SeedDrug[] = [
  // Suspensions
  d({ seed_id: "amoxycillin-an-susp-250", generic_name: "AMOXYCILLIN", brand_name: "AN",
      full_display_name: "AMOXYCILLIN (AN) SUSP 250MG/5ML",
      form: "SUSP", strength: "250MG/5ML", pack_size: "100mL", qty_default: 100, repeats_default: 0,
      supply_type: "NHS", schedule: "S4", pbs_code: "4244H", ws_cost: 2.10, retail_price: 5.40,
      manufacturer_code: "EA", manufacturer_full: "Alphapharm Pty Ltd", is_generic: false, cmi_available: true }),
  d({ seed_id: "amoxil-susp-250", generic_name: "AMOXYCILLIN", brand_name: "AMOXIL",
      full_display_name: "AMOXIL SUSP 250MG/5ML",
      form: "SUSP", strength: "250MG/5ML", pack_size: "100mL", qty_default: 100, repeats_default: 0,
      supply_type: "NHS", schedule: "S4", pbs_code: "4244H", ws_cost: 4.50, retail_price: 9.80,
      manufacturer_code: "PF", manufacturer_full: "Pfizer Australia Pty Ltd", is_generic: false, cmi_available: true }),
  d({ seed_id: "amoxycillin-apo-susp-250", generic_name: "AMOXYCILLIN", brand_name: "APO",
      full_display_name: "AMOXYCILLIN (APO) SUSP 250MG/5ML",
      form: "SUSP", strength: "250MG/5ML", pack_size: "100mL", qty_default: 100, repeats_default: 0,
      supply_type: "NHS", schedule: "S4", pbs_code: "4244H", ws_cost: 2.00, retail_price: 5.40,
      manufacturer_code: "TX", manufacturer_full: "Apotex Pty Ltd", is_generic: false, cmi_available: true }),
  d({ seed_id: "amoxycillin-sandoz-susp-250", generic_name: "AMOXYCILLIN", brand_name: "SANDOZ",
      full_display_name: "AMOXYCILLIN (SANDOZ) SUSP 250MG/5ML",
      form: "SUSP", strength: "250MG/5ML", pack_size: "100mL", qty_default: 100, repeats_default: 0,
      supply_type: "NHS", schedule: "S4", pbs_code: "4244H", ws_cost: 2.00, retail_price: 5.40,
      manufacturer_code: "SZ", manufacturer_full: "Sandoz Pty Ltd", is_generic: false, cmi_available: true }),
  d({ seed_id: "amoxycillin-base-susp-250", generic_name: "AMOXYCILLIN", brand_name: null,
      full_display_name: "AMOXYCILLIN SUSP 250MG/5ML",
      form: "SUSP", strength: "250MG/5ML", pack_size: "100mL", qty_default: 100, repeats_default: 0,
      supply_type: "NHS", schedule: "S4", pbs_code: "4244H", ws_cost: 1.90, retail_price: 5.40,
      manufacturer_code: "GN", manufacturer_full: "Generic Health Pty Ltd", is_generic: true, cmi_available: true }),
  // Capsule decoys (250mg, 500mg — appear when student types "amox")
  d({ seed_id: "amoxycillin-an-cap-250", generic_name: "AMOXYCILLIN", brand_name: "AN",
      full_display_name: "AMOXYCILLIN (AN) CAP 250MG",
      form: "CAP", strength: "250MG", pack_size: "20", qty_default: 20, repeats_default: 1,
      supply_type: "NHS", schedule: "S4", pbs_code: "3916E", ws_cost: 1.40, retail_price: 4.20,
      manufacturer_code: "EA", manufacturer_full: "Alphapharm Pty Ltd", is_generic: false, cmi_available: true }),
  d({ seed_id: "amoxycillin-apo-cap-250", generic_name: "AMOXYCILLIN", brand_name: "APO",
      full_display_name: "AMOXYCILLIN (APO) CAP 250MG",
      form: "CAP", strength: "250MG", pack_size: "20", qty_default: 20, repeats_default: 1,
      supply_type: "NHS", schedule: "S4", pbs_code: "3916E", ws_cost: 1.35, retail_price: 4.20,
      manufacturer_code: "TX", manufacturer_full: "Apotex Pty Ltd", is_generic: false, cmi_available: true }),
  d({ seed_id: "amoxycillin-an-cap-500", generic_name: "AMOXYCILLIN", brand_name: "AN",
      full_display_name: "AMOXYCILLIN (AN) CAP 500MG",
      form: "CAP", strength: "500MG", pack_size: "20", qty_default: 20, repeats_default: 1,
      supply_type: "NHS", schedule: "S4", pbs_code: "3917F", ws_cost: 2.10, retail_price: 5.40,
      manufacturer_code: "EA", manufacturer_full: "Alphapharm Pty Ltd", is_generic: false, cmi_available: true }),
  d({ seed_id: "amoxycillin-apo-cap-500", generic_name: "AMOXYCILLIN", brand_name: "APO",
      full_display_name: "AMOXYCILLIN (APO) CAP 500MG",
      form: "CAP", strength: "500MG", pack_size: "20", qty_default: 20, repeats_default: 1,
      supply_type: "NHS", schedule: "S4", pbs_code: "3917F", ws_cost: 2.00, retail_price: 5.40,
      manufacturer_code: "TX", manufacturer_full: "Apotex Pty Ltd", is_generic: false, cmi_available: true }),
  d({ seed_id: "amoxycillin-base-cap-500", generic_name: "AMOXYCILLIN", brand_name: null,
      full_display_name: "AMOXYCILLIN CAP 500MG",
      form: "CAP", strength: "500MG", pack_size: "20", qty_default: 20, repeats_default: 1,
      supply_type: "NHS", schedule: "S4", pbs_code: "3917F", ws_cost: 1.80, retail_price: 5.00,
      manufacturer_code: "GN", manufacturer_full: "Generic Health Pty Ltd", is_generic: true, cmi_available: true }),
];

// ── GROUP 4: TEMAZEPAM (Case 4 correct = temazepam-temaze-tab-10) ───────────────
// Temazepam is Schedule 4 and is monitored in SafeScript in Victoria.

const TEMAZEPAM: SeedDrug[] = [
  d({ seed_id: "temazepam-temaze-tab-10", generic_name: "TEMAZEPAM", brand_name: "TEMAZE",
      full_display_name: "TEMAZE TAB 10MG",
      form: "TAB", strength: "10MG", pack_size: "30", qty_default: 30, repeats_default: 0,
      supply_type: "Private", schedule: "S4", pbs_code: null, ws_cost: 8.50, retail_price: 18.00,
      manufacturer_code: "EA", manufacturer_full: "Alphapharm Pty Ltd", is_generic: false, cmi_available: true }),
  d({ seed_id: "temazepam-normison-tab-10", generic_name: "TEMAZEPAM", brand_name: "NORMISON",
      full_display_name: "NORMISON TAB 10MG",
      form: "TAB", strength: "10MG", pack_size: "30", qty_default: 30, repeats_default: 0,
      supply_type: "Private", schedule: "S4", pbs_code: null, ws_cost: 9.00, retail_price: 20.00,
      manufacturer_code: "PF", manufacturer_full: "Pfizer Australia Pty Ltd", is_generic: false, cmi_available: true }),
  d({ seed_id: "temazepam-sandoz-tab-10", generic_name: "TEMAZEPAM", brand_name: "SANDOZ",
      full_display_name: "TEMAZEPAM (SANDOZ) TAB 10MG",
      form: "TAB", strength: "10MG", pack_size: "30", qty_default: 30, repeats_default: 0,
      supply_type: "Private", schedule: "S4", pbs_code: null, ws_cost: 7.50, retail_price: 16.00,
      manufacturer_code: "SZ", manufacturer_full: "Sandoz Pty Ltd", is_generic: false, cmi_available: true }),
  d({ seed_id: "temazepam-apo-tab-10", generic_name: "TEMAZEPAM", brand_name: "APO",
      full_display_name: "TEMAZEPAM (APO) TAB 10MG",
      form: "TAB", strength: "10MG", pack_size: "30", qty_default: 30, repeats_default: 0,
      supply_type: "Private", schedule: "S4", pbs_code: null, ws_cost: 7.00, retail_price: 15.00,
      manufacturer_code: "TX", manufacturer_full: "Apotex Pty Ltd", is_generic: false, cmi_available: true }),
  d({ seed_id: "temazepam-base-tab-10", generic_name: "TEMAZEPAM", brand_name: null,
      full_display_name: "TEMAZEPAM TAB 10MG",
      form: "TAB", strength: "10MG", pack_size: "30", qty_default: 30, repeats_default: 0,
      supply_type: "Private", schedule: "S4", pbs_code: null, ws_cost: 6.50, retail_price: 14.00,
      manufacturer_code: "GN", manufacturer_full: "Generic Health Pty Ltd", is_generic: true, cmi_available: true }),
];

// ── GROUP 5: METFORMIN (Case 5 correct = metformin-an-tab-1000) ─────────────────

const METFORMIN: SeedDrug[] = [
  d({ seed_id: "metformin-an-tab-1000", generic_name: "METFORMIN", brand_name: "AN",
      full_display_name: "METFORMIN (AN) TAB 1000MG",
      form: "TAB", strength: "1000MG", pack_size: "60", qty_default: 60, repeats_default: 5,
      supply_type: "NHS", schedule: "S4", pbs_code: "1162L", ws_cost: 2.80, retail_price: 6.50,
      manufacturer_code: "EA", manufacturer_full: "Alphapharm Pty Ltd", is_generic: false, cmi_available: true }),
  d({ seed_id: "metformin-sandoz-tab-1000", generic_name: "METFORMIN", brand_name: "SANDOZ",
      full_display_name: "METFORMIN (SANDOZ) TAB 1000MG",
      form: "TAB", strength: "1000MG", pack_size: "60", qty_default: 60, repeats_default: 5,
      supply_type: "NHS", schedule: "S4", pbs_code: "1162L", ws_cost: 2.75, retail_price: 6.50,
      manufacturer_code: "SZ", manufacturer_full: "Sandoz Pty Ltd", is_generic: false, cmi_available: true }),
  d({ seed_id: "metformin-apo-tab-1000", generic_name: "METFORMIN", brand_name: "APO",
      full_display_name: "METFORMIN (APO) TAB 1000MG",
      form: "TAB", strength: "1000MG", pack_size: "60", qty_default: 60, repeats_default: 5,
      supply_type: "NHS", schedule: "S4", pbs_code: "1162L", ws_cost: 2.60, retail_price: 6.50,
      manufacturer_code: "TX", manufacturer_full: "Apotex Pty Ltd", is_generic: false, cmi_available: true }),
  d({ seed_id: "diabex-tab-1000", generic_name: "METFORMIN", brand_name: "DIABEX",
      full_display_name: "DIABEX TAB 1000MG",
      form: "TAB", strength: "1000MG", pack_size: "60", qty_default: 60, repeats_default: 5,
      supply_type: "NHS", schedule: "S4", pbs_code: "1162L", ws_cost: 5.50, retail_price: 12.00,
      manufacturer_code: "BE", manufacturer_full: "Bayer Australia Ltd", is_generic: false, cmi_available: true }),
  d({ seed_id: "metformin-an-tab-500", generic_name: "METFORMIN", brand_name: "AN",
      full_display_name: "METFORMIN (AN) TAB 500MG",
      form: "TAB", strength: "500MG", pack_size: "60", qty_default: 60, repeats_default: 5,
      supply_type: "NHS", schedule: "S4", pbs_code: "1162M", ws_cost: 1.80, retail_price: 6.50,
      manufacturer_code: "EA", manufacturer_full: "Alphapharm Pty Ltd", is_generic: false, cmi_available: true }),
  d({ seed_id: "metformin-sandoz-tab-500", generic_name: "METFORMIN", brand_name: "SANDOZ",
      full_display_name: "METFORMIN (SANDOZ) TAB 500MG",
      form: "TAB", strength: "500MG", pack_size: "60", qty_default: 60, repeats_default: 5,
      supply_type: "NHS", schedule: "S4", pbs_code: "1162M", ws_cost: 1.75, retail_price: 6.50,
      manufacturer_code: "SZ", manufacturer_full: "Sandoz Pty Ltd", is_generic: false, cmi_available: true }),
  d({ seed_id: "metformin-base-tab-500", generic_name: "METFORMIN", brand_name: null,
      full_display_name: "METFORMIN TAB 500MG",
      form: "TAB", strength: "500MG", pack_size: "60", qty_default: 60, repeats_default: 5,
      supply_type: "NHS", schedule: "S4", pbs_code: "1162M", ws_cost: 1.60, retail_price: 6.50,
      manufacturer_code: "GN", manufacturer_full: "Generic Health Pty Ltd", is_generic: true, cmi_available: true }),
];

// ── GROUP 6: DOXYCYCLINE (Case 6 correct = doxycycline-an-tab-50) ───────────────

const DOXYCYCLINE: SeedDrug[] = [
  d({ seed_id: "doxycycline-an-tab-50", generic_name: "DOXYCYCLINE", brand_name: "AN",
      full_display_name: "DOXYCYCLINE (AN) TAB 50MG",
      form: "TAB", strength: "50MG", pack_size: "60", qty_default: 60, repeats_default: 5,
      supply_type: "NHS", schedule: "S4", pbs_code: "1678N", ws_cost: 4.50, retail_price: 13.01,
      manufacturer_code: "EA", manufacturer_full: "Alphapharm Pty Ltd", is_generic: false, cmi_available: true }),
  d({ seed_id: "doxycycline-apo-tab-50", generic_name: "DOXYCYCLINE", brand_name: "APO",
      full_display_name: "DOXYCYCLINE (APO) TAB 50MG",
      form: "TAB", strength: "50MG", pack_size: "60", qty_default: 60, repeats_default: 5,
      supply_type: "NHS", schedule: "S4", pbs_code: "1678N", ws_cost: 4.30, retail_price: 13.01,
      manufacturer_code: "TX", manufacturer_full: "Apotex Pty Ltd", is_generic: false, cmi_available: true }),
  d({ seed_id: "doxycycline-sandoz-tab-50", generic_name: "DOXYCYCLINE", brand_name: "SANDOZ",
      full_display_name: "DOXYCYCLINE (SANDOZ) TAB 50MG",
      form: "TAB", strength: "50MG", pack_size: "60", qty_default: 60, repeats_default: 5,
      supply_type: "NHS", schedule: "S4", pbs_code: "1678N", ws_cost: 4.20, retail_price: 13.01,
      manufacturer_code: "SZ", manufacturer_full: "Sandoz Pty Ltd", is_generic: false, cmi_available: true }),
  d({ seed_id: "doxycycline-an-cap-100", generic_name: "DOXYCYCLINE", brand_name: "AN",
      full_display_name: "DOXYCYCLINE (AN) CAP 100MG",
      form: "CAP", strength: "100MG", pack_size: "30", qty_default: 30, repeats_default: 1,
      supply_type: "NHS", schedule: "S4", pbs_code: "1678P", ws_cost: 5.00, retail_price: 13.01,
      manufacturer_code: "EA", manufacturer_full: "Alphapharm Pty Ltd", is_generic: false, cmi_available: true }),
  d({ seed_id: "doxylin-cap-100", generic_name: "DOXYCYCLINE", brand_name: "DOXYLIN",
      full_display_name: "DOXYLIN CAP 100MG",
      form: "CAP", strength: "100MG", pack_size: "30", qty_default: 30, repeats_default: 1,
      supply_type: "NHS", schedule: "S4", pbs_code: "1678P", ws_cost: 8.00, retail_price: 18.00,
      manufacturer_code: "PF", manufacturer_full: "Pfizer Australia Pty Ltd", is_generic: false, cmi_available: true }),
  d({ seed_id: "doxycycline-base-tab-50", generic_name: "DOXYCYCLINE", brand_name: null,
      full_display_name: "DOXYCYCLINE TAB 50MG",
      form: "TAB", strength: "50MG", pack_size: "60", qty_default: 60, repeats_default: 5,
      supply_type: "NHS", schedule: "S4", pbs_code: "1678N", ws_cost: 3.80, retail_price: 13.01,
      manufacturer_code: "GN", manufacturer_full: "Generic Health Pty Ltd", is_generic: true, cmi_available: true }),
];

// ── GROUP 7: PARACETAMOL (common OTC/S2) ───────────────────────────────────────

const PARACETAMOL: SeedDrug[] = [
  d({ seed_id: "paracetamol-an-tab-500", generic_name: "PARACETAMOL", brand_name: "AN",
      full_display_name: "PARACETAMOL (AN) TAB 500MG",
      form: "TAB", strength: "500MG", pack_size: "100", qty_default: 100, repeats_default: 0,
      supply_type: "Private", schedule: "S2", pbs_code: null, ws_cost: 0.80, retail_price: 3.50,
      manufacturer_code: "EA", manufacturer_full: "Alphapharm Pty Ltd", is_generic: false, cmi_available: false }),
  d({ seed_id: "panamax-tab-500", generic_name: "PARACETAMOL", brand_name: "PANAMAX",
      full_display_name: "PANAMAX TAB 500MG",
      form: "TAB", strength: "500MG", pack_size: "100", qty_default: 100, repeats_default: 0,
      supply_type: "Private", schedule: "S2", pbs_code: null, ws_cost: 1.50, retail_price: 5.50,
      manufacturer_code: "SZ", manufacturer_full: "Sandoz Pty Ltd", is_generic: false, cmi_available: false }),
  d({ seed_id: "panadol-tab-500", generic_name: "PARACETAMOL", brand_name: "PANADOL",
      full_display_name: "PANADOL TAB 500MG",
      form: "TAB", strength: "500MG", pack_size: "100", qty_default: 100, repeats_default: 0,
      supply_type: "Private", schedule: "S2", pbs_code: null, ws_cost: 2.80, retail_price: 8.99,
      manufacturer_code: "HX", manufacturer_full: "Haleon Australia Pty Ltd", is_generic: false, cmi_available: false }),
  d({ seed_id: "paracetamol-base-tab-500", generic_name: "PARACETAMOL", brand_name: null,
      full_display_name: "PARACETAMOL TAB 500MG",
      form: "TAB", strength: "500MG", pack_size: "100", qty_default: 100, repeats_default: 0,
      supply_type: "Private", schedule: "S2", pbs_code: null, ws_cost: 0.60, retail_price: 2.99,
      manufacturer_code: "GN", manufacturer_full: "Generic Health Pty Ltd", is_generic: true, cmi_available: false }),
];

// ── GROUP 8: IBUPROFEN (common S2/S3) ──────────────────────────────────────────

const IBUPROFEN: SeedDrug[] = [
  d({ seed_id: "ibuprofen-an-tab-400", generic_name: "IBUPROFEN", brand_name: "AN",
      full_display_name: "IBUPROFEN (AN) TAB 400MG",
      form: "TAB", strength: "400MG", pack_size: "24", qty_default: 24, repeats_default: 0,
      supply_type: "Private", schedule: "S2", pbs_code: null, ws_cost: 1.20, retail_price: 4.99,
      manufacturer_code: "EA", manufacturer_full: "Alphapharm Pty Ltd", is_generic: false, cmi_available: false }),
  d({ seed_id: "nurofen-tab-400", generic_name: "IBUPROFEN", brand_name: "NUROFEN",
      full_display_name: "NUROFEN TAB 400MG",
      form: "TAB", strength: "400MG", pack_size: "24", qty_default: 24, repeats_default: 0,
      supply_type: "Private", schedule: "S2", pbs_code: null, ws_cost: 3.50, retail_price: 9.99,
      manufacturer_code: "RB", manufacturer_full: "Reckitt Benckiser Healthcare", is_generic: false, cmi_available: false }),
  d({ seed_id: "ibuprofen-apo-tab-200", generic_name: "IBUPROFEN", brand_name: "APO",
      full_display_name: "IBUPROFEN (APO) TAB 200MG",
      form: "TAB", strength: "200MG", pack_size: "24", qty_default: 24, repeats_default: 0,
      supply_type: "Private", schedule: "S2", pbs_code: null, ws_cost: 0.90, retail_price: 3.99,
      manufacturer_code: "TX", manufacturer_full: "Apotex Pty Ltd", is_generic: false, cmi_available: false }),
  d({ seed_id: "ibuprofen-base-tab-200", generic_name: "IBUPROFEN", brand_name: null,
      full_display_name: "IBUPROFEN TAB 200MG",
      form: "TAB", strength: "200MG", pack_size: "24", qty_default: 24, repeats_default: 0,
      supply_type: "Private", schedule: "S2", pbs_code: null, ws_cost: 0.70, retail_price: 3.49,
      manufacturer_code: "GN", manufacturer_full: "Generic Health Pty Ltd", is_generic: true, cmi_available: false }),
];

// ── GROUP 9: CEPHALEXIN (common antibiotic) ────────────────────────────────────

const CEPHALEXIN: SeedDrug[] = [
  d({ seed_id: "cephalexin-an-cap-500", generic_name: "CEPHALEXIN", brand_name: "AN",
      full_display_name: "CEPHALEXIN (AN) CAP 500MG",
      form: "CAP", strength: "500MG", pack_size: "20", qty_default: 20, repeats_default: 0,
      supply_type: "NHS", schedule: "S4", pbs_code: "2442X", ws_cost: 3.20, retail_price: 8.20,
      manufacturer_code: "EA", manufacturer_full: "Alphapharm Pty Ltd", is_generic: false, cmi_available: true }),
  d({ seed_id: "keflex-cap-500", generic_name: "CEPHALEXIN", brand_name: "KEFLEX",
      full_display_name: "KEFLEX CAP 500MG",
      form: "CAP", strength: "500MG", pack_size: "20", qty_default: 20, repeats_default: 0,
      supply_type: "NHS", schedule: "S4", pbs_code: "2442X", ws_cost: 7.50, retail_price: 16.00,
      manufacturer_code: "EL", manufacturer_full: "Eli Lilly Australia Pty Ltd", is_generic: false, cmi_available: true }),
  d({ seed_id: "cephalexin-apo-cap-500", generic_name: "CEPHALEXIN", brand_name: "APO",
      full_display_name: "CEPHALEXIN (APO) CAP 500MG",
      form: "CAP", strength: "500MG", pack_size: "20", qty_default: 20, repeats_default: 0,
      supply_type: "NHS", schedule: "S4", pbs_code: "2442X", ws_cost: 3.00, retail_price: 8.20,
      manufacturer_code: "TX", manufacturer_full: "Apotex Pty Ltd", is_generic: false, cmi_available: true }),
  d({ seed_id: "cephalexin-base-cap-500", generic_name: "CEPHALEXIN", brand_name: null,
      full_display_name: "CEPHALEXIN CAP 500MG",
      form: "CAP", strength: "500MG", pack_size: "20", qty_default: 20, repeats_default: 0,
      supply_type: "NHS", schedule: "S4", pbs_code: "2442X", ws_cost: 2.80, retail_price: 7.50,
      manufacturer_code: "GN", manufacturer_full: "Generic Health Pty Ltd", is_generic: true, cmi_available: true }),
];

// ── GROUP 10: ATORVASTATIN ─────────────────────────────────────────────────────

const ATORVASTATIN: SeedDrug[] = [
  d({ seed_id: "atorvastatin-an-tab-40", generic_name: "ATORVASTATIN", brand_name: "AN",
      full_display_name: "ATORVASTATIN (AN) TAB 40MG",
      form: "TAB", strength: "40MG", pack_size: "30", qty_default: 30, repeats_default: 5,
      supply_type: "NHS", schedule: "S4", pbs_code: "8462J", ws_cost: 2.60, retail_price: 6.50,
      manufacturer_code: "EA", manufacturer_full: "Alphapharm Pty Ltd", is_generic: false, cmi_available: true }),
  d({ seed_id: "lipitor-tab-40", generic_name: "ATORVASTATIN", brand_name: "LIPITOR",
      full_display_name: "LIPITOR TAB 40MG",
      form: "TAB", strength: "40MG", pack_size: "30", qty_default: 30, repeats_default: 5,
      supply_type: "NHS", schedule: "S4", pbs_code: "8462J", ws_cost: 6.80, retail_price: 14.00,
      manufacturer_code: "PF", manufacturer_full: "Pfizer Australia Pty Ltd", is_generic: false, cmi_available: true }),
  d({ seed_id: "atorvastatin-apo-tab-20", generic_name: "ATORVASTATIN", brand_name: "APO",
      full_display_name: "ATORVASTATIN (APO) TAB 20MG",
      form: "TAB", strength: "20MG", pack_size: "30", qty_default: 30, repeats_default: 5,
      supply_type: "NHS", schedule: "S4", pbs_code: "8461H", ws_cost: 2.20, retail_price: 6.50,
      manufacturer_code: "TX", manufacturer_full: "Apotex Pty Ltd", is_generic: false, cmi_available: true }),
  d({ seed_id: "atorvastatin-base-tab-40", generic_name: "ATORVASTATIN", brand_name: null,
      full_display_name: "ATORVASTATIN TAB 40MG",
      form: "TAB", strength: "40MG", pack_size: "30", qty_default: 30, repeats_default: 5,
      supply_type: "NHS", schedule: "S4", pbs_code: "8462J", ws_cost: 2.40, retail_price: 6.50,
      manufacturer_code: "GN", manufacturer_full: "Generic Health Pty Ltd", is_generic: true, cmi_available: true }),
];

// ── GROUP 11: SERTRALINE ───────────────────────────────────────────────────────

const SERTRALINE: SeedDrug[] = [
  d({ seed_id: "sertraline-an-tab-50", generic_name: "SERTRALINE", brand_name: "AN",
      full_display_name: "SERTRALINE (AN) TAB 50MG",
      form: "TAB", strength: "50MG", pack_size: "30", qty_default: 30, repeats_default: 5,
      supply_type: "NHS", schedule: "S4", pbs_code: "2885L", ws_cost: 2.50, retail_price: 6.50,
      manufacturer_code: "EA", manufacturer_full: "Alphapharm Pty Ltd", is_generic: false, cmi_available: true }),
  d({ seed_id: "zoloft-tab-50", generic_name: "SERTRALINE", brand_name: "ZOLOFT",
      full_display_name: "ZOLOFT TAB 50MG",
      form: "TAB", strength: "50MG", pack_size: "30", qty_default: 30, repeats_default: 5,
      supply_type: "NHS", schedule: "S4", pbs_code: "2885L", ws_cost: 7.20, retail_price: 15.00,
      manufacturer_code: "PF", manufacturer_full: "Pfizer Australia Pty Ltd", is_generic: false, cmi_available: true }),
  d({ seed_id: "sertraline-base-tab-50", generic_name: "SERTRALINE", brand_name: null,
      full_display_name: "SERTRALINE TAB 50MG",
      form: "TAB", strength: "50MG", pack_size: "30", qty_default: 30, repeats_default: 5,
      supply_type: "NHS", schedule: "S4", pbs_code: "2885L", ws_cost: 2.20, retail_price: 6.50,
      manufacturer_code: "GN", manufacturer_full: "Generic Health Pty Ltd", is_generic: true, cmi_available: true }),
];

// ── GROUPS 12–17: COMPLEX CASE MEDICINES ────────────────────────────────────

const OXYCODONE_MR: SeedDrug[] = [
  d({ seed_id: "oxycontin-mr-tab-20", generic_name: "OXYCODONE", brand_name: "OXYCONTIN",
      full_display_name: "OXYCONTIN MR TAB 20MG",
      form: "MR TAB", strength: "20MG", pack_size: "28", qty_default: 28, repeats_default: 0,
      supply_type: "AUTHORITY", schedule: "S8", pbs_code: null, ws_cost: 18.20, retail_price: 7.70,
      manufacturer_code: "MU", manufacturer_full: "Mundipharma Pty Ltd", is_generic: false, cmi_available: true }),
  d({ seed_id: "oxycodone-generic-mr-tab-20", generic_name: "OXYCODONE", brand_name: null,
      full_display_name: "OXYCODONE MR TAB 20MG",
      form: "MR TAB", strength: "20MG", pack_size: "28", qty_default: 28, repeats_default: 0,
      supply_type: "AUTHORITY", schedule: "S8", pbs_code: null, ws_cost: 14.80, retail_price: 7.70,
      manufacturer_code: "GN", manufacturer_full: "Generic Health Pty Ltd", is_generic: true, cmi_available: true }),
];

const FENTANYL_PATCH: SeedDrug[] = [
  d({ seed_id: "durogesic-patch-25", generic_name: "FENTANYL", brand_name: "DUROGESIC",
      full_display_name: "DUROGESIC PATCH 25MCG/H",
      form: "PATCH", strength: "25MCG/H", pack_size: "5", qty_default: 5, repeats_default: 0,
      supply_type: "AUTHORITY", schedule: "S8", pbs_code: null, ws_cost: 22.00, retail_price: 7.70,
      manufacturer_code: "JC", manufacturer_full: "Janssen-Cilag Pty Ltd", is_generic: false, cmi_available: true }),
  d({ seed_id: "fentanyl-sandoz-patch-25", generic_name: "FENTANYL", brand_name: "SANDOZ",
      full_display_name: "FENTANYL SANDOZ PATCH 25MCG/H",
      form: "PATCH", strength: "25MCG/H", pack_size: "5", qty_default: 5, repeats_default: 0,
      supply_type: "AUTHORITY", schedule: "S8", pbs_code: null, ws_cost: 18.40, retail_price: 7.70,
      manufacturer_code: "SZ", manufacturer_full: "Sandoz Pty Ltd", is_generic: false, cmi_available: true }),
];

const DEXAMFETAMINE: SeedDrug[] = [
  d({ seed_id: "aspen-dexamfetamine-tab-5", generic_name: "DEXAMFETAMINE", brand_name: "ASPEN",
      full_display_name: "ASPEN DEXAMFETAMINE TAB 5MG",
      form: "TAB", strength: "5MG", pack_size: "100", qty_default: 100, repeats_default: 0,
      supply_type: "AUTHORITY", schedule: "S8", pbs_code: null, ws_cost: 13.20, retail_price: 7.70,
      manufacturer_code: "AP", manufacturer_full: "Aspen Pharmacare Australia Pty Ltd", is_generic: false, cmi_available: true }),
  d({ seed_id: "dexamfetamine-genpar-tab-5", generic_name: "DEXAMFETAMINE", brand_name: "GENPAR",
      full_display_name: "DEXAMFETAMINE GENPAR TAB 5MG",
      form: "TAB", strength: "5MG", pack_size: "100", qty_default: 100, repeats_default: 0,
      supply_type: "AUTHORITY", schedule: "S8", pbs_code: null, ws_cost: 11.40, retail_price: 7.70,
      manufacturer_code: "AR", manufacturer_full: "Arrotex Pharmaceuticals Pty Ltd", is_generic: false, cmi_available: true }),
];

const METHOTREXATE: SeedDrug[] = [
  d({ seed_id: "methotrexate-cipla-tab-10", generic_name: "METHOTREXATE", brand_name: "CIPLA",
      full_display_name: "METHOTREXATE CIPLA TAB 10MG",
      form: "TAB", strength: "10MG", pack_size: "15", qty_default: 12, repeats_default: 2,
      supply_type: "NHS", schedule: "S4", pbs_code: null, ws_cost: 8.30, retail_price: 7.70,
      manufacturer_code: "CP", manufacturer_full: "Cipla Australia Pty Ltd", is_generic: false, cmi_available: true }),
  d({ seed_id: "methotrexate-generic-tab-10", generic_name: "METHOTREXATE", brand_name: null,
      full_display_name: "METHOTREXATE TAB 10MG",
      form: "TAB", strength: "10MG", pack_size: "15", qty_default: 12, repeats_default: 2,
      supply_type: "NHS", schedule: "S4", pbs_code: null, ws_cost: 7.10, retail_price: 7.70,
      manufacturer_code: "GN", manufacturer_full: "Generic Health Pty Ltd", is_generic: true, cmi_available: true }),
];

const LITHIUM: SeedDrug[] = [
  d({ seed_id: "quilonum-sr-tab-450", generic_name: "LITHIUM CARBONATE", brand_name: "QUILONUM SR",
      full_display_name: "QUILONUM SR TAB 450MG",
      form: "SR TAB", strength: "450MG", pack_size: "100", qty_default: 100, repeats_default: 2,
      supply_type: "NHS", schedule: "S4", pbs_code: null, ws_cost: 10.90, retail_price: 7.70,
      manufacturer_code: "GK", manufacturer_full: "GlaxoSmithKline Australia Pty Ltd", is_generic: false, cmi_available: true }),
  d({ seed_id: "lithicarb-tab-250", generic_name: "LITHIUM CARBONATE", brand_name: "LITHICARB",
      full_display_name: "LITHICARB TAB 250MG",
      form: "TAB", strength: "250MG", pack_size: "100", qty_default: 100, repeats_default: 2,
      supply_type: "NHS", schedule: "S4", pbs_code: null, ws_cost: 9.20, retail_price: 7.70,
      manufacturer_code: "AR", manufacturer_full: "Arrotex Pharmaceuticals Pty Ltd", is_generic: false, cmi_available: true }),
];

const APIXABAN: SeedDrug[] = [
  d({ seed_id: "eliquis-tab-5", generic_name: "APIXABAN", brand_name: "ELIQUIS",
      full_display_name: "ELIQUIS TAB 5MG",
      form: "TAB", strength: "5MG", pack_size: "60", qty_default: 60, repeats_default: 5,
      supply_type: "NHS", schedule: "S4", pbs_code: null, ws_cost: 35.40, retail_price: 7.70,
      manufacturer_code: "BM", manufacturer_full: "Bristol-Myers Squibb Australia Pty Ltd", is_generic: false, cmi_available: true }),
  d({ seed_id: "apo-apixaban-tab-5", generic_name: "APIXABAN", brand_name: "APO",
      full_display_name: "APO-APIXABAN TAB 5MG",
      form: "TAB", strength: "5MG", pack_size: "60", qty_default: 60, repeats_default: 5,
      supply_type: "NHS", schedule: "S4", pbs_code: null, ws_cost: 28.20, retail_price: 7.70,
      manufacturer_code: "AR", manufacturer_full: "Arrotex Pharmaceuticals Pty Ltd", is_generic: false, cmi_available: true }),
];

export const DRUG_LIBRARY: SeedDrug[] = [
  ...ERYTHROMYCIN,   // 6
  ...WARFARIN,       // 5
  ...AMOXYCILLIN,    // 10
  ...TEMAZEPAM,      // 5
  ...METFORMIN,      // 7
  ...DOXYCYCLINE,    // 6
  ...PARACETAMOL,    // 4
  ...IBUPROFEN,      // 4
  ...CEPHALEXIN,     // 4
  ...ATORVASTATIN,   // 4
  ...SERTRALINE,     // 3
  ...OXYCODONE_MR,
  ...FENTANYL_PATCH,
  ...DEXAMFETAMINE,
  ...METHOTREXATE,
  ...LITHIUM,
  ...APIXABAN,
  // Total: 70
];
