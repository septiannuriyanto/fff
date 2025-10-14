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
  onTap?: (consumer: ConsumerUnit) => void; // ✅ NEW: Add tap handler
}> = React.memo(({ consumer, parentClusterId, onTap }) => {
  const { isOver, setNodeRef } = useDroppable({
    id: consumer.id,
    data: { isConsumerUnit: true, parentClusterId: parentClusterId },
  });

  const iconSrc = getConsumerIcon(
    consumer.unit_id || '',
    consumer.current_grease_type || 'EMPTY',
  );

  const qtyText =
    consumer.current_tank_qty > 0 ? `${consumer.current_tank_qty} KG` : '';
  const hasFilledTank = consumer.current_grease_type !== 'EMPTY';

  // Ribbon color based on grease type
  const getRibbonColor = () => {
    if (!hasFilledTank) {
      return {
        bg: 'bg-slate-600',
        text: 'text-white',
        lightBg: 'bg-slate-400',
      };
    }

    if (consumer.current_grease_type === 'ALVANIA') {
      return {
        bg: 'bg-yellow-500',
        text: 'text-white',
        lightBg: 'bg-yellow-400',
      };
    }

    if (consumer.current_grease_type === 'ALBIDA') {
      return {
        bg: 'bg-red-500',
        text: 'text-white',
        lightBg: 'bg-red-400',
      };
    }

    return {
      bg: 'bg-slate-600',
      text: 'text-white',
      lightBg: 'bg-slate-400',
    };
  };

  const getBackgroundColor = () => {
    if (!hasFilledTank) {
      return 'bg-white';
    }

    if (consumer.current_grease_type === 'ALVANIA') {
      return 'bg-yellow-50';
    }

    if (consumer.current_grease_type === 'ALBIDA') {
      return 'bg-red-50';
    }

    return 'bg-white';
  };

  const getBorderColor = () => {
    if (isOver) {
      return 'border-blue-500';
    }

    if (!hasFilledTank) {
      return 'border-slate-200';
    }

    if (consumer.current_grease_type === 'ALVANIA') {
      return 'border-yellow-200';
    }

    if (consumer.current_grease_type === 'ALBIDA') {
      return 'border-red-200';
    }

    return 'border-slate-200';
  };

  const ribbonColors = getRibbonColor();

  // ✅ NEW: Handle tap/click
  const handleClick = () => {
    if (onTap) {
      onTap(consumer);
    }
  };

  return (
    <div
      ref={setNodeRef}
      onClick={handleClick} // ✅ NEW: Add click handler
      className={`relative p-3 pb-5 border rounded-lg text-center transition-all duration-200 w-28 min-h-[140px] flex flex-col overflow-visible ${getBackgroundColor()} ${getBorderColor()} ${
        isOver ? 'shadow-md ring-2 ring-blue-500' : 'hover:shadow-sm'
      } ${
        onTap ? 'cursor-pointer hover:scale-105' : 'cursor-default' // ✅ NEW: Show clickable
      }`}
    >
      {/* TOP RIBBONS - 3D STACKED STYLE */}
      <div className="absolute top-0 left-0 right-0 flex items-start z-20 pointer-events-none">
        {/* BACK RIBBON - LOCATION (FULL WIDTH) */}
        <div
          className={`${ribbonColors.lightBg} ${ribbonColors.text} text-left text-ellipsis text-[9px] font-bold px-1.5 py-[3px] shadow-sm w-full rounded-t-md relative z-0`}
        >
          {consumer.description || 'LOC'}
        </div>

        {/* FRONT RIBBON - UNIT ID (OVERLAYED WITH DEPTH) */}
        <div
          className={`${ribbonColors.bg} ${ribbonColors.text}  text-[8px] font-bold px-2 py-[3px] shadow-md rounded-bl-lg absolute right-1 top-[2px] z-10 transform translate-x-1 -translate-y-1`}
          style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.25)' }}
        >
          {consumer.unit_id || 'N/A'}
        </div>
      </div>

      {/* ICON SECTION */}
      <div className="flex-1 flex items-center justify-center mb-2 mt-4">
        {hasFilledTank ? (
          <DraggableLubcar
            consumer={consumer}
            parentClusterId={parentClusterId}
          />
        ) : (
          <img
            src={iconSrc}
            alt={`${consumer.unit_id} status`}
            className="h-14 w-14 object-contain opacity-40"
          />
        )}
      </div>

      {/* BOTTOM RIBBONS (SEAMLESS) */}
      {hasFilledTank && (
        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between z-10 pointer-events-none">
          <div
            className={`${ribbonColors.bg} ${ribbonColors.text} text-[9px] font-bold px-2 py-1 shadow-sm flex-1 text-left`}
          >
            {consumer.current_tank_nomor_gt || 'N/A'}
          </div>
          <div
            className={`${ribbonColors.bg} ${ribbonColors.text} text-[9px] font-bold px-2 py-1 shadow-sm flex-1 text-right`}
          >
            {qtyText}
          </div>
        </div>
      )}
    </div>
  );
});

DroppableConsumer.displayName = 'DroppableConsumer';
