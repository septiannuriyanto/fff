import React, { useCallback } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { ClusterWithConsumers, TankWithLocation, ConsumerUnit } from '../types/grease.types';
import { DraggableTank } from './DraggableTank';
import { DroppableConsumer } from './DroppableConsumer';


export const DroppableCluster: React.FC<{
  cluster: ClusterWithConsumers;
  tanks: TankWithLocation[];
  clusterGroups: ClusterWithConsumers[];
  consumers: ConsumerUnit[];
  onConsumerTap?: (consumer: ConsumerUnit) => void; // ✅ NEW
}> = React.memo(({ cluster, tanks, clusterGroups, consumers, onConsumerTap }) => {
  const { isOver, setNodeRef } = useDroppable({ id: cluster.id });
  const isRegister = cluster.name.toLowerCase() === 'register';
  const clusterConsumers = cluster.associatedConsumers || [];
  const isConsumerDroppoint = clusterConsumers.length > 0;

  const getDroppableStyles = useCallback(() => {
    if (isRegister) {
      return 'border-purple-300 bg-purple-50';
    }
    if (isOver && !isConsumerDroppoint) {
      return 'border-green-400 bg-green-50 shadow-lg';
    }
    if (isOver && isConsumerDroppoint) {
      return 'border-indigo-400 bg-indigo-50 shadow-lg';
    }
    return 'border-gray-200 bg-white hover:shadow-md';
  }, [isRegister, isOver, isConsumerDroppoint]);

  return (
    <div
      ref={setNodeRef}
      className={`border-2 rounded-lg p-4 transition-all w-full ${getDroppableStyles()}`}
    >
      {/* Cluster Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-bold text-lg text-gray-800">{cluster.name}</h4>
            <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded font-semibold">
              {tanks.length} tanks
            </span>
            {isConsumerDroppoint && (
              <span className="bg-indigo-200 text-indigo-800 text-xs px-2 py-0.5 rounded font-semibold">
                {clusterConsumers.length} Consumers
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tanks Display */}
      {/* ✅ UPDATED: Only show section if tanks exist OR currently dropping */}
      {(tanks.length > 0 || isOver) && (
        <div className="border-t border-gray-200 pt-3">
          <div className="flex gap-3 flex-wrap min-h-[80px] bg-gray-50 rounded-lg p-3">
            {tanks.length === 0 ? (
              <div className="w-full text-center text-gray-400 text-sm py-4">
                Drop tank here
              </div>
            ) : (
              tanks
                .sort((a, b) => (b.tipe ?? '').localeCompare(a.tipe ?? ''))
                .sort((a, b) => (b.status ?? '').localeCompare(a.status ?? ''))
                .map((tank) => (
                  <DraggableTank
                    key={tank.id}
                    tank={tank}
                    fromClusterId={cluster.id}
                    clusterGroups={clusterGroups}
                    consumers={consumers}
                  />
                ))
            )}
          </div>
        </div>
      )}

      {/* Consumer Units Section */}
      

{/* Consumer Units Section */}
{isConsumerDroppoint && (
  <div className="border-t border-gray-200 pt-3 mt-3">
    <h5 className="font-semibold text-sm text-gray-700 mb-2">
      Unit Konsumen (Droppoint)
    </h5>
    <div className="flex flex-wrap gap-3 p-2 bg-gray-50 rounded-lg min-h-[100px]">
      {clusterConsumers.map((consumer) => (
        <DroppableConsumer
          key={consumer.id}
          consumer={consumer}
          parentClusterId={cluster.id}
          onTap={onConsumerTap} // ✅ NEW: Pass tap handler dari parent
        />
      ))}
    </div>
    {isOver && (
      <div className="text-center text-xs text-indigo-700 mt-2">
        Drop di area Cluster ini untuk memilih Unit Destinasi secara Manual.
      </div>
    )}
  </div>
)}
    </div>
  );
});
DroppableCluster.displayName = 'DroppableCluster';