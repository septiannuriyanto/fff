// ============================================
// components/MovementModal/utils/iconHelpers.ts
// ============================================

import GreaseTankIcon from '../../../../../../../images/icon/grease-tank.png';
import GreaseTankIconYellow from '../../../../../../../images/icon/grease-tank-alt.png';
import LubcarEmpty from '../../../../../../../images/icon/lubcar-empty.png';
import LubcarAlbida from '../../../../../../../images/icon/lubcar-mounted.png';
import LubcarAlvania from '../../../../../../../images/icon/lubcar-mounted-alt.png';
import PitstopEmpty from '../../../../../../../images/icon/pitstop.png';
import PitstopAlbida from '../../../../../../../images/icon/pitstop-albida.png';
import PitstopAlvania from '../../../../../../../images/icon/pitstop-alvania.png';
import Warehouse from '../../../../../../../images/icon/warehouse.png';
import Factory from '../../../../../../../images/icon/factory.png';

/**
 * Get tank icon based on grease type
 */
export const getTankIcon = (tipe: string | null): string => {
  return tipe === 'ALVANIA' ? GreaseTankIconYellow : GreaseTankIcon;
};

/**
 * Get Lubcar icon based on grease type
 * @deprecated Use getConsumerIcon() instead for auto-detection
 */
export const getLubcarIcon = (greaseType: string): string => {
  if (greaseType === 'ALBIDA') return LubcarAlbida;
  if (greaseType === 'ALVANIA') return LubcarAlvania;
  return LubcarEmpty;
};

/**
 * Get Pitstop icon based on grease type
 */
export const getPitstopIcon = (greaseType: string): string => {
  if (greaseType === 'ALBIDA') return PitstopAlbida;
  if (greaseType === 'ALVANIA') return PitstopAlvania;
  return PitstopEmpty;
};

/**
 * Auto-detect consumer type and return appropriate icon
 * - If unit_id starts with "LO" → Lubcar icon
 * - Otherwise → Pitstop icon
 * 
 * @param unitId - Consumer unit ID (e.g., "LO-001", "PS-001")
 * @param greaseType - Current grease type ("ALBIDA" | "ALVANIA" | "EMPTY")
 * @returns Icon path
 */
export const getConsumerIcon = (unitId: string, greaseType: string): string => {
  const isLubcar = unitId.toUpperCase().startsWith('LO');
  
  if (isLubcar) {
    return getLubcarIcon(greaseType);
  } else {
    return getPitstopIcon(greaseType);
  }
};

/**
 * Check if consumer is Lubcar type
 */
export const isLubcarUnit = (unitId: string): boolean => {
  return unitId.toUpperCase().startsWith('LO');
};

/**
 * Check if consumer is Pitstop type
 */
export const isPitstopUnit = (unitId: string): boolean => {
  return !isLubcarUnit(unitId);
};

export const getWarehouseIcon = (): string => Warehouse;

export const getFactoryIcon = (): string => Factory;

// Export all icons
export {
  GreaseTankIcon,
  GreaseTankIconYellow,
  LubcarEmpty,
  LubcarAlbida,
  LubcarAlvania,
  PitstopEmpty,
  PitstopAlbida,
  PitstopAlvania,
  Warehouse,
  Factory,
};