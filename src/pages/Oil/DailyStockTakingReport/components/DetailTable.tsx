import React, { useEffect, useRef, useState } from "react";
import { supabase } from "../../../../db/SupabaseClient";
import { DstOliWithLocation } from "./DstOliWithLocation";
import StockTakingOilChart from "./StockTakingOilChart";

interface DetailTableProps {
  records: DstOliWithLocation[];
  warehouseFilter: string;
  setWarehouseFilter: (val: string) => void;
  unitFilter: string;
  setUnitFilter: (val: string) => void;
  selectedDate: string;
  fetchRecords: () => void; // supaya bisa refetch setelah submit
}

const DetailTable: React.FC<DetailTableProps> = ({
  records,
  warehouseFilter,
  setWarehouseFilter,
  unitFilter,
  setUnitFilter,
  selectedDate,
  fetchRecords,
}) => {
  const [viewMode, setViewMode] = useState<"SOH" | "Pending">("SOH");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalField, setModalField] = useState<string>("");
  const [modalRecordId, setModalRecordId] = useState<number | null>(null);
  const [modalValue, setModalValue] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  const sohFisik = records.reduce((acc, r) => acc + (r.qty ?? 0), 0);
const pendingPosting = records.reduce((acc, r) => acc + (r.pending_input ?? 0), 0);
const sohSystem = records.reduce((acc, r) => acc + (r.qty_system_1 ?? 0), 0);
const pendingReceive = records.reduce((acc, r) => acc + (r.pending_receive ?? 0), 0);
const diff = (sohFisik + pendingPosting) - (sohSystem + pendingReceive);

  // autofocus setiap buka modal
  useEffect(() => {
    if (modalOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [modalOpen]);

  let lastWarehouse = "";
  let isOddGroup = false;

  const openModal = (
    recordId: number,
    field: string,
    currentVal?: number | null
  ) => {
    setModalRecordId(recordId);
    setModalField(field);
    setModalValue(currentVal?.toString() ?? "");
    setModalOpen(true);
  };

  const saveModal = async () => {
    if (modalRecordId == null || modalField === "") return;
    const numericVal = modalValue === "" ? null : Number(modalValue);
    // update ke supabase
    const { error } = await supabase
      .from("dst_oli")
      .update({ [modalField]: numericVal })
      .eq("id", modalRecordId);

    if (error) {
      alert(error.message);
    } else {
      setModalOpen(false);
      fetchRecords(); // refetch tabel terbaru
    }
  };

  return (
    <div>

      <div className="visualisasi my-6">
    {/* Chart summary */}
<div className="mb-4">
  <StockTakingOilChart
    sohFisik={sohFisik}
    pendingPosting={pendingPosting}
    sohSystem={sohSystem}
    pendingReceive={pendingReceive}
    diff={diff}
  />
</div>

{/* Angka ringkasan */}
<div className="w-full flex justify-between mb-4 px-2">
  <div>
    <h1 className="font-bold">Stock Fisik</h1>
    <h1>{sohFisik.toLocaleString('id-ID')}</h1>
  </div>
  <div>
    <h1 className="font-bold">Pending Posting</h1>
    <h1>{pendingPosting.toLocaleString('id-ID')}</h1>
  </div>
  <div>
    <h1 className="font-bold">Stock System</h1>
    <h1>{sohSystem.toLocaleString('id-ID')}</h1>
  </div>
  <div>
    <h1 className="font-bold">Pending Receive</h1>
    <h1>{pendingReceive.toLocaleString('id-ID')}</h1>
  </div>
  <div>
    <h1 className="font-bold">Difference</h1>
    <h1
      className={`${
        diff > 0 ? 'text-green-500' : diff < 0 ? 'text-red-500' : ''
      }`}
    >
      {diff.toLocaleString('id-ID')}
    </h1>
  </div>
</div>

      </div>
      <h3 className="text-center font-semibold mb-2">
        Detail Stock Taking – {selectedDate}
      </h3>

      {/* switcher */}
      <div className="flex justify-center gap-4 mb-2">
        <button
          onClick={() => setViewMode("SOH")}
          className={`px-4 py-1 rounded ${
            viewMode === "SOH" ? "bg-blue-500 text-white" : "bg-gray-200"
          }`}
        >
          SOH
        </button>
        <button
          onClick={() => setViewMode("Pending")}
          className={`px-4 py-1 rounded ${
            viewMode === "Pending" ? "bg-blue-500 text-white" : "bg-gray-200"
          }`}
        >
          Pending
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse border border-slate-400 dark:border-slate-300">
          <thead className="bg-slate-200 dark:bg-slate-800">
            <tr>
              <th
                rowSpan={2}
                className="text-center px-3 py-2 border border-slate-400 dark:border-slate-300"
              >
                No
              </th>
              <th
                rowSpan={2}
                className="text-center px-3 py-2 border border-slate-400 dark:border-slate-300 w-24"
              >
                <div>Warehouse</div>
                <input
                  className="mt-1 block w-full border rounded px-1 text-sm"
                  placeholder="Filter"
                  value={warehouseFilter}
                  onChange={(e) => setWarehouseFilter(e.target.value)}
                />
              </th>
              <th
                rowSpan={2}
                className="text-center px-3 py-2 border border-slate-400 dark:border-slate-300 w-24"
              >
                <div>Unit</div>
                <input
                  className="mt-1 block w-full border rounded px-1 text-sm"
                  placeholder="Filter"
                  value={unitFilter}
                  onChange={(e) => setUnitFilter(e.target.value)}
                />
              </th>
              <th
                rowSpan={2}
                className="text-center px-3 py-2 border border-slate-400 dark:border-slate-300"
              >
                Material
              </th>
              <th
                rowSpan={2}
                className="text-center px-3 py-2 border border-slate-400 dark:border-slate-300"
              >
                Description
              </th>
              <th
                rowSpan={2}
                className="text-center px-3 py-2 border border-slate-400 dark:border-slate-300"
              >
                Tank
              </th>
              <th
                rowSpan={2}
                className="text-center px-3 py-2 border border-slate-400 dark:border-slate-300"
              >
                UOI
              </th>

              {viewMode === "SOH" ? (
                <th
                  colSpan={3}
                  className="text-center px-3 py-2 border border-slate-400 dark:border-slate-300"
                >
                  Qty
                </th>
              ) : (
                <th
                  colSpan={3}
                  className="text-center px-3 py-2 border border-slate-400 dark:border-slate-300"
                >
                  Pending
                </th>
              )}
              <th
                rowSpan={2}
                className="text-center px-3 py-2 border border-slate-400 dark:border-slate-300"
              >
                Location
              </th>
            </tr>
            <tr>
              {viewMode === "SOH" ? (
                <>
                  <th className="px-3 py-1 border border-slate-400 dark:border-slate-300">
                    Fisik
                  </th>
                  <th className="px-3 py-1 border border-slate-400 dark:border-slate-300">
                    System1
                  </th>
                  <th className="px-3 py-1 border border-slate-400 dark:border-slate-300">
                    System2
                  </th>
                </>
              ) : (
                <>
                  <th className="px-3 py-1 border border-slate-400 dark:border-slate-300">
                    Receive
                  </th>
                  <th className="px-3 py-1 border border-slate-400 dark:border-slate-300">
                    Failed
                  </th>
                  <th className="px-3 py-1 border border-slate-400 dark:border-slate-300">
                    Input
                  </th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {records.map((r, idx) => {
              if (r.warehouse_id !== lastWarehouse) {
                isOddGroup = !isOddGroup;
                lastWarehouse = r.warehouse_id;
              }
              const bgClass = isOddGroup
                ? "bg-orange-50 dark:bg-boxdark-2"
                : "bg-white dark:bg-slate-700";

              return (
                <tr
                  key={r.id}
                  className={`${bgClass} border-b border-slate-400 dark:border-slate-300 hover:bg-orange-100 dark:hover:bg-orange-900`}
                >
                  <td className="px-3 py-1 border border-slate-400 dark:border-slate-300 text-center">
                    {idx + 1}
                  </td>
                  <td className="px-3 py-1 border border-slate-400 dark:border-slate-300">
                    {r.warehouse_id}
                  </td>
                  <td className="px-3 py-1 border border-slate-400 dark:border-slate-300">
                    {r.unit_id}
                  </td>
                  <td className="px-3 py-1 border border-slate-400 dark:border-slate-300">
                    {r.material_code}
                  </td>
                  <td className="px-3 py-1 border border-slate-400 dark:border-slate-300">
                    {r.item_description}
                  </td>
                  <td className="px-3 py-1 border border-slate-400 dark:border-slate-300 text-center">
                    {r.tank_number}
                  </td>
                  <td className="px-3 py-1 border border-slate-400 dark:border-slate-300">
                    {r.uoi}
                  </td>

                  {viewMode === "SOH" ? (
                    <>
                      <td
                        onClick={() => openModal(r.id, "qty", r.qty)}
                        className="cursor-pointer px-3 py-1 border border-slate-400 dark:border-slate-300 text-center hover:bg-orange-200 dark:hover:bg-orange-950"
                      >
                        {r.qty}
                      </td>
                      <td
                        onClick={() => openModal(r.id, "qty_system_1", r.qty_system_1)}
                        className="cursor-pointer px-3 py-1 border border-slate-400 dark:border-slate-300 text-center hover:bg-orange-200 dark:hover:bg-orange-950"
                      >
                        {r.qty_system_1}
                      </td>
                      <td
                        onClick={() => openModal(r.id, "qty_system_2", r.qty_system_2)}
                        className="cursor-pointer px-3 py-1 border border-slate-400 dark:border-slate-300 text-center hover:bg-orange-200 dark:hover:bg-orange-950"
                      >
                        {r.qty_system_2}
                      </td>
                    </>
                  ) : (
                    <>
                      <td
                        onClick={() =>
                          openModal(r.id, "pending_receive", r.pending_receive)
                        }
                        className="cursor-pointer px-3 py-1 border border-slate-400 dark:border-slate-300 text-center hover:bg-orange-200 dark:hover:bg-orange-950"
                      >
                        {r.pending_receive}
                      </td>
                      <td
                        onClick={() =>
                          openModal(r.id, "failed_posting", r.failed_posting)
                        }
                        className="cursor-pointer px-3 py-1 border border-slate-400 dark:border-slate-300 text-center hover:bg-orange-200 dark:hover:bg-orange-950"
                      >
                        {r.failed_posting}
                      </td>
                      <td
                        onClick={() =>
                          openModal(r.id, "pending_input", r.pending_input)
                        }
                        className="cursor-pointer px-3 py-1 border border-slate-400 dark:border-slate-300 text-center hover:bg-orange-200 dark:hover:bg-orange-950"
                      >
                        {r.pending_input}
                      </td>
                    </>
                  )}

                  <td className="px-3 py-1 border border-slate-400 dark:border-slate-300">
                    {r.location}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-slate-800 p-4 rounded shadow-md w-80">
            <h4 className="mb-2 font-semibold">Input nilai untuk {modalField}</h4>
            <input
              ref={inputRef}
              type="number"
              className="border p-1 w-full text-center"
              value={modalValue}
              onChange={(e) => setModalValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  saveModal();
                }
              }}
            />
            <div className="mt-3 flex justify-end gap-2">
              <button
                onClick={() => setModalOpen(false)}
                className="px-3 py-1 bg-gray-300 rounded"
              >
                Batal
              </button>
              <button
                onClick={saveModal}
                className="px-3 py-1 bg-blue-500 text-white rounded"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DetailTable;
