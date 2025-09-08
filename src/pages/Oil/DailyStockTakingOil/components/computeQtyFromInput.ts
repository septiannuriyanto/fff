import { supabase } from "../../../../db/SupabaseClient";

/**
 * Hitung qty berdasarkan input (dalam cm) dan warehouse_id
 * @param warehouseId warehouse_id
 * @param v input depth dalam cm
 */
export const computeQtyFromInput = async (
  warehouseId: string,
  v: string
): Promise<number | null> => {
  const depthCm = parseFloat(v);
  if (!Number.isFinite(depthCm)) return null;

  // ubah cm -> mm
  const depthMm = depthCm * 10;

  // ambil storage_model untuk warehouse ini
  const { data: storageData, error: storageErr } = await supabase
    .from('storage_oil')
    .select('storage_model')
    .eq('warehouse_id', warehouseId)
    .maybeSingle();

  if (storageErr || !storageData?.storage_model) {
    console.error('gagal ambil storage_model', storageErr);
    return null;
  }

  const storageModel = storageData.storage_model;

  // ambil daftar tera tangki untuk model ini
  const { data: teraData, error: teraErr } = await supabase
    .from('tera_tangki_oil')
    .select('depth_mm, qty')
    .eq('storage_model', storageModel)
    .order('depth_mm', { ascending: true });

  if (teraErr || !teraData?.length) {
    console.error('gagal ambil tera_tangki_oil', teraErr);
    return null;
  }

  // cari 2 titik terdekat utk interpolasi
  let lower = teraData[0];
  let upper = teraData[teraData.length - 1];

  for (let i = 0; i < teraData.length; i++) {
    const row = teraData[i];
    if (row.depth_mm <= depthMm) lower = row;
    if (row.depth_mm >= depthMm) {
      upper = row;
      break;
    }
  }

  // kalau persis di tabel
  if (depthMm === lower.depth_mm) return lower.qty;

  // linear interpolation qty
  const qty =
    lower.qty +
    ((upper.qty - lower.qty) * (depthMm - lower.depth_mm)) /
      (upper.depth_mm - lower.depth_mm);

  return qty;
};
