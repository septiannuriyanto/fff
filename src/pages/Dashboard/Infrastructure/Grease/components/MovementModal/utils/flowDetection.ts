// ============================================
// components/MovementModal/utils/flowDetection.ts
// ============================================

import { TankWithLocation, GreaseCluster, ConsumerUnit } from '../../../types/grease.types';
import { MAIN_WAREHOUSE_STORAGE_CLUSTER, SUPPLIER_NAME } from '../../../types/grease.constants';
import { FlowDetectionResult } from '../types/modal.types';

export const detectMovementFlow = (
  fromCluster: GreaseCluster | undefined,
  toCluster: GreaseCluster,
  isToConsumer: boolean,
  selectedConsumerId: string | null,
  consumersList: ConsumerUnit[]
): FlowDetectionResult => {
  const isToReceivingCluster = !isToConsumer && (toCluster?.is_receiving || false);
  const isReferenceNoMandatory = isToReceivingCluster || toCluster.name.toLowerCase() === 'register';

  // ✅ UPDATED: Use SUPPLIER_NAME constant
  const isFromSupplier = fromCluster?.name.toUpperCase() === SUPPLIER_NAME;
  const isToSupplier = toCluster.name.toUpperCase() === SUPPLIER_NAME;
  
  const isFromMainWarehouse = fromCluster?.name.toUpperCase() === MAIN_WAREHOUSE_STORAGE_CLUSTER;
  const isToMainWarehouse = toCluster.name.toUpperCase() === MAIN_WAREHOUSE_STORAGE_CLUSTER;
  const isFromRegister = !fromCluster || fromCluster.name.toLowerCase() === 'register';

  // Check if this is a replacement scenario
  const isReplacement = isToConsumer && !!selectedConsumerId;
  const oldTankInConsumer = selectedConsumerId
    ? consumersList.find((c) => c.id === selectedConsumerId)
    : null;
  const hasOldTank =
    oldTankInConsumer?.current_tank_id !== null &&
    oldTankInConsumer?.current_grease_type !== 'EMPTY';

  // Flow types
  const isInstallFlow = isToConsumer && !hasOldTank && !isFromRegister;
  const isDismantlingFlow = !isToConsumer && isToMainWarehouse && !isFromRegister && !isFromSupplier;
  const isReplacementFlow = isReplacement && hasOldTank;
  const isRefillToSupplierFlow = isFromMainWarehouse && isToSupplier;
  const isRestockFromSupplierFlow = isFromSupplier && isToMainWarehouse;

  return {
    isToReceivingCluster,
    isReferenceNoMandatory,
    isFromSupplier,
    isToSupplier,
    isFromMainWarehouse,
    isToMainWarehouse,
    isFromRegister,
    isReplacement,
    hasOldTank,
    isInstallFlow,
    isDismantlingFlow,
    isReplacementFlow,
    isRefillToSupplierFlow,
    isRestockFromSupplierFlow,
  };
};