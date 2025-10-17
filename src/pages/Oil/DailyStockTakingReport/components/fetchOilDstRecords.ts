// src/utils/fetchDstOilRecords.ts

import { supabase } from "../../../../db/SupabaseClient";
import { DstOliWithLocation } from "./DstOliWithLocation";

export interface Material {
  item_description: string;
  material_code: string;
}

export interface StorageOil {
  warehouse_id: string;
  location: string;
}

export interface StorageOilSetup {
  id: number;
  warehouse_id: string | null;
  material_code: string | null;
  tank_number: number;
  uoi: string | null;
  conversion_factor: number | null;
  storage_model: string | null;
  special_monitor: number | null;
  materials?: Material;
  storage_oil?: StorageOil;
}

/**
 * Fungsi fetch data lewat RPC dengan error handling yang lebih baik
 */
export async function fetchDstOilRecords(
  startDate: string,
  endDate: string
): Promise<DstOliWithLocation[]> {
  try {
    console.log('🔄 Fetching DST Oil Records...', { startDate, endDate });
    
    const { data, error } = await supabase.rpc("fetch_dst_oil_full", {
      start_date: startDate,
      end_date: endDate,
    });

    if (error) {
      console.error('❌ Supabase RPC Error:', error);
      throw new Error(`Failed to fetch DST oil records: ${error.message}`);
    }

    if (!data) {
      console.warn('⚠️ No data returned from RPC');
      return []; // Return empty array instead of null
    }

    console.log('✅ DST Oil Records fetched:', data.length, 'records');
    return data as DstOliWithLocation[];
  } catch (error) {
    console.error('❌ Error in fetchDstOilRecords:', error);
    throw error; // Re-throw untuk ditangkap di component
  }
}

/**
 * Fungsi fetch storage oil setup dengan error handling
 */
export const fetchAvailableStorageOil = async (): Promise<StorageOilSetup[]> => {
  try {
    console.log('🔄 Fetching Available Storage Oil...');
    
    const { data, error } = await supabase
      .from('storage_oil_setup')
      .select(
        `
        id,
        warehouse_id,
        material_code,
        tank_number,
        uoi,
        conversion_factor,
        storage_model,
        special_monitor,
        materials:material_code(item_description, material_code),
        storage_oil:warehouse_id(warehouse_id, location)
        `
      )
      .in('storage_model', ['tank6000', 'tank2000']);

    if (error) {
      console.error('❌ Supabase Query Error:', error);
      throw new Error(`Failed to fetch storage oil setup: ${error.message}`);
    }

    if (!data) {
      console.warn('⚠️ No storage oil setup data found');
      return [];
    }

    const mappedData = data.map((item: any) => ({
      ...item,
      materials: Array.isArray(item.materials) ? item.materials[0] : item.materials,
      storage_oil: Array.isArray(item.storage_oil) ? item.storage_oil[0] : item.storage_oil,
    }));

    console.log('✅ Storage Oil Setup fetched:', mappedData.length, 'records');
    return mappedData;
  } catch (error) {
    console.error('❌ Error in fetchAvailableStorageOil:', error);
    throw error;
  }
};