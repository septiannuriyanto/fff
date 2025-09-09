export interface DstOliWithLocation {
  id: number;
  warehouse_id: string;
  unit_id: string;
  material_code: string;
  item_description: string | null;
  tank_number: number | null;
  uoi: string;
  input_value: number | null;
  qty: number | null;
  qty_system_1?: number | null;
  qty_system_2?: number | null;
  pending_receive?: number | null;
  failed_posting?: number | null;
  pending_input?: number | null;
  location: string | null;
}