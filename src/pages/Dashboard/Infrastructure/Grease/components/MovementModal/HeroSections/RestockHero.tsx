// ============================================
// components/MovementModal/HeroSections/RestockHero.tsx
// ============================================

import React from 'react';
import { HeroSectionBaseProps } from '../types/modal.types';
import { getTankIcon, Warehouse } from '../utils/iconHelpers';
import { SimpleFlowArrow } from '../Shared/FlowArrow';
import { SUPPLIER_NAME } from '../../../types/grease.constants';

export const RestockHero: React.FC<HeroSectionBaseProps> = ({ tank, fromCluster, toCluster }) => {
  return (
    <div className="bg-gradient-to-r from-red-50 to-orange-50 border-b border-red-200 px-6 py-8">
      <p className="text-xs font-semibold text-red-900 mb-4">
        Restock Flow (Receiving GT from Factory)
      </p>
      <div className="flex items-center justify-center gap-4">
        {/* GT NEW FROM FACTORY (SUPPLIER) */}
        <div className="flex flex-col items-center">
          <div className="relative bg-white rounded-xl p-6 mb-4 shadow-md border-2 border-red-200 hover:shadow-lg transition">
            <div className="absolute top-0 left-0 transform -translate-x-1 -translate-y-1 z-20">
              <div className="bg-red-600 text-white text-xs font-bold uppercase py-1 px-4 rounded-br-lg shadow-lg">
                {tank.nomor_gt}
              </div>
            </div>
            <img src={getTankIcon(tank.tipe)} alt="Grease Tank" className="h-20 w-20 object-contain" />
          </div>
          <div className="text-center">
            <div className="text-sm font-bold text-gray-900 bg-red-100 px-3 py-1 rounded-full inline-block mb-2">
              NEW GT
            </div>
            <div className="text-base font-bold text-gray-900">{tank.nomor_gt}</div>
            <div className="text-xs text-gray-600 mt-2">
              From: <span className="font-semibold">{fromCluster?.name || SUPPLIER_NAME}</span>
            </div>
            <div className="text-xs text-red-600 font-semibold mt-1">Type: {tank.tipe}</div>
          </div>
        </div>

        {/* ARROW */}
        <SimpleFlowArrow label="RESTOCK" color="red" />

        {/* WAREHOUSE (MAIN WAREHOUSE) */}
        <div className="flex flex-col items-center">
          <div className="bg-white rounded-xl p-6 mb-4 shadow-md border-2 border-orange-200 hover:shadow-lg transition">
            <img src={Warehouse} alt="Warehouse Icon" className="h-20 w-20 object-contain" />
          </div>
          <div className="text-center">
            <div className="text-sm font-bold text-gray-900 bg-orange-100 px-3 py-1 rounded-full inline-block mb-2">
              RECEIVING
            </div>
            <div className="text-base font-bold text-gray-900">{toCluster.name}</div>
            <div className="text-xs text-gray-600 mt-2">
              Storage <span className="font-semibold">Warehouse</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};