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
      <p className="text-xs font-semibold text-orange-900 mb-4">
        Dismantling Flow (Return to Warehouse)
      </p>
      <div className="flex items-center justify-center gap-4">
        {/* ========== GREASE TANK DC (LEFT) ========== */}
        <div className="flex flex-col items-center">
          <div className="relative bg-white rounded-xl p-6 mb-4 shadow-md border-2 border-orange-200 hover:shadow-lg transition">
            {/* RIBBON GT NUMBER */}
            <div className="absolute top-0 left-0 transform -translate-x-1 -translate-y-1 z-20">
              <div className="bg-red-600 text-white text-xs font-bold uppercase py-1 px-4 rounded-br-lg shadow-lg">
                {tank.nomor_gt}
              </div>
            </div>
            {/* ✅ FIXED: Use getTankIcon for Grease Tank, not consumer icon */}
            <img
              src={getTankIcon(tank.tipe)}
              alt="Grease Tank DC"
              className="h-20 w-20 object-contain opacity-60 hue-rotate-180"
            />
          </div>
          <div className="text-center">
            <div className="text-sm font-bold text-gray-900 bg-red-100 px-3 py-1 rounded-full inline-block mb-2">
              DC TANK
            </div>
            <div className="text-base font-bold text-gray-900">{tank.nomor_gt}</div>
            <div className="text-xs text-gray-600 mt-2">
              Type: <span className="font-semibold">{tank.tipe || 'N/A'}</span>
            </div>
            <div className="mt-3 space-y-1">
              <div className="inline-block bg-orange-100 text-orange-700 text-xs font-bold px-2 py-1 rounded">
                Qty: {tank.qty}L
              </div>
              <div className="block text-xs text-red-600 font-semibold mt-1">
                Status: DC (Dirty Container)
              </div>
            </div>
          </div>
        </div>

        {/* ========== ARROW ========== */}
        <SimpleFlowArrow label="RETURN" color="orange" />

        {/* ========== WAREHOUSE (RIGHT) ========== */}
        <div className="flex flex-col items-center">
          <div className="bg-white rounded-xl p-6 mb-4 shadow-md border-2 border-orange-200 hover:shadow-lg transition">
            <img 
              src={Warehouse} 
              alt="Warehouse Icon" 
              className="h-20 w-20 object-contain opacity-80" 
            />
          </div>
          <div className="text-center">
            <div className="text-sm font-bold text-gray-900 bg-orange-100 px-3 py-1 rounded-full inline-block mb-2">
              STORAGE
            </div>
            <div className="text-base font-bold text-gray-900">
              {MAIN_WAREHOUSE_STORAGE_CLUSTER}
            </div>
            <div className="text-xs text-gray-600 mt-2">
              Warehouse <span className="font-semibold">Receiving</span>
            </div>
            <div className="text-xs text-orange-600 mt-2 font-semibold">
              Will be marked DC
            </div>
          </div>
        </div>
      </div>

      {/* ========== INFO NOTE ========== */}
      <div className="mt-4 bg-white rounded-lg px-4 py-3 border-l-4 border-orange-600 shadow-sm">
        <p className="text-xs text-gray-800 font-medium">
          <span className="text-orange-600 font-bold">Note:</span> Tank will be returned to warehouse 
          with DC (Dirty Container) status and quantity set to 0L for refill.
        </p>
      </div>
    </div>
  );
};