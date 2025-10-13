// ============================================
// components/MovementModal/utils/consumerHelpers.ts
// ============================================

import { ConsumerUnit } from '../../../types/grease.types';

export const getConsumerLabel = (consumer: ConsumerUnit): string => {
  const desc = consumer.description ? ` (${consumer.description})` : '';
  const type = consumer.current_grease_type === 'EMPTY' ? '' : ` [${consumer.current_grease_type}]`;
  return `${consumer.unit_id || consumer.id}${desc}${type}`;
};

export const getConsumersForCluster = (
  clusterId: string,
  consumersList: ConsumerUnit[]
): ConsumerUnit[] => {
  return consumersList.filter((c) => c.grease_cluster_id === clusterId);
};

export const findConsumerById = (
  consumerId: string,
  consumersList: ConsumerUnit[]
): ConsumerUnit | undefined => {
  return consumersList.find((c) => c.id === consumerId);
};