import { supabase } from "../../../../db/SupabaseClient";

export const getValidMaterials = async (): Promise<Set<string>> => {
  const { data, error } = await supabase.from('materials').select('material_code');
  if (error) {
    console.error('Gagal fetch materials:', error);
    return new Set();
  }
  return new Set(data.map((m) => m.material_code));
};