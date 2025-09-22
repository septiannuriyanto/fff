export interface DraftRitasi {
  no_surat_jalan: string;
  queue_num: number | null;
  ritation_date: string;
  warehouse_id: string | null;
  qty_sj: number;
  qty_sonding_before: number;
  qty_sonding_after: number;
  qty_sonding: number;
  sonding_before_front: number;
  sonding_before_rear: number;
  sonding_after_front: number;
  sonding_after_rear: number;
  operator_id: string;
  fuelman_id: string;
  qty_flowmeter_before: number;
  qty_flowmeter_after: number;
  isValidated: boolean;
  petugas_pencatatan: string;
  shift: '1' | '2';
  photo_url?: string | null;
  photo_file?: File; 
}