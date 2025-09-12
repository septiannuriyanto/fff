import { supabase } from '../../../../db/SupabaseClient';

export const fetchStorageOilSetup = async () => {
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
    storage_model_data:storage_model!inner(capacity)
  `)
  .not('special_monitor', 'is', null)
  .order('special_monitor');

  if (error) {
    console.error(error);
    return [];
  }

  // mapping isi current_filled & max_capacity
  const result = await Promise.all(
    setups.map(async (item) => {
      // current_filled dari dst_oli:
      const { data: dst, error: dstErr } = await supabase
        .from('dst_oli')
        .select('qty')
        .eq('material_code', item.material_code)
        .eq('tank_number', item.tank_number)
        .eq('uoi', item.uoi)
        // bisa tambahkan .eq('date_dst', tanggalFilter)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (dstErr) console.error(dstErr);

      return {
        ...item,
        current_filled: dst?.qty ?? 0,
        max_capacity: item.storage_model_data?.[0]?.capacity ?? 0


      };
    })
  );

  return result;
};
