export interface StockStatus {
    working_shift: number;
    warehouse_id: string;
    unit_id: string;
    height_cm: number;
    qty_liter: number;
    pending_posting: number | null;
    pending_receive: number | null;
    soh_system: number;
    max_capacity: number;
}
