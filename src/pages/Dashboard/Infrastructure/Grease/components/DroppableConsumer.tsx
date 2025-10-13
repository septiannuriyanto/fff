// ============================================
// components/DroppableConsumer.tsx
// ============================================

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { ConsumerUnit } from '../types/grease.types';
import { getConsumerIcon } from './MovementModal/utils/iconHelpers';
import { DraggableLubcar } from './DraggableLubcar';

export const DroppableConsumer: React.FC<{
  consumer: ConsumerUnit;
  parentClusterId: string;
}> = React.memo(({ consumer, parentClusterId }) => {
  const { isOver, setNodeRef } = useDroppable({
    id: consumer.id,
    data: { isConsumerUnit: true, parentClusterId: parentClusterId },
  });

  const iconSrc = getConsumerIcon(
    consumer.unit_id || '',
    consumer.current_grease_type || 'EMPTY'
  );

  const qtyText = consumer.current_tank_qty > 0 ? `${consumer.current_tank_qty}L` : '';
  const hasFilledTank = consumer.current_grease_type !== 'EMPTY';

  return (
    <div
      ref={setNodeRef}
      className={`relative p-3 border rounded-lg text-center cursor-default transition-all duration-200 w-28 min-h-[140px] flex flex-col overflow-hidden ${
        isOver
          ? 'border-blue-500 bg-blue-50 shadow-md ring-2 ring-blue-500'
          : 'border-gray-200 bg-white hover:shadow-sm'
      }`}
    >
      {/* ========== RIBBON TANK NUMBER - TOP LEFT ========== */}
      {hasFilledTank && consumer.current_tank_nomor_gt && (
        <div className="absolute -top-0.5 -left-7 transform -rotate-45 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-[10px] font-bold px-7 py-1 shadow-md z-20 pointer-events-none whitespace-nowrap">
          {consumer.current_tank_nomor_gt}
        </div>
      )}

      {/* ========== ICON SECTION ========== */}
      <div className="flex-1 flex items-center justify-center mb-2 mt-2">
        {hasFilledTank ? (
          // Draggable filled consumer
          <DraggableLubcar consumer={consumer} parentClusterId={parentClusterId} />
        ) : (
          // Static empty consumer
          <img
            src={iconSrc}
            alt={`${consumer.unit_id} status`}
            className="h-14 w-14 object-contain"
          />
        )}
      </div>

      {/* ========== UNIT ID (ALWAYS VISIBLE) ========== */}
      <div className="text-xs font-bold text-gray-800 truncate w-full px-1 mb-1">
        {consumer.unit_id || 'N/A'}
      </div>

      {/* ========== STATUS INFO ========== */}
      <div className="flex flex-col gap-0.5">
        <div
          className={`text-[10px] font-semibold ${
            consumer.current_grease_type === 'ALBIDA'
              ? 'text-green-600'
              : consumer.current_grease_type === 'ALVANIA'
              ? 'text-yellow-600'
              : 'text-gray-400'
          }`}
        >
          {consumer.current_grease_type}
        </div>
        
        {qtyText && (
          <div className="text-[9px] text-gray-600 font-medium">
            {qtyText}
          </div>
        )}
      </div>

      {/* ========== DRAG HINT FOR FILLED TANK ========== */}
      {hasFilledTank && (
        <div className="absolute bottom-1 left-0 right-0 text-center">
          <div className="text-[8px] text-blue-600 font-semibold bg-blue-50 rounded-full px-2 py-0.5 inline-block">
            Drag to return
          </div>
        </div>
      )}
    </div>
  );
});

DroppableConsumer.displayName = 'DroppableConsumer';