// src/config/supplierConfig.ts

/**
 * Konfigurasi Supplier untuk Oil Reordering System
 * 
 * Aturan:
 * - Supplier A: Hanya untuk Engine Oil, kapasitas 8-10 IBC per pengiriman
 * - Supplier B: Untuk Transmission & Hydraulic, fixed 10 IBC total per pengiriman
 *   (bisa kombinasi, contoh: 4 IBC Transmission + 6 IBC Hydraulic)
 */



export const MATERIALS = {
  engine: "1000101471",
  transmission: "1000012900",
  hydraulic: "1000000763",
};

// Target buffer untuk setiap jenis oli (dalam IBC)
export const TARGET_BUFFERS: Record<string, number> = {
  engine: 5,        // Engine oil butuh buffer lebih banyak
  transmission: 6,  // Transmission oil buffer sedang
  hydraulic: 6,     // Hydraulic oil buffer sedang-tinggi
};

// Skor bobot untuk prioritas order
export const ORDER_WEIGHT: Record<string, number> = {
  engine: 10,        // Engine oil prioritas tinggi
  transmission: 7,  // Transmission oil prioritas sedang
  hydraulic: 3,     // Hydraulic oil prioritas lebih rendah
};

export interface SupplierInfo {
  id: string;
  name: string;
  leadTimeDays: number;
  notes?: string;
}

export interface OilTypeConfig {
  materialCode: string;
  supplierId: string;
  minOrderQty?: number; // minimal order (IBC) - opsional
  maxOrderQty?: number; // maksimal order (IBC) - opsional
  description: string;
}

export interface SupplierOrderRule {
  supplierId: string;
  maxTotalIBCPerShipment: number; // total IBC maksimal per pengiriman
  minTotalIBCPerShipment: number; // total IBC minimal per pengiriman
  allowCombination: boolean; // apakah boleh kombinasi beberapa jenis oli
  combinableOilTypes?: string[]; // jenis oli yang bisa dikombinasikan
}

export interface BufferStockTarget {
  safetyStock: number; // minimum kritis (IBC)
  targetBuffer: number; // target ideal (IBC)
  reorderPoint: number; // titik reorder (IBC)
}

// ============================================================
// KONFIGURASI UTAMA - EDIT DI SINI
// ============================================================

/**
 * Daftar Supplier
 */
export const SUPPLIERS: Record<string, SupplierInfo> = {
  SUPPLIER_A: {
    id: 'SUPPLIER_A',
    name: 'PT. Sefas Pelindotama',
    leadTimeDays: 2,
    notes: 'Khusus Engine Oil, pengiriman fleksibel 8-10 IBC',
  },
  SUPPLIER_B: {
    id: 'SUPPLIER_B',
    name: 'PT. Sumber Mutiara Prima',
    leadTimeDays: 5,
    notes: 'Transmission & Hydraulic, fixed 10 IBC total per pengiriman',
  },
};

/**
 * Mapping Jenis Oli → Supplier & Material Code
 */
export const OIL_TYPE_CONFIG: Record<string, OilTypeConfig> = {
  engine: {
    materialCode: '1000101471',
    supplierId: 'SUPPLIER_A',
    minOrderQty: 8,
    maxOrderQty: 10,
    description: 'Engine Oil SAE 15W-40',
  },
  transmission: {
    materialCode: '1000012900',
    supplierId: 'SUPPLIER_B',
    description: 'Transmission Oil TO-4',
  },
  hydraulic: {
    materialCode: '1000000763',
    supplierId: 'SUPPLIER_B',
    description: 'Hydraulic Oil AW-68',
  },
};

/**
 * Aturan Order per Supplier
 */
export const SUPPLIER_ORDER_RULES: Record<string, SupplierOrderRule> = {
  SUPPLIER_A: {
    supplierId: 'SUPPLIER_A',
    maxTotalIBCPerShipment: 10,
    minTotalIBCPerShipment: 8,
    allowCombination: false, // hanya 1 jenis oli (engine)
  },
  SUPPLIER_B: {
    supplierId: 'SUPPLIER_B',
    maxTotalIBCPerShipment: 10,
    minTotalIBCPerShipment: 10, // harus pas 10 IBC
    allowCombination: true, // boleh kombinasi transmission + hydraulic
    combinableOilTypes: ['transmission', 'hydraulic'],
  },
};

/**
 * Target Buffer Stock (berlaku untuk semua jenis oli)
 */
export const BUFFER_STOCK_TARGETS: BufferStockTarget = {
  safetyStock: 2, // minimum 2 IBC
  targetBuffer: 5, // ideal 5 IBC
  reorderPoint: 3, // trigger order saat <= 3 IBC
};

// ============================================================
// CONTOH KOMBINASI ORDER UNTUK SUPPLIER B
// ============================================================

/**
 * Template kombinasi order untuk Supplier B
 * Total harus = 10 IBC
 * 
 * Contoh kombinasi yang valid:
 * - 10 Transmission + 0 Hydraulic
 * - 6 Transmission + 4 Hydraulic
 * - 4 Transmission + 6 Hydraulic
 * - 0 Transmission + 10 Hydraulic
 * - 5 Transmission + 5 Hydraulic
 */
export interface CombinationTemplate {
  transmission: number;
  hydraulic: number;
  description: string;
}

export const SUPPLIER_B_COMBINATIONS: CombinationTemplate[] = [
  { transmission: 10, hydraulic: 0, description: 'Full Transmission' },
  { transmission: 6, hydraulic: 4, description: 'Transmission 60% - Hydraulic 40%' },
  { transmission: 5, hydraulic: 5, description: 'Transmission 50% - Hydraulic 50%' },
  { transmission: 4, hydraulic: 6, description: 'Transmission 40% - Hydraulic 60%' },
  { transmission: 0, hydraulic: 10, description: 'Full Hydraulic' },
];

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Get supplier info by oil type
 */
export const getSupplierByOilType = (oilType: string): SupplierInfo | null => {
  const config = OIL_TYPE_CONFIG[oilType];
  if (!config) return null;
  return SUPPLIERS[config.supplierId] || null;
};

/**
 * Get order rules by oil type
 */
export const getOrderRulesByOilType = (oilType: string): SupplierOrderRule | null => {
  const config = OIL_TYPE_CONFIG[oilType];
  if (!config) return null;
  return SUPPLIER_ORDER_RULES[config.supplierId] || null;
};

/**
 * Check if two oil types can be combined in one order
 */
export const canCombineOilTypes = (oilType1: string, oilType2: string): boolean => {
  const config1 = OIL_TYPE_CONFIG[oilType1];
  const config2 = OIL_TYPE_CONFIG[oilType2];
  
  if (!config1 || !config2) return false;
  if (config1.supplierId !== config2.supplierId) return false;
  
  const rule = SUPPLIER_ORDER_RULES[config1.supplierId];
  if (!rule || !rule.allowCombination) return false;
  
  return (
    (rule.combinableOilTypes?.includes(oilType1) ?? false) &&
    (rule.combinableOilTypes?.includes(oilType2) ?? false)
  );
};

/**
 * Validate combination total for Supplier B
 */
export const isValidSupplierBCombination = (
  transmissionQty: number,
  hydraulicQty: number
): boolean => {
  const total = transmissionQty + hydraulicQty;
  const rule = SUPPLIER_ORDER_RULES.SUPPLIER_B;
  return (
    total >= rule.minTotalIBCPerShipment &&
    total <= rule.maxTotalIBCPerShipment &&
    transmissionQty >= 0 &&
    hydraulicQty >= 0
  );
};

/**
 * Find best combination template for Supplier B based on needs
 */
export const findBestSupplierBCombination = (
  transmissionNeed: number,
  hydraulicNeed: number
): CombinationTemplate => {
  const total = transmissionNeed + hydraulicNeed;
  
  // Jika total kebutuhan <= 10, sesuaikan proporsi
  if (total <= 10) {
    return {
      transmission: Math.min(transmissionNeed, 10),
      hydraulic: Math.min(hydraulicNeed, 10 - Math.min(transmissionNeed, 10)),
      description: 'Custom - Sesuai kebutuhan',
    };
  }
  
  // Jika total > 10, prioritaskan yang paling urgent
  if (transmissionNeed >= hydraulicNeed) {
    // Prioritas Transmission
    const transQty = Math.min(transmissionNeed, 10);
    const hydroQty = 10 - transQty;
    return {
      transmission: transQty,
      hydraulic: hydroQty,
      description: 'Prioritas Transmission',
    };
  } else {
    // Prioritas Hydraulic
    const hydroQty = Math.min(hydraulicNeed, 10);
    const transQty = 10 - hydroQty;
    return {
      transmission: transQty,
      hydraulic: hydroQty,
      description: 'Prioritas Hydraulic',
    };
  }
};

export default {
  SUPPLIERS,
  OIL_TYPE_CONFIG,
  SUPPLIER_ORDER_RULES,
  BUFFER_STOCK_TARGETS,
  SUPPLIER_B_COMBINATIONS,
  getSupplierByOilType,
  getOrderRulesByOilType,
  canCombineOilTypes,
  isValidSupplierBCombination,
  findBestSupplierBCombination,
};