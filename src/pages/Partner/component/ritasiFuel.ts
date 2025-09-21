export interface RitasiFuel {
  id: number;
  no_surat_jalan: string;
  queue_num?: number;
  ritation_date: string; // YYYY-MM-DD
  warehouse_id?: string;
  qty_sj?: number;
  qty_sonding?: number;
  sonding_before_front?: number;
  sonding_before_rear?: number;
  sonding_after_front?: number;
  sonding_after_rear?: number;
  qty_sonding_before?: number;
  qty_sonding_after?: number;
  operator_id?: string;
  fuelman_id?: string;
  qty_flowmeter_before?: number;
  qty_flowmeter_after?: number;
  isValidated?: boolean;
  petugas_pencatatan?: string;
  shift?: number;
  flowmeter_before_url?: string;
  flowmeter_after_url?: string;
  photo_url?: string;
  photoPreview?: string;
  unit_id?: string;
  fuelman_name?: string;
  operator_name?: string;
  petugas_pencatatan_name?: string;
}