import { supabase } from "../db/SupabaseClient";

export const getQtyByHeight = async (height: any, whId: string) => {
    let heightBottom = Math.floor(height);
    let heightTop = Math.ceil(height);

    // Fetch data from the Supabase table
    const { data, error } = await supabase
      .from('tera_tangki')
      .select('qty_liter') // Select the qty_liter column
      .or(`height_cm.eq.${heightBottom},height_cm.eq.${heightTop}`) // Match the height for bottom and top
      .eq('warehouse_id', whId); // Filter by warehouse_id

    if (error) {
      console.log(error.message);
      return;
    }

    console.log(data);

    // Extract the quantities for bottom and top
    let qtyBottom = 0;
    let qtyTop = 0;
    let resultLiter = 0;

    if (data.length === 1) {
      resultLiter = data[0].qty_liter;
    } else {
      if (data[0].qty_liter < data[1].qty_liter) {
        qtyBottom = data[0].qty_liter;
        qtyTop = data[1].qty_liter;
      } else {
        qtyBottom = data[1].qty_liter;
        qtyTop = data[0].qty_liter;
      }

      resultLiter =
        qtyBottom +
        ((height - heightBottom) / (heightTop - heightBottom)) *
          (qtyTop - qtyBottom);
    }

    // Perform linear interpolation to get the resultLiter

    console.log('Interpolated result:', resultLiter);

    // Return both quantities to the client
    return resultLiter;
  };