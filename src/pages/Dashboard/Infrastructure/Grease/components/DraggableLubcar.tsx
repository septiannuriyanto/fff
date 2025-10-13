import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { ConsumerUnit } from '../types/grease.types';
import LubcarEmpty from '../../../../../images/icon/lubcar-empty.png';
import LubcarAlbida from '../../../../../images/icon/lubcar-mounted.png';
import LubcarAlvania from '../../../../../images/icon/lubcar-mounted-alt.png';

export const DraggableLubcar: React.FC<{
  consumer: ConsumerUnit;
  parentClusterId: string;
}> = React.memo(({ consumer, parentClusterId }) => {
  const draggableId = `lubcar-${consumer.id}`;

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: draggableId,
    data: {
      isLubcarRelease: true,
      consumer,
      parentClusterId,
    },
  });

  let iconSrc = LubcarEmpty;
  if (consumer.current_grease_type === 'ALBIDA') iconSrc = LubcarAlbida;
  else if (consumer.current_grease_type === 'ALVANIA') iconSrc = LubcarAlvania;

  const hasFilledTank = consumer.current_grease_type !== 'EMPTY';

  if (!hasFilledTank) {
    return null;
  }

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{ touchAction: 'none' }}
      className={`cursor-grab active:cursor-grabbing p-2 transition-all w-full h-full flex flex-col items-center justify-center mb-9 ${
        isDragging ? 'opacity-40' : ''
      }`}
    >
      <img
        src={iconSrc}
        alt={`${consumer.unit_id} - Drag to release`}
        className="h-12 w-12 object-contain hover:opacity-80 transition-opacity"
        title="Drag to release grease tank"
      />
    </div>
  );
});
DraggableLubcar.displayName = 'DraggableLubcar';
