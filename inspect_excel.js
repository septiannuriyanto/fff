import * as XLSX from 'xlsx';
import fs from 'fs';

try {
  const filePath = '/Users/septiansm2/Downloads/Fuel Cons Project/fff-web/src/files/ReportHistoryTransfer_20260227.xlsx';
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
  console.log(JSON.stringify(data.slice(0, 5), null, 2));
} catch (error) {
  console.error(error);
}
