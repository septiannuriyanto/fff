import { supabase } from "../../../../db/SupabaseClient";

export const fetchOilSetup = async (warehouseId: string) => {
  const { data: weights } = await supabase.from('oil_priority_weight').select('*');
  const { data: buffers } = await supabase.from('oil_buffer_target').select('*').eq('warehouse_id', warehouseId);

  const ORDER_WEIGHT = {
    engine: weights?.find(w => w.material_code === '1000101471')?.priority_weight || 10,
    transmission: weights?.find(w => w.material_code === '1000012900')?.priority_weight || 5,
    hydraulic: weights?.find(w => w.material_code === '1000000763')?.priority_weight || 7,
  };

  const TARGET_BUFFERS = {
    engine: buffers?.find(b => b.material_code === '1000101471')?.target_buffer || 8,
    transmission: buffers?.find(b => b.material_code === '1000012900')?.target_buffer || 10,
    hydraulic: buffers?.find(b => b.material_code === '1000000763')?.target_buffer || 10,
  };

  const BUFFER_STOCK_TARGETS = {
    safetyStock: 5,
    reorderPoint: 6,
    targetBuffer: 8,
  };

  return { ORDER_WEIGHT, TARGET_BUFFERS, BUFFER_STOCK_TARGETS };
};
