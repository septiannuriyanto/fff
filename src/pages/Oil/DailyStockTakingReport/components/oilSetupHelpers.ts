import { supabase } from "../../../../db/SupabaseClient";

export interface OilPriorityWeight {
  id: number;
  material_code: string;
  item_description?: string;
  priority_weight: number;
  last_updated?: string;
}

export interface OilBufferTarget {
  id: number;
  warehouse_id: string;
  material_code: string;
  item_description?: string;
  target_buffer: number;
  reorder_point: number;
  max_buffer: number;
  active: boolean;
  updated_at?: string;
}

// ============================
// Helper untuk ambil deskripsi materials
// ============================
const getMaterialDescriptions = async (): Promise<Record<string, string>> => {
  const { data, error } = await supabase
    .from("materials")
    .select("material_code, item_description");

  if (error) throw error;

  const map: Record<string, string> = {};
  data.forEach((m) => {
    map[m.material_code] = m.item_description;
  });
  return map;
};

// ============================
// oil_priority_weight
// ============================
export const getOilPriorityWeights = async (): Promise<OilPriorityWeight[]> => {
  const [{ data, error }, materialMap] = await Promise.all([
    supabase.from("oil_priority_weight").select("*"),
    getMaterialDescriptions(),
  ]);

  if (error) throw error;

  return (
    data?.map((w) => ({
      ...w,
      item_description: materialMap[w.material_code] || null,
    })) || []
  );
};

export const updateOilPriorityWeight = async (
  material_code: string,
  weight: number
) => {
  const { error } = await supabase
    .from("oil_priority_weight")
    .update({
      priority_weight: weight,
      last_updated: new Date().toISOString(),
    })
    .eq("material_code", material_code);

  if (error) throw error;
};

// ============================
// oil_buffer_target
// ============================
export const getBufferTargetsByWarehouse = async (
  warehouseId: string
): Promise<OilBufferTarget[]> => {
  const [{ data, error }, materialMap] = await Promise.all([
    supabase
      .from("oil_buffer_target")
      .select("*")
      .eq("warehouse_id", warehouseId),
    getMaterialDescriptions(),
  ]);

  if (error) throw error;

  return (
    data?.map((b) => ({
      ...b,
      item_description: materialMap[b.material_code] || null,
    })) || []
  );
};

export const updateBufferTarget = async (
  warehouseId: string,
  material_code: string,
  fields: Partial<
    Pick<
      OilBufferTarget,
      "target_buffer" | "reorder_point" | "max_buffer" | "active"
    >
  >
) => {
  const { error } = await supabase
    .from("oil_buffer_target")
    .update({
      ...fields,
      updated_at: new Date().toISOString(),
    })
    .eq("warehouse_id", warehouseId)
    .eq("material_code", material_code);

  if (error) throw error;
};
