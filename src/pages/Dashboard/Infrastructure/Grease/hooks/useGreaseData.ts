import { useState, useCallback } from 'react';
import {
  ClusterWithConsumers,
  ConsumerUnit,
  TankWithLocation,
} from '../types/grease.types';
import { supabase } from '../../../../../db/SupabaseClient';

export const useGreaseData = () => {
  const [clusterGroups, setClusterGroups] = useState<ClusterWithConsumers[]>([]);
  const [consumers, setConsumers] = useState<ConsumerUnit[]>([]);
  const [tanks, setTanks] = useState<TankWithLocation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);

    // 1. Fetch Clusters
    const { data: clustersData, error: clustersError } = await supabase
      .from('grease_clusters')
      .select('*')
      .order('view_queue', { ascending: true, nullsFirst: false });

    if (clustersError) console.error('Error fetching clusters:', clustersError);

    // 2. Fetch Tanks & Movements
    const { data: tanksData, error: tanksError } = await supabase
      .from('grease_tanks')
      .select(
        `
          *, 
          grease_tank_movements(
            to_grease_cluster_id, 
            to_consumer_id, 
            movement_date
          )
        `
      )
      .order('tipe')
      .order('movement_date', {
        foreignTable: 'grease_tank_movements',
        ascending: false,
      });

    if (tanksError) {
      console.error('Error fetching tanks:', tanksError);
      setLoading(false);
      return;
    }

    const tanksWithLocation: TankWithLocation[] = [];
    const tanksInConsumers: Record<
      string,
      { tank_id: string; tank_nomor_gt: string; grease_type: 'ALBIDA' | 'ALVANIA' | null; qty: number }
    > = {};

    (tanksData || []).forEach((tank: any) => {
      const latestMovement = tank.grease_tank_movements?.[0];
      const hasAnyMovement = (tank.grease_tank_movements?.length || 0) > 0;

      let current_cluster_id = latestMovement?.to_grease_cluster_id || null;
      const current_consumer_id = latestMovement?.to_consumer_id || null;

      if (!hasAnyMovement) {
        current_cluster_id = null;
      }

      if (current_consumer_id) {
        tanksInConsumers[current_consumer_id] = {
          tank_id: tank.id,
          tank_nomor_gt: tank.nomor_gt,
          grease_type: tank.tipe,
          qty: tank.qty,
        };
        current_cluster_id = null;
      }

      tanksWithLocation.push({
        ...tank,
        current_cluster_id,
        current_consumer_id,
      });
    });

    setTanks(tanksWithLocation);

    // 3. Fetch Consumers
    const { data: consumersData, error: consumersError } = await supabase
      .from('grease_consumers')
      .select('id, unit_id, description, grease_cluster_id')
      .order('unit_id');

    if (consumersError) console.error('Error fetching consumers:', consumersError);

    const consumersWithStatus: ConsumerUnit[] = (consumersData || []).map((consumer: any) => {
      const tankInfo = tanksInConsumers[consumer.id];
      let greaseType: 'ALBIDA' | 'ALVANIA' | 'EMPTY' = 'EMPTY';
      if (tankInfo) greaseType = tankInfo.grease_type || 'EMPTY';

      return {
        ...consumer,
        grease_cluster_id: consumer.grease_cluster_id,
        current_grease_type: greaseType,
        current_tank_id: tankInfo?.tank_id || null,
        current_tank_qty: tankInfo?.qty || 0,
        current_tank_nomor_gt: tankInfo?.tank_nomor_gt || null,
      };
    });

    // 4. Process Clusters
    const clusteredConsumers = consumersWithStatus.filter((c) => c.grease_cluster_id);
    const tempClusterGroups: ClusterWithConsumers[] = (clustersData || []).map((cluster) => ({
      ...cluster,
      associatedConsumers: clusteredConsumers.filter((c) => c.grease_cluster_id === cluster.id),
    }));

    setClusterGroups(tempClusterGroups);
    setConsumers(consumersWithStatus);
    setLoading(false);
  }, []);

  return { clusterGroups, consumers, tanks, loading, fetchData };
};
