import { useCallback } from 'react';
import toast from 'react-hot-toast';
import { TankWithLocation, ConsumerUnit, ClusterWithConsumers, MovementFormData } from '../types/grease.types';
import { supabase } from '../../../../../db/SupabaseClient';
import { MAIN_WAREHOUSE_STORAGE_CLUSTER } from '../types/grease.constants';

export const useTankMovement = (onMovementComplete: () => void) => {
  const handleConfirmMovement = useCallback(
    async (
      pendingMovement: any,
      consumers: ConsumerUnit[],
      clusterGroups: ClusterWithConsumers[],
      formData: MovementFormData
    ) => {
      const { tank, fromClusterId, fromCluster, toCluster, isToConsumer } = pendingMovement;

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
      const isFromMainWarehouse = fromCluster?.name.toUpperCase() === MAIN_WAREHOUSE_STORAGE_CLUSTER;
      const isToMainWarehouse = toCluster.name.toUpperCase() === MAIN_WAREHOUSE_STORAGE_CLUSTER;
      const isFromRegister = !fromCluster || fromCluster.name.toLowerCase() === 'register';

      if (isFromSefas && isToMainWarehouse) {
        toStatus = 'NEW';
      }

      let from_qty = 0;
      let to_qty = 0;

      if (isFromMainWarehouse && isToConsumer) {
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
      } else if (isFromRegister && isToMainWarehouse) {
        from_qty = 0;
        to_qty = formData.to_qty ?? 0;
      } else {
        from_qty = currentQty;
        to_qty = formData.to_qty ?? currentQty;
      }

      let oldTankId: string | null = null;
      let oldTankQty: number = 0;
      let MainStorageClusterId: string | null = null;

      if (isToConsumer && to_consumer_id) {
        const targetConsumer = consumers.find((c) => c.id === to_consumer_id);

        if (targetConsumer?.current_tank_id) {
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

          const { error: returnError } = await supabase
            .from('grease_tank_movements')
            .insert([
              {
                grease_tank_id: oldTankId,
                from_consumer_id: to_consumer_id,
                from_grease_cluster_id: null,
                to_grease_cluster_id: MainStorageClusterId,
                to_consumer_id: null,
                from_qty: oldTankQty,
                to_qty: 0,
                from_status: 'DC',
                to_status: 'DC',
                reference_no: formData.reference_no,
                pic_movement: formData.pic_movement,
                movement_date: new Date().toISOString(),
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

      const { error } = await supabase
        .from('grease_tank_movements')
        .insert([
          {
            grease_tank_id: tank.id,
            from_grease_cluster_id: fromClusterId,
            from_consumer_id: null,
            to_grease_cluster_id: final_to_cluster_id,
            to_consumer_id: to_consumer_id,
            from_qty,
            to_qty,
            from_status: currentStatus,
            to_status: toStatus,
            reference_no: formData.reference_no,
            pic_movement: formData.pic_movement,
            movement_date: new Date().toISOString(),
          },
        ]);

      if (error) {
        console.error('Error creating movement:', error);
        toast.error('Failed to move tank');
        return;
      }

      const final_tank_qty = isToConsumer && isFromMainWarehouse ? to_qty : to_qty;
      await supabase
        .from('grease_tanks')
        .update({ qty: final_tank_qty, status: toStatus })
        .eq('id', tank.id);

      onMovementComplete();

      const destinationName = to_consumer_id
        ? `Unit: ${consumers.find((c) => c.id === to_consumer_id)?.unit_id || to_consumer_id}`
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

  return { handleConfirmMovement };
};