// FuelPartnerDashboard.tsx
import { format, toZonedTime } from "date-fns-tz";
import React, { useEffect, useState } from "react";
import { supabase } from "../../../db/SupabaseClient";
import DetailTableRitasi from "./DetailTableRitasi";
import { RitasiFuel } from "../component/ritasiFuel";

const FuelPartnerDashboard: React.FC = () => {
  const [records, setRecords] = useState<RitasiFuel[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const timeZone = "Asia/Makassar";
  const now = toZonedTime(new Date(), timeZone);
  const year = now.getFullYear();
  const month = now.getMonth();
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

  return (
    <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark mb-6">
      <div className="w-full p-4 sm:p-12.5 xl:p-5">
        <h2 className="mb-4 font-bold text-black dark:text-white sm:text-title-sm w-full">
          Fuel Partner Dashboard
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
        {selectedDate && <DetailTableRitasi records={selectedRecords} tanggal={selectedDate} />}
      </div>
    </div>
  );
};

export default FuelPartnerDashboard;
