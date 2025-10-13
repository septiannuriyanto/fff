// ============================================
// types/grease.constants.ts
// ============================================

/**
 * Main warehouse storage cluster name
 * Used for validation and flow detection
 */
export const MAIN_WAREHOUSE_STORAGE_CLUSTER = 'OM1';

/**
 * Supplier/Factory name for grease refill operations
 * Change this value if supplier name changes
 */
export const SUPPLIER_NAME = 'SEFAS';

/**
 * Register cluster name (virtual cluster for new tanks)
 */
export const REGISTER_CLUSTER_NAME = 'register';

/**
 * Tank statuses
 */
export const TANK_STATUS = {
  NEW: 'NEW',
  FULL: 'FULL',
  DC: 'DC', // Dirty Container
  EMPTY: 'EMPTY',
} as const;

/**
 * Grease types
 */
export const GREASE_TYPES = {
  ALBIDA: 'ALBIDA',
  ALVANIA: 'ALVANIA',
  EMPTY: 'EMPTY',
} as const;
