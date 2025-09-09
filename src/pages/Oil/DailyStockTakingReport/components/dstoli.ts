export interface DstOli {
  id: number;
  warehouse_id: string;
  unit_id: string;
  material_code: string;
  item_description: string | null;
  tank_number: number | null;
  uoi: string;
  input_value: number | null;
  qty: number | null;
  date_dst: string | null;
}