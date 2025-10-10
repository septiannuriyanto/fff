// FuelPartnerDashboard.tsx
import { format } from "date-fns-tz";
import React, { useEffect, useState } from "react";
import { supabase } from "../../../db/SupabaseClient";
import DetailTableRitasi from "./DetailTableRitasi";
import { RitasiFuel } from "../component/ritasiFuel";
import { convertMakassarDateObject, getMakassarDateObject, timeZone } from "../../../Utils/TimeUtility";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import QRCode from "qrcode";

const FuelPartnerDashboard: React.FC = () => {
  const [records, setRecords] = useState<RitasiFuel[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const now = getMakassarDateObject();

  const [year, setYear] = useState<number>(now.getFullYear());
  const [month, setMonth] = useState<number>(now.getMonth());

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const handleFetchRecords = async () => {
  const startMakassar = convertMakassarDateObject(new Date(year, month, 1));
  const endMakassar = convertMakassarDateObject(new Date(year, month + 1, 0));

  const startDate = format(startMakassar, "yyyy-MM-dd");
  const endDate = format(endMakassar, "yyyy-MM-dd");

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
      storage:warehouse_id ( unit_id ),
      fuelman:fuelman_id ( nama ),
      operator:operator_id ( nama ),
      petugas:petugas_pencatatan ( nama ),
      remark_modification
    `)
    .gte("ritation_date", startDate)
    .lte("ritation_date", endDate)
    .order("no_surat_jalan", { ascending: true });

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
    handleFetchRecords();
  }, [month, year]);

  const hasData = (day: number) => {
    const dateStr = format(new Date(year, month, day), "yyyy-MM-dd", { timeZone });
    return records.some((r) => r.ritation_date === dateStr);
  };

  const selectedRecords = selectedDate
    ? records.filter((r) => r.ritation_date === selectedDate)
    : [];

  /** 🟢 Fungsi Export Excel (Mingguan atau Bulanan) */
  const handleReportToExcel = async (startDay: number, endDay: number, label: string) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Ritasi Fuel");

  const headers = [
    "No",
    "No Surat Jalan",
    "Tanggal",
    "Shift",
    "Unit",
    "Warehouse",
    "Fuelman",
    "Operator",
    "Qty Flowmeter Before",
    "Qty Flowmeter After",
    "Qty SJ",
    "Qty Sonding Before",
    "Qty Sonding After",
    "Evidence",
    "Remark",
  ];

  // 🔹 Header style
  const headerRow = sheet.addRow(headers);
  for (let i = 1; i <= headers.length; i++) {
    const cell = headerRow.getCell(i);
    cell.font = { bold: true };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "D3D3D3" } };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  }

  const startDate = format(new Date(year, month, startDay), "yyyy-MM-dd", { timeZone });
  const endDate = format(new Date(year, month, endDay), "yyyy-MM-dd", { timeZone });

  const filteredRecords = records.filter(
    (r) => r.ritation_date >= startDate && r.ritation_date <= endDate
  );

  const sortedRecords = [...filteredRecords].sort((a, b) =>
    (a.no_surat_jalan || "").localeCompare(b.no_surat_jalan || "", undefined, {
      numeric: true,
      sensitivity: "base",
    })
  );

  // 🔹 Tambahkan data baris
  const firstDataRow = headerRow.number + 1;

  for (let i = 0; i < sortedRecords.length; i++) {
    const row = sortedRecords[i];

    const dataRow = sheet.addRow([
      i + 1,
      row.no_surat_jalan,
      row.ritation_date,
      row.shift,
      row.unit_id,
      row.warehouse_id,
      row.fuelman_name,
      row.operator_name,
      row.qty_flowmeter_before,
      row.qty_flowmeter_after,
      row.qty_sj,
      row.qty_sonding_before,
      row.qty_sonding_after,
      "",
      row.remark_modification,
    ]);

    // 📸 QR code
    if (row.photo_url) {
      const qrBase64 = await QRCode.toDataURL(row.photo_url);
      const base64Data = qrBase64.replace(/^data:image\/png;base64,/, "");
      const imageId = workbook.addImage({
        base64: base64Data,
        extension: "png",
      });
      const rowNum = dataRow.number;
      sheet.addImage(imageId, {
        tl: { col: 13.3, row: rowNum - 0.8 },
        ext: { width: 48, height: 48 },
      });
      sheet.getRow(rowNum).height = 40;
    }
  }

  const lastDataRow = sheet.lastRow!.number;

  // 🔹 Tambahkan baris TOTAL (pakai rumus SUM di kolom K)
  const totalRow = sheet.addRow([
    "TOTAL",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    { formula: `SUM(K${firstDataRow}:K${lastDataRow})` },
    "",
    "",
    "",
  ]);

  totalRow.font = { bold: true };

  // 🔹 Format kolom K (Qty SJ) jadi comma style
  sheet.getColumn(11).numFmt = "#,##0";

  // 🔹 Rapiin border + alignment
  sheet.eachRow((row) => {
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
      cell.alignment = {
        vertical: "middle",
        horizontal: "center",
        wrapText: true,
      };
    });
  });

  // 🔹 Lebar kolom otomatis
  sheet.columns.forEach((column, i) => {
    let maxLength = headers[i] ? headers[i].length : 10;
    if (column && typeof column.eachCell === "function") {
      column.eachCell({ includeEmpty: true }, (cell) => {
        const cellLength = cell.value ? cell.value.toString().length : 10;
        maxLength = Math.max(maxLength, cellLength);
      });
    }
    column.width = maxLength + 2;
  });

  // 🔹 Simpan file
  const fileName = `Ritasi_Fuel_${label}_${month + 1}-${year}.xlsx`;
  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), fileName);
};


  /** 🟢 Tombol Export Mingguan Cluster */
  const handleExportW1 = () => handleReportToExcel(1, 7, "W1");
  const handleExportW2 = () => handleReportToExcel(8, 14, "W2");
  const handleExportW3 = () => handleReportToExcel(15, 21, "W3");
  const handleExportW4 = () => handleReportToExcel(22, daysInMonth, "W4");
  const handleExportAll = () => handleReportToExcel(1, daysInMonth, "ALL");

  return (
    <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark mb-6">
      <div className="w-full p-4 sm:p-12.5 xl:p-5">
        <h2 className="mb-4 font-bold text-black dark:text-white sm:text-title-sm w-full">
          Fuel Partner Dashboard
        </h2>

        {/* Year, Month, and Export Cluster */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
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

          {/* ✅ Cluster Tombol Export dengan Label */}
<div className="flex flex-col sm:flex-row sm:items-center gap-2 border rounded px-3 py-2 bg-green-50">
  <span className="font-semibold text-green-700 text-sm sm:text-base">
    Export Range:
  </span>
  <div className="flex flex-wrap gap-1">
    <button
      onClick={handleExportW1}
      className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded"
    >
      W1
    </button>
    <button
      onClick={handleExportW2}
      className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded"
    >
      W2
    </button>
    <button
      onClick={handleExportW3}
      className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded"
    >
      W3
    </button>
    <button
      onClick={handleExportW4}
      className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded"
    >
      W4
    </button>
    <button
      onClick={handleExportAll}
      className="bg-green-700 hover:bg-green-800 text-white px-3 py-1 rounded"
    >
      All
    </button>
  </div>
</div>

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

        {selectedDate && <DetailTableRitasi records={selectedRecords} tanggal={selectedDate} />}
      </div>
    </div>
  );
};

export default FuelPartnerDashboard;
