import ExcelJS from 'exceljs';
import CompanyLogo from '../../../../images/logo/company_logo.png';
import { saveAs } from 'file-saver';
import { DstOliWithLocation } from '../components/DstOliWithLocation';

interface ExportToExcelProps {
  selectedDate: string;
  filteredRecords: DstOliWithLocation[];
}

export async function exportToExcel({ selectedDate, filteredRecords }: ExportToExcelProps) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('StockTaking');

  const namaKabag = 'Rizqi Suminar';
  const logoUrl = CompanyLogo;

  // Logo
  sheet.mergeCells('A1:A3');
  const logoCell = sheet.getCell('A1');
  logoCell.alignment = { vertical: 'middle', horizontal: 'center' };

  try {
    const response = await fetch(logoUrl);
    if (response.ok) {
      const arrayBuffer = await response.arrayBuffer();
      const logoImageId = workbook.addImage({
        buffer: arrayBuffer,
        extension: 'png',
      });
      sheet.addImage(logoImageId, {
        tl: { col: 0, row: 0 },
        ext: { width: 60, height: 60 },
      });
    } else {
      throw new Error('Logo tidak dapat dimuat dari URL');
    }
  } catch (error) {
    console.warn('Logo tidak dapat dimuat:', error);
    logoCell.value = 'LOGO\nPERUSAHAAN';
    logoCell.font = { size: 10, bold: true };
  }

  // Header perusahaan
  sheet.getCell('B1').value = 'PT. Pamapersada Nusantara';
  sheet.getCell('B2').value = 'District BRCG';
  sheet.getCell('B3').value = 'Gurimbang - Kalimantan Timur';

  // Kode form
  sheet.mergeCells('L1:O1');
  const codeCell = sheet.getCell('L1');
  codeCell.value = 'PAMA/SMDV/F-011';
  codeCell.alignment = { horizontal: 'right', vertical: 'middle' };
  codeCell.font = { size: 10, bold: true };

  // Judul
  sheet.mergeCells('A6:O6');
  const titleCell = sheet.getCell('A6');
  titleCell.value = 'FORMULIR STOCK TAKING PELUMAS & ADDITIVE';
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  titleCell.font = { size: 22, bold: true };
  sheet.getRow(6).height = 24.1;

  // Info district & tanggal
  sheet.getCell('B8').value = 'DISTRICT';
  sheet.getCell('C8').value = ': BRCG';

  sheet.getCell('B9').value = 'TANGGAL';
  const dateObj = new Date(selectedDate);
  const formattedDate = dateObj.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  sheet.getCell('C9').value = `: ${formattedDate}`;

  // === HEADER ROWS ===
  const headerRow1 = [
    'No',
    'Key',
    'Warehouse',
    'Unit',
    'Material',
    'Description',
    'Tank',
    'UOI',
    'Location',
    'SOH',
    '',
    '',
    'Pending',
    '',
    '',
    'Diff', // kolom baru
  ];
  const headerRow2 = [
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    'Fisik',
    'System1',
    'System2',
    'Receive',
    'Failed',
    'Input',
    '', // header2 Diff kosong
  ];

  sheet.insertRow(11, headerRow1);
  sheet.insertRow(12, headerRow2);

  sheet.mergeCells('J11:L11'); // SOH group
  sheet.mergeCells('M11:O11'); // Pending group
  sheet.mergeCells('P11:P12'); // Diff sendiri

  ['A','B','C','D','E','F','G','H','I'].forEach(col => {
    sheet.mergeCells(`${col}11:${col}12`);
  });

  for (let rowNum = 11; rowNum <= 12; rowNum++) {
    const row = sheet.getRow(rowNum);
    row.eachCell(cell => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFBFBFBF' },
      };
      cell.font = { bold: true };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
  }

  // === DATA ROWS ===
  filteredRecords.forEach((r, idx) => {
    const key = `${r.warehouse_id}-${r.material_code}`;
    const rowData = [
      idx + 1,
      key,
      r.warehouse_id,
      r.unit_id,
      r.material_code,
      r.item_description,
      r.tank_number,
      r.uoi,
      r.location,
      r.qty ?? 0,
      r.qty_system_1 ?? 0,
      r.qty_system_2 ?? 0,
      r.pending_receive ?? 0,
      r.failed_posting ?? 0,
      r.pending_input ?? 0,
      null, // Diff nanti formula
    ];
    sheet.addRow(rowData);
  });

  const dataStartRow = 13;
  const dataEndRow = 12 + filteredRecords.length;

  // Formula Diff tiap baris
  for (let rowNum = dataStartRow; rowNum <= dataEndRow; rowNum++) {
    sheet.getCell(`P${rowNum}`).value = {
      formula: `ROUND(J${rowNum}-K${rowNum}-L${rowNum}-M${rowNum}+N${rowNum}+O${rowNum},0)`,
    };
  }

  // Border & alignment data
  for (let rowNum = dataStartRow; rowNum <= dataEndRow; rowNum++) {
    const row = sheet.getRow(rowNum);
    row.eachCell(cell => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
  }

  // === BARIS TOTAL ===
  const totalRowIndex = dataEndRow + 1;

  sheet.mergeCells(`A${totalRowIndex}:I${totalRowIndex}`);
  const totalCell = sheet.getCell(`A${totalRowIndex}`);
  totalCell.value = 'Total';
  totalCell.font = { bold: true };
  totalCell.alignment = { horizontal: 'center', vertical: 'middle' };

  ['J','K','L','M','N','O','P'].forEach(col => {
    const cell = sheet.getCell(`${col}${totalRowIndex}`);
    cell.value = {
      formula: `SUM(${col}${dataStartRow}:${col}${dataEndRow})`,
    };
    cell.font = { bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  const totalRow = sheet.getRow(totalRowIndex);
  totalRow.eachCell(cell => {
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
  });

  // === tanda tangan (sama seperti sebelumnya) ===
  const rowX = totalRowIndex + 3;
  const rowY = rowX + 7;
  const rowZ = rowY + 1;

  sheet.mergeCells(`B${rowX}:E${rowX}`);
  const stockTakerCell = sheet.getCell(`B${rowX}`);
  stockTakerCell.value = 'Stock Taker';
  stockTakerCell.alignment = { horizontal: 'center', vertical: 'middle' };
  stockTakerCell.font = { bold: true };

  sheet.mergeCells(`L${rowX}:O${rowX}`);
  const mengetahuiCell = sheet.getCell(`L${rowX}`);
  mengetahuiCell.value = 'Mengetahui';
  mengetahuiCell.alignment = { horizontal: 'center', vertical: 'middle' };
  mengetahuiCell.font = { bold: true };

  sheet.mergeCells(`B${rowY}:E${rowY}`);
  const signatureLineCell = sheet.getCell(`B${rowY}`);
  signatureLineCell.value = '_______________________________';
  signatureLineCell.alignment = { horizontal: 'center', vertical: 'middle' };
  signatureLineCell.font = { bold: true };

  sheet.mergeCells(`L${rowY}:O${rowY}`);
  const kabagNameCell = sheet.getCell(`L${rowY}`);
  kabagNameCell.value = namaKabag;
  kabagNameCell.alignment = { horizontal: 'center', vertical: 'middle' };
  kabagNameCell.font = { bold: true };

  sheet.mergeCells(`B${rowZ}:E${rowZ}`);
  const faoCell = sheet.getCell(`B${rowZ}`);
  faoCell.value = 'FAO GL BRCG';
  faoCell.alignment = { horizontal: 'center', vertical: 'middle' };

  sheet.mergeCells(`L${rowZ}:O${rowZ}`);
  const smDeptHeadCell = sheet.getCell(`L${rowZ}`);
  smDeptHeadCell.value = 'SM Dept Head BRCG';
  smDeptHeadCell.alignment = { horizontal: 'center', vertical: 'middle' };

  // Format beberapa cell header
  ['B1','B2','B3'].forEach(c => {
    const cell = sheet.getCell(c);
    cell.font = { size: 12, bold: true };
    cell.alignment = { vertical: 'middle' };
  });
  ['B8','B9','C8','C9'].forEach(c => {
    sheet.getCell(c).font = { bold: true };
  });

  // Autofit & override (tetap sama punyamu)
  // … bisa paste bagian autofit & column width overrides di sini …

  // Print area
  sheet.pageSetup.printArea = `A1:P${rowZ}`;
  sheet.pageSetup.orientation = 'portrait';
  sheet.pageSetup.fitToPage = true;
  sheet.pageSetup.fitToWidth = 1;
  sheet.pageSetup.fitToHeight = 0;

  // Export
  const buf = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buf]), `StockTaking-${selectedDate}.xlsx`);
}
