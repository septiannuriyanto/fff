// /dst-oil/DstOilReport.tsx
import React, { useEffect, useState } from "react";
import DetailTable from "./components/DetailTable";
import { DstOliWithLocation } from "./components/DstOliWithLocation";
import { fetchDstOilRecords } from "./components/fetchOilDstRecords";
import { toZonedTime, format } from "date-fns-tz";

const DstOilReport: React.FC = () => {
  const [records, setRecords] = useState<DstOliWithLocation[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [warehouseFilter, setWarehouseFilter] = useState("");
  const [unitFilter, setUnitFilter] = useState("");
  const [materialFilter, setMaterialFilter] = useState("");

  // Tanggal saat ini dengan timezone Asia/Makassar
  const timeZone = "Asia/Makassar";
  const now = toZonedTime(new Date(), timeZone);
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const fetchRecords = async () => {
    const startDate = format(new Date(year, month, 1), "yyyy-MM-dd", { timeZone });
    const endDate = format(new Date(year, month + 1, 0), "yyyy-MM-dd", { timeZone });
    try {
      const data = await fetchDstOilRecords(startDate, endDate);
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
    fetchRecords();
  }, [month, year]);

  const hasData = (day: number) => {
    const dateStr = format(new Date(year, month, day), "yyyy-MM-dd", { timeZone });
    return records.some((r) => r.date_dst === dateStr);
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
