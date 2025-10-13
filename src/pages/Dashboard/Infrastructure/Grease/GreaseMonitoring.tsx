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

import { MAIN_WAREHOUSE_STORAGE_CLUSTER, SUPPLIER_NAME } from './types/grease.constants';

import GreaseTankIcon from '../../../../images/icon/grease-tank.png';
import GreaseTankIconYellow from '../../../../images/icon/grease-tank-alt.png';
import { useGreaseData } from './hooks/useGreaseData';
import { useTankMovement } from './hooks/useTankMovement';
import { ConsumerUnit, GreaseCluster, PendingMovement, TankWithLocation } from './types/grease.types';
import { DroppableCluster } from './components/DroppableCluster';
import { MovementModal } from './components/MovementModal/MovementModal';
import { ConsumerConfirmationModal } from './components/modals/ConsumerConfirmationModal';
import { TankSelectionModal } from './components/modals/TankSelectionModal';

const GreaseClusterMonitoring: React.FC = () => {
  // ========== DATA HOOKS ==========
  const { clusterGroups, consumers, tanks, loading, fetchData } = useGreaseData();
  const { handleConfirmMovement } = useTankMovement(fetchData);

  // ========== ALL STATE DECLARATIONS (GROUPED) ==========
  const [activeTank, setActiveTank] = useState<TankWithLocation | null>(null);
  const [activeLubcar, setActiveLubcar] = useState<ConsumerUnit | null>(null);
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [pendingMovement, setPendingMovement] = useState<PendingMovement | null>(null);
  
  // ✅ Modal states
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showTankSelectionModal, setShowTankSelectionModal] = useState(false);
  const [selectedConsumerForTap, setSelectedConsumerForTap] = useState<ConsumerUnit | null>(null);

  // ✅ NEW: Track if movement came from tap selection
  const [isFromTapSelection, setIsFromTapSelection] = useState(false);

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

    // ========== HANDLE LUBCAR RELEASE ==========
    if (dragData?.isLubcarRelease) {
      const consumer = dragData.consumer as ConsumerUnit;

      if (!consumer.current_tank_id) {
        toast.error('No tank to release from this unit');
        return;
      }

      const mainWarehouseCluster = clusterGroups.find(
        (c) => c.id === (over.id as string)
      );

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

    if (isToConsumer) {
      const consumerTargetId = over.id as string;
      const targetConsumer = consumers.find((c) => c.id === consumerTargetId);

      if (!targetConsumer) return;

      if (tank.status === 'DC') {
        toast.error(
          `Tank ${tank.nomor_gt} is DC (Discarded). Consumer cluster can only receive NEW tanks.`
        );
        return;
      }

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

      if (hasConsumers) {
        isToConsumer = true;
        isDroppedOnUnit = false;
        toId = '';
      } else {
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

  // ========== CONSUMER & TANK SELECTION HANDLERS ==========

  const handleConsumerTap = useCallback((consumer: ConsumerUnit) => {
    console.log('🔵 Consumer tapped:', consumer.unit_id);
    setSelectedConsumerForTap(consumer);
    setShowConfirmModal(true);
  }, []);

  const handleConfirmInstallation = useCallback(() => {
    console.log('✅ Confirmed installation');
    setShowConfirmModal(false);
    setShowTankSelectionModal(true);
  }, []);

  // ✅ UPDATE: handleTankSelected - mark as from tap
  const handleTankSelected = useCallback((tank: TankWithLocation) => {
    console.log('🎯 Tank selected:', tank.nomor_gt);
    
    if (!selectedConsumerForTap) return;

    const mainWarehouse = clusterGroups.find(
      (c) => c.name.trim().toUpperCase() === MAIN_WAREHOUSE_STORAGE_CLUSTER.trim().toUpperCase()
    );
    
    const consumerCluster = clusterGroups.find(
      (c) => c.id === selectedConsumerForTap.grease_cluster_id
    );

    if (!mainWarehouse || !consumerCluster) {
      toast.error('Cluster not found');
      return;
    }

    setPendingMovement({
      tank: tank,
      fromClusterId: mainWarehouse.id,
      toId: selectedConsumerForTap.id,
      isToConsumer: true,
      isDroppedOnUnit: true,
      fromCluster: mainWarehouse,
      toCluster: consumerCluster,
    });

    setIsFromTapSelection(true); // ✅ NEW: Mark as from tap
    setShowTankSelectionModal(false);
    setShowMovementModal(true);
  }, [selectedConsumerForTap, clusterGroups]);

  // ✅ NEW: Handle back from movement modal to tank selection
  const handleBackFromMovement = useCallback(() => {
    console.log('⬅️ Back from movement to tank selection');
    setShowMovementModal(false);
    setPendingMovement(null);
    setShowTankSelectionModal(true);
    // Keep selectedConsumerForTap intact
  }, []);

  // ✅ NEW: Handle back from tank selection to confirmation
  const handleBackToConfirmation = useCallback(() => {
    console.log('⬅️ Back from tank selection to confirmation');
    setShowTankSelectionModal(false);
    setShowConfirmModal(true);
  }, []);

  // ✅ UPDATE: handleCancelSelection - reset tap flag
  const handleCancelSelection = useCallback(() => {
    console.log('❌ Cancelled selection');
    setShowConfirmModal(false);
    setShowTankSelectionModal(false);
    setShowMovementModal(false); // ✅ Also close movement modal
    setSelectedConsumerForTap(null);
    setPendingMovement(null);
    setIsFromTapSelection(false); // ✅ Reset flag
  }, []);

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

      {/* ✅ UPDATED: Movement Modal with conditional onBack */}
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
            setIsFromTapSelection(false); // ✅ Reset flag
          }}
          onCancel={() => {
            setShowMovementModal(false);
            setPendingMovement(null);
            setIsFromTapSelection(false); // ✅ Reset flag
          }}
          onBack={isFromTapSelection ? handleBackFromMovement : undefined} // ✅ Conditional back
        />
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && selectedConsumerForTap && (
        <ConsumerConfirmationModal
          consumer={selectedConsumerForTap}
          onConfirm={handleConfirmInstallation}
          onCancel={handleCancelSelection}
        />
      )}

      {/* Tank Selection Modal */}
      {showTankSelectionModal && selectedConsumerForTap && (
        <TankSelectionModal
          tanks={tanks}
          consumer={selectedConsumerForTap}
          clusterGroups={clusterGroups}
          onSelectTank={handleTankSelected}
          onCancel={handleCancelSelection}
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
                  onConsumerTap={handleConsumerTap}
                />
              );
            })
          )}
        </div>
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeTank ? (
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
          <div
            className="cursor-grabbing text-center w-20 opacity-80"
            style={{ touchAction: 'none' }}
          >
            <img
              src={
                activeLubcar.current_grease_type === 'ALVANIA'
                  ? GreaseTankIconYellow
                  : GreaseTankIcon
              }
              className="h-12 mx-auto object-contain opacity-60 hue-rotate-180"
              alt={`Returning tank ${activeLubcar.current_tank_nomor_gt}`}
            />
            <div className="text-xs bg-red-100 border border-red-300 text-red-700 rounded-full px-2 py-0.5 mt-1 font-semibold">
              {activeLubcar.current_tank_nomor_gt || 'N/A'}
            </div>
            <div className="text-[9px] text-red-600 font-bold mt-0.5">
              DC - Returning
            </div>
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