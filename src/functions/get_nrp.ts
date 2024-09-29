import { supabase } from "../db/SupabaseClient"

export const getNrpFromName = async (name:string)=>{
    const { data, error } = await supabase
    .from('manpower')
    .select('nrp')
    .eq('nama', name)
    if(error){
        console.log(error.message);
        return null;
    }
    console.log(data);
    
    return data[0].nrp;
    
}

export const getNameFromNrp = async (nrp:string)=>{
    const { data, error } = await supabase
    .from('manpower')
    .select('nama')
    .eq('nrp', nrp)
    if(error){
        console.log(error.message);
        return null;
    }
    console.log(data);
    
    return data[0].nama;
}

export const getFTFromWH = async (whId:string)=>{
    const { data, error } = await supabase
    .from('storage')
    .select('unit_id')
    .eq('warehouse_id', whId)
    if(error){
        console.log(error.message);
        return null;
    }
    console.log(data);
    
    return data[0].unit_id;
}

export const getWHFromFT = async (ftNumber:string)=>{
    const { data, error } = await supabase
    .from('storages')
    .select('warehouse_id')
    .eq('unit_id', ftNumber)
    if(error){
        console.log(error.message);
        return null;
    }
    console.log(data);
    
    return data[0].warehouse_id;
}

