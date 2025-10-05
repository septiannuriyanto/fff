import { supabase } from "../../../../db/SupabaseClient";


export const getVolumeFromTera = async (unitId: string, sonding: number) => {
  const { data, error } = await supabase
    .from("tera_tangki")
    .select("height_cm, qty_liter")
    .eq("unit_id", unitId)
    .order("height_cm", { ascending: true });

  if (error || !data || data.length === 0) {
    console.warn("No tera data found for", unitId);
    return 0;
  }

  // Cari dua titik terdekat
  let lower = data[0];
  let upper = data[data.length - 1];

  for (let i = 0; i < data.length - 1; i++) {
    if (sonding >= data[i].height_cm && sonding <= data[i + 1].height_cm) {
      lower = data[i];
      upper = data[i + 1];
      break;
    }
  }

  if (lower.height_cm === upper.height_cm) return lower.qty_liter;

  // Interpolasi linear
  const result =
    lower.qty_liter +
    ((sonding - lower.height_cm) /
      (upper.height_cm - lower.height_cm)) *
      (upper.qty_liter - lower.qty_liter);

  return Math.round(result * 100) / 100; // bulatkan dua angka desimal
};
