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
import { getConsumerIcon } from './components/MovementModal/utils/iconHelpers';

import { useGreaseData } from './hooks/useGreaseData';
import { useTankMovement } from './hooks/useTankMovement';
import { ConsumerUnit, GreaseCluster, PendingMovement, TankWithLocation } from './types/grease.types';
import { DroppableCluster } from './components/DroppableCluster';
import { MovementModal } from './components/MovementModal/MovementModal';

const GreaseClusterMonitoring: React.FC = () => {
  const { clusterGroups, consumers, tanks, loading, fetchData } = useGreaseData();
  const { handleConfirmMovement } = useTankMovement(fetchData);

  const [activeTank, setActiveTank] = useState<TankWithLocation | null>(null);
  const [activeLubcar, setActiveLubcar] = useState<ConsumerUnit | null>(null);
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [pendingMovement, setPendingMovement] = useState<PendingMovement | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { distance: 5, delay: 100, tolerance: 5 },
    })
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  const handleDragStart = (event: { active: Active }) => {
    const dragData = event.active.data.current as any;
    if (dragData && 'tank' in dragData) {
      setActiveTank(dragData.tank as TankWithLocation);
    } else if (dragData && 'isLubcarRelease' in dragData) {
      setActiveLubcar(dragData.consumer as ConsumerUnit);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTank(null);
    setActiveLubcar(null);

    if (!over) return;

    const dragData = active.data.current as any;

    // ========== HANDLE CONSUMER RELEASE (Return tank to Main Warehouse) ==========
    if (dragData?.isLubcarRelease) {
      const consumer = dragData.consumer as ConsumerUnit;

      if (!consumer.current_tank_id) {
        toast.error('No tank to release from this unit');
        return;
      }

      // ✅ FIX: Find target cluster by ID first
      const targetCluster = clusterGroups.find((c) => c.id === (over.id as string));

      if (!targetCluster) {
        toast.error('Invalid drop target. Please drop on a valid cluster.');
        return;
      }

      // ✅ FIX: Normalize and compare cluster names
      const targetClusterName = targetCluster.name.trim().toUpperCase();
      const warehouseName = MAIN_WAREHOUSE_STORAGE_CLUSTER.trim().toUpperCase();

      console.log('🔍 Debug Lubcar Release:', {
        targetClusterId: targetCluster.id,
        targetClusterName: targetClusterName,
        expectedWarehouse: warehouseName,
        isMatch: targetClusterName === warehouseName,
      });

      // Verify it's actually the main warehouse
      if (targetClusterName !== warehouseName) {
        toast.error(
          `Tank can only be returned to ${MAIN_WAREHOUSE_STORAGE_CLUSTER}. You dropped on "${targetCluster.name}".`,
          { duration: 4000 }
        );
        return;
      }

      // Find consumer's current cluster
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
        toCluster: targetCluster,
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

      <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
        <div className="border-b border-stroke py-4 px-6 dark:border-strokedark">
          <h3 className="font-bold text-black dark:text-white text-xl">
            Grease Cluster Monitoring
          </h3>
        </div>

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
            className="cursor-grabbing text-center w-16 opacity-80"
            style={{ touchAction: 'none' }}
          >
            <img
              src={getConsumerIcon(
                activeLubcar.unit_id || '',
                activeLubcar.current_grease_type || 'EMPTY'
              )}
              className="h-12 mx-auto object-contain"
              alt={`${activeLubcar.unit_id} - Releasing tank`}
            />
            <div className="text-xs bg-gray-200 rounded-full px-1 mt-1">
              {activeLubcar.current_tank_nomor_gt || 'N/A'}
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default GreaseClusterMonitoring;