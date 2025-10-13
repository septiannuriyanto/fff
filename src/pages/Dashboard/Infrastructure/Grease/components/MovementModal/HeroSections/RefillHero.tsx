// ============================================
// components/MovementModal/HeroSections/RefillHero.tsx
// ============================================

import React from 'react';
import { HeroSectionBaseProps } from '../types/modal.types';
import { getTankIcon, Factory } from '../utils/iconHelpers';
import { SimpleFlowArrow } from '../Shared/FlowArrow';
import { SUPPLIER_NAME } from '../../../types/grease.constants';

export const RefillHero: React.FC<HeroSectionBaseProps> = ({ tank, fromCluster, toCluster }) => {
  return (
    <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-200 px-6 py-8">
      <p className="text-xs font-semibold text-purple-900 mb-4">
        Refill Flow (Issuing GT to Factory)
      </p>
      <div className="flex items-center justify-center gap-4">
        {/* GT in DC (MAIN WAREHOUSE) */}
        <div className="flex flex-col items-center">
          <div className="relative bg-white rounded-xl p-6 mb-4 shadow-md border-2 border-purple-200 hover:shadow-lg transition">
            <div className="absolute top-0 left-0 transform -translate-x-1 -translate-y-1 z-20">
              <div className="bg-purple-600 text-white text-xs font-bold uppercase py-1 px-4 rounded-br-lg shadow-lg">
                {tank.nomor_gt}
              </div>
            </div>
            <img src={getTankIcon(tank.tipe)} alt="Grease Tank" className="h-20 w-20 object-contain" />
          </div>
          <div className="text-center">
            <div className="text-sm font-bold text-gray-900 bg-purple-100 px-3 py-1 rounded-full inline-block mb-2">
              DC GT
            </div>
            <div className="text-base font-bold text-gray-900">{tank.nomor_gt}</div>
            <div className="text-xs text-gray-600 mt-2">
              From: <span className="font-semibold">{fromCluster?.name}</span>
            </div>
            <div className="text-xs text-purple-600 font-semibold mt-1">Qty: {tank.qty}L</div>
          </div>
        </div>

        {/* ARROW */}
        <SimpleFlowArrow label="REFILL" color="purple" />

        {/* FACTORY (SUPPLIER) */}
        <div className="flex flex-col items-center">
          <div className="bg-white rounded-xl p-6 mb-4 shadow-md border-2 border-pink-200 hover:shadow-lg transition">
            <img src={Factory} alt="Factory Icon" className="h-20 w-20 object-contain" />
          </div>
          <div className="text-center">
            <div className="text-sm font-bold text-gray-900 bg-pink-100 px-3 py-1 rounded-full inline-block mb-2">
              FACTORY
            </div>
            <div className="text-base font-bold text-gray-900">{toCluster.name}</div>
            <div className="text-xs text-gray-600 mt-2">
              Destination <span className="font-semibold">{SUPPLIER_NAME}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};