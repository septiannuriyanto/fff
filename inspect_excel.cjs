const XLSX = require('xlsx');

try {
  const filePath = '/Users/septiansm2/Downloads/Fuel Cons Project/fff-web/src/files/ReportHistoryTransfer_20260227.xlsx';
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
  console.log('HEADER:', JSON.stringify(data[0]));
  console.log('ROW 1:', JSON.stringify(data[1]));
} catch (error) {
  console.error(error);
}
