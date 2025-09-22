import { supabase } from "../../../../db/SupabaseClient";
import { getValidMaterials } from "./getValidMaterial";
import * as XLSX from 'xlsx';



async function detectAndUpload(file: File) {
  try {
    console.log("Detecting and uploading file:", file.name);

    const extension = file.name.split(".").pop()?.toLowerCase();

    if (extension === "csv" || extension === "txt") {
      const text = await file.text();
      const firstLine = text.split("\n")[0].trim();
      if (firstLine.startsWith("PID")) {
        return handleFailedPosting(text); // handler CSV pipe
      }
      throw new Error("Format CSV/TXT tidak dikenali");
    }

    if (extension === "xlsx" || extension === "xls") {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];

      if (!sheet) throw new Error("Sheet pertama tidak ditemukan");

      const cellA1 = sheet["A1"]?.v as string;
      const json = XLSX.utils.sheet_to_json<any>(sheet, { defval: "" });

      if (cellA1 && cellA1.trim().toUpperCase() === "DISTRICT") {
        return handleSohTactys(json);
      } else {
        return handleSohSAP(json);
      }
    }

    throw new Error("Format file tidak dikenali");
  } catch (err) {
    // lempar lagi supaya ditangkap di handleUpload
    console.error("detectAndUpload error:", err);
    throw err;
  }
}

async function handleFailedPosting(text: string) {
  console.log("Handling FAILED_POSTING file");

  // pisahkan baris dan ambil header
  const lines = text.split("\n").filter(line => line.trim() !== "");
  const header = lines[0].split("|").map(h => h.trim());

  // cari index kolom yang kita butuhkan
  const stockCodeIndex = header.findIndex(
    h => h.toLowerCase() === "stock_code"
  );
  const warehouseIndex = header.findIndex(
    h => h.toLowerCase() === "warehouse"
  );
  const qtyRequestIndex = header.findIndex(
    h => h.toLowerCase().includes("qty request")
  );
  const loadingDateSuccessIndex = header.findIndex(
    h => h.toLowerCase().includes("loading date success")
  );

  if (
    stockCodeIndex === -1 ||
    warehouseIndex === -1 ||
    qtyRequestIndex === -1 ||
    loadingDateSuccessIndex === -1
  ) {
    throw new Error(
      "Kolom Warehouse / Stock_Code / Qty Request / Loading Date Success tidak ditemukan"
    );
  }

  // mapping isi file jadi objek
  const rows = lines.slice(1).map(line => {
    const cols = line.split("|");
    return {
      material_code: cols[stockCodeIndex]?.trim() ?? "",
      warehouse_id: cols[warehouseIndex]?.trim() ?? "",
      qty: Number(cols[qtyRequestIndex] ?? 0),
      loadingDateSuccess: cols[loadingDateSuccessIndex]?.trim() ?? ""
    };
  });

  const validMaterials = await getValidMaterials();

  // filter sesuai kriteria
  const filtered = rows.filter(
    r =>
      validMaterials.has(r.material_code) &&
      r.qty > 0 &&
      !r.loadingDateSuccess // kosong → lolos
  );

  console.log(`Filtered rows count: ${filtered.length}`);

  // insert ke dst_system
  return supabase.from("dst_system").insert(
    filtered.map(r => ({
      dst_date: new Date(), // kalau ada selectedDate ganti di sini
      warehouse_id: r.warehouse_id,
      qty: r.qty,
      type: "FAILED_POSTING",
      material_code: r.material_code
    }))
  );
}



// SOH SAP: file seperti Plant / Material / Total Stock
async function handleSohSAP(json: any[]) {
  console.log("Handling SOH_SAP file");
  
  const validMaterials = await getValidMaterials();

  const rows = json.map(row => ({
    material_code: row['Material Number'] ?? row['Material'] ?? '',
    warehouse_id: row['Storage Location'] ?? row['Plant'] ?? '',
    qty: Number(row['Total Stock'] ?? 0),
  })).filter(r => validMaterials.has(r.material_code));

  return supabase.from('dst_system').insert(
    rows.map(r => ({
      dst_date: new Date(),        // pakai selectedDate kalau ada
      warehouse_id: r.warehouse_id,
      material_code: r.material_code,
      qty: r.qty,
      type: 'SOH_SAP'
    }))
  );
}

// SOH TACTYS: file seperti DISTRICT / WAREHOUSE / STOCKCODE / SOH
async function handleSohTactys(json: any[]) {
  console.log("Handling SOH_TACTYS file");

  const validMaterials = await getValidMaterials();

  // mapping dan filtering langsung
  const rows = json
    .map(row => ({
      material_code: row["STOCKCODE"] ?? "",
      warehouse_id: row["WAREHOUSE"] ?? "",
      qty: Number(row["SOH"] ?? 0),
    }))
    // hanya material valid dan qty > 0
    .filter(r => validMaterials.has(r.material_code) && r.qty > 0);

  // insert ke Supabase
  return supabase.from("dst_system").insert(
    rows.map(r => ({
      dst_date: new Date(), // pakai selectedDate kalau ada
      warehouse_id: r.warehouse_id,
      material_code: r.material_code,
      qty: r.qty,
      type: "SOH_TACTYS",
    }))
  );
}





export { detectAndUpload, handleSohSAP, handleSohTactys, handleFailedPosting };
