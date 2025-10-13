import { TankWithLocation, ClusterWithConsumers, ConsumerUnit } from '../types/grease.types';

export const getCurrentLocationName = (
  tank: TankWithLocation,
  clusterGroups: ClusterWithConsumers[],
  consumers: ConsumerUnit[]
): string => {
  if (tank.current_consumer_id) {
    const consumer = consumers.find((c) => c.id === tank.current_consumer_id);
    if (consumer) return consumer.unit_id || 'N/A';
  }

  if (tank.current_cluster_id) {
    const cluster = clusterGroups.find((c) => c.id === tank.current_cluster_id);
    if (cluster) return cluster.name.toUpperCase();
  }

  return 'REGISTER';
};

export const getTankIcon = (tipe: string | null, yellowIcon: string, defaultIcon: string) => {
  return tipe === 'ALVANIA' ? yellowIcon : defaultIcon;
};