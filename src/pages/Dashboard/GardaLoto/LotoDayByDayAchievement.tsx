import React, { useEffect, useState } from 'react';
import { supabase } from '../../../db/SupabaseClient';
import { format, startOfMonth, endOfMonth, parseISO, isWithinInterval } from 'date-fns';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { FaFileExcel, FaUndo } from 'react-icons/fa';

interface DayAchievement {
    date: string; // YYYY-MM-DD
    s1Plan: number;
    s1Actual: number;
    s2Plan: number;
    s2Actual: number;
}

const LotoDayByDayAchievement = () => {
    const [startDate, setStartDate] = useState<string>(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState<string>(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
    const [data, setData] = useState<DayAchievement[]>([]);
    const [loading, setLoading] = useState(false);
    const [isDefaultDates, setIsDefaultDates] = useState(true);

    const defaultStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
    const defaultEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd');

    useEffect(() => {
        setIsDefaultDates(startDate === defaultStart && endDate === defaultEnd);
        fetchData();
    }, [startDate, endDate]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: rpcData, error } = await supabase.rpc('get_loto_achievement_trend', { days_back: 365 });

            if (error) throw error;

            const processed: Record<string, DayAchievement> = {};
            
            const filtered = rpcData.filter((d: any) => {
                 return isWithinInterval(parseISO(d.date), {
                     start: parseISO(startDate),
                     end: parseISO(endDate)
                 });
            });

            filtered.forEach((item: any) => {
                const dateStr = item.date;
                if (!processed[dateStr]) {
                    processed[dateStr] = {
                        date: dateStr,
                        s1Plan: 0,
                        s1Actual: 0,
                        s2Plan: 0,
                        s2Actual: 0
                    };
                }
                
                if (item.shift === 1) {
                    processed[dateStr].s1Plan += item.total_verification || 0;
                    processed[dateStr].s1Actual += item.total_loto || 0;
                } else if (item.shift === 2) {
                    processed[dateStr].s2Plan += item.total_verification || 0;
                    processed[dateStr].s2Actual += item.total_loto || 0;
                }
            });

            const sortedData = Object.values(processed).sort((a, b) => a.date.localeCompare(b.date));
            setData(sortedData);

        } catch (err) {
            console.error("Error fetching day by day achievement:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setStartDate(defaultStart);
        setEndDate(defaultEnd);
    };

    const calculateAchievement = (actual: number, plan: number) => {
        if (plan <= 0) return 0;
        return Math.round((actual / plan) * 100);
    };

    const exportToExcel = async () => {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Daily Achievement');

        // Styles
        const headerStyle: Partial<ExcelJS.Style> = {
            font: { bold: true, size: 12 },
            alignment: { horizontal: 'center', vertical: 'middle' },
            border: {
                top: { style: 'thin', color: { argb: 'FF000000' } },
                left: { style: 'thin', color: { argb: 'FF000000' } },
                bottom: { style: 'thin', color: { argb: 'FF000000' } },
                right: { style: 'thin', color: { argb: 'FF000000' } }
            }
        };

        const greenFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F4EA' } }; // Light Green
        const greenHeadFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCEEAD6' } }; // Darker Green
        
        const grayFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F3F4' } }; // Light Gray
        const grayHeadFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD6D8DA' } }; // Darker Gray

        const orangeFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3E0' } }; // Light Orange
        const orangeHeadFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE0B2' } }; // Darker Orange

        // --- Headers ---
        // Row 1: Merged Headers
        worksheet.mergeCells('A1:A2'); // Tanggal
        worksheet.getCell('A1').value = 'Tanggal';
        worksheet.getCell('A1').fill = greenHeadFill;

        worksheet.mergeCells('B1:D1'); // Shift 1
        worksheet.getCell('B1').value = 'Shift 1';
        worksheet.getCell('B1').fill = greenHeadFill;

        worksheet.mergeCells('E1:G1'); // Shift 2
        worksheet.getCell('E1').value = 'Shift 2';
        worksheet.getCell('E1').fill = grayHeadFill;

        worksheet.mergeCells('H1:J1'); // Total
        worksheet.getCell('H1').value = 'Total';
        worksheet.getCell('H1').fill = orangeHeadFill;

        // Row 2: Sub Headers
        const subHeaders = [
            '', // A (Merged)
            'Unit Refueling', 'Foto LOTO', 'Achv', // B, C, D
            'Unit Refueling', 'Foto LOTO', 'Achv', // E, F, G
            'Unit Refueling', 'Foto LOTO', 'Achv'  // H, I, J
        ];
        
        worksheet.getRow(2).values = subHeaders;

        // Apply Header Styles
        const applyBorder = (cell: ExcelJS.Cell) => {
             cell.border = {
                top: { style: 'thin', color: { argb: 'FF000000' } },
                left: { style: 'thin', color: { argb: 'FF000000' } },
                bottom: { style: 'thin', color: { argb: 'FF000000' } },
                right: { style: 'thin', color: { argb: 'FF000000' } }
            };
        };

        ['A1', 'B1', 'H1', 'E1'].forEach(cell => {
             const c = worksheet.getCell(cell);
             c.style = headerStyle;
             applyBorder(c);
        });

        const row2 = worksheet.getRow(2);
        row2.eachCell((cell, colNumber) => {
            cell.style = headerStyle;
            applyBorder(cell);
            if (colNumber >= 2 && colNumber <= 4) cell.fill = greenFill;
            if (colNumber >= 5 && colNumber <= 7) cell.fill = grayFill;
            if (colNumber >= 8 && colNumber <= 10) cell.fill = orangeFill;
        });

        // Set Column Widths
        worksheet.columns = [
            { width: 12 }, // Date
            { width: 15 }, { width: 12 }, { width: 10 }, // S1
            { width: 15 }, { width: 12 }, { width: 10 }, // S2
            { width: 15 }, { width: 12 }, { width: 10 }  // Total
        ];

        // --- Data Rows ---
        let currentRowIdx = 3;
        data.forEach((row) => {
            const rowData = worksheet.getRow(currentRowIdx);
            
            // A: Date
            rowData.getCell(1).value = format(parseISO(row.date), 'dd MMM');
            rowData.getCell(1).alignment = { horizontal: 'center' };

            // B, C: Shift 1 Values
            rowData.getCell(2).value = row.s1Plan;
            rowData.getCell(3).value = row.s1Actual;
            
            // D: Shift 1 Achv Formula: =C/B
            rowData.getCell(4).value = { formula: `IF(B${currentRowIdx}>0, C${currentRowIdx}/B${currentRowIdx}, 0)` };
            rowData.getCell(4).numFmt = '0%';

            // E, F: Shift 2 Values
            rowData.getCell(5).value = row.s2Plan;
            rowData.getCell(6).value = row.s2Actual;

            // G: Shift 2 Achv Formula: =F/E
            rowData.getCell(7).value = { formula: `IF(E${currentRowIdx}>0, F${currentRowIdx}/E${currentRowIdx}, 0)` };
            rowData.getCell(7).numFmt = '0%';

            // H: Total Plan Formula: =B+E
            rowData.getCell(8).value = { formula: `B${currentRowIdx}+E${currentRowIdx}` };
            
            // I: Total Actual Formula: =C+F
            rowData.getCell(9).value = { formula: `C${currentRowIdx}+F${currentRowIdx}` };

            // J: Total Achv Formula: =I/H
            rowData.getCell(10).value = { formula: `IF(H${currentRowIdx}>0, I${currentRowIdx}/H${currentRowIdx}, 0)` };
            rowData.getCell(10).numFmt = '0%';

            // Apply Row Styling
            rowData.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                applyBorder(cell);
                if (colNumber === 1) cell.fill = greenFill;
                if (colNumber >= 2 && colNumber <= 4) cell.font = { color: { argb: 'FF000000'} }; 
                if (colNumber >= 5 && colNumber <= 7) cell.fill = grayFill;
                if (colNumber >= 8 && colNumber <= 10) cell.fill = orangeFill;
                
                // Achievement Colors
                if ([4, 7, 10].includes(colNumber)) {
                    cell.font = { bold: true };
                }
            });

            currentRowIdx++;
        });

        // --- Summary Row ---
        const summaryRowIdx = currentRowIdx;
        const summaryRow = worksheet.getRow(summaryRowIdx);
        
        summaryRow.getCell(1).value = 'Total';
        summaryRow.getCell(1).font = { bold: true };
        summaryRow.getCell(1).fill = greenHeadFill;
        summaryRow.getCell(1).alignment = { horizontal: 'center' };

        // Sum Formulas for Columns B, C, E, F
        ['B', 'C', 'E', 'F'].forEach((colChar) => {
             const colIdx = colChar.charCodeAt(0) - 64;
             summaryRow.getCell(colIdx).value = { formula: `SUM(${colChar}3:${colChar}${summaryRowIdx - 1})` };
        });

        // Achievement Formulas for Summary Row
        // D: =C/B
        summaryRow.getCell(4).value = { formula: `IF(B${summaryRowIdx}>0, C${summaryRowIdx}/B${summaryRowIdx}, 0)` };
        summaryRow.getCell(4).numFmt = '0%';
        
        // G: =F/E
        summaryRow.getCell(7).value = { formula: `IF(E${summaryRowIdx}>0, F${summaryRowIdx}/E${summaryRowIdx}, 0)` };
        summaryRow.getCell(7).numFmt = '0%';

        // Total Plan (H): =SUM(H...)
        summaryRow.getCell(8).value = { formula: `SUM(H3:H${summaryRowIdx - 1})` };
        summaryRow.getCell(9).value = { formula: `SUM(I3:I${summaryRowIdx - 1})` };

        // Total Achv (J): =I/H
        summaryRow.getCell(10).value = { formula: `IF(H${summaryRowIdx}>0, I${summaryRowIdx}/H${summaryRowIdx}, 0)` };
        summaryRow.getCell(10).numFmt = '0%';

        // Styling Summary Row
         summaryRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            cell.border = {
                top: { style: 'medium', color: { argb: 'FF000000' } },
                left: { style: 'thin', color: { argb: 'FF000000' } },
                bottom: { style: 'thin', color: { argb: 'FF000000' } },
                right: { style: 'thin', color: { argb: 'FF000000' } }
            };
            cell.font = { bold: true };
            if (colNumber >= 2 && colNumber <= 4) cell.fill = greenHeadFill;
            if (colNumber >= 5 && colNumber <= 7) cell.fill = grayHeadFill;
            if (colNumber >= 8 && colNumber <= 10) cell.fill = orangeHeadFill;
        });

        // Save
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, `Loto_Achievement_${startDate}_to_${endDate}.xlsx`);
    };

    return (
        <div className="bg-white dark:bg-boxdark rounded-xl border border-black dark:border-strokedark shadow-sm p-5 mt-6">
            <div className="flex flex-col md:flex-row justify-between items-center mb-5 gap-4">
                <div>
                     <h3 className="text-lg font-bold text-slate-800 dark:text-white">Daily Performance Record</h3>
                     <p className="text-sm text-slate-500 dark:text-slate-400">Detailed breakdown by shift and date</p>
                </div>
                
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-meta-4 p-1.5 rounded-lg border border-black dark:border-strokedark">
                        <input 
                            type="date" 
                            className="bg-transparent border-none text-sm text-slate-700 dark:text-slate-300 focus:ring-0 p-1"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                        <span className="text-slate-400">-</span>
                        <input 
                            type="date" 
                            className="bg-transparent border-none text-sm text-slate-700 dark:text-slate-300 focus:ring-0 p-1"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>

                    {!isDefaultDates && (
                        <button 
                            onClick={handleReset}
                            className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Reset to Current Month"
                        >
                            <FaUndo size={14} />
                        </button>
                    )}

                    <button 
                        onClick={exportToExcel}
                        className="flex items-center gap-2 px-3 py-2 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg border border-green-200 transition-colors text-sm font-semibold"
                    >
                        <FaFileExcel />
                        <span>Export</span>
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-black dark:border-strokedark max-h-[500px] overflow-y-auto custom-scrollbar">
                <table className="w-full text-sm text-center border-collapse border-spacing-0">
                    <thead className="sticky top-0 z-20 text-xs font-bold uppercase tracking-wider">
                        {/* Main Header */}
                        <tr className="text-slate-700 dark:text-slate-200">
                             <th rowSpan={2} className="bg-green-100 dark:bg-green-900 px-4 py-3 border border-black dark:border-strokedark min-w-[100px] shadow-[inset_0_-1px_0_#000] dark:shadow-[inset_0_-1px_0_#fff]">Tanggal</th>
                             <th colSpan={3} className="bg-green-100 dark:bg-green-900 px-4 py-2 border-x border-t border-black dark:border-strokedark text-green-800 dark:text-green-200 shadow-[inset_0_-1px_0_#000] dark:shadow-[inset_0_-1px_0_#fff]">Shift 1</th>
                             <th colSpan={3} className="bg-slate-100 dark:bg-slate-800 px-4 py-2 border-x border-t border-black dark:border-strokedark text-slate-700 dark:text-slate-300 shadow-[inset_0_-1px_0_#000] dark:shadow-[inset_0_-1px_0_#fff]">Shift 2</th>
                             <th colSpan={3} className="bg-orange-100 dark:bg-orange-900 px-4 py-2 border-x border-t border-black dark:border-strokedark text-orange-800 dark:text-orange-200 shadow-[inset_0_-1px_0_#000] dark:shadow-[inset_0_-1px_0_#fff]">Total</th>
                        </tr>
                        {/* Sub Header */}
                        <tr className="bg-white dark:bg-boxdark text-[10px]">
                            {/* Shift 1 */}
                            <th className="px-2 py-2 bg-green-50 border-x border-black dark:border-strokedark shadow-[inset_0_-1px_0_#000] dark:shadow-[inset_0_-1px_0_#fff]">Unit Refueling</th>
                            <th className="px-2 py-2 bg-green-50 border-x border-black dark:border-strokedark shadow-[inset_0_-1px_0_#000] dark:shadow-[inset_0_-1px_0_#fff]">Foto LOTO</th>
                            <th className="px-2 py-2 bg-green-50 border-x border-black dark:border-strokedark shadow-[inset_0_-1px_0_#000] dark:shadow-[inset_0_-1px_0_#fff]">Achv</th>

                            {/* Shift 2 */}
                             <th className="px-2 py-2 bg-slate-50 border-x border-black dark:border-strokedark shadow-[inset_0_-1px_0_#000] dark:shadow-[inset_0_-1px_0_#fff]">Unit Refueling</th>
                            <th className="px-2 py-2 bg-slate-50 border-x border-black dark:border-strokedark shadow-[inset_0_-1px_0_#000] dark:shadow-[inset_0_-1px_0_#fff]">Foto LOTO</th>
                            <th className="px-2 py-2 bg-slate-50 border-x border-black dark:border-strokedark shadow-[inset_0_-1px_0_#000] dark:shadow-[inset_0_-1px_0_#fff]">Achv</th>

                            {/* Total */}
                             <th className="px-2 py-2 bg-orange-50 border-x border-black dark:border-strokedark shadow-[inset_0_-1px_0_#000] dark:shadow-[inset_0_-1px_0_#fff]">Unit Refueling</th>
                            <th className="px-2 py-2 bg-orange-50 border-x border-black dark:border-strokedark shadow-[inset_0_-1px_0_#000] dark:shadow-[inset_0_-1px_0_#fff]">Foto LOTO</th>
                            <th className="px-2 py-2 bg-orange-50 border-x border-black dark:border-strokedark shadow-[inset_0_-1px_0_#000] dark:shadow-[inset_0_-1px_0_#fff]">Achv</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-black dark:divide-strokedark bg-white dark:bg-boxdark">
                        {loading ? (
                            <tr>
                                <td colSpan={10} className="py-8 text-center text-slate-500 border border-black dark:border-strokedark">Loading data...</td>
                            </tr>
                        ) : data.length === 0 ? (
                            <tr>
                                <td colSpan={10} className="py-8 text-center text-slate-500 border border-black dark:border-strokedark">No data found for selected period</td>
                            </tr>
                        ) : (
                            data.map((row, idx) => {
                                const s1Ach = calculateAchievement(row.s1Actual, row.s1Plan);
                                const s2Ach = calculateAchievement(row.s2Actual, row.s2Plan);
                                const totalPlan = row.s1Plan + row.s2Plan;
                                const totalActual = row.s1Actual + row.s2Actual;
                                const totalAch = calculateAchievement(totalActual, totalPlan);

                                return (
                                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-meta-4/30 transition-colors">
                                        <td className="px-4 py-3 font-semibold text-slate-800 dark:text-white border border-black dark:border-strokedark bg-green-50 dark:bg-meta-4 text-left">
                                            {format(parseISO(row.date), 'dd')} 
                                        </td>
                                        
                                        {/* Shift 1 */}
                                        <td className="px-2 py-2 border border-black dark:border-strokedark text-slate-600 dark:text-slate-300">{row.s1Plan || '-'}</td>
                                        <td className="px-2 py-2 border border-black dark:border-strokedark text-slate-600 dark:text-slate-300">{row.s1Actual || '-'}</td>
                                        <td className={`px-2 py-2 border border-black dark:border-strokedark font-bold ${s1Ach >= 100 ? 'text-green-600' : s1Ach < 50 ? 'text-red-500' : 'text-amber-600'}`}>{s1Ach}%</td>

                                        {/* Shift 2 */}
                                        <td className="px-2 py-2 border border-black dark:border-strokedark text-slate-600 dark:text-slate-300 bg-slate-50/30 dark:bg-transparent">{row.s2Plan || '-'}</td>
                                        <td className="px-2 py-2 border border-black dark:border-strokedark text-slate-600 dark:text-slate-300 bg-slate-50/30 dark:bg-transparent">{row.s2Actual || '-'}</td>
                                        <td className={`px-2 py-2 border border-black dark:border-strokedark font-bold bg-slate-50/30 dark:bg-transparent ${s2Ach >= 100 ? 'text-green-600' : s2Ach < 50 ? 'text-red-500' : 'text-amber-600'}`}>{s2Ach}%</td>

                                        {/* Total */}
                                        <td className="px-2 py-2 border border-black dark:border-strokedark text-slate-800 dark:text-white font-semibold bg-orange-50/30 dark:bg-transparent">{totalPlan || '-'}</td>
                                        <td className="px-2 py-2 border border-black dark:border-strokedark text-slate-800 dark:text-white font-semibold bg-orange-50/30 dark:bg-transparent">{totalActual || '-'}</td>
                                        <td className={`px-2 py-2 border border-black dark:border-strokedark font-bold bg-orange-50/30 dark:bg-transparent ${totalAch >= 100 ? 'text-green-600' : totalAch < 50 ? 'text-red-500' : 'text-amber-600'}`}>{totalAch}%</td>
                                    </tr>
                                )
                            })
                        )}
                    </tbody>
                    {data.length > 0 && (
                        <tfoot className="sticky bottom-0 z-20 font-bold bg-white dark:bg-boxdark">
                            {(() => {
                                const totalS1Plan = data.reduce((sum, row) => sum + row.s1Plan, 0);
                                const totalS1Actual = data.reduce((sum, row) => sum + row.s1Actual, 0);
                                const totalS1Ach = calculateAchievement(totalS1Actual, totalS1Plan);

                                const totalS2Plan = data.reduce((sum, row) => sum + row.s2Plan, 0);
                                const totalS2Actual = data.reduce((sum, row) => sum + row.s2Actual, 0);
                                const totalS2Ach = calculateAchievement(totalS2Actual, totalS2Plan);

                                const grandTotalPlan = totalS1Plan + totalS2Plan;
                                const grandTotalActual = totalS1Actual + totalS2Actual;
                                const grandTotalAch = calculateAchievement(grandTotalActual, grandTotalPlan);

                                return (
                                    <tr>
                                         <td className="px-4 py-3 text-slate-800 dark:text-white border-x border-b border-black dark:border-strokedark bg-slate-50 dark:bg-meta-4 shadow-[inset_0_1px_0_#000] dark:shadow-[inset_0_1px_0_#fff]">Total</td>
                                         
                                         {/* Shift 1 Total */}
                                         <td className="px-2 py-3 border-x border-b border-black dark:border-strokedark text-slate-800 dark:text-white bg-green-50 dark:bg-green-900 shadow-[inset_0_1px_0_#000] dark:shadow-[inset_0_1px_0_#fff]">{totalS1Plan}</td>
                                         <td className="px-2 py-3 border-x border-b border-black dark:border-strokedark text-slate-800 dark:text-white bg-green-50 dark:bg-green-900 shadow-[inset_0_1px_0_#000] dark:shadow-[inset_0_1px_0_#fff]">{totalS1Actual}</td>
                                         <td className={`px-2 py-3 border-x border-b border-black dark:border-strokedark bg-green-50 dark:bg-green-900 shadow-[inset_0_1px_0_#000] dark:shadow-[inset_0_1px_0_#fff] ${totalS1Ach >= 100 ? 'text-green-600' : totalS1Ach < 50 ? 'text-red-500' : 'text-amber-600'}`}>{totalS1Ach}%</td>

                                         {/* Shift 2 Total */}
                                         <td className="px-2 py-3 border-x border-b border-black dark:border-strokedark text-slate-800 dark:text-white bg-slate-100 dark:bg-meta-4 shadow-[inset_0_1px_0_#000] dark:shadow-[inset_0_1px_0_#fff]">{totalS2Plan}</td>
                                         <td className="px-2 py-3 border-x border-b border-black dark:border-strokedark text-slate-800 dark:text-white bg-slate-100 dark:bg-meta-4 shadow-[inset_0_1px_0_#000] dark:shadow-[inset_0_1px_0_#fff]">{totalS2Actual}</td>
                                         <td className={`px-2 py-3 border-x border-b border-black dark:border-strokedark bg-slate-100 dark:bg-meta-4 shadow-[inset_0_1px_0_#000] dark:shadow-[inset_0_1px_0_#fff] ${totalS2Ach >= 100 ? 'text-green-600' : totalS2Ach < 50 ? 'text-red-500' : 'text-amber-600'}`}>{totalS2Ach}%</td>

                                         {/* Grand Total */}
                                         <td className="px-2 py-3 border-x border-b border-black dark:border-strokedark text-slate-900 dark:text-white bg-orange-100 dark:bg-orange-900 shadow-[inset_0_1px_0_#000] dark:shadow-[inset_0_1px_0_#fff]">{grandTotalPlan}</td>
                                         <td className="px-2 py-3 border-x border-b border-black dark:border-strokedark text-slate-900 dark:text-white bg-orange-100 dark:bg-orange-900 shadow-[inset_0_1px_0_#000] dark:shadow-[inset_0_1px_0_#fff]">{grandTotalActual}</td>
                                         <td className={`px-2 py-3 bg-orange-100 border-x border-b border-black dark:border-strokedark dark:bg-orange-900 shadow-[inset_0_1px_0_#000] dark:shadow-[inset_0_1px_0_#fff] ${grandTotalAch >= 100 ? 'text-green-600' : grandTotalAch < 50 ? 'text-red-500' : 'text-amber-600'}`}>{grandTotalAch}%</td>
                                    </tr>
                                );
                            })()}
                        </tfoot>
                    )}
                </table>
            </div>
        </div>
    )
}

export default LotoDayByDayAchievement