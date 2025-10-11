import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
  TouchSensor, // Wajib untuk mobile
  Active,
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
  grease_cluster_id: string | null;
  current_grease_type: 'ALBIDA' | 'ALVANIA' | 'EMPTY';
  current_tank_id: string | null;
  current_tank_qty: number;
}

interface ClusterWithConsumers extends GreaseCluster {
    associatedConsumers: ConsumerUnit[];
}


// --- DRAGGABLE COMPONENT (Tank) ---
const DraggableTank: React.FC<{ tank: TankWithLocation; fromClusterId: string }> = React.memo(({ 
    tank, 
    fromClusterId 
  }) => {
    // ID unik untuk drag
    const draggableId = `${tank.id}-${fromClusterId}`; 

    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
      id: draggableId,
      data: { tank, fromClusterId },
    });
  
    const tankIcon = tank.tipe === 'ALVANIA' ? GreaseTankIconYellow : GreaseTankIcon;
  
    return (
      <div
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        // SOLUSI MOBILE: Mencegah default action browser saat disentuh
        style={{ touchAction: 'none' }} 
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
});
DraggableTank.displayName = 'DraggableTank';


// --- DROPPABLE CONSUMER UNIT ---
const DroppableConsumer: React.FC<{ consumer: ConsumerUnit; parentClusterId: string }> = React.memo(({ consumer, parentClusterId }) => {
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
});
DroppableConsumer.displayName = 'DroppableConsumer';


// --- DROPPABLE CLUSTER (TANK + CONSUMER) ---
const DroppableCluster: React.FC<{
  cluster: ClusterWithConsumers;
  tanks: TankWithLocation[];
}> = React.memo(({ cluster, tanks }) => {
  // Hanya Cluster ID yang berfungsi sebagai droppable target, BUKAN consumer ID
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
});
DroppableCluster.displayName = 'DroppableCluster';


// --- MAIN COMPONENT ---

const GreaseClusterMonitoring: React.FC = () => {
  const [clusterGroups, setClusterGroups] = useState<ClusterWithConsumers[]>([]);
  const [consumers, setConsumers] = useState<ConsumerUnit[]>([]); 
  const [tanks, setTanks] = useState<TankWithLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTank, setActiveTank] = useState<TankWithLocation | null>(null);
  
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [pendingMovement, setPendingMovement] = useState<{
    tank: TankWithLocation;
    fromClusterId: string;
    toId: string; // Consumer Unit ID, atau '' (untuk manual selection)
    isToConsumer: boolean;
    isDroppedOnUnit: boolean; 
    fromCluster: GreaseCluster | undefined;
    toCluster: GreaseCluster;
  } | null>(null);

  // SOLUSI MOBILE: Konfigurasi Sensors yang lebih baik
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    // TouchSensor: Mengaktifkan drag setelah pergerakan 5px (lebih baik dari delay)
    useSensor(TouchSensor, { activationConstraint: { distance: 5 } }) 
  );

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);

    // 1. Fetch Clusters
    const { data: clustersData, error: clustersError } = await supabase
      .from('grease_clusters')
      .select('*')
      .order('view_queue', { ascending: true, nullsFirst: false });

    if (clustersError) console.error('Error fetching clusters:', clustersError);

    // 2. Fetch Tanks & Movements
    // FIX: Ambil movement terakhir
    const { data: tanksData, error: tanksError } = await supabase
        .from('grease_tanks')
        .select(`
            *, 
            grease_tank_movements(
                to_grease_cluster_id, 
                to_consumer_id, 
                movement_date
            )
        `)
        .order('tipe')
        .order('movement_date', { foreignTable: 'grease_tank_movements', ascending: false});

    if (tanksError) {
      console.error('Error fetching tanks:', tanksError);
      setLoading(false);
      return;
    }
    
    const tanksWithLocation: TankWithLocation[] = [];
    const tanksInConsumers: Record<string, { tank_id: string, grease_type: 'ALBIDA' | 'ALVANIA' | null, qty: number }> = {};
    
    (tanksData || []).forEach((tank: any) => {
        // FIX: Hanya ambil movement pertama (terakhir) dari array
        const latestMovement = tank.grease_tank_movements?.[0]; 
        
        let current_cluster_id = latestMovement?.to_grease_cluster_id || null;
        const current_consumer_id = latestMovement?.to_consumer_id || null;

        if (current_consumer_id) {
            tanksInConsumers[current_consumer_id] = {
                tank_id: tank.id,
                grease_type: tank.tipe,
                qty: tank.qty,
            };
            current_cluster_id = null; // Tank ada di Consumer, bukan di Cluster (parent cluster hanya referensi)
        }

        tanksWithLocation.push({
            ...tank,
            current_cluster_id: current_cluster_id,
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
        };
    });

    // 4. Process Clusters to include associated consumers
    const clusteredConsumers = consumersWithStatus.filter(c => c.grease_cluster_id);
    
    const tempClusterGroups: ClusterWithConsumers[] = (clustersData || []).map(cluster => ({
        ...cluster,
        // FIX: Hanya asosiasikan consumer yang parent cluster ID nya match
        associatedConsumers: clusteredConsumers.filter(c => c.grease_cluster_id === cluster.id)
    }));

    // Tank yang current_cluster_id nya NULL dianggap ada di 'Register' Cluster
    // Jika 'Register' Cluster tidak ada, buat dummy
    let registerCluster = tempClusterGroups.find(c => c.name.toLowerCase() === 'register');
    if (!registerCluster && clustersData?.length) {
        // Asumsi cluster pertama sebagai fallback jika tidak ada 'Register'
        registerCluster = tempClusterGroups[0]; 
    }
    
    // Consumers yang grease_cluster_id nya NULL/Unassigned: tidak dimasukkan ke Cluster manapun
    // Karena mereka tidak bisa menjadi droppoint.

    setClusterGroups(tempClusterGroups);
    setConsumers(consumersWithStatus); 
    setLoading(false);
  }, []); // Tambahkan dependensi jika diperlukan

  const getTanksInCluster = useCallback((clusterId: string, clusterName: string): TankWithLocation[] => {
    // Tank yang current_cluster_id nya NULL diasosiasikan dengan 'Register'
    if (clusterName.toLowerCase() === 'register') {
      return tanks.filter((tank) => tank.current_cluster_id === null);
    }
    return tanks.filter((tank) => tank.current_cluster_id === clusterId);
  }, [tanks]);

  const handleDragStart = (event: { active: Active }) => {
    const dragData = event.active.data.current;
    if (dragData && 'tank' in dragData) {
      setActiveTank(dragData.tank as TankWithLocation);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTank(null);

    if (!over) return;

    const dragData = active.data.current as { tank: TankWithLocation; fromClusterId: string };
    const tank = dragData?.tank;
    const fromClusterId = dragData?.fromClusterId;
    
    if (!tank || fromClusterId === (over.id as string)) return;

    const fromCluster = clusterGroups.find((c) => c.id === fromClusterId);
    const overData = over.data.current as { isConsumerUnit?: boolean, parentClusterId?: string };

    let toCluster: GreaseCluster | undefined = undefined;
    let isToConsumer = overData?.isConsumerUnit || false;
    let isDroppedOnUnit = overData?.isConsumerUnit || false;
    let toId = over.id as string;
    
    if (isToConsumer) {
        const consumerTargetId = over.id as string;
        const targetConsumer = consumers.find(c => c.id === consumerTargetId);

        if (!targetConsumer) return;

        // Validation: Cannot drop a tank if the consumer is not EMPTY
        if (targetConsumer.current_grease_type !== 'EMPTY') {
            toast.error(`Cannot fill ${targetConsumer.unit_id}. It already contains ${targetConsumer.current_grease_type}.`);
            return;
        }
        
        // Target Cluster adalah Cluster Parent dari Unit Consumer
        const parentCluster = clusterGroups.find(c => c.id === targetConsumer.grease_cluster_id);
        if (!parentCluster) {
            toast.error(`Consumer ${targetConsumer.unit_id} has no assigned parent cluster.`);
            return;
        }
        
        toCluster = parentCluster;
        toId = consumerTargetId; // Destination ID adalah Consumer UUID
        
    } else {
        // Dropping on a Cluster ID
        toCluster = clusterGroups.find((c) => c.id === (over.id as string));

        if (!toCluster) return;

        const clusterDestination = clusterGroups.find(c => c.id === (over.id as string));
        const hasConsumers = clusterDestination?.associatedConsumers.length;
        
        if (hasConsumers) {
            // Jika cluster memiliki Consumer, anggap ini adalah "Manual Droppoint" ke Consumer
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

    const { tank, fromClusterId, fromCluster, isToConsumer } = pendingMovement;
    
    const { data: currentTankData } = await supabase.from('grease_tanks').select('qty, status').eq('id', tank.id).single();
    const currentQty = currentTankData?.qty || tank.qty;
    const currentStatus = currentTankData?.status || tank.status;

    let toStatus = currentStatus;
    // Status berubah menjadi DC jika keluar dari Issuing Cluster, atau jika bergerak ke Consumer Unit
    if (fromCluster?.is_issuing || isToConsumer) {
      toStatus = 'DC'; 
    }
    
    const to_consumer_id = isToConsumer ? formData.consumer_id : null;
    const final_to_cluster_id = pendingMovement.toCluster.id; 

    // Quantity menjadi 0 jika pindah ke Consumer, atau gunakan input jika ke Receiving Cluster
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
    // Catatan: Jika update ini gagal, fetchData() akan memperbaiki state
    await supabase
        .from('grease_tanks')
        .update({ qty: final_to_qty, status: toStatus })
        .eq('id', tank.id);
    
    // Refresh data untuk update tampilan
    fetchData();

    const destinationName = to_consumer_id 
        ? `Unit: ${consumers.find(c => c.id === to_consumer_id)?.unit_id || to_consumer_id}` 
        : pendingMovement.toCluster.name;
        
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
          <div 
            className="cursor-grabbing text-center w-16 opacity-80"
            // SOLUSI MOBILE: Wajib untuk overlay
            style={{ touchAction: 'none' }} 
          >
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

// --- MOVEMENT MODAL COMPONENT (Revisi Minor) ---

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
    
    // Inisiasi selectedConsumerId dari drop point atau null
    const initialConsumerId = useMemo(() => {
      // Jika di-drop langsung ke unit, gunakan ID unit tsb
      if (isToConsumer && isDroppedOnUnit) {
        return consumerTargetId;
      } 
      // Jika di-drop di cluster yang punya consumer (manual select), atau bukan consumer, null
      return null;
    }, [isToConsumer, isDroppedOnUnit, consumerTargetId]);
    
    const [selectedConsumerId, setSelectedConsumerId] = useState<string | null>(initialConsumerId);
  
    const isIssuingFrom = fromCluster?.is_issuing || false; 
    const isToReceivingCluster = !isToConsumer && (toCluster?.is_receiving || false); 
  
    // Reference No wajib untuk Cluster-to-Cluster, tidak wajib saat mengisi Unit Consumer (karena tank DC)
    const isReferenceNoMandatory = isToReceivingCluster || (toCluster.name.toLowerCase() === 'register'); 
  
    React.useEffect(() => {
      // Set default value atau required state berdasarkan tujuan
      if (isToReceivingCluster) {
        // Jika ke Receiving Cluster, input QTY diperlukan
        setToQty(tank.qty); // Set default ke Qty saat ini
      } else if (isToConsumer) {
        // Jika ke Consumer, QTY harus 0 (DC), tidak perlu input
        setToQty(0);
      } else {
        // Cluster lain, QTY tetap (tidak perlu input)
        setToQty(tank.qty);
      }
      
      // Update selectedConsumerId jika ada perubahan pada consumerTargetId (walaupun seharusnya tidak)
      if (isToConsumer && isDroppedOnUnit && consumerTargetId !== selectedConsumerId) {
          setSelectedConsumerId(consumerTargetId);
      }
      
    }, [isToReceivingCluster, isToConsumer, isDroppedOnUnit, tank.qty, consumerTargetId, selectedConsumerId]);
  
    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      
      if (isReferenceNoMandatory && !referenceNo.trim()) {
        toast.error('Reference number is required for this destination (Receiving/Register).');
        return;
      }
      
      if (!picMovement.trim()) {
        toast.error('PIC is required');
        return;
      }
  
      if (isToReceivingCluster && (toQty === null || toQty < 0)) {
        toast.error('Please enter a valid quantity');
        return;
      }
      
      if (isToConsumer && !selectedConsumerId) {
        toast.error('Unit Destination/Consumer selection is required.');
        return;
      }

      // Validasi tambahan: Tidak boleh memilih consumer yang sudah berisi
      const targetConsumer = consumersList.find(c => c.id === selectedConsumerId);
      if (targetConsumer && targetConsumer.current_grease_type !== 'EMPTY' && targetConsumer.id !== tank.id) {
          toast.error(`Cannot fill ${targetConsumer.unit_id}. It already contains ${targetConsumer.current_grease_type}.`);
          return;
      }
  
      onConfirm({
        reference_no: referenceNo,
        pic_movement: picMovement,
        // Kirim toQty hanya jika ke receiving cluster. Jika ke consumer, kirim 0.
        to_qty: isToConsumer ? 0 : toQty, 
        consumer_id: selectedConsumerId, 
      });
    };
  
    const getConsumerLabel = (consumer: ConsumerUnit) => {
      const desc = consumer.description ? ` (${consumer.description})` : '';
      const type = consumer.current_grease_type === 'EMPTY' ? '' : ` [${consumer.current_grease_type}]`;
      return `${consumer.unit_id || consumer.id}${desc}${type}`;
    }
    
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
            <span className="font-semibold">{toCluster.name}</span>
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            Destinasi: {destinationDetail}
          </p>
          {(isIssuingFrom || isToConsumer) && (
            <div className="mt-2 bg-orange-50 border border-orange-200 rounded px-3 py-2">
              <p className="text-xs text-orange-800">
                ⚠️ **Tank status will change to DC** (Discarded/Consumed) and **QTY will be set to 0** after filling a unit.
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
              required={isReferenceNoMandatory}
            />
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
          
          {/* Consumer Selection (Hanya tampil jika ke Consumer) */}
          {isToConsumer && (
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
                <p className="text-xs text-gray-500 mt-1">Destinasi telah dipilih sebelumnya. Ubah jika salah.</p>
             )}
            </div>
          )}


          {/* Quantity (Hanya tampil jika ke Receiving Cluster) */}
          {isToReceivingCluster && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantity After Movement <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={toQty ?? ''}
                onChange={(e) => setToQty(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={`Current: ${tank.qty}`}
                min="0"
                required
              />
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