// ============================================
// components/GreaseClusterMonitoring.tsx
// ============================================

import React, { useEffect, useState, useCallback } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  TouchSensor,
  Active,
} from '@dnd-kit/core';

// ✅ UPDATED: Import SUPPLIER_NAME
import { MAIN_WAREHOUSE_STORAGE_CLUSTER, SUPPLIER_NAME } from './types/grease.constants';

// Import images
import GreaseTankIcon from '../../../../images/icon/grease-tank.png';
import GreaseTankIconYellow from '../../../../images/icon/grease-tank-alt.png';
import LubcarAlbida from '../../../../images/icon/lubcar-mounted.png';
import LubcarAlvania from '../../../../images/icon/lubcar-mounted-alt.png';
import LubcarEmpty from '../../../../images/icon/lubcar-empty.png';
import { useGreaseData } from './hooks/useGreaseData';
import { useTankMovement } from './hooks/useTankMovement';
import { ConsumerUnit, GreaseCluster, PendingMovement, TankWithLocation } from './types/grease.types';
import { DroppableCluster } from './components/DroppableCluster';
import { MovementModal } from './components/MovementModal/MovementModal';

const GreaseClusterMonitoring: React.FC = () => {
  // ========== DATA HOOKS ==========
  const { clusterGroups, consumers, tanks, loading, fetchData } = useGreaseData();
  const { handleConfirmMovement } = useTankMovement(fetchData);

  // ========== LOCAL STATE ==========
  const [activeTank, setActiveTank] = useState<TankWithLocation | null>(null);
  const [activeLubcar, setActiveLubcar] = useState<ConsumerUnit | null>(null);
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [pendingMovement, setPendingMovement] = useState<PendingMovement | null>(null);

  // ========== DRAG & DROP SENSORS ==========
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { distance: 5, delay: 100, tolerance: 5 },
    })
  );

  // ========== LIFECYCLE ==========
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ========== HELPER FUNCTIONS ==========

  /**
   * Get tanks in specific cluster or register
   */
  const getTanksInCluster = useCallback(
    (clusterId: string, clusterName: string): TankWithLocation[] => {
      if (clusterName.toLowerCase() === 'register') {
        return tanks.filter(
          (tank) => tank.current_cluster_id === null && !tank.current_consumer_id
        );
      }
      return tanks.filter((tank) => tank.current_cluster_id === clusterId);
    },
    [tanks]
  );

  /**
   * Handle drag start - track active element
   */
  const handleDragStart = (event: { active: Active }) => {
    const dragData = event.active.data.current as any;
    if (dragData && 'tank' in dragData) {
      setActiveTank(dragData.tank as TankWithLocation);
    } else if (dragData && 'isLubcarRelease' in dragData) {
      setActiveLubcar(dragData.consumer as ConsumerUnit);
    }
  };

  /**
   * Handle drag end - process movement logic
   */
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTank(null);
    setActiveLubcar(null);

    if (!over) return;

    const dragData = active.data.current as any;

    // ========== HANDLE LUBCAR RELEASE (Return tank to Main Warehouse) ==========
    if (dragData?.isLubcarRelease) {
      const consumer = dragData.consumer as ConsumerUnit;

      if (!consumer.current_tank_id) {
        toast.error('No tank to release from this unit');
        return;
      }

      // Find main warehouse cluster
      const mainWarehouseCluster = clusterGroups.find(
        (c) => c.id === (over.id as string)
      );

      // Verify it's actually the main warehouse
      if (
        !mainWarehouseCluster ||
        mainWarehouseCluster.name.toUpperCase() !== MAIN_WAREHOUSE_STORAGE_CLUSTER
      ) {
        toast.error(
          `Tank can only be returned to ${MAIN_WAREHOUSE_STORAGE_CLUSTER}. Please drag lubcar unit to the warehouse cluster.`
        );
        return;
      }

      const consumersCluster = clusterGroups.find(
        (c) => c.id === consumer.grease_cluster_id
      );

      const tankToReturn = tanks.find((t) => t.id === consumer.current_tank_id);

      if (!tankToReturn) {
        toast.error('Tank not found');
        return;
      }

      setPendingMovement({
        tank: tankToReturn,
        fromClusterId: consumer.grease_cluster_id || '',
        toId: '',
        isToConsumer: false,
        isDroppedOnUnit: false,
        fromCluster: consumersCluster,
        toCluster: mainWarehouseCluster,
      });
      setShowMovementModal(true);
      return;
    }

    // ========== HANDLE TANK DRAGGING ==========
    const tank = dragData?.tank;
    const fromClusterId = dragData?.fromClusterId;

    if (!tank || fromClusterId === (over.id as string)) return;

    const fromCluster = clusterGroups.find((c) => c.id === fromClusterId);
    const overData = over.data.current as {
      isConsumerUnit?: boolean;
      parentClusterId?: string;
    };

    let toCluster: GreaseCluster | undefined = undefined;
    let isToConsumer = overData?.isConsumerUnit || false;
    let isDroppedOnUnit = overData?.isConsumerUnit || false;
    let toId = over.id as string;

    // ========== PROCESS DROP TARGET ==========
    if (isToConsumer) {
      const consumerTargetId = over.id as string;
      const targetConsumer = consumers.find((c) => c.id === consumerTargetId);

      if (!targetConsumer) return;

      // Validate: DC tanks cannot go to consumer
      if (tank.status === 'DC') {
        toast.error(
          `Tank ${tank.nomor_gt} is DC (Discarded). Consumer cluster can only receive NEW tanks.`
        );
        return;
      }

      // Info if will replace
      if (
        targetConsumer.current_grease_type !== 'EMPTY' &&
        targetConsumer.current_tank_id
      ) {
        toast.success(
          `${targetConsumer.unit_id} already has a tank. It will be replaced and old tank returned to ${MAIN_WAREHOUSE_STORAGE_CLUSTER}.`
        );
      }

      const parentCluster = clusterGroups.find(
        (c) => c.id === targetConsumer.grease_cluster_id
      );

      if (!parentCluster) {
        toast.error(
          `Consumer ${targetConsumer.unit_id} has no assigned parent cluster.`
        );
        return;
      }

      toCluster = parentCluster;
      toId = consumerTargetId;
    } else {
      toCluster = clusterGroups.find((c) => c.id === (over.id as string));

      if (!toCluster) return;

      const clusterDestination = clusterGroups.find(
        (c) => c.id === (over.id as string)
      );
      const hasConsumers = clusterDestination?.associatedConsumers.length;

      // If cluster has consumers, treat as consumer destination
      if (hasConsumers) {
        isToConsumer = true;
        isDroppedOnUnit = false;
        toId = '';
      } else {
        // Cluster-to-cluster transfer
        const canReceive = toCluster.receives || [];
        const isRegister = toCluster.name.toLowerCase() === 'register';

        if (
          !isRegister &&
          canReceive.length > 0 &&
          !canReceive.includes(tank.status || '')
        ) {
          toast.error(
            `${toCluster.name} can only receive: ${canReceive.join(', ')}`
          );
          return;
        }
      }
    }

    if (!toCluster) return;

    // ✅ UPDATED: Use SUPPLIER_NAME constant
    const isFromRegister = !fromCluster || fromCluster.name.toLowerCase() === 'register';
    const isToSupplier = toCluster.name.toUpperCase() === SUPPLIER_NAME;

    if (isFromRegister && (isToConsumer || isToSupplier)) {
      toast.error(
        `🚫 Tank from REGISTER must be moved to ${MAIN_WAREHOUSE_STORAGE_CLUSTER} first, not directly to Consumer/${SUPPLIER_NAME}.`,
        {
          duration: 4000,
          icon: '⚠️',
        }
      );
      return;
    }

    // ========== SET PENDING MOVEMENT & SHOW MODAL ==========
    setPendingMovement({
      tank,
      fromClusterId,
      toId,
      isToConsumer,
      isDroppedOnUnit,
      fromCluster,
      toCluster: toCluster as GreaseCluster,
    });
    setShowMovementModal(true);
  };

  // ========== RENDER ==========

  if (loading) {
    return (
      <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark p-6">
        <div className="text-center text-gray-500">Loading data...</div>
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <Toaster position="top-center" />

      {/* Movement Modal */}
      {showMovementModal && pendingMovement && (
        <MovementModal
          tank={pendingMovement.tank}
          fromCluster={pendingMovement.fromCluster}
          toCluster={pendingMovement.toCluster}
          isToConsumer={pendingMovement.isToConsumer}
          isDroppedOnUnit={pendingMovement.isDroppedOnUnit}
          consumerTargetId={pendingMovement.toId}
          consumersList={consumers}
          clusterGroups={clusterGroups}
          onConfirm={(formData: any) => {
            handleConfirmMovement(
              pendingMovement,
              consumers,
              clusterGroups,
              formData
            );
            setShowMovementModal(false);
            setPendingMovement(null);
          }}
          onCancel={() => {
            setShowMovementModal(false);
            setPendingMovement(null);
          }}
        />
      )}

      {/* Main Container */}
      <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
        {/* Header */}
        <div className="border-b border-stroke py-4 px-6 dark:border-strokedark">
          <h3 className="font-bold text-black dark:text-white text-xl">
            Grease Cluster Monitoring
          </h3>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col gap-4">
          {clusterGroups.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No clusters found</div>
          ) : (
            clusterGroups.map((cluster) => {
              const clusterTanks = getTanksInCluster(cluster.id, cluster.name);
              return (
                <DroppableCluster
                  key={cluster.id}
                  cluster={cluster}
                  tanks={clusterTanks}
                  clusterGroups={clusterGroups}
                  consumers={consumers}
                />
              );
            })
          )}
        </div>
      </div>

      {/* Drag Overlay - Visual feedback during drag */}
      <DragOverlay>
        {activeTank ? (
          // Regular tank drag
          <div
            className="cursor-grabbing text-center w-16 opacity-80"
            style={{ touchAction: 'none' }}
          >
            <img
              src={
                activeTank.tipe === 'ALVANIA'
                  ? GreaseTankIconYellow
                  : GreaseTankIcon
              }
              className={`h-10 mx-auto ${
                activeTank.status === 'DC' ? 'opacity-50 hue-rotate-180' : ''
              }`}
              alt={`Tank ${activeTank.nomor_gt}`}
            />
            <div className="text-xs bg-gray-200 rounded-full px-1 mt-1">
              {activeTank.nomor_gt}
            </div>
          </div>
        ) : activeLubcar ? (
          // ✅ FIXED: Consumer release - Show TANK being returned, not consumer icon
          <div
            className="cursor-grabbing text-center w-20 opacity-80"
            style={{ touchAction: 'none' }}
          >
            {/* Show GREASE TANK DC icon */}
            <img
              src={
                activeLubcar.current_grease_type === 'ALVANIA'
                  ? GreaseTankIconYellow
                  : GreaseTankIcon
              }
              className="h-12 mx-auto object-contain opacity-60 hue-rotate-180" // DC style
              alt={`Returning tank ${activeLubcar.current_tank_nomor_gt}`}
            />
            {/* Show TANK number, not unit ID */}
            <div className="text-xs bg-red-100 border border-red-300 text-red-700 rounded-full px-2 py-0.5 mt-1 font-semibold">
              {activeLubcar.current_tank_nomor_gt || 'N/A'}
            </div>
            <div className="text-[9px] text-red-600 font-bold mt-0.5">
              DC - Returning
            </div>
            {/* Optional: Show from which unit */}
            <div className="text-[8px] text-gray-500 mt-0.5">
              from {activeLubcar.unit_id}
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default GreaseClusterMonitoring;