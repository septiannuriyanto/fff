export interface DstOilFull {
  id: number;
  date_dst: string;
  warehouse_id: string;
  material_code: string;
  location: string | null;
  qty: number | null;
  soh_tactys: number | null;
  soh_sap: number | null;
  failed_posting: number | null;
  pending_receive: number | null;
}