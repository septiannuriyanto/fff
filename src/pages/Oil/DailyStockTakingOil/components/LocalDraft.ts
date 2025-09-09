export type LocalDraft = {
  key: string;
  warehouse_id: string;
  unit_id?: string | null;
  location?: string | null;
  material_code: string;
  item_description?: string | null;
  tank_number: number;
  uoi: string;
  input_value: string;
  qty?: number | null;
  created_at: number; // tambahan ini
};