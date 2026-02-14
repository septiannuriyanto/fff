import { useEffect, useState } from "react";
import { formatDateToString } from "../../../../../Utils/DateUtility";
import { supabase } from "../../../../../db/SupabaseClient";

export const useRitationDaily = (date: Date | null) => {
  const [data, setData] = useState<any[]>([]);
  const [totalToday, setTotalToday] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchDaily = async () => {
    if (!date) return;

    setLoading(true);

    const { data: rows, error } = await supabase
      .from("ritasi_fuel")
      .select(`
        *,
        fuelman:manpower!ritasi_fuel_fuelman_id_fkey(nrp, nama),
        operator:manpower!ritasi_fuel_operator_id_fkey(nrp, nama),
        unit:storage!ritasi_fuel_warehouse_id_fkey(warehouse_id, unit_id)
      `)
      .eq("ritation_date", formatDateToString(date))
      .order("no_surat_jalan");

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    const enriched = rows.map((item: any) => ({
      ...item,
      fuelman_name: item.fuelman?.nama || "Unknown",
      operator_name: item.operator?.nama || "Unknown",
      unit: item.unit?.unit_id || "Unknown",
    }));

    const total = enriched.reduce((t: number, i: any) => t + i.qty_sj, 0);

    setTotalToday(total);
    setData(enriched);
    setLoading(false);
  };

  useEffect(() => {
    fetchDaily();
  }, [date]);

  return { data, totalToday, loading, refetch: fetchDaily };
};
