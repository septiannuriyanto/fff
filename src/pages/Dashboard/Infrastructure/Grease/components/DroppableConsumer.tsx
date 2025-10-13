import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { ConsumerUnit } from '../types/grease.types';
import LubcarEmpty from '../../../../../images/icon/lubcar-empty.png';
import LubcarAlbida from '../../../../../images/icon/lubcar-mounted.png';
import LubcarAlvania from '../../../../../images/icon/lubcar-mounted-alt.png';
import { DraggableLubcar } from './DraggableLubcar';

export const DroppableConsumer: React.FC<{
  consumer: ConsumerUnit;
  parentClusterId: string;
}> = React.memo(({ consumer, parentClusterId }) => {
  const { isOver, setNodeRef } = useDroppable({
    id: consumer.id,
    data: { isConsumerUnit: true, parentClusterId: parentClusterId },
  });

  let iconSrc = LubcarEmpty;
  if (consumer.current_grease_type === 'ALBIDA') iconSrc = LubcarAlbida;
  else if (consumer.current_grease_type === 'ALVANIA') iconSrc = LubcarAlvania;

  const qtyText = consumer.current_tank_qty > 0 ? `(${consumer.current_tank_qty})` : '';
  const hasFilledTank = consumer.current_grease_type !== 'EMPTY';

  return (
    <div
      ref={setNodeRef}
      className={`p-2 border rounded-lg text-center cursor-default transition-all duration-200 w-28 h-32 flex flex-col justify-between items-center relative overflow-hidden ${
        isOver
          ? 'border-blue-500 bg-blue-50 shadow-md ring-2 ring-blue-500'
          : 'border-gray-200 bg-white hover:shadow-sm'
      }`}
    >
      {/* Ribbon LO Number - Top Left */}
      {hasFilledTank && (
        <div className="absolute -top-0.5 -left-7 transform -rotate-45 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-[10px] font-bold px-7 py-1 shadow-md z-10 pointer-events-none">
          {consumer.current_tank_nomor_gt || 'N/A'}
        </div>
      )}

      {/* Draggable Lubcar Image - Only if filled */}
      {hasFilledTank ? (
        <div className="absolute inset-0 flex items-center justify-center rounded-lg z-0">
          <DraggableLubcar consumer={consumer} parentClusterId={parentClusterId} />
        </div>
      ) : null}

      {/* Background info - visible when not dragging filled tank */}
      <div className={hasFilledTank ? 'opacity-0 pointer-events-none' : ''}>
        <img
          src={iconSrc}
          alt={`${consumer.unit_id} status`}
          className="h-12 w-12 mx-auto object-contain"
        />
      </div>
      <div className="text-xs font-semibold mt-1 truncate w-full">
        {consumer.unit_id || 'N/A'}
      </div>
      <div
        className={`text-[10px] ${
          consumer.current_grease_type === 'ALBIDA'
            ? 'text-green-600'
            : consumer.current_grease_type === 'ALVANIA'
            ? 'text-yellow-600'
            : 'text-gray-500'
        }`}
      >
        {consumer.current_grease_type} {qtyText}
      </div>
    </div>
  );
});
DroppableConsumer.displayName = 'DroppableConsumer';
