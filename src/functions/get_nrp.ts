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