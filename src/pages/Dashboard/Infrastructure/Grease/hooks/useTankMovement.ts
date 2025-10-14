import { useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  ConsumerUnit,
  ClusterWithConsumers,
  MovementFormData,
  GreaseCluster,
} from '../types/grease.types';
import { supabase } from '../../../../../db/SupabaseClient';
import {
  MAIN_WAREHOUSE_STORAGE_CLUSTER,
  SUPPLIER_NAME,
} from '../types/grease.constants';

export const useTankMovement = (onMovementComplete: () => void) => {
  // ============================================
  // 🧭 Movement Type Determiner
  // ============================================
  const determineMovementType = (
    fromCluster?: GreaseCluster,
    toCluster?: GreaseCluster,
    isToConsumer?: boolean,
    hasReturn?: boolean
  ): string => {
    const fromName = fromCluster?.name?.toUpperCase() || '';
    const toName = toCluster?.name?.toUpperCase() || '';

    // REGISTER → MAIN WH
    if (
      (!fromCluster || fromName === 'REGISTER') &&
      toName === MAIN_WAREHOUSE_STORAGE_CLUSTER
    ) {
      return "000"; // 000 - INITIALIZATION
    }

    // MAIN WH → CONSUMER
    if (fromName === MAIN_WAREHOUSE_STORAGE_CLUSTER && isToConsumer) {
      return hasReturn ? "101" : "100"; // REPLACE / INSTALL
    }

    // CONSUMER → MAIN WH
    if (
      fromName !== MAIN_WAREHOUSE_STORAGE_CLUSTER &&
      toName === MAIN_WAREHOUSE_STORAGE_CLUSTER
    ) {
      return "102"; // DISMANTLING
    }

    // MAIN WH → SUPPLIER
    if (fromName === MAIN_WAREHOUSE_STORAGE_CLUSTER && toName === SUPPLIER_NAME) {
      return "103"; // REFILL
    }

    // SUPPLIER → MAIN WH
    if (fromName === SUPPLIER_NAME && toName === MAIN_WAREHOUSE_STORAGE_CLUSTER) {
      return "104"; // RESTOCK
    }

    return "000"; // default / unknown
  };

  // ============================================
  // ⚙️ Main Movement Handler
  // ============================================
  const handleConfirmMovement = useCallback(
    async (
      pendingMovement: any,
      consumers: ConsumerUnit[],
      clusterGroups: ClusterWithConsumers[],
      formData: MovementFormData
    ) => {
      const { tank, fromClusterId, fromCluster, toCluster, isToConsumer } =
        pendingMovement;

      const { data: currentTankData } = await supabase
        .from('grease_tanks')
        .select('qty, status')
        .eq('id', tank.id)
        .single();

      const currentQty = currentTankData?.qty || tank.qty;
      const currentStatus = currentTankData?.status || tank.status;

      let toStatus = currentStatus;
      if (fromCluster?.is_issuing || isToConsumer) {
        toStatus = 'DC';
      }

      const to_consumer_id = isToConsumer ? formData.consumer_id : null;
      const final_to_cluster_id = toCluster.id;
      const isFromSefas = fromCluster?.name.toUpperCase() === 'SEFAS';
      const isToSefas = toCluster.name.toUpperCase() === 'SEFAS';
      const isFromMainWarehouse =
        fromCluster?.name.toUpperCase() === MAIN_WAREHOUSE_STORAGE_CLUSTER;
      const isToMainWarehouse =
        toCluster.name.toUpperCase() === MAIN_WAREHOUSE_STORAGE_CLUSTER;
      const isFromRegister =
        !fromCluster || fromCluster.name.toLowerCase() === 'register';

      if (isFromSefas && isToMainWarehouse) {
        toStatus = 'NEW';
      }

      let from_qty = 0;
      let to_qty = 0;

      if (isFromRegister && isToMainWarehouse) {
        // INITIALIZATION
        from_qty = 0;
        to_qty = formData.to_qty ?? currentQty;
      } else if (isFromMainWarehouse && isToConsumer) {
        from_qty = currentQty;
        to_qty = currentQty;
      } else if (isToConsumer && isToMainWarehouse) {
        from_qty = currentQty;
        to_qty = 0;
      } else if (isFromMainWarehouse && isToSefas) {
        from_qty = 0;
        to_qty = 0;
      } else if (isFromSefas && isToMainWarehouse) {
        from_qty = 0;
        to_qty = formData.to_qty ?? 0;
      } else {
        from_qty = currentQty;
        to_qty = formData.to_qty ?? currentQty;
      }

      let oldTankId: string | null = null;
      let oldTankQty: number = 0;
      let MainStorageClusterId: string | null = null;

      // ============================
      // 🌀 Handle Tank Return (Replace)
      // ============================
      let hasReturn = false;
      if (isToConsumer && to_consumer_id) {
        const targetConsumer = consumers.find((c) => c.id === to_consumer_id);

        if (targetConsumer?.current_tank_id) {
          hasReturn = true;
          oldTankId = targetConsumer.current_tank_id;
          oldTankQty = targetConsumer.current_tank_qty;

          const MainStorageCluster = clusterGroups.find(
            (c) => c.name.toUpperCase() === MAIN_WAREHOUSE_STORAGE_CLUSTER
          );
          MainStorageClusterId = MainStorageCluster?.id || null;

          if (!MainStorageClusterId) {
            toast.error(
              `Cannot find ${MAIN_WAREHOUSE_STORAGE_CLUSTER} cluster for tank return.`
            );
            return;
          }

          // Insert return movement (old tank)
          const { error: returnError } = await supabase
            .from('grease_tank_movements')
            .insert([
              {
                grease_tank_id: oldTankId,
                from_consumer_id: to_consumer_id,
                to_grease_cluster_id: MainStorageClusterId,
                from_qty: oldTankQty,
                to_qty: 0,
                from_status: 'DC',
                to_status: 'DC',
                reference_no: formData.reference_no,
                pic_movement: formData.pic_movement,
                movement_date: new Date().toISOString(),
                movement_type: 102, // DISMANTLING
              },
            ]);

          if (returnError) {
            console.error('Error creating return movement:', returnError);
            toast.error('Failed to process tank return.');
            return;
          }

          await supabase
            .from('grease_tanks')
            .update({ status: 'DC', qty: 0 })
            .eq('id', oldTankId);
        }
      }

      // ============================
      // 🧭 Determine Movement Type
      // ============================
      const movementType = determineMovementType(
        fromCluster,
        toCluster,
        isToConsumer,
        hasReturn
      );

      // ============================
      // 🚀 Insert Main Movement
      // ============================
      const { error } = await supabase.from('grease_tank_movements').insert([
        {
          grease_tank_id: tank.id,
          from_grease_cluster_id: fromClusterId,
          to_grease_cluster_id: final_to_cluster_id,
          from_consumer_id: null,
          to_consumer_id: to_consumer_id,
          from_qty,
          to_qty,
          from_status: currentStatus,
          to_status: toStatus,
          reference_no: formData.reference_no,
          pic_movement: formData.pic_movement,
          movement_date: new Date().toISOString(),
          movement_type: movementType,
        },
      ]);

      if (error) {
        console.error('Error creating movement:', error);
        toast.error('Failed to move tank');
        return;
      }

      // Update tank record
      const final_tank_qty =
        isToConsumer && isFromMainWarehouse ? to_qty : to_qty;
      await supabase
        .from('grease_tanks')
        .update({ qty: final_tank_qty, status: toStatus })
        .eq('id', tank.id);

      onMovementComplete();

      // Toast summary
      const destinationName = to_consumer_id
        ? `Unit: ${
            consumers.find((c) => c.id === to_consumer_id)?.unit_id ||
            to_consumer_id
          }`
        : toCluster.name;

      if (oldTankId) {
        toast.success(
          `Tank ${tank.nomor_gt} moved to ${destinationName} (${from_qty}L → ${to_qty}L). Old tank returned to ${MAIN_WAREHOUSE_STORAGE_CLUSTER}.`,
          { duration: 4000 }
        );
      } else {
        toast.success(
          `Tank ${tank.nomor_gt} moved to ${destinationName} (${from_qty}L → ${to_qty}L)`
        );
      }
    },
    [onMovementComplete]
  );

  return { handleConfirmMovement, determineMovementType };
};
