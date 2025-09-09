// /dst-oil/computeQtyFromInput.ts
import { supabase } from "../../../../db/SupabaseClient";

/** Interpolasi linear antara (x0,y0) dan (x1,y1) pada x */
function linearInterpolate(
  x: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number
): number {
  if (x1 === x0) return y0;
  return y0 + ((x - x0) * (y1 - y0)) / (x1 - x0);
}

export async function computeQtyFromInput(
  warehouseId: string,
  materialCode: string,
  tankNumber: number,
  uoi: string,
  inputValue: string,
  setupData?: { conversion_factor?: number; storage_model?: string } // optional, jika tidak ada akan fetch
): Promise<number | null> {
  if (!inputValue) return null;

  console.log(inputValue);
  console.log(warehouseId, materialCode, tankNumber, uoi);

  const raw = parseFloat(inputValue);
  if (isNaN(raw)) return null;

  let setup = setupData;

  // 1) Jika setupData tidak diprovide, fetch dari database
  if (!setup) {
    const { data: fetchedSetup, error: setupError } = await supabase
      .from("storage_oil_setup")
      .select("conversion_factor, storage_model")
      .eq("warehouse_id", warehouseId)
      .eq("material_code", materialCode)
      .eq("tank_number", tankNumber)
      .eq("uoi", uoi)
      .maybeSingle();

    if (setupError || !fetchedSetup) {
      console.log("Error getting setup data or no setup found:", setupError);
      return null;
    }
    
    setup = fetchedSetup;
  }

  // 2) Jika conversion_factor tersedia dan bukan null/undefined
  if (setup.conversion_factor != null) {
    console.log("Using conversion_factor:", setup.conversion_factor);
    return raw * setup.conversion_factor;
  }

  // 3) Fallback: interpolasi dari tera_tangki_oil
  if (!setup.storage_model) {
    console.log("No storage_model available for interpolation");
    return null;
  }

  // Input dikali 10 sebelum interpolasi
  const depth = raw * 10;
  console.log("computeQtyFromInput: depth (x10) =", depth);

  // cari batas bawah: depth_mm <= depth, ambil yang paling dekat (descending)
  const {
    data: lower,
    error: lowerError
  } = await supabase
    .from("tera_tangki_oil")
    .select("depth_mm, qty")
    .eq("storage_model", setup.storage_model)
    .lte("depth_mm", depth)
    .order("depth_mm", { ascending: false })
    .limit(1)
    .maybeSingle();

  // cari batas atas: depth_mm >= depth, ambil yang paling dekat (ascending)
  const {
    data: upper,
    error: upperError
  } = await supabase
    .from("tera_tangki_oil")
    .select("depth_mm, qty")
    .eq("storage_model", setup.storage_model)
    .gte("depth_mm", depth)
    .order("depth_mm", { ascending: true })
    .limit(1)
    .maybeSingle();

  // jika terjadi error pada query atau tidak ada data sama sekali
  if ((lowerError && upperError) || (!lower && !upper)) {
    console.log("No data found in tera_tangki_oil for interpolation");
    return null;
  }

  // jika hanya satu bound tersedia -> kembalikan qty bound tersebut (ekstrapolasi sederhana)
  if (lower && !upper) {
    console.log("Only lower bound found, returning lower.qty:", lower.qty);
    return lower.qty ?? null;
  }
  if (upper && !lower) {
    console.log("Only upper bound found, returning upper.qty:", upper.qty);
    return upper.qty ?? null;
  }

  // kalau keduanya ada:
  // jika depth persis sama dengan salah satu bound -> langsung kembalikan
  if (lower && lower.depth_mm === depth) {
    console.log("Exact match with lower bound:", lower.qty);
    return lower.qty ?? null;
  }
  if (upper && upper.depth_mm === depth) {
    console.log("Exact match with upper bound:", upper.qty);
    return upper.qty ?? null;
  }

  // lakukan interpolasi linear antara lower dan upper
  const interpolatedResult = linearInterpolate(
    depth,
    lower!.depth_mm,
    lower!.qty,
    upper!.depth_mm,
    upper!.qty
  );
  
  console.log(`Interpolated result: depth=${depth}, lower=(${lower!.depth_mm},${lower!.qty}), upper=(${upper!.depth_mm},${upper!.qty}), result=${interpolatedResult}`);
  
  return interpolatedResult;
}