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
      <p className="text-xs font-semibold text-red-900 mb-6">
        Restock Flow (Receiving GT from Factory)
      </p>

      <div className="flex items-center justify-center gap-8">
        {/* ========== LEFT: NEW GT FROM FACTORY ========== */}
        <div className="flex flex-col items-center justify-between w-32 self-stretch">
          {/* Tank Card */}
          <div className="relative bg-white rounded-xl p-4 shadow-md border-2 border-red-200 hover:shadow-lg transition w-full h-32 flex items-center justify-center">
            {/* Ribbon */}
            <div className="absolute top-0 left-0 transform -translate-x-1 -translate-y-1 z-20">
              <div className="bg-red-600 text-white text-xs font-bold uppercase py-1 px-3 rounded-br-lg shadow-lg">
                {tank.nomor_gt}
              </div>
            </div>

            <img
              src={getTankIcon(tank.tipe)}
              alt="Grease Tank"
              className="h-16 w-16 object-contain"
            />
          </div>

          {/* Tank Info */}
          <div className="text-center w-full mt-3">
            <div className="text-xs font-bold text-gray-900 bg-red-100 px-2 py-1 rounded-full inline-block mb-2">
              NEW GT
            </div>
            <div className="text-sm font-bold text-gray-900 truncate px-1">
              {tank.nomor_gt}
            </div>
            <div className="text-xs text-gray-600 mt-1">
              From:{' '}
              <span className="font-semibold">
                {fromCluster?.name || SUPPLIER_NAME}
              </span>
            </div>
            <div className="text-xs text-red-600 font-semibold mt-0.5">
              Type: {tank.tipe}
            </div>
          </div>
        </div>

        {/* ========== MIDDLE: ARROW ========== */}
        <div className="flex items-center justify-center self-stretch">
          <SimpleFlowArrow label="RESTOCK" color="red" />
        </div>

        {/* ========== RIGHT: WAREHOUSE RECEIVING ========== */}
        <div className="flex flex-col items-center justify-between w-32 self-stretch">
          {/* Warehouse Card */}
          <div className="bg-white rounded-xl p-4 shadow-md border-2 border-orange-200 hover:shadow-lg transition w-full h-32 flex items-center justify-center">
            <img
              src={Warehouse}
              alt="Warehouse Icon"
              className="h-16 w-16 object-contain"
            />
          </div>

          {/* Warehouse Info */}
          <div className="text-center w-full mt-3">
            <div className="text-xs font-bold text-gray-900 bg-orange-100 px-2 py-1 rounded-full inline-block mb-2">
              RECEIVING
            </div>
            <div className="text-sm font-bold text-gray-900 truncate px-1">
              {toCluster?.name}
            </div>
            <div className="text-xs text-gray-600 mt-1">
              Storage <span className="font-semibold">Warehouse</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
