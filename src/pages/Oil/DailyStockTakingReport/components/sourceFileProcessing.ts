import { supabase } from "../../../../db/SupabaseClient";
import { getValidMaterials } from "./getValidMaterial";
import * as XLSX from 'xlsx';


async function detectAndUpload(file: File) {
  const extension = file.name.split('.').pop()?.toLowerCase();

  if (extension === 'csv' || extension === 'txt') {
    // baca baris pertama
    const text = await file.text();
    const firstLine = text.split('\n')[0].trim();
    if (firstLine.startsWith('PID')) {
      // FAILED_POSTING
      return handleFailedPosting(text); // handler CSV pipe
    }
  }

  if (extension === 'xlsx' || extension === 'xls') {
    // baca sheet pertama
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // cek cell A1
    const cellA1 = sheet['A1']?.v as string;
    const json = XLSX.utils.sheet_to_json<any>(sheet, { defval: '' });

    if (cellA1 && cellA1.trim().toUpperCase() === 'DISTRICT') {
      // SOH_TACTYS
      return handleSohTactys(json);
    } else {
      // SOH_SAP
      return handleSohSAP(json);
    }
  }

  throw new Error('Format file tidak dikenali');
}

async function handleFailedPosting(text: string) {
  const rows = text
    .split('\n')
    .slice(1) // skip header
    .map(line => {
      const [material_code, qty] = line.split('|');
      return { material_code: material_code?.trim(), qty: Number(qty) };
    });

  const validMaterials = await getValidMaterials();
  const filtered = rows.filter(r => validMaterials.has(r.material_code));

  return supabase.from('dst_system').insert(
    filtered.map(r => ({
      dst_date: new Date(),
      warehouse_id: 'WH1',
      qty: r.qty,
      type: 'FAILED_POSTING',
    }))
  );
}

// SOH SAP: file seperti Plant / Material / Total Stock
async function handleSohSAP(json: any[]) {
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
      qty: r.qty,
      type: 'SOH_SAP'
    }))
  );
}

// SOH TACTYS: file seperti DISTRICT / WAREHOUSE / STOCKCODE / SOH
async function handleSohTactys(json: any[]) {
  const validMaterials = await getValidMaterials();

  const rows = json.map(row => ({
    material_code: row['STOCKCODE'] ?? '',
    warehouse_id: row['WAREHOUSE'] ?? '',
    qty: Number(row['SOH'] ?? 0),
  })).filter(r => validMaterials.has(r.material_code));

  return supabase.from('dst_system').insert(
    rows.map(r => ({
      dst_date: new Date(),        // pakai selectedDate kalau ada
      warehouse_id: r.warehouse_id,
      qty: r.qty,
      type: 'SOH_TACTYS'
    }))
  );
}




export { detectAndUpload, handleSohSAP, handleSohTactys, handleFailedPosting };
