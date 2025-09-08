import React, { useEffect, useState } from 'react';
import { supabase } from '../../../db/SupabaseClient';

interface DstOli {
  id: number;
  warehouse_id: string;
  unit_id: string;
  material_code: string;
  item_description: string | null;
  tank_number: number | null;
  uoi: string;
  input_value: number | null;
  qty: number | null;
  date_dst: string | null;
}

interface StorageOil {
  warehouse_id: string;
  location: string | null;
}

const DstOilReport: React.FC = () => {
  const [records, setRecords] = useState<(DstOli & { location: string | null })[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // filter state
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [unitFilter, setUnitFilter] = useState('');

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  useEffect(() => {
    const fetchData = async () => {
      const startDate = new Date(year, month, 1).toISOString().split('T')[0];
      const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];

      const { data: dstData, error: dstErr } = await supabase
        .from('dst_oli')
        .select('*')
        .gte('date_dst', startDate)
        .lte('date_dst', endDate);

      if (dstErr) {
        console.error(dstErr);
        return;
      }

      const { data: storageData, error: storageErr } = await supabase
        .from('storage_oil')
        .select('warehouse_id, location');

      if (storageErr) {
        console.error(storageErr);
        return;
      }

      const locMap = new Map<string, string | null>();
      storageData?.forEach((s: StorageOil) => {
        locMap.set(s.warehouse_id, s.location);
      });

      const merged = (dstData as DstOli[]).map((d) => ({
        ...d,
        location: locMap.get(d.warehouse_id) || null,
      }));
      setRecords(merged);
    };
    fetchData();
  }, [month, year]);

  const hasData = (day: number) => {
    const dateStr = new Date(year, month, day).toISOString().split('T')[0];
    return records.some((r) => r.date_dst === dateStr);
  };

  // filter record sesuai warehouse & unit
  const filteredRecords = records.filter((r) => {
    const warehouseOk = warehouseFilter === '' || r.warehouse_id.toLowerCase().includes(warehouseFilter.toLowerCase());
    const unitOk = unitFilter === '' || r.unit_id.toLowerCase().includes(unitFilter.toLowerCase());
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
                const dateStr = new Date(year, month, day).toISOString().split('T')[0];
                const active = hasData(day);
                return (
                  <div
                    key={day}
                    className={`rounded-md py-2 text-center text-sm font-medium ${
                      active
                        ? 'bg-green-500 text-white cursor-pointer'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                    onClick={() => active && setSelectedDate(dateStr)}
                  >
                    {day}
                  </div>
                );
              })}
            </div>

            {/* Tabel detail */}
            {selectedDate && (
              <div>
                <h3 className="text-center font-semibold mb-2">
                  Detail Stock Taking – {selectedDate}
                </h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full border-separate border-spacing-0">
                    <thead className="bg-slate-100">
                      <tr>
                        <th rowSpan={2} className="text-left px-3 py-2 border-b w-24">
                          <div>Warehouse</div>
                          <input
                            className="mt-1 block w-full border rounded px-1 text-sm"
                            placeholder="Filter"
                            value={warehouseFilter}
                            onChange={(e) => setWarehouseFilter(e.target.value)}
                          />
                        </th>
                        <th rowSpan={2} className="text-left px-3 py-2 border-b w-24">
                          <div>Unit</div>
                          <input
                            className="mt-1 block w-full border rounded px-1 text-sm"
                            placeholder="Filter"
                            value={unitFilter}
                            onChange={(e) => setUnitFilter(e.target.value)}
                          />
                        </th>
                        <th rowSpan={2} className="text-left px-3 py-2 border-b">
                          Material
                        </th>
                        <th rowSpan={2} className="text-left px-3 py-2 border-b">
                          Description
                        </th>
                        <th rowSpan={2} className="text-left px-3 py-2 border-b">
                          Tank
                        </th>
                        <th rowSpan={2} className="text-left px-3 py-2 border-b">
                          UOI
                        </th>
                        <th colSpan={5} className="text-center px-3 py-2 border-b">
                          Input
                        </th>
                        <th rowSpan={2} className="text-left px-3 py-2 border-b">
                          Qty
                        </th>
                        <th rowSpan={2} className="text-left px-3 py-2 border-b">
                          Location
                        </th>
                      </tr>
                      <tr>
                        <th className="px-3 py-1 border-b">DRUM</th>
                        <th className="px-3 py-1 border-b">IBC</th>
                        <th className="px-3 py-1 border-b">PAIL</th>
                        <th className="px-3 py-1 border-b">KG</th>
                        <th className="px-3 py-1 border-b">DEPTH</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedRecords.map((r) => {
                        let drum = '';
                        let ibc = '';
                        let pail = '';
                        let kg = '';
                        let depth = '';

                        switch (r.uoi?.toUpperCase()) {
                          case 'DRUM':
                            drum = r.input_value?.toString() ?? '';
                            break;
                          case 'IBC':
                            ibc = r.input_value?.toString() ?? '';
                            break;
                          case 'PAIL':
                            pail = r.input_value?.toString() ?? '';
                            break;
                          case 'KG':
                            kg = r.input_value?.toString() ?? '';
                            break;
                          case 'LITR':
                          case 'DEPTH':
                          default:
                            depth = r.input_value?.toString() ?? '';
                            break;
                        }

                        return (
                          <tr key={r.id} className="border-b">
                            <td className="px-3 py-1">{r.warehouse_id}</td>
                            <td className="px-3 py-1">{r.unit_id}</td>
                            <td className="px-3 py-1">{r.material_code}</td>
                            <td className="px-3 py-1">{r.item_description}</td>
                            <td className="px-3 py-1">{r.tank_number}</td>
                            <td className="px-3 py-1">{r.uoi}</td>
                            <td className="px-3 py-1">{drum}</td>
                            <td className="px-3 py-1">{ibc}</td>
                            <td className="px-3 py-1">{pail}</td>
                            <td className="px-3 py-1 ">{kg}</td>
                            <td className="px-3 py-1 justify-center flex">{depth}</td>
                            <td className="px-3 py-1">{r.qty}</td>
                            <td className="px-3 py-1">{r.location}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DstOilReport;
