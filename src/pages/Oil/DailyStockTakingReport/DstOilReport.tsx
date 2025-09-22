// /dst-oil/DstOilReport.tsx
import React, { useEffect, useState } from "react";
import DetailTable from "./components/DetailTable";
import { fetchDstOilRecords } from "./components/fetchOilDstRecords";
import { toZonedTime, format } from "date-fns-tz";
import { DstOliWithLocation } from "./components/DstOliWithLocation";
import { supabase } from "../../../db/SupabaseClient";

// mapping warna indikator
const indicatorColors = {
  sohSap: "bg-blue-600",        // SOH SAP
  sohTactys: "bg-blue-300",     // SOH Tactys
  failedPosting: "bg-yellow-400", // Failed Posting
  pendingReceive: "bg-red-500",   // Pending Receive
};

const DstOilReport: React.FC = () => {
  const [records, setRecords] = useState<DstOliWithLocation[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [warehouseFilter, setWarehouseFilter] = useState("");
  const [unitFilter, setUnitFilter] = useState("");
  const [materialFilter, setMaterialFilter] = useState("");
  const [availableDates, setAvailableDates] = useState<string[]>([]);

  const [dateSummary, setDateSummary] = useState<Record<string, {
  soh_sap_count: number;
  soh_tactys_count: number;
  failed_posting_count: number;
  pending_receive_count: number;
}>>({});

  // Tanggal saat ini dengan timezone Asia/Makassar
  const timeZone = "Asia/Makassar";
  const now = toZonedTime(new Date(), timeZone);
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const fetchRecords = async (date: string) => {
    const startDate = format(new Date(date), "yyyy-MM-dd", { timeZone });
    const endDate = format(new Date(date), "yyyy-MM-dd", { timeZone });
    try {
      const data = await fetchDstOilRecords(startDate, endDate); // sudah RPC
      setRecords(
        data.map((item) => ({
          ...item,
          date_dst: item.date_dst ?? "",
        }))
      );
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (selectedDate) {
      fetchRecords(selectedDate);
    }
  }, [selectedDate]);

  useEffect(() => {
    const startDate = format(new Date(year, month, 1), "yyyy-MM-dd", { timeZone });
    const endDate = format(new Date(year, month + 1, 0), "yyyy-MM-dd", { timeZone });

    const fetchDates = async () => {
      const { data, error } = await supabase
        .rpc("fetch_dst_oil_dates", { start_date: startDate, end_date: endDate });
      if (error) {
        console.error(error);
      } else {
        setAvailableDates(data.map((d: { date_dst: string }) => d.date_dst));
      }
    };

    fetchDates();
  }, [month, year]);

  const hasData = (day: number) => {
    const dateStr = format(new Date(year, month, day), "yyyy-MM-dd", { timeZone });
    return availableDates.includes(dateStr);
  };

  const selectedRecords = selectedDate
    ? records.filter((r) => r.date_dst === selectedDate)
    : [];
  return (
    <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark mb-6">
      <div className="w-full p-4 sm:p-12.5 xl:p-5">
        <h2 className="mb-4 font-bold text-black dark:text-white sm:text-title-sm w-full">
          DST Oil Report
        </h2>

        {/* Grid tanggal */}
        <div className="grid grid-cols-7 gap-2 mb-6">
          {Array.from({ length: daysInMonth }, (_, idx) => {
            const day = idx + 1;
            const dateStr = format(new Date(year, month, day), "yyyy-MM-dd", { timeZone });
            const active = hasData(day);
            const selected = selectedDate === dateStr;

            // cek data per tipe
            const dayRecords = records.filter(r => r.date_dst === dateStr);
            const hasSOHSAP = dayRecords.some(r => r.qty_system_1 && r.qty_system_1 !== 0);
            const hasSOHTactys = dayRecords.some(r => r.qty_system_2 && r.qty_system_2 !== 0);
            const hasFailedPosting = dayRecords.some(r => r.failed_posting && r.failed_posting !== 0);
            const hasPendingReceive = dayRecords.some(r => r.pending_receive && r.pending_receive !== 0);

            const baseClass = active
              ? "bg-green-200 dark:bg-green-700 text-green-900 dark:text-green-200 cursor-pointer"
              : "bg-slate-200 text-slate-700 dark:bg-graydark dark:text-slate-300";
            const hoverClass = active ? "hover:bg-green-300 dark:hover:bg-green-600" : "";
            const selectedClass = selected ? "bg-green-500 dark:bg-green-900 text-white" : "";

            return (
              <div
                key={day}
                className={`flex flex-col items-center justify-center rounded-md py-1 text-center text-sm font-medium ${baseClass} ${hoverClass} ${selectedClass}`}
                onClick={() => active && setSelectedDate(dateStr)}
              >
                {/* angka tanggal */}
                <div>{day}</div>
                {/* indikator bulatan */}
                <div className="flex gap-1 mt-1">
                  {hasSOHSAP && <span className={`w-2 h-2 rounded-full ${indicatorColors.sohSap}`}></span>}
                  {hasSOHTactys && <span className={`w-2 h-2 rounded-full ${indicatorColors.sohTactys}`}></span>}
                  {hasFailedPosting && <span className={`w-2 h-2 rounded-full ${indicatorColors.failedPosting}`}></span>}
                  {hasPendingReceive && <span className={`w-2 h-2 rounded-full ${indicatorColors.pendingReceive}`}></span>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Detail Table */}
        {selectedDate && (
          <DetailTable
            records={selectedRecords}
            warehouseFilter={warehouseFilter}
            setWarehouseFilter={setWarehouseFilter}
            unitFilter={unitFilter}
            setUnitFilter={setUnitFilter}
            materialFilter={materialFilter}
            setMaterialFilter={setMaterialFilter}
            selectedDate={selectedDate}
            fetchRecords={fetchRecords}
          />
        )}
      </div>
    </div>
  );
};

export default DstOilReport;
