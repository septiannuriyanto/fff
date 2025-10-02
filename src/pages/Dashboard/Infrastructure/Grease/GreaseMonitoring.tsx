import React, { useEffect, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import {
  DndContext,
  useDraggable,
  useDroppable,
  DragEndEvent,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  TouchSensor,
} from '@dnd-kit/core';
import { supabase } from '../../../../db/SupabaseClient';

// --- ICON IMPORTS ---
import GreaseTankIcon from '../../../../images/icon/grease-tank.png';
import GreaseTankIconYellow from '../../../../images/icon/grease-tank-alt.png';
import LubcarEmpty from '../../../../images/icon/lubcar.png';
import LubcarAlbida from '../../../../images/icon/lubcar-mounted.png';
import LubcarAlvania from '../../../../images/icon/lubcar-mounted-alt.png';

// --- INTERFACES ---
interface GreaseCluster {
  id: string;
  name: string;
  description: string | null;
  sends: string[] | null;
  receives: string[] | null;
  view_queue: number | null;
  is_issuing: boolean | null;
  is_receiving: boolean | null;
}

interface GreaseTank {
  id: string;
  nomor_gt: string;
  tipe: 'ALBIDA' | 'ALVANIA' | null;
  status: 'NEW' | 'DC' | null;
  qty: number;
}

interface TankWithLocation extends GreaseTank {
  current_cluster_id: string | null;
}

interface ConsumerUnit {
  id: string;
  unit_id: string | null;
  description: string | null;
  grease_cluster_id: string | null; // Kolom dari DB (Cluster Parent)
  
  current_grease_type: 'ALBIDA' | 'ALVANIA' | 'EMPTY';
  current_tank_id: string | null;
  current_tank_qty: number;
}

// Cluster yang diperkaya dengan data Consumer
interface ClusterWithConsumers extends GreaseCluster {
    associatedConsumers: ConsumerUnit[];
}


// --- DRAGGABLE COMPONENT (Tank) ---
const DraggableTank: React.FC<{ tank: TankWithLocation; fromClusterId: string }> = ({ 
    tank, 
    fromClusterId 
  }) => {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
      id: tank.id,
      data: { tank, fromClusterId },
    });
  
    const tankIcon = tank.tipe === 'ALVANIA' ? GreaseTankIconYellow : GreaseTankIcon;
  
    return (
      <div
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        className={`cursor-move text-center w-16 ${isDragging ? 'opacity-30' : ''}`}
      >
        <img
          src={tankIcon}
          className={`h-10 mx-auto ${
            tank.status === 'DC' ? 'opacity-50 hue-rotate-180' : ''
          }`}
          alt={`Tank ${tank.nomor_gt}`}
        />
        <div className="text-xs bg-gray-200 rounded-full px-1 mt-1">
          {tank.nomor_gt}
        </div>
        <div className={`text-[10px] font-semibold mt-0.5 ${
          tank.status === 'NEW' ? 'text-green-600' : 'text-orange-600'
        }`}>
          {tank.status}
        </div>
        {tank.qty > 1 && (
          <div className="text-[10px] text-gray-500">
            Qty: {tank.qty}
          </div>
        )}
      </div>
    );
};


// --- DROPPABLE CONSUMER UNIT ---
const DroppableConsumer: React.FC<{ consumer: ConsumerUnit; parentClusterId: string }> = ({ consumer, parentClusterId }) => {
    const { isOver, setNodeRef } = useDroppable({
        id: consumer.id, // ID Droppable adalah UUID Consumer
        data: { isConsumerUnit: true, parentClusterId: parentClusterId } 
    });
    
    let iconSrc = LubcarEmpty;
    if (consumer.current_grease_type === 'ALBIDA') iconSrc = LubcarAlbida;
    else if (consumer.current_grease_type === 'ALVANIA') iconSrc = LubcarAlvania;

    const qtyText = consumer.current_tank_qty > 0 ? `(${consumer.current_tank_qty})` : '';

    return (
        <div 
            ref={setNodeRef}
            className={`p-2 border rounded-lg text-center cursor-default transition-all duration-200 w-28 h-32 flex flex-col justify-between items-center ${
                isOver ? 'border-blue-500 bg-blue-50 shadow-md ring-2 ring-blue-500' : 'border-gray-200 bg-white hover:shadow-sm'
            }`}
        >
            <img 
                src={iconSrc} 
                alt={`${consumer.unit_id} status`} 
                className="h-12 w-12 mx-auto"
            />
            <div className="text-xs font-semibold mt-1 truncate w-full">
                {consumer.unit_id || 'N/A'}
            </div>
            <div className={`text-[10px] ${
                consumer.current_grease_type === 'ALBIDA' ? 'text-green-600' : 
                consumer.current_grease_type === 'ALVANIA' ? 'text-yellow-600' : 'text-gray-500'
            }`}>
                {consumer.current_grease_type} {qtyText}
            </div>
        </div>
    );
}


// --- DROPPABLE CLUSTER (TANK + CONSUMER) ---
const DroppableCluster: React.FC<{
  cluster: ClusterWithConsumers;
  tanks: TankWithLocation[];
}> = ({ cluster, tanks }) => {
  const { isOver, setNodeRef } = useDroppable({ id: cluster.id });
  const isRegister = cluster.name.toLowerCase() === 'register';
  const consumers = cluster.associatedConsumers || [];
  const isConsumerDroppoint = consumers.length > 0;

  return (
    <div
      ref={setNodeRef}
      className={`border-2 rounded-lg p-4 transition-all w-full ${
        isRegister
          ? 'border-purple-300 bg-purple-50'
          : isOver && !isConsumerDroppoint
          ? 'border-green-400 bg-green-50 shadow-lg'
          : isOver && isConsumerDroppoint
          ? 'border-indigo-400 bg-indigo-50 shadow-lg' // Warna berbeda untuk droppable area cluster consumer
          : 'border-gray-200 bg-white hover:shadow-md'
      }`}
    >
      {/* Cluster Header */}
      <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
              <div className="flex items-center gap-2">
                  <h4 className="font-bold text-lg text-gray-800">{cluster.name}</h4>
                  <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded font-semibold">{tanks.length} tanks</span>
                  {isConsumerDroppoint && (
                    <span className="bg-indigo-200 text-indigo-800 text-xs px-2 py-0.5 rounded font-semibold">
                        {consumers.length} Consumers
                    </span>
                  )}
              </div>
          </div>
      </div>

      {/* Tanks Display */}
      <div className="border-t border-gray-200 pt-3">
        <div className="flex gap-3 flex-wrap min-h-[80px] bg-gray-50 rounded-lg p-3">
          {tanks.length === 0 ? (
            <div className="w-full text-center text-gray-400 text-sm py-4">
              {isOver ? 'Drop tank here' : 'No tanks in this cluster'}
            </div>
          ) : (
            tanks.map((tank) => (
              <DraggableTank key={tank.id} tank={tank} fromClusterId={cluster.id} />
            ))
          )}
        </div>
      </div>

      {/* TAMPILAN CONSUMER UNITS (JIKA ADA) */}
      {isConsumerDroppoint && (
          <div className="border-t border-gray-200 pt-3 mt-3">
              <h5 className="font-semibold text-sm text-gray-700 mb-2">
                  Unit Konsumen (Droppoint)
              </h5>
              <div className="flex flex-wrap gap-3 p-2 bg-gray-50 rounded-lg min-h-[100px]">
                  {consumers.map((consumer) => (
                      <DroppableConsumer 
                          key={consumer.id} 
                          consumer={consumer} 
                          parentClusterId={cluster.id} 
                      />
                  ))}
              </div>
              {isOver && (
                <div className="text-center text-xs text-indigo-700 mt-2">
                    Drop di area Cluster ini untuk memilih Unit Destinasi secara **Manual**.
                </div>
              )}
          </div>
      )}
    </div>
  );
};


// --- MAIN COMPONENT ---

const GreaseClusterMonitoring: React.FC = () => {
  // FIX: Menggunakan ClusterWithConsumers[]
  const [clusterGroups, setClusterGroups] = useState<ClusterWithConsumers[]>([]);
  const [consumers, setConsumers] = useState<ConsumerUnit[]>([]); // Untuk referensi Modal
  const [tanks, setTanks] = useState<TankWithLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTank, setActiveTank] = useState<TankWithLocation | null>(null);
  
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [pendingMovement, setPendingMovement] = useState<{
    tank: TankWithLocation;
    fromClusterId: string;
    toId: string; // Cluster ID, Consumer Unit ID, atau '' (untuk manual selection)
    isToConsumer: boolean;
    isDroppedOnUnit: boolean; 
    fromCluster: GreaseCluster | undefined;
    toCluster: GreaseCluster;
  } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
  );

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
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
      .select('*, grease_tank_movements(to_grease_cluster_id, to_consumer_id, movement_date)')
      .order('tipe')
      .order('movement_date', { foreignTable: 'grease_tank_movements', ascending: false });

    if (tanksError) {
      console.error('Error fetching tanks:', tanksError);
      setLoading(false);
      return;
    }
    
    const tanksWithLocation: TankWithLocation[] = [];
    const tanksInConsumers: Record<string, { tank_id: string, grease_type: 'ALBIDA' | 'ALVANIA' | null, qty: number }> = {};
    
    (tanksData || []).forEach((tank: any) => {
        const latestMovement = tank.grease_tank_movements[0];
        
        let current_cluster_id = latestMovement?.to_grease_cluster_id || null;
        const current_consumer_id = latestMovement?.to_consumer_id || null;

        if (current_consumer_id) {
            tanksInConsumers[current_consumer_id] = {
                tank_id: tank.id,
                grease_type: tank.tipe,
                qty: tank.qty,
            };
            current_cluster_id = null; // Tank is at a consumer, not a cluster
        }

        tanksWithLocation.push({
            ...tank,
            current_cluster_id: current_cluster_id,
        });
    });

    setTanks(tanksWithLocation);

    // 3. Fetch Consumers
    // FIX: Mengambil kolom grease_cluster_id
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
        };
    });

    // 4. Process Clusters to include associated consumers
    const clusteredConsumers = consumersWithStatus.filter(c => c.grease_cluster_id);
    const consumersUnassigned = consumersWithStatus.filter(c => !c.grease_cluster_id);
    
    const tempClusterGroups: ClusterWithConsumers[] = (clustersData || []).map(cluster => ({
        ...cluster,
        associatedConsumers: clusteredConsumers.filter(c => c.grease_cluster_id === cluster.id)
    }));

    // Tangani Register Cluster
    const registerCluster = tempClusterGroups.find(c => c.name.toLowerCase() === 'register');
    if (registerCluster) {
        registerCluster.associatedConsumers.push(...consumersUnassigned);
    }
    
    setClusterGroups(tempClusterGroups);
    setConsumers(consumersWithStatus); 
    setLoading(false);
  };
  
  const getTanksInCluster = (clusterId: string, clusterName: string): TankWithLocation[] => {
    if (clusterName.toLowerCase() === 'register') {
      return tanks.filter((tank) => tank.current_cluster_id === null);
    }
    return tanks.filter((tank) => tank.current_cluster_id === clusterId);
  };

  const handleDragStart = (event: any) => {
    const dragData = event.active.data.current;
    if (dragData?.tank) {
      setActiveTank(dragData.tank);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTank(null);

    if (!over) return;

    const dragData = active.data.current as { tank: TankWithLocation; fromClusterId: string };
    const tank = dragData?.tank;
    const fromClusterId = dragData?.fromClusterId;
    const destinationId = over.id as string;
    
    if (!tank || fromClusterId === destinationId) return;

    // FIX: Menggunakan 'clusterGroups'
    const fromCluster = clusterGroups.find((c) => c.id === fromClusterId);
    
    const overData = over.data.current as { isConsumerUnit?: boolean, parentClusterId?: string };

    let toCluster: GreaseCluster | undefined = undefined;
    let isToConsumer = overData?.isConsumerUnit || false;
    let isDroppedOnUnit = overData?.isConsumerUnit || false;
    let toId = destinationId;
    
    if (isToConsumer) {
        const consumerTargetId = destinationId;
        const targetConsumer = consumers.find(c => c.id === consumerTargetId);

        if (!targetConsumer) return;

        // Validation: Cannot drop a tank if the consumer is not EMPTY
        if (targetConsumer.current_grease_type !== 'EMPTY') {
            toast.error(`Cannot fill ${targetConsumer.unit_id}. It already contains ${targetConsumer.current_grease_type}.`);
            return;
        }
        
        // Target Cluster adalah Cluster Parent dari Unit Consumer (grease_cluster_id)
        // FIX: Menggunakan 'clusterGroups'
        const parentCluster = clusterGroups.find(c => c.id === targetConsumer.grease_cluster_id);
        if (!parentCluster) return; 
        
        toCluster = parentCluster;
        toId = consumerTargetId; // Destination ID adalah Consumer UUID
        
    } else {
        // Dropping on a Cluster ID
        // FIX: Menggunakan 'clusterGroups'
        toCluster = clusterGroups.find((c) => c.id === destinationId);

        if (!toCluster) return;

        // FIX: Menggunakan 'clusterGroups'
        const clusterDestination = clusterGroups.find(c => c.id === destinationId);
        const hasConsumers = clusterDestination?.associatedConsumers.length;
        
        // Jika cluster memiliki Consumer, anggap ini adalah "Manual Droppoint" ke Consumer
        if (hasConsumers) {
            isToConsumer = true;
            isDroppedOnUnit = false;
            toId = ''; // Kosongkan ID, paksa pilih manual di Modal
        } else {
            // Validation (Cluster-to-Cluster)
            const canReceive = toCluster.receives || [];
            const isRegister = toCluster.name.toLowerCase() === 'register';

            if (!isRegister && canReceive.length > 0 && !canReceive.includes(tank.status || '')) {
                toast.error(`${toCluster.name} can only receive: ${canReceive.join(', ')}`);
                return;
            }
        }
    }

    if (!toCluster) return;

    // Open Modal
    setPendingMovement({
        tank,
        fromClusterId,
        toId: toId, 
        isToConsumer,
        isDroppedOnUnit,
        fromCluster,
        toCluster: toCluster as GreaseCluster, 
    });
    setShowMovementModal(true);
  };

  const handleConfirmMovement = async (formData: {
    reference_no: string;
    pic_movement: string;
    to_qty: number | null;
    consumer_id: string | null; 
  }) => {
    if (!pendingMovement) return;

    const { tank, fromClusterId, toId, fromCluster, isToConsumer } = pendingMovement;

    // ... (Logika fetch current tank data dan penentuan toStatus - UNCHANGED) ...
    const { data: currentTankData } = await supabase.from('grease_tanks').select('qty, status').eq('id', tank.id).single();
    const currentQty = currentTankData?.qty || tank.qty;
    const currentStatus = currentTankData?.status || tank.status;

    let toStatus = currentStatus;
    if (fromCluster?.is_issuing || isToConsumer) {
      toStatus = 'DC'; 
    }
    
    // Penentuan Destination IDs dan Quantity
    const to_consumer_id = isToConsumer ? formData.consumer_id : null;
    
    // final_to_cluster_id adalah ID cluster destinasi (baik itu cluster murni atau parent cluster consumer)
    const final_to_cluster_id = pendingMovement.toCluster.id; 

    const final_to_qty = isToConsumer ? 0 : (formData.to_qty ?? currentQty);

    // Insert movement record
    const { error } = await supabase.from('grease_tank_movements').insert([
      {
        grease_tank_id: tank.id,
        from_grease_cluster_id: fromClusterId,
        
        to_grease_cluster_id: final_to_cluster_id, 
        to_consumer_id: to_consumer_id, 
        
        from_qty: currentQty,
        to_qty: final_to_qty,
        
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

    // Update tank qty and status in grease_tanks table
    await supabase
        .from('grease_tanks')
        .update({ qty: final_to_qty, status: toStatus })
        .eq('id', tank.id);
    
    fetchData();

    const destinationName = to_consumer_id ? `Consumer ID ${to_consumer_id}` : pendingMovement.toCluster.name;
    toast.success(`Tank ${tank.nomor_gt} moved to ${destinationName}`);
    setShowMovementModal(false);
    setPendingMovement(null);
  };

  if (loading) {
    return (
      <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark p-6">
        <div className="text-center text-gray-500">Loading data...</div>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <Toaster position="top-center" />
      
      {/* Movement Confirmation Modal */}
      {showMovementModal && pendingMovement && (
        <MovementModal
          tank={pendingMovement.tank}
          fromCluster={pendingMovement.fromCluster}
          toCluster={pendingMovement.toCluster}
          isToConsumer={pendingMovement.isToConsumer}
          isDroppedOnUnit={pendingMovement.isDroppedOnUnit}
          consumerTargetId={pendingMovement.toId} 
          consumersList={consumers} 
          onConfirm={handleConfirmMovement} 
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
          {/* Legend ... */}
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
                        />
                    );
                })
            )}
        </div>
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeTank ? (
          <div className="cursor-grabbing text-center w-16 opacity-80">
            <img
              src={activeTank.tipe === 'ALVANIA' ? GreaseTankIconYellow : GreaseTankIcon}
              className={`h-10 mx-auto ${
                activeTank.status === 'DC' ? 'opacity-50 hue-rotate-180' : ''
              }`}
              alt={`Tank ${activeTank.nomor_gt}`}
            />
            <div className="text-xs bg-gray-200 rounded-full px-1 mt-1">
              {activeTank.nomor_gt}
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

// --- MOVEMENT MODAL COMPONENT ---

const MovementModal: React.FC<{
    tank: TankWithLocation;
    fromCluster: GreaseCluster | undefined;
    toCluster: GreaseCluster;
    isToConsumer: boolean;
    isDroppedOnUnit: boolean;
    consumerTargetId: string; 
    consumersList: ConsumerUnit[]; 
    onConfirm: (data: { 
      reference_no: string; 
      pic_movement: string; 
      to_qty: number | null; 
      consumer_id: string | null; 
    }) => void;
    onCancel: () => void;
  }> = ({ tank, fromCluster, toCluster, isToConsumer, isDroppedOnUnit, consumerTargetId, consumersList, onConfirm, onCancel }) => {
    const [referenceNo, setReferenceNo] = useState('');
    const [picMovement, setPicMovement] = useState('');
    
    const [toQty, setToQty] = useState<number | null>(null); 
    const [showQtyInput, setShowQtyInput] = useState(false);
    
    const initialConsumerId = (isToConsumer && isDroppedOnUnit) ? consumerTargetId : null; 
    const [selectedConsumerId, setSelectedConsumerId] = useState<string | null>(initialConsumerId);
    const [showConsumerInput, setShowConsumerInput] = useState(false);
  
    const isIssuingFrom = fromCluster?.is_issuing || false; 
    const isToReceivingCluster = !isToConsumer && (toCluster?.is_receiving || false); 
  
    const isReferenceNoMandatory = !isToConsumer; 
  
    React.useEffect(() => {
      if (isToReceivingCluster) {
        setShowQtyInput(true);
      } else {
        setShowQtyInput(false);
        setToQty(null);
      }
      
      if (isToConsumer || isIssuingFrom) {
        setShowConsumerInput(true);
        
        if (isToConsumer && !isDroppedOnUnit) {
          setSelectedConsumerId(null);
        }
      } else {
        setShowConsumerInput(false);
        setSelectedConsumerId(null);
      }
    }, [isToReceivingCluster, isToConsumer, isIssuingFrom, isDroppedOnUnit]);
  
    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      
      if (isReferenceNoMandatory && !referenceNo.trim()) {
        toast.error('Reference number is required for this destination.');
        return;
      }
      
      if (!picMovement.trim()) {
        toast.error('PIC is required');
        return;
      }
  
      if (showQtyInput && (toQty === null || toQty < 0)) {
        toast.error('Please enter a valid quantity');
        return;
      }
      
      if (showConsumerInput && !selectedConsumerId) {
        toast.error('Unit Destination/Consumer selection is required.');
        return;
      }
  
      onConfirm({
        reference_no: referenceNo,
        pic_movement: picMovement,
        to_qty: toQty,
        consumer_id: selectedConsumerId, 
      });
    };
  
    const getConsumerLabel = (consumer: ConsumerUnit) => {
      const desc = consumer.description ? ` (${consumer.description})` : '';
      return `${consumer.unit_id || consumer.id}${desc}`;
    }
    
    const destinationName = toCluster.name;
    const consumerDetail = consumersList.find(c => c.id === consumerTargetId)?.unit_id || 'N/A';
    
    const destinationDetail = isToConsumer
      ? (isDroppedOnUnit ? `Unit: ${consumerDetail}` : 'Manual Unit Selection')
      : 'Cluster Destination';
  
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="border-b px-6 py-4">
          <h3 className="text-lg font-bold text-gray-800">Confirm Tank Movement</h3>
          <p className="text-sm text-gray-600 mt-1">
            Moving <span className="font-semibold">{tank.nomor_gt}</span> from{' '}
            <span className="font-semibold">{fromCluster?.name || 'Register'}</span> to{' '}
            <span className="font-semibold">{destinationName}</span>
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            Destinasi: {destinationDetail}
          </p>
          {(isIssuingFrom || isToConsumer) && (
            <div className="mt-2 bg-orange-50 border border-orange-200 rounded px-3 py-2">
              <p className="text-xs text-orange-800">
                ⚠️ **Tank status will change to DC** (Discarded/Consumed) after this movement.
              </p>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Reference Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reference Number 
              {isReferenceNoMandatory && <span className="text-red-500"> *</span>}
            </label>
            <input
              type="text"
              value={referenceNo}
              onChange={(e) => setReferenceNo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={isReferenceNoMandatory ? 'e.g., DOC-2024-001' : 'Optional reference number'}
            />
             {!isReferenceNoMandatory && (
                <p className="text-xs text-gray-500 mt-1">Reference number is optional for this destination.</p>
             )}
          </div>

          {/* PIC Movement (unchanged) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              PIC (Person In Charge) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={picMovement}
              onChange={(e) => setPicMovement(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., John Doe"
              required
            />
          </div>
          
          {/* Consumer Selection */}
          {showConsumerInput && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unit Destination/Consumer <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedConsumerId ?? ''}
                onChange={(e) => setSelectedConsumerId(e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={isDroppedOnUnit} 
              >
                <option value="" disabled>Select Unit</option>
                {/* FILTER: Hanya menampilkan Consumer yang terikat ke toCluster saat ini */}
                {consumersList
                    .filter(c => c.grease_cluster_id === toCluster.id)
                    .map((consumer) => (
                    <option key={consumer.id} value={consumer.id}>
                        {getConsumerLabel(consumer)}
                    </option>
                ))}
              </select>
              {isDroppedOnUnit && (
                <p className="text-xs text-gray-500 mt-1">Destination pre-selected dari droppoint.</p>
             )}
            </div>
          )}


          {/* Quantity (conditional) */}
          {showQtyInput && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantity After Movement <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={toQty ?? ''}
                onChange={(e) => setToQty(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter quantity"
                min="0"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Current quantity: {tank.qty}
              </p>
            </div>
          )}

          {!isToConsumer && toCluster.is_receiving && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <p className="text-sm text-blue-800">
                ℹ️ This is a **receiving cluster** - please update the quantity
              </p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Confirm Movement
            </button>
          </div>
        </form>
      </div>
      </div>
    );
  };

export default GreaseClusterMonitoring;