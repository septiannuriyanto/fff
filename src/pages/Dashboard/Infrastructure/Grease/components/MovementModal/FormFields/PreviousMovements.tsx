// ============================================
// components/MovementModal/FormFields/PreviousMovements.tsx
// ============================================

import React from 'react';
import { TankMovement } from '../../../types/grease.types';

interface PreviousMovementsProps {
  movements: TankMovement[];
}

export const PreviousMovements: React.FC<PreviousMovementsProps> = ({ movements }) => {
  if (movements.length === 0) return null;

  return (
    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
      <p className="text-xs font-semibold text-gray-700 mb-3">Previous Movements (Last 5)</p>
      <div className="space-y-2 max-h-40 overflow-y-auto">
        {movements.map((movement) => (
          <div
            key={movement.id}
            className="text-xs bg-white p-2 rounded border border-gray-100 hover:bg-gray-50"
          >
            <div className="flex justify-between items-start mb-1">
              <span className="font-semibold text-blue-600">{movement.reference_no || 'N/A'}</span>
              <span className="text-gray-500 text-[10px]">
                {new Date(movement.movement_date).toLocaleDateString()}
              </span>
            </div>
            <div className="text-gray-700">
              <span className="font-mono bg-gray-100 px-1 py-0.5 rounded">{movement.from_qty}L</span>
              <span className="text-gray-400 mx-1">→</span>
              <span className="font-mono bg-gray-100 px-1 py-0.5 rounded">{movement.to_qty}L</span>
            </div>
            <div className="text-gray-500 mt-1">
              {movement.from_status} → {movement.to_status}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};