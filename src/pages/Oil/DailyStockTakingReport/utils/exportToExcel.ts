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

    // Variable for department head name - default "Harfan"
    const namaKabag = "Rizqi Suminar";

    const logoUrl = CompanyLogo; 

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

    sheet.getCell('B1').value = 'PT. Pamapersada Nusantara';
    sheet.getCell('B2').value = 'District BRCG';
    sheet.getCell('B3').value = 'Gurimbang - Kalimantan Timur';

    sheet.mergeCells('L1:O1');
    const codeCell = sheet.getCell('L1');
    codeCell.value = 'PAMA/SMDV/F-011';
    codeCell.alignment = { horizontal: 'right', vertical: 'middle' };
    codeCell.font = { size: 10, bold: true };

    sheet.mergeCells('A6:O6');
    const titleCell = sheet.getCell('A6');
    titleCell.value = 'FORMULIR STOCK TAKING PELUMAS & ADDITIVE';
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell.font = { size: 22, bold: true };

    sheet.getRow(6).height = 24.1;

    sheet.getCell('B8').value = 'DISTRICT';
    sheet.getCell('C8').value = ': BRCG';

    sheet.getCell('B9').value = 'TANGGAL';
    const dateObj = new Date(selectedDate);
    const formattedDate = dateObj.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
    sheet.getCell('C9').value = `: ${formattedDate}`;

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
    ];

    sheet.insertRow(11, headerRow1);
    sheet.insertRow(12, headerRow2);

    sheet.mergeCells('J11:L11'); 
    sheet.mergeCells('M11:O11'); 
  
    ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'].forEach((col) => {
        sheet.mergeCells(`${col}11:${col}12`);
    });

    for (let rowNum = 11; rowNum <= 12; rowNum++) {
        const row = sheet.getRow(rowNum);
        row.eachCell((cell) => {
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
        ];
        sheet.addRow(rowData);
    });

    const dataStartRow = 13;
    const dataEndRow = 12 + filteredRecords.length;
  
    for (let rowNum = dataStartRow; rowNum <= dataEndRow; rowNum++) {
        const row = sheet.getRow(rowNum);
        row.eachCell((cell) => {
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' },
            };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
        });
    }

    // --- NEW FEATURE: Signature Section ---
    // Calculate signature rows
    const rowX = dataEndRow + 3; // 3 baris setelah baris terakhir data
    const rowY = rowX + 7;        // 7 baris setelah rowX  
    const rowZ = rowY + 1;        // 1 baris setelah rowY

    // Row X: Labels
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

    // Row Y: Signature lines and name
    sheet.mergeCells(`B${rowY}:E${rowY}`);
    const signatureLineCell = sheet.getCell(`B${rowY}`);
    signatureLineCell.value = '_______________________________';
    signatureLineCell.alignment = { horizontal: 'center', vertical: 'middle' };

    sheet.mergeCells(`L${rowY}:O${rowY}`);
    const kabagNameCell = sheet.getCell(`L${rowY}`);
    kabagNameCell.value = namaKabag;
    kabagNameCell.alignment = { horizontal: 'center', vertical: 'middle' };
    kabagNameCell.font = { bold: true };

    // Row Z: Position titles
    sheet.mergeCells(`B${rowZ}:E${rowZ}`);
    const faoCell = sheet.getCell(`B${rowZ}`);
    faoCell.value = 'FAO GL BRCG';
    faoCell.alignment = { horizontal: 'center', vertical: 'middle' };
    faoCell.font = { bold: false };

    sheet.mergeCells(`L${rowZ}:O${rowZ}`);
    const smDeptHeadCell = sheet.getCell(`L${rowZ}`);
    smDeptHeadCell.value = 'SM Dept Head BRCG';
    smDeptHeadCell.alignment = { horizontal: 'center', vertical: 'middle' };
    smDeptHeadCell.font = { bold: false };

    ['B1', 'B2', 'B3'].forEach(cellAddr => {
        const cell = sheet.getCell(cellAddr);
        cell.font = { size: 12, bold: true };
        cell.alignment = { vertical: 'middle' };
    });

    ['B8', 'B9'].forEach(cellAddr => {
        const cell = sheet.getCell(cellAddr);
        cell.font = { bold: true };
    });

    ['C8', 'C9'].forEach(cellAddr => {
        const cell = sheet.getCell(cellAddr);
        cell.font = { bold: true };
    });

    // --- FIXED: Improved Autofit Logic ---
    // Calculate column widths based on content
    const columnWidths: { [key: number]: number } = {};

    // Check all rows for content width
    sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
            if (cell.value) {
                let cellText = '';
                
                // Handle different cell value types
                if (typeof cell.value === 'string') {
                    cellText = cell.value;
                } else if (typeof cell.value === 'number') {
                    cellText = cell.value.toString();
                } else if (cell.value && typeof cell.value === 'object' && 'text' in cell.value) {
                    // Handle rich text
                    cellText = (cell.value as any).text || '';
                } else {
                    cellText = String(cell.value);
                }

                // Calculate width based on text length and font
                const font = cell.font || {};
                const fontSize = font.size || 11;
                const isBold = font.bold || false;
                
                // Rough character width calculation (adjust multiplier as needed)
                const baseCharWidth = fontSize * 0.7;
                const boldMultiplier = isBold ? 1.2 : 1;
                const calculatedWidth = (cellText.length * baseCharWidth * boldMultiplier) / 7; // Convert to Excel units
                
                // Track maximum width for each column
                if (!columnWidths[colNumber] || calculatedWidth > columnWidths[colNumber]) {
                    columnWidths[colNumber] = Math.min(calculatedWidth, 50); // Cap at 50 units
                }
            }
        });
    });

    // Apply calculated widths to columns with minimum width
    Object.keys(columnWidths).forEach(colNumber => {
        const col = sheet.getColumn(parseInt(colNumber));
        const calculatedWidth = columnWidths[parseInt(colNumber)];
        col.width = Math.max(calculatedWidth + 2, 8); // Minimum width 8, add 2 for padding
    });

    // --- FIXED: Manual Column Width Overrides ---
    // Force override specific columns AFTER autofit
    const cmToCharWidth = 2.83;
    
    // Method 1: Direct column object access (more reliable)
    const columnA = sheet.columns[0]; // Column A (index 0)
    const columnB = sheet.columns[1]; // Column B (index 1)  
    const columnC = sheet.columns[2]; // Column C (index 2)
    const columnF = sheet.columns[5]; // Column F (index 5)
    
    if (columnA) columnA.width = 1.7 * cmToCharWidth;
    if (columnB) columnB.width = 3.60 * cmToCharWidth;
    if (columnC) columnC.width = 2.2 * cmToCharWidth;
    if (columnF) columnF.width = 4.8 * cmToCharWidth;
    
    // Method 2: Alternative using getColumn with explicit assignment
    try {
        sheet.getColumn('A').width = 1.7 * cmToCharWidth;  // No
        sheet.getColumn('B').width = 3.60 * cmToCharWidth; // Key
        sheet.getColumn('C').width = 2.2 * cmToCharWidth;  // Warehouse  
        sheet.getColumn('F').width = 4.8 * cmToCharWidth;  // Description
        
        // Other specific widths
        sheet.getColumn('D').width = 8;   // Unit
        sheet.getColumn('E').width = 12;  // Material
        sheet.getColumn('G').width = 8;   // Tank
        sheet.getColumn('H').width = 6;   // UOI
        sheet.getColumn('I').width = 10;  // Location
        
        // Data columns (J-O) with consistent width
        sheet.getColumn('J').width = 10;  // SOH Fisik
        sheet.getColumn('K').width = 10;  // System1
        sheet.getColumn('L').width = 10;  // System2
        sheet.getColumn('M').width = 10;  // Pending Receive
        sheet.getColumn('N').width = 10;  // Failed
        sheet.getColumn('O').width = 10;  // Input
    } catch (error) {
        console.warn('Error setting column widths:', error);
    }


    

    // --- NEW FEATURE: Set Print Area ---
    // Set print area from A1 to O{rowZ} (covering all content including signature section)
    sheet.pageSetup.printArea = `A1:O${rowZ}`;
    
    // Optional: Set page orientation and margins for better printing
    sheet.pageSetup.orientation = 'portrait';
    sheet.pageSetup.fitToPage = true;
    sheet.pageSetup.fitToWidth = 1;
    sheet.pageSetup.fitToHeight = 0; // Auto fit height

    // Export
    const buf = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buf]), `StockTaking-${selectedDate}.xlsx`);
}