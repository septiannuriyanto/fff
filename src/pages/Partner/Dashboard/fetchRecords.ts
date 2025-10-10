import { supabase } from "../../../db/SupabaseClient";
import { RitasiFuel } from "../component/ritasiFuel";

export const fetchRecords = async (
  startDate: string,
  endDate: string
): Promise<RitasiFuel[]> => {
  try {
    const { data, error } = await supabase
      .from("ritasi_fuel")
      .select(`
        id,
        no_surat_jalan,
        queue_num,
        ritation_date,
        warehouse_id,
        qty_sj,
        qty_sonding,
        sonding_before_front,
        sonding_before_rear,
        sonding_after_front,
        sonding_after_rear,
        qty_sonding_before,
        qty_sonding_after,
        operator_id,
        fuelman_id,
        qty_flowmeter_before,
        qty_flowmeter_after,
        isValidated,
        petugas_pencatatan,
        shift,
        flowmeter_before_url,
        flowmeter_after_url,
        photo_url,
        po_allocation,
        rotate_constant,
        storage:warehouse_id ( unit_id ),
        fuelman:fuelman_id ( nama ),
        operator:operator_id ( nama ),
        petugas:petugas_pencatatan ( nama ),
        remark_modification
      `)
      .gte("ritation_date", startDate)
      .lte("ritation_date", endDate)
      .order("no_surat_jalan", { ascending: true });

    if (error) {
      console.error("❌ Error fetching ritasi_fuel:", error);
      return [];
    }

    return (data ?? []).map((item: any) => ({
      ...item,
      unit_id: item.storage?.unit_id ?? null,
      fuelman_name: item.fuelman?.nama ?? null,
      operator_name: item.operator?.nama ?? null,
      petugas_pencatatan_name: item.petugas?.nama ?? null,
      ritation_date: item.ritation_date ?? "",
      rotate_constant: item.rotate_constant ?? 0,
    })) as RitasiFuel[];
  } catch (err) {
    console.error("🔥 Unexpected error in fetchRecords:", err);
    return [];
  }
};
