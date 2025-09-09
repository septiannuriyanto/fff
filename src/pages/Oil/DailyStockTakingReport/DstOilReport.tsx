import React, { useEffect, useState } from "react";
import { supabase } from "../../../db/SupabaseClient";
import DetailTable from "./components/DetailTable";
import { DstOli } from "./components/dstoli";
import { StorageOil } from "./components/storageOli";
import { fetchDstOilRecords } from "./components/fetchOilDstRecords";




const DstOilReport: React.FC = () => {
  const [records, setRecords] = useState<
    (DstOli & { location: string | null })[]
  >([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const [warehouseFilter, setWarehouseFilter] = useState("");
  const [unitFilter, setUnitFilter] = useState("");

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const fetchRecords = async () => {
    const startDate = new Date(year, month, 1).toISOString().split("T")[0];
    const endDate = new Date(year, month + 1, 0).toISOString().split("T")[0];
    try {
      const data = await fetchDstOilRecords(startDate, endDate);
      setRecords(data);
    } catch (err) {
      console.error(err);
    }
  };
  useEffect(() => {
    
    fetchRecords();
  }, [month, year]);

  const hasData = (day: number) => {
    const dateStr = new Date(year, month, day).toISOString().split("T")[0];
    return records.some((r) => r.date_dst === dateStr);
  };

  const filteredRecords = records.filter((r) => {
    const warehouseOk =
      warehouseFilter === "" ||
      r.warehouse_id.toLowerCase().includes(warehouseFilter.toLowerCase());
    const unitOk =
      unitFilter === "" ||
      r.unit_id.toLowerCase().includes(unitFilter.toLowerCase());
    return warehouseOk && unitOk;
  });

  const selectedRecords = selectedDate
    ? filteredRecords.filter((r) => r.date_dst === selectedDate)
    : [];

  return (
    <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark mb-6">
      <div className="flex flex-wrap items-center">
        <div className="w-full border-stroke dark:border-strokedark xl:border-l-2">
          <div className="w-full p-4 sm:p-12.5 xl:p-5">
            <h2 className="mb-4 font-bold text-black dark:text-white sm:text-title-sm w-full">
              DST Oil Report
            </h2>

            {/* Grid tanggal */}
            <div className="grid grid-cols-7 gap-2 mb-6">
              {Array.from({ length: daysInMonth }, (_, idx) => {
                const day = idx + 1;
                const dateStr = new Date(year, month, day)
                  .toISOString()
                  .split("T")[0];
                const active = hasData(day);
                return (
                  <div
                    key={day}
                    className={`rounded-md py-2 text-center text-sm font-medium ${
                      active
                        ? "bg-green-500 text-white cursor-pointer"
                        : "bg-slate-200 text-slate-700 dark:bg-graydark dark:text-slate-300"
                    }`}
                    onClick={() => active && setSelectedDate(dateStr)}
                  >
                    {day}
                  </div>
                );
              })}
            </div>

            {selectedDate && (
              <DetailTable
              fetchRecords={fetchRecords}
                records={selectedRecords}
                warehouseFilter={warehouseFilter}
                setWarehouseFilter={setWarehouseFilter}
                unitFilter={unitFilter}
                setUnitFilter={setUnitFilter}
                selectedDate={selectedDate}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DstOilReport;
