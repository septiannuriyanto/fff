// Bentuk data di Supabase
export interface GreaseTankDB {
  id: string;
  tipe: 'ALBIDA' | 'ALVANIA';
  nomor_gt: string;
  qty: number;
  status: 'NEW' | 'DC';
}

// Bentuk data di UI (untuk drag-drop)
export interface GreaseTankUI {
  id: string;
  type: 'ALBIDA' | 'ALVANIA';
  number: string;
  status: 'NEW' | 'DC';
}
