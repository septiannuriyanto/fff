import { supabase } from "../db/SupabaseClient";

interface RoleProps {
  nrp?: string;
}

const getRole = async ({ nrp }: RoleProps): Promise<{ role: string | null; position: number | null; dept: string | null }> => {
  try {
    // Fetch user role and dept based on the `nrp`
    const { data: positionData, error: positionError } = await supabase
      .from('manpower')
      .select('position, incumbent(id, incumbent, dept)')
      .eq('nrp', nrp)
      .single();

    if (positionError) {
      console.error("Error fetching role:", positionError.message);
      return { role: null, position: null, dept: null };
    }

    // Safely extract role, dept, and position
    const incumbentData = positionData?.incumbent;
    const role = Array.isArray(incumbentData) ? incumbentData[0]?.incumbent : (incumbentData as any)?.incumbent || null;
    const dept = Array.isArray(incumbentData) ? incumbentData[0]?.dept : (incumbentData as any)?.dept || null;
    const position = positionData?.position ?? null;
    return { role, position, dept };
  } catch (error) {
    console.error("Unexpected error fetching role:", error);
    return { role: null, position: null, dept: null };
  }
};

export default getRole;
