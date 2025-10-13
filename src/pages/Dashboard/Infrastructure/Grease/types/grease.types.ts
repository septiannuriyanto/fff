export interface GreaseCluster {
  id: string;
  name: string;
  description: string | null;
  sends: string[] | null;
  receives: string[] | null;
  view_queue: number | null;
  is_issuing: boolean | null;
  is_receiving: boolean | null;
   location?: string | null; // ✅ ADD THIS
}

export interface GreaseTank {
  id: string;
  nomor_gt: string;
  tipe: 'ALBIDA' | 'ALVANIA' | null;
  status: 'NEW' | 'DC' | null;
  qty: number;
}

export interface TankWithLocation {
  id: string;
  nomor_gt: string;
  tipe: string | null;
  status: string | null;
  qty: number;
  current_cluster_id: string | null;
  current_cluster_name: string | null;
  current_consumer_id: string | null;
  current_consumer_unit_id?: string | null; // ✅ Tambahkan ini jika belum ada
  // ... other fields
}

export interface ConsumerUnit {
  id: string;
  unit_id: string | null;
  description: string | null;
  
  grease_cluster_id: string | null;
  current_grease_type: 'ALBIDA' | 'ALVANIA' | 'EMPTY';
  current_tank_id: string | null;
  current_tank_qty: number;
  current_tank_nomor_gt: string | null;
}

export interface ClusterWithConsumers extends GreaseCluster {
  associatedConsumers: ConsumerUnit[];
}

export interface TankMovement {
  id: string;
  reference_no: string | null;
  from_qty: number;
  to_qty: number | null;
  from_status: string | null;
  to_status: string | null;
  movement_date: string;
}

export interface MovementFormData {
  reference_no: string;
  pic_movement: string;
  to_qty: number | null;
  consumer_id: string | null;
}

export interface PendingMovement {
  tank: TankWithLocation;
  fromClusterId: string;
  toId: string;
  isToConsumer: boolean;
  isDroppedOnUnit: boolean;
  fromCluster: GreaseCluster | undefined;
  toCluster: GreaseCluster;
}
