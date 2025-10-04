// FuelPartnerDashboard.tsx
import { format } from "date-fns-tz";
import React, { useEffect, useState } from "react";
import { supabase } from "../../../db/SupabaseClient";
import DetailTableRitasi from "./DetailTableRitasi";
import { RitasiFuel } from "../component/ritasiFuel";
import { getMakassarDateObject } from "../../../Utils/TimeUtility";
  import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import QRCode from 'qrcode';

const FuelPartnerDashboard: React.FC = () => {
  const [records, setRecords] = useState<RitasiFuel[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const timeZone = "Asia/Makassar";
  const now = getMakassarDateObject();

  // Gunakan 0-based month (Date default JS)
  const [year, setYear] = useState<number>(now.getFullYear());
  const [month, setMonth] = useState<number>(now.getMonth());

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1); // untuk selector 1–12

  // daysInMonth: bulan +1 untuk dapat jumlah hari bulan berjalan
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const fetchRecords = async () => {
    const startDate = format(new Date(year, month, 1), "yyyy-MM-dd", { timeZone });
    const endDate = format(new Date(year, month + 1, 0), "yyyy-MM-dd", { timeZone });

    const { data, error } = await supabase
      .from("ritasi_fuel")
      .select(`
        id,
        no_surat_jalan,
        queue_num,
        ritation_date,
        warehouse_id,
        qty_sj,
        qty_sonding,
        sonding_before_front,
        sonding_before_rear,
        sonding_after_front,
        sonding_after_rear,
        qty_sonding_before,
        qty_sonding_after,
        operator_id,
        fuelman_id,
        qty_flowmeter_before,
        qty_flowmeter_after,
        isValidated,
        petugas_pencatatan,
        shift,
        flowmeter_before_url,
        flowmeter_after_url,
        photo_url,
        po_allocation,
        rotate_constant,
        storage:warehouse_id (
          unit_id
        ),
        fuelman:fuelman_id (
          nama
        ),
        operator:operator_id (
          nama
        ),
        petugas:petugas_pencatatan (
          nama
        )
      `)
      .gte("ritation_date", startDate)
      .lte("ritation_date", endDate);

    if (error) {
      console.error(error);
      return;
    }

    setRecords(
      (data ?? []).map((item: any) => ({
        ...item,
        unit_id: item.storage?.unit_id ?? null,
        fuelman_name: item.fuelman?.nama ?? null,
        operator_name: item.operator?.nama ?? null,
        petugas_pencatatan_name: item.petugas?.nama ?? null,
        ritation_date: item.ritation_date ?? "",
        rotate_constant: item.rotate_constant ?? 0,
      })) as RitasiFuel[]
    );
  };

  useEffect(() => {
    fetchRecords();
  }, [month, year]);

  const hasData = (day: number) => {
    const dateStr = format(new Date(year, month, day), "yyyy-MM-dd", { timeZone });
    return records.some((r) => r.ritation_date === dateStr);
  };

  const selectedRecords = selectedDate
    ? records.filter((r) => r.ritation_date === selectedDate)
    : [];



const handleReportToExcelMonthly = async () => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Ritasi Fuel');

  const headers = [
    'No',
    'Tanggal',
    'No Surat Jalan',
    'Unit',
    'Qty Flowmeter Before',
    'Qty Flowmeter After',
    'Qty SJ',
    'Qty Sonding Before',
    'Qty Sonding After',
    'Fuelman',
    'Operator',
    'Warehouse',
    'Shift',
    'Evidence',
  ];

  const headerRow = sheet.addRow(headers);
  for (let i = 1; i <= headers.length; i++) {
    const cell = headerRow.getCell(i);
    cell.font = { bold: true };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'D3D3D3' },
    };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
  }

  let totalSJ = 0;

const sortedRecords = [...records].sort((a, b) => {
  return (a.no_surat_jalan || '').localeCompare(b.no_surat_jalan || '', undefined, {
    numeric: true,
    sensitivity: 'base',
  });
});



  for (let i = 0; i < sortedRecords.length; i++) {
    const row = sortedRecords[i];
    totalSJ += Number(row.qty_sj) || 0;

    const dataRow = sheet.addRow([
      i + 1,
      row.ritation_date,
      row.no_surat_jalan,
      row.unit_id,
      row.qty_flowmeter_before,
      row.qty_flowmeter_after,
      row.qty_sj,
      row.qty_sonding_before,
      row.qty_sonding_after,
      row.fuelman_name,
      row.operator_name,
      row.warehouse_id,
      row.shift,
      '',
    ]);

    if (row.photo_url) {
      const qrBase64 = await QRCode.toDataURL(row.photo_url);
      const base64Data = qrBase64.replace(/^data:image\/png;base64,/, '');
      const imageId = workbook.addImage({
        base64: base64Data,
        extension: 'png',
      });
      const rowNum = dataRow.number;
      sheet.addImage(imageId, {
        tl: { col: 13.3, row: rowNum - 0.3 },
        ext: { width: 50, height: 50 },
      });
      sheet.getRow(rowNum).height = 40;
    }
  }

  const totalRow = sheet.addRow([
    'TOTAL',
    '',
    '',
    '',
    '',
    '',
    totalSJ,
    '',
    '',
    '',
    '',
    '',
    '',
    '',
  ]);
  totalRow.font = { bold: true };

  sheet.eachRow((row) => {
    row.eachCell({ includeEmpty: false }, (cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
       cell.alignment = { vertical: 'middle' };
    });
  });

  sheet.columns.forEach((column, i) => {
    let maxLength = headers[i] ? headers[i].length : 10;
    if (column && typeof column.eachCell === 'function') {
      column.eachCell({ includeEmpty: true }, (cell) => {
        const cellLength = cell.value ? cell.value.toString().length : 10;
        maxLength = Math.max(maxLength, cellLength);
      });
    }
    column.width = maxLength + 2;
  });

  // ✅ Format nama file pakai date-fns-tz (Makassar timezone)
  const fileName = `Ritasi_Fuel_${month + 1}-${year}.xlsx`;

  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), fileName);
};


  return (
    <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark mb-6">
      <div className="w-full p-4 sm:p-12.5 xl:p-5">
        <h2 className="mb-4 font-bold text-black dark:text-white sm:text-title-sm w-full">
          Fuel Partner Dashboard
        </h2>

        {/* Year and Month Selector */}
        <div className="flex space-x-4 mb-4">
          <select
            className="border rounded px-2 py-1"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

          <select
            className="border rounded px-2 py-1"
            value={month + 1}
            onChange={(e) => setMonth(Number(e.target.value) - 1)}
          >
            {months.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>

          <button
            onClick={handleReportToExcelMonthly}
            className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded"
          >
            Export to Excel
          </button>
        </div>

        {/* Grid tanggal */}
        <div className="grid grid-cols-7 gap-2 mb-6">
          {Array.from({ length: daysInMonth }, (_, idx) => {
            const day = idx + 1;
            const dateStr = format(new Date(year, month, day), "yyyy-MM-dd", { timeZone });
            const active = hasData(day);
            const selected = selectedDate === dateStr;

            const baseClass = active
              ? "bg-green-200 dark:bg-green-700 text-green-900 dark:text-green-200 cursor-pointer"
              : "bg-slate-200 text-slate-700 dark:bg-graydark dark:text-slate-300";

            const hoverClass = active ? "hover:bg-green-300 dark:hover:bg-green-600" : "";
            const selectedClass = selected ? "bg-green-500 dark:bg-green-900 text-white" : "";

            return (
              <div
                key={day}
                className={`rounded-md py-2 text-center text-sm font-medium ${baseClass} ${hoverClass} ${selectedClass}`}
                onClick={() => active && setSelectedDate(dateStr)}
              >
                {day}
              </div>
            );
          })}
        </div>

        {/* Detail Table */}
        {selectedDate && <DetailTableRitasi records={selectedRecords} tanggal={selectedDate} />}
      </div>
    </div>
  );
};

export default FuelPartnerDashboard;
