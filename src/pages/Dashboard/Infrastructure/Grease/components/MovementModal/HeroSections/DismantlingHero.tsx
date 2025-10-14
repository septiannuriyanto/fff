// ============================================
// components/MovementModal/HeroSections/DismantlingHero.tsx
// ============================================

import React from 'react';
import { HeroSectionBaseProps } from '../types/modal.types';
import { getTankIcon, Warehouse } from '../utils/iconHelpers';
import { SimpleFlowArrow } from '../Shared/FlowArrow';
import { MAIN_WAREHOUSE_STORAGE_CLUSTER } from '../../../types/grease.constants';

export const DismantlingHero: React.FC<HeroSectionBaseProps> = ({ tank, toCluster }) => {
  return (
    <div className="bg-gradient-to-r from-orange-50 to-red-50 border-b border-orange-200 px-6 py-8">
      <p className="text-xs font-semibold text-orange-900 mb-6">
        Dismantling Flow (Return to Warehouse)
      </p>

      <div className="flex items-center justify-center gap-8">
        {/* ========== LEFT: GREASE TANK DC ========== */}
        <div className="flex flex-col items-center justify-between w-32 self-stretch">
          {/* Tank Card */}
          <div className="relative bg-white rounded-xl p-4 shadow-md border-2 border-orange-200 hover:shadow-lg transition w-full h-32 flex items-center justify-center">
            {/* Ribbon */}
            <div className="absolute top-0 left-0 transform -translate-x-1 -translate-y-1 z-20">
              <div className="bg-red-600 text-white text-xs font-bold uppercase py-1 px-3 rounded-br-lg shadow-lg">
                {tank.nomor_gt}
              </div>
            </div>

            <img
              src={getTankIcon(tank.tipe)}
              alt="Grease Tank DC"
              className="h-16 w-16 object-contain opacity-70 hue-rotate-180"
            />
          </div>

          {/* Tank Info */}
          <div className="text-center w-full mt-3">
            <div className="text-xs font-bold text-gray-900 bg-red-100 px-2 py-1 rounded-full inline-block mb-2">
              DC TANK
            </div>
            <div className="text-sm font-bold text-gray-900 truncate px-1">
              {tank.nomor_gt}
            </div>
            <div className="text-xs text-gray-600 mt-1">
              Type: <span className="font-semibold">{tank.tipe || 'N/A'}</span>
            </div>
            <div className="text-xs text-orange-700 font-bold mt-1">
              Qty: {tank.qty}L
            </div>
          </div>
        </div>

        {/* ========== MIDDLE: ARROW ========== */}
        <div className="flex items-center justify-center self-stretch">
          <SimpleFlowArrow label="RETURN" color="orange" />
        </div>

        {/* ========== RIGHT: WAREHOUSE ========== */}
        <div className="flex flex-col items-center justify-between w-32 self-stretch">
          {/* Warehouse Card */}
          <div className="bg-white rounded-xl p-4 shadow-md border-2 border-orange-200 hover:shadow-lg transition w-full h-32 flex items-center justify-center">
            <img
              src={Warehouse}
              alt="Warehouse Icon"
              className="h-16 w-16 object-contain opacity-80"
            />
          </div>

          {/* Warehouse Info */}
          <div className="text-center w-full mt-3">
            <div className="text-xs font-bold text-gray-900 bg-orange-100 px-2 py-1 rounded-full inline-block mb-2">
              STORAGE
            </div>
            <div className="text-sm font-bold text-gray-900 truncate px-1">
              {MAIN_WAREHOUSE_STORAGE_CLUSTER}
            </div>
            <div className="text-xs text-gray-600 mt-1">
              Warehouse <span className="font-semibold">Receiving</span>
            </div>
            <div className="text-xs text-orange-600 font-semibold mt-0.5">
              Will be marked DC
            </div>
          </div>
        </div>
      </div>

      {/* ========== INFO NOTE ========== */}
      <div className="mt-6 bg-white rounded-lg px-4 py-3 border-l-4 border-orange-600 shadow-sm">
        <p className="text-xs text-gray-800 font-medium">
          <span className="text-orange-600 font-bold">Note:</span> Tank will be returned to warehouse 
          with DC (Damage Core) status and quantity set to 0L for refill.
        </p>
      </div>
    </div>
  );
};
