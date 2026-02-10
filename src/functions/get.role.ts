import { supabase } from "../db/SupabaseClient";

interface RoleProps {
  nrp?: string;
}

const getRole = async ({ nrp }: RoleProps): Promise<{ role: string | null; position: number | null }> => {
  try {
    // Fetch user role based on the `nrp`
    const { data: positionData, error: positionError } = await supabase
      .from('manpower')
      .select('position, incumbent(incumbent)')
      .eq('nrp', nrp)
      .single(); // Ensures only one result is fetched

    if (positionError) {
      console.error("Error fetching role:", positionError.message);
      return { role: null, position: null };
    }

    // Safely extract role and position
    const incumbentData = positionData?.incumbent;
    const role = Array.isArray(incumbentData) ? incumbentData[0]?.incumbent : (incumbentData as any)?.incumbent || null;
    const position = positionData?.position ?? null;
    return { role, position };
  } catch (error) {
    console.error("Unexpected error fetching role:", error);
    return { role: null, position: null };
  }
};

export default getRole;
