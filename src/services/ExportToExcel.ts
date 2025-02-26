import * as XLSX from 'xlsx'; // Import the xlsx library
import { supabase } from '../db/SupabaseClient';

async function downloadExcel(startDate: string, endDate: string) {
  // Call the RPC to fetch the data
  const { data, error } = await supabase
    .rpc('export_ritasi_fuel_to_csv', {
      start_date: startDate,
      end_date: endDate,
    });

  if (error) {
    console.error('Error fetching Excel data:', error);
    return;
  }

  // Parse the CSV data into an array of objects
  const rows = data.split('\n').map((row: string) => row.split(','));
  
  // Get the headers from the first row
  const headers = rows[0];

  // Convert the rest of the rows into an array of objects
  const jsonData = rows.slice(1).map((row: string[]) => {
    return {
      no_surat_jalan: row[0],
      ritation_date: row[1],
      queue_num: row[2],
      warehouse_id: row[3],
      qty_flowmeter_before: parseInt(row[4], 10), // Convert to bigint (number)
      qty_flowmeter_after: parseInt(row[5], 10), // Convert to bigint (number)
      qty_sj: parseInt(row[6], 10) // Convert to bigint (number)
    };
  });

  // Convert JSON to Excel using xlsx
  const worksheet = XLSX.utils.json_to_sheet(jsonData); // Create a worksheet from the JSON data
  const workbook = XLSX.utils.book_new(); // Create a new workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Ritasi Fuel'); // Append the worksheet to the workbook

  // Create a downloadable Excel file
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'ritasi_fuel.xlsx';
  a.click();
}

export { downloadExcel };
