import React, { useEffect, useState, useRef } from 'react';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from 'react-beautiful-dnd';
import { Plus, X, GripHorizontal } from 'lucide-react';
import { supabase } from '../../../../db/SupabaseClient';
import LiquidMeter from '../../../../components/FluidMeterComponent/LiquidMeter';
import { fetchStorageOilSetup } from './fetchSelectedSpecialMonitoring';    
import { JSX } from 'react/jsx-runtime';

interface StockLevelMonitoringProps {
  onUpdated?: () => void;
  selectedDate?: string;
}

const StockLevelMonitoring: React.FC<StockLevelMonitoringProps> = ({
  onUpdated,
  selectedDate,
}) => {
  const [liquidMeters, setLiquidMeters] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [available, setAvailable] = useState<any[]>([]);
  const [selected, setSelected] = useState<any[]>([]);
  const updateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchAvailable = async () => {
    const { data } = await supabase
      .from('storage_oil_setup')
      .select('*, materials:material_code(item_description, material_code)')
      .in('storage_model', ['tank6000', 'tank2000']);
    setAvailable(data ?? []);
  };

  const reloadData = async () => {
    const data = await fetchStorageOilSetup(selectedDate);
    setLiquidMeters(data);
    setSelected(data);
  };

  useEffect(() => {
    fetchAvailable();
    reloadData();
  }, [selectedDate]);

  const addToSelected = async (item: any) => {
    const maxOrder =
      selected.length > 0
        ? Math.max(...selected.map((i) => i.special_monitor ?? 0))
        : 0;
    await supabase
      .from('storage_oil_setup')
      .update({ special_monitor: maxOrder + 1 })
      .eq('id', item.id);
    await reloadData();
    onUpdated?.();
  };

  // fungsi update DB untuk seluruh urutan baru
  const commitOrderToDB = async (items: any[]) => {
    for (let i = 0; i < items.length; i++) {
      await supabase
        .from('storage_oil_setup')
        .update({ special_monitor: i + 1 })
        .eq('id', items[i].id);
    }
    await reloadData();
    onUpdated?.();
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const items = Array.from(selected);
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);
    setSelected(items);

    // cancel timer sebelumnya
    if (updateTimer.current) clearTimeout(updateTimer.current);

    // bikin timer baru 3 detik untuk update DB
    updateTimer.current = setTimeout(() => {
      commitOrderToDB(items);
      updateTimer.current = null;
    }, 3000);
  };

  return (
    <div className="liquid_chart p-4 border rounded mb-4">
      <div className="flex justify-between items-center mb-4">
        <h4 className="font-bold text-black dark:text-white sm:text-title-sm text-center">
          Stock Level
        </h4>
        <button
          className="flex items-center gap-1 bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
          onClick={() => setShowModal(true)}
        >
          <Plus className="w-4 h-6" />
        </button>
      </div>

      <div className="inline-flex justify-evenly flex-row w-full flex-wrap gap-4 ">
        {liquidMeters.map((m) => (
          <div className='p-2 border rounded-md border-slate-300 bg-slate-50 dark:bg-graydark'>
            <p className='text-center text-xs mt-1 font-bold '>{m.warehouse_id} ({m.storage_oil.location})</p>
            <p className='text-center text-xs my-1 font-bold text-red-300'>Tank #{m.tank_number}</p>
       
              <LiquidMeter
            key={m.id}
            filled={m.current_filled ?? 0}
            max={m.max_capacity ?? 100}
            whId={m.warehouse_id ?? ''}
            diameter={90}
          />
           
          <div className='text-center text-xs mt-1 font-bold'>
            
            <p className='text-purple-400'>{m.materials?.item_description}</p>
            <p className='text-blue-300'>(<span className='text-green-600 underline'>{m.current_filled}</span> of {m.max_capacity})</p>
          </div>

          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-99">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg w-[95%] max-w-7xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">Pilih Tangki untuk Monitoring</h2>
              <button
                className="p-1 text-gray-500 hover:text-black"
                onClick={() => setShowModal(false)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex gap-4 h-[calc(80vh-4rem)]">
              {/* kiri */}
              <div className="w-1/2 border p-2 rounded overflow-y-auto">
                <h5 className="font-semibold mb-2">Daftar Tangki</h5>
                <ul className="space-y-2">
                  {available.map((item) => (
                    <li
                      key={item.id}
                      className="flex justify-between items-center border-b pb-1"
                    >
                      <div className="text-sm">
                        <div className="font-medium">{item.warehouse_id}</div>
                        <div className="text-gray-500">
                          {item.materials?.material_code} —{' '}
                          {item.materials?.item_description}
                        </div>
                      </div>
                      <button
                        onClick={() => addToSelected(item)}
                        className="p-1 bg-green-500 text-white rounded hover:bg-green-600"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              {/* kanan */}
              <div className="w-1/2 border p-2 rounded overflow-y-auto">
                <h5 className="font-semibold mb-2">
                  Dipilih (drag untuk ubah urutan)
                </h5>
                <DragDropContext onDragEnd={onDragEnd}>
                  <Droppable droppableId="selectedList">
                    {(provided: { droppableProps: JSX.IntrinsicAttributes & React.ClassAttributes<HTMLUListElement> & React.HTMLAttributes<HTMLUListElement>; innerRef: React.LegacyRef<HTMLUListElement> | undefined; placeholder: string | number | boolean | React.ReactElement<any, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | null | undefined; }) => (
                      <ul
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className="space-y-2"
                      >
                        {selected.map((item, index) => (
                          <Draggable
                            key={item.id}
                            draggableId={String(item.id)}
                            index={index}
                          >
                            {(provided: { innerRef: React.LegacyRef<HTMLLIElement> | undefined; draggableProps: JSX.IntrinsicAttributes & React.ClassAttributes<HTMLLIElement> & React.LiHTMLAttributes<HTMLLIElement>; dragHandleProps: JSX.IntrinsicAttributes & React.ClassAttributes<HTMLLIElement> & React.LiHTMLAttributes<HTMLLIElement>; }) => (
                              <li
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className="border p-2 bg-gray-100 rounded flex items-center gap-2"
                              >
                                <GripHorizontal className="w-4 h-4 text-gray-500" />
                                <div className="flex flex-col">
                                  <span className="font-medium">
                                    {item.warehouse_id}
                                  </span>
                                  <span className="text-gray-500 text-sm">
                                    {item.materials?.material_code} —{' '}
                                    {item.materials?.item_description}
                                  </span>
                                </div>
                              </li>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </ul>
                    )}
                  </Droppable>
                </DragDropContext>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockLevelMonitoring;
