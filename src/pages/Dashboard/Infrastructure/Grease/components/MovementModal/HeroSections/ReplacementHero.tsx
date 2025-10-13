// ============================================
// components/MovementModal/HeroSections/ReplacementHero.tsx
// ============================================

import React from 'react';
import { HeroSectionBaseProps } from '../types/modal.types';
import { TankCard } from '../Shared/TankCard';
import { FlowArrow } from '../Shared/FlowArrow';
import { MAIN_WAREHOUSE_STORAGE_CLUSTER } from '../../../types/grease.constants';

export const ReplacementHero: React.FC<HeroSectionBaseProps> = ({
  tank,
  fromCluster,
  oldTankInConsumer,
}) => {
  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200 px-6 py-8">
      <p className="text-xs font-semibold text-blue-900 mb-4">Tank Replacement Flow</p>
      <div className="flex items-center justify-between gap-3">
        {/* NEW TANK */}
        <TankCard
          tankNumber={tank.nomor_gt}
          tankType={tank.tipe}
          qty={tank.qty}
          status={tank.status ?? undefined}
          location={`From: ${fromCluster?.name || 'WAREHOUSE'}`}
          label="NEW"
          badgeColor="bg-blue-100"
          borderColor="border-blue-200"
          ribbonColor="bg-blue-600"
          additionalInfo={
            <div className="text-xs text-gray-600 mt-1">
              Type: <span className="font-mono">{tank.tipe}</span>
            </div>
          }
        />

        {/* ARROW */}
        <FlowArrow label="REPLACING" color="indigo" />

        {/* OLD TANK */}
        <TankCard
          tankNumber={oldTankInConsumer?.current_tank_nomor_gt || 'N/A'}
          tankType={oldTankInConsumer?.current_grease_type ?? null}
          qty={oldTankInConsumer?.current_tank_qty || 0}
          location={`At: ${oldTankInConsumer?.unit_id || 'UNIT'}`}
          label="OLD (DC)"
          badgeColor="bg-orange-100"
          borderColor="border-orange-200"
          ribbonColor="bg-orange-600"
          isOld
          additionalInfo={
            <>
              <div className="text-xs font-semibold text-orange-600 mt-1">Will be marked DC</div>
              <div className="text-xs text-orange-700 mt-2 font-semibold">
                Return to {MAIN_WAREHOUSE_STORAGE_CLUSTER}
              </div>
            </>
          }
        />
      </div>
      <div className="mt-4 bg-white rounded-lg px-4 py-3 border-l-4 border-indigo-600 shadow-sm">
        <p className="text-xs text-gray-800 font-medium">
          <span className="text-indigo-600 font-bold">Note:</span> Old tank will be marked as DC and
          returned to {MAIN_WAREHOUSE_STORAGE_CLUSTER}
        </p>
      </div>
    </div>
  );
};