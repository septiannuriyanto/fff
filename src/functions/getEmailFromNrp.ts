import { supabase } from "../db/SupabaseClient";

const getEmailFromNrp = async (nrp: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .from('manpower') // Replace with your actual table name
        .select('email') // Replace 'email' with the column name for the email
        .eq('nrp', nrp)
        .single();
  
      if (error) {
        console.error('Error fetching email:', error);
        return null;
      }
      return data.email;
    } catch (error) {
      console.error('Unexpected error:', error);
      return null;
    }
  };

  export default getEmailFromNrp;