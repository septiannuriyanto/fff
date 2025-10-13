// ============================================
// components/MovementModal/HeroSections/InstallationHero.tsx
// ============================================

import React from 'react';
import { HeroSectionBaseProps } from '../types/modal.types';
import { getTankIcon, getConsumerIcon } from '../utils/iconHelpers';
import { SimpleFlowArrow } from '../Shared/FlowArrow';
import { findConsumerById } from '../utils/consumerHelpers';

export const InstallationHero: React.FC<HeroSectionBaseProps> = ({
  tank,
  consumerTargetId,
  consumersList = [],
}) => {
  const targetConsumer = consumerTargetId
    ? findConsumerById(consumerTargetId, consumersList)
    : null;

  return (
    <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-200 px-6 py-8">
      <p className="text-xs font-semibold text-green-900 mb-4">Installation Flow</p>
      <div className="flex items-center justify-center gap-4">
        {/* GREASE TANK */}
        <div className="flex flex-col items-center">
          <div className="relative bg-white rounded-xl p-6 mb-4 shadow-md border-2 border-green-200 hover:shadow-lg transition">
            <div className="absolute top-0 left-0 transform -translate-x-1 -translate-y-1 z-20">
              <div className="bg-green-600 text-white text-xs font-bold uppercase py-1 px-4 rounded-br-lg shadow-lg">
                {tank.nomor_gt}
              </div>
            </div>
            <img
              src={getTankIcon(tank.tipe)}
              alt="Grease Tank"
              className="h-20 w-20 object-contain"
            />
          </div>
          <div className="text-center">
            <div className="text-sm font-bold text-gray-900 bg-green-100 px-3 py-1 rounded-full inline-block mb-2">
              GT
            </div>
            <div className="text-base font-bold text-gray-900">{tank.nomor_gt}</div>
            <div className="text-xs text-gray-600 mt-2">
              Qty: <span className="font-semibold">{tank.qty}L</span>
            </div>
            <div className="text-xs text-green-600 font-semibold mt-1">Type: {tank.tipe}</div>
          </div>
        </div>

        {/* ARROW */}
        <SimpleFlowArrow label="INSTALL" color="green" />

        {/* CONSUMER EMPTY (Auto-detect Lubcar/Pitstop) */}
        <div className="flex flex-col items-center">
          <div className="bg-white rounded-xl p-6 mb-4 shadow-md border-2 border-green-200 hover:shadow-lg transition">
            {/* ✅ UPDATED: Auto-detect icon */}
            <img
              src={getConsumerIcon(
                targetConsumer?.unit_id || '',
                'EMPTY'
              )}
              alt="Consumer Empty"
              className="h-20 w-20 object-contain"
            />
          </div>
          <div className="text-center">
            <div className="text-sm font-bold text-gray-900 bg-gray-100 px-3 py-1 rounded-full inline-block mb-2">
              EMPTY
            </div>
            <div className="text-base font-bold text-gray-900">
              {targetConsumer?.unit_id || 'Unit'}
            </div>
            <div className="text-xs text-gray-600 mt-2">
              Consumer <span className="font-semibold">Empty</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};