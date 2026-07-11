export interface DrugRow {
  id: string;
  seed_id: string;
  generic_name: string;
  brand_name: string | null;
  full_display_name: string;
  form: string;
  strength: string;
  pack_size: string;
  qty_default: number;
  repeats_default: number;
  supply_type: string;
  schedule: string | null;
  pbs_code: string | null;
  ws_cost: number | null;
  retail_price: number | null;
  manufacturer_code: string | null;
  manufacturer_full: string | null;
  is_generic: boolean;
  cmi_available: boolean;
  created_at: string;
}
