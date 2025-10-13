// ============================================
// components/MovementModal/Shared/TankCard.tsx
// ============================================

import React from 'react';
import { TankCardProps } from '../types/modal.types';
import { getTankIcon } from '../utils/iconHelpers';

export const TankCard: React.FC<TankCardProps> = ({
  tankNumber,
  tankType,
  qty,
  status,
  location,
  label,
  badgeColor,
  borderColor,
  ribbonColor,
  additionalInfo,
  isOld = false,
}) => {
  return (
    <div className="flex flex-col items-center">
      <div
        className={`relative bg-white rounded-xl p-6 mb-4 shadow-md border-2 ${borderColor} hover:shadow-lg transition`}
      >
        {/* RIBBON */}
        <div className="absolute top-0 left-0 transform -translate-x-1 -translate-y-1 z-20">
          <div className={`${ribbonColor} text-white text-xs font-bold uppercase py-1 px-4 rounded-br-lg shadow-lg`}>
            {tankNumber}
          </div>
        </div>
        {/* TANK ICON */}
        <img
          src={getTankIcon(tankType)}
          alt={`Tank ${tankNumber}`}
          className={`h-24 w-24 object-contain mx-auto ${isOld ? 'opacity-50 hue-rotate-180' : ''}`}
        />
      </div>

      {/* DETAILS */}
      <div className="text-center">
        <div className={`text-sm font-bold text-gray-900 ${badgeColor} px-3 py-1 rounded-full inline-block mb-2`}>
          {label}
        </div>
        <div className="text-base font-bold text-gray-900">{tankNumber}</div>
        {location && (
          <div className="text-xs text-gray-600 mt-2">
            {location.includes(':') ? location.split(':')[0] : 'At'}:{' '}
            <span className="font-semibold">{location.includes(':') ? location.split(':')[1] : location}</span>
          </div>
        )}
        <div className="mt-3 space-y-1">
          <div className={`inline-block ${badgeColor.replace('bg-', 'bg-').replace('-100', '-100')} text-${badgeColor.split('-')[1]}-700 text-xs font-bold px-2 py-1 rounded`}>
            Qty: {qty}L
          </div>
          {tankType && (
            <div className="block text-xs text-gray-600 mt-1">
              Type: <span className="font-mono">{tankType}</span>
            </div>
          )}
          {status && (
            <div className="text-xs text-green-600 font-semibold mt-1">Status: {status}</div>
          )}
          {additionalInfo}
        </div>
      </div>
    </div>
  );
};