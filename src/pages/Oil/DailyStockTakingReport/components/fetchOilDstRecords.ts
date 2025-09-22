// src/utils/fetchDstOilRecords.ts

import { supabase } from "../../../../db/SupabaseClient";
import { DstOliWithLocation } from "./DstOliWithLocation";


// tipe data hasil RPC


// fungsi fetch data lewat RPC
export async function fetchDstOilRecords(
  startDate: string,
  endDate: string
): Promise<DstOliWithLocation[]> {
  const { data, error } = await supabase.rpc("fetch_dst_oil_full", {
    start_date: startDate,
    end_date: endDate,
  });

  if (error) throw error;

  return data as DstOliWithLocation[];
}

