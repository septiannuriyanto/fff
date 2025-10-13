import React from 'react';
import { useDraggable } from '@dnd-kit/core';

import GreaseTankIcon from '../../../../../images/icon/grease-tank.png';
import GreaseTankIconYellow from '../../../../../images/icon/grease-tank-alt.png';
import { getCurrentLocationName, getTankIcon } from '../types/grease.utils';
import { ClusterWithConsumers, ConsumerUnit, TankWithLocation } from '../types/grease.types';

export const DraggableTank: React.FC<{
  tank: TankWithLocation;
  fromClusterId: string;
  clusterGroups: ClusterWithConsumers[];
  consumers: ConsumerUnit[];
}> = React.memo(({ tank, fromClusterId, clusterGroups, consumers }) => {
  const draggableId = `${tank.id}-${fromClusterId}`;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: draggableId,
    data: { tank, fromClusterId },
  });

  const tankIcon = getTankIcon(tank.tipe, GreaseTankIconYellow, GreaseTankIcon);
  const locationName = getCurrentLocationName(tank, clusterGroups, consumers);

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{ touchAction: 'none' }}
      className={`cursor-move text-center w-16 ${isDragging ? 'opacity-30' : ''}`}
    >
      <img
        src={tankIcon}
        className={`h-10 mx-auto ${tank.status === 'DC' ? 'opacity-50 hue-rotate-180' : ''}`}
        alt={`Tank ${tank.nomor_gt}`}
      />
      <div className="text-xs bg-gray-200 rounded-full px-1 mt-1">{tank.nomor_gt}</div>
      <div
        className={`text-[10px] font-semibold mt-0.5 ${
          tank.status === 'NEW' ? 'text-green-600' : 'text-orange-600'
        }`}
      >
        {tank.status}
      </div>
      <div className="text-[10px] text-gray-600 mt-0.5">{locationName}</div>
      {tank.qty > 1 && <div className="text-[10px] text-gray-500">Qty: {tank.qty}</div>}
    </div>
  );
});
DraggableTank.displayName = 'DraggableTank';