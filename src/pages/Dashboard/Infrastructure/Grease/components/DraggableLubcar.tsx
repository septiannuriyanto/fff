// ============================================
// components/DraggableLubcar.tsx
// ============================================

import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { ConsumerUnit } from '../types/grease.types';
import { getConsumerIcon } from './MovementModal/utils/iconHelpers';

interface DraggableLubcarProps {
  consumer: ConsumerUnit;
  parentClusterId: string;
}

export const DraggableLubcar: React.FC<DraggableLubcarProps> = ({ 
  consumer, 
  parentClusterId 
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `lubcar-release-${consumer.id}`,
    data: {
      isLubcarRelease: true,
      consumer,
      parentClusterId,
    },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    cursor: isDragging ? 'grabbing' : 'grab',
  };

  const iconSrc = getConsumerIcon(
    consumer.unit_id || '',
    consumer.current_grease_type || 'EMPTY'
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`transition-opacity ${isDragging ? 'opacity-50' : 'opacity-100'}`}
      title={`Drag ${consumer.unit_id} to return tank ${consumer.current_tank_nomor_gt} to warehouse`}
    >
      <img
        src={iconSrc}
        alt={`${consumer.unit_id} - ${consumer.current_grease_type}`}
        className="h-14 w-14 object-contain pointer-events-none select-none"
        draggable={false}
      />
    </div>
  );
};