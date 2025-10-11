// components/MasterStorage/types.ts

import { Edit, Trash2 } from 'lucide-react'; // <-- Import dari Lucide

export interface StorageData {
  // ... (Definisi Interface StorageData tetap sama) ...
  id?: number;
  warehouse_id: string; 
  unit_id: string | null; 
  max_capacity: number | null;
  manufacturer: string | null;
  callibration_date: string | null; 
  expired_date: string | null; 
  type: string | null;
  status: string | null;
  fm_seal_number: number[] | null;
  fm_seal_img: string | null;
  filter_id: string | null;
  daily_check_days: number | null;
  filter_config: number | null;
  notes: string | null;
  sko: UnitLicense[] | null; // Relasi ke UnitLicense
}

export interface UnitLicense {
  unit_id: string;
  sko_code: string | null;
  issued_date: string | null;
  expired_date: string | null;
  document_url: string | null;
  sticker_url: string | null;
  status: string | null;
  notes: string | null;
}


// Interface baru untuk tabel storage_photos
export interface StoragePhoto {
  id?: number;
  created_at?: string;
  unit_id: string;
  component:string;
  image_url: string | null;
  category: string | null;
  kondisi: string | null;
  remark: string | null;
  name: string | null;
  is_primary: boolean;
}

export type ViewMode = 'grid' | 'list' | 'overview';

// --- Ikon yang diperbarui menggunakan Lucide ---

// Ikon Edit dari Lucide
export const EditIcon = () => (
    <Edit className="h-4 w-4 text-blue-500 hover:text-blue-700 cursor-pointer" />
);

// Ikon Delete menggunakan Trash2 dari Lucide
export const DeleteIcon = () => (
    <Trash2 className="h-4 w-4 text-red-500 hover:text-red-700 cursor-pointer" />
);

// Ikon untuk View Switcher (jika Anda ingin memindahkannya ke sini)
// Jika tidak, biarkan di MasterStorage.tsx agar tidak terjadi circular dependency.


export const dateFormatter = (value: string | null): string => {
  if (value) {
    return new Date(value).toLocaleDateString('id-ID');
  }
  return '-';
};