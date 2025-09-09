// src/utils/fetchDstOilRecords.ts

import { supabase } from "../../../../db/SupabaseClient";
import { DstOli } from "./dstoli";
import { StorageOil } from "./storageOli";


// fungsi untuk fetch data dst_oli join storage_oil
export async function fetchDstOilRecords(
  startDate: string,
  endDate: string
): Promise<(DstOli & { location: string | null })[]> {
  const { data: dstData, error: dstErr } = await supabase
    .from("dst_oli")
    .select("*")
    .gte("date_dst", startDate)
    .lte("date_dst", endDate)
    .order("id", { ascending: true })
    ;

  if (dstErr) throw dstErr;

  const { data: storageData, error: storageErr } = await supabase
    .from("storage_oil")
    .select("warehouse_id, location");

  if (storageErr) throw storageErr;

  const locMap = new Map<string, string | null>();
  storageData?.forEach((s: StorageOil) => {
    locMap.set(s.warehouse_id, s.location);
  });

  return (dstData as DstOli[]).map((d) => ({
    ...d,
    location: locMap.get(d.warehouse_id) || null,
  }));
}
