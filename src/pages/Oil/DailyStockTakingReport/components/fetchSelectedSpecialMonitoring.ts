import { supabase } from '../../../../db/SupabaseClient';

/**
 * Ambil storage_oil_setup yang punya special_monitor beserta nilai current_filled & capacity.
 * @param dateFilter optional string 'YYYY-MM-DD' untuk filter tanggal pada dst_oli
 */
export const fetchStorageOilSetup = async (dateFilter?: string) => {
  // ambil setup yang punya special_monitor
  const { data: setups, error } = await supabase
    .from('storage_oil_setup')
    .select(`
      id,
      warehouse_id,
      material_code,
      tank_number,
      uoi,
      special_monitor,
      storage_model,
      materials:material_code(item_description, material_code),
      storage_model_data:storage_model!inner(capacity),
      storage_oil:warehouse_id(location) 
      
    `)
    .not('special_monitor', 'is', null)
    .order('special_monitor');

  if (error) {
    console.error('Error fetch storage_oil_setup:', error);
    return [];
  }

  console.log(setups);
  

  // mapping isi current_filled & max_capacity
  const result = await Promise.all(
    (setups ?? []).map(async (item: any) => {
      // builder untuk dst_oli
      let dstBuilder = supabase
        .from('dst_oli')
        .select('qty')
        .eq('material_code', item.material_code)
        .eq('tank_number', item.tank_number)
        .eq('uoi', item.uoi)
        .order('created_at', { ascending: false })
        .limit(1);

      if (dateFilter) {
        dstBuilder = dstBuilder.eq('date_dst', dateFilter);
      }

      const { data: dst, error: dstErr } = await dstBuilder.single();

      if (dstErr && dstErr.code !== 'PGRST116') {
        // PGRST116 = no rows returned
        console.error('Error fetch dst_oli:', dstErr);
      }

let capacity = 0;
if (Array.isArray(item.storage_model_data)) {
  capacity = item.storage_model_data[0]?.capacity ?? 0;
} else if (item.storage_model_data) {
  capacity = item.storage_model_data.capacity ?? 0;
}

console.log(dst);


return {
  ...item,
  current_filled: dst?.qty ?? 0,
  max_capacity: capacity
};

    })
  );

  return result;
};
