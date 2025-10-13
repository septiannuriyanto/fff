// ============================================
// components/MovementModal/types/modal.types.ts
// ============================================

import {
  TankWithLocation,
  ConsumerUnit,
  ClusterWithConsumers,
  GreaseCluster,
} from '../../../types/grease.types';

export interface MovementModalProps {
  tank: TankWithLocation;
  fromCluster: GreaseCluster | undefined;
  toCluster: GreaseCluster;
  isToConsumer: boolean;
  isDroppedOnUnit: boolean;
  consumerTargetId: string;
  consumersList: ConsumerUnit[];
  clusterGroups: ClusterWithConsumers[];
  onConfirm: (data: {
    reference_no: string;
    pic_movement: string;
    to_qty: number | null;
    consumer_id: string | null;
  }) => void;
  onCancel: () => void;
}

export interface FlowDetectionResult {
  isToReceivingCluster: boolean;
  isReferenceNoMandatory: boolean;
  isFromSupplier: boolean;
  isToSupplier: boolean;
  isFromMainWarehouse: boolean;
  isToMainWarehouse: boolean;
  isFromRegister: boolean;
  isReplacement: boolean;
  hasOldTank: boolean;
  isInstallFlow: boolean;
  isDismantlingFlow: boolean;
  isReplacementFlow: boolean;
  isRefillToSupplierFlow: boolean;
  isRestockFromSupplierFlow: boolean;
}

export interface TankCardProps {
  tankNumber: string;
  tankType: string | null;
  qty: number;
  status?: string;
  location?: string;
  label: string;
  badgeColor: string;
  borderColor: string;
  ribbonColor: string;
  additionalInfo?: React.ReactNode;
  isOld?: boolean;
}

export interface FlowArrowProps {
  label: string;
  color: string;
}

export interface ModalHeaderProps {
  tank: TankWithLocation;
  fromCluster: GreaseCluster | undefined;
  toCluster: GreaseCluster;
  onClose: () => void;
}

export interface SummarySectionProps {
  tank: TankWithLocation;
  fromCluster: GreaseCluster | undefined;
  toCluster: GreaseCluster;
  selectedConsumerId: string | null;
  toQty: number | null;
  consumersList: ConsumerUnit[];
  isToConsumer: boolean;
}

export interface HeroSectionBaseProps {
  tank: TankWithLocation;
  fromCluster?: GreaseCluster;
  toCluster: GreaseCluster;
  consumerTargetId?: string;
  consumersList?: ConsumerUnit[];
  oldTankInConsumer?: ConsumerUnit | null;
}