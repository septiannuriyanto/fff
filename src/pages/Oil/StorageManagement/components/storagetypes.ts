export interface Storage {
  id: number;
  unit_id: string;
  warehouse_id: string;
  location?: string;
  type?: string;
  storage_model?: string;
}

export interface Material {
  material_code: string;
  item_description?: string;
  mnemonic?: string;
  material_group?: string;
}

export interface StorageSetup {
  id: number;
  warehouse_id: string;
  material_code: string;
  tank_number: number;
}