import React from "react";

interface DstOliWithLocation {
  id: number;
  warehouse_id: string;
  unit_id: string;
  material_code: string;
  item_description: string | null;
  tank_number: number | null;
  uoi: string;
  input_value: number | null;
  qty: number | null;
  location: string | null;
}

interface DetailTableProps {
  records: DstOliWithLocation[];
  warehouseFilter: string;
  setWarehouseFilter: (val: string) => void;
  unitFilter: string;
  setUnitFilter: (val: string) => void;
  selectedDate: string;
}

const DetailTable: React.FC<DetailTableProps> = ({
  records,
  warehouseFilter,
  setWarehouseFilter,
  unitFilter,
  setUnitFilter,
  selectedDate,
}) => {
  return (
    <div>
      <h3 className="text-center font-semibold mb-2">
        Detail Stock Taking – {selectedDate}
      </h3>
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse border border-gray-400">
          <thead className="bg-slate-100">
            <tr>
              <th
                rowSpan={2}
                className="text-center px-3 py-2 border border-gray-400 text"
              >
                No
              </th>
              <th
                rowSpan={2}
                className="text-center px-3 py-2 border border-gray-400 w-24"
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
                className="text-center px-3 py-2 border border-gray-400 w-24"
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
                className="text-center px-3 py-2 border border-gray-400"
              >
                Material
              </th>
              <th
                rowSpan={2}
                className="text-center px-3 py-2 border border-gray-400"
              >
                Description
              </th>
              <th
                rowSpan={2}
                className="text-center px-3 py-2 border border-gray-400"
              >
                Tank
              </th>
              <th
                rowSpan={2}
                className="text-center px-3 py-2 border border-gray-400"
              >
                UOI
              </th>
              <th
                colSpan={5}
                className="text-center px-3 py-2 border border-gray-400"
              >
                Input
              </th>
              <th
                rowSpan={2}
                className="text-center px-3 py-2 border border-gray-400"
              >
                Qty
              </th>
              <th
                rowSpan={2}
                className="text-center px-3 py-2 border border-gray-400"
              >
                Location
              </th>
            </tr>
            <tr>
              <th className="px-3 py-1 border border-gray-300">DRUM</th>
              <th className="px-3 py-1 border border-gray-300">IBC</th>
              <th className="px-3 py-1 border border-gray-300">PAIL</th>
              <th className="px-3 py-1 border border-gray-300">KG</th>
              <th className="px-3 py-1 border border-gray-300">DEPTH</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r, idx) => {
              let drum = "";
              let ibc = "";
              let pail = "";
              let kg = "";
              let depth = "";

              switch (r.uoi?.toUpperCase()) {
                case "DRUM":
                  drum = r.input_value?.toString() ?? "";
                  break;
                case "IBC":
                  ibc = r.input_value?.toString() ?? "";
                  break;
                case "PAIL":
                  pail = r.input_value?.toString() ?? "";
                  break;
                case "KG":
                  kg = r.input_value?.toString() ?? "";
                  break;
                case "LITR":
                case "DEPTH":
                default:
                  depth = r.input_value?.toString() ?? "";
                  break;
              }

              return (
                <tr
                  key={r.id}
                  className="border-b border-gray-300 hover:bg-gray-50"
                >
                  <td className="px-3 py-1 border border-gray-400 text-center">
                    {idx + 1}
                  </td>
                  <td className="px-3 py-1 border border-gray-400">
                    {r.warehouse_id}
                  </td>
                  <td className="px-3 py-1 border border-gray-400">
                    {r.unit_id}
                  </td>
                  <td className="px-3 py-1 border border-gray-400">
                    {r.material_code}
                  </td>
                  <td className="px-3 py-1 border border-gray-400">
                    {r.item_description}
                  </td>
                  <td className="px-3 py-1 border border-gray-400 text-center">
                    {r.tank_number}
                  </td>
                  <td className="px-3 py-1 border border-gray-400">
                    {r.uoi}
                  </td>
                  <td className="px-3 py-1 border border-gray-400 text-center">
                    {drum}
                  </td>
                  <td className="px-3 py-1 border border-gray-400 text-center">
                    {ibc}
                  </td>
                  <td className="px-3 py-1 border border-gray-400 text-center">
                    {pail}
                  </td>
                  <td className="px-3 py-1 border border-gray-400 text-center">
                    {kg}
                  </td>
                  <td className="px-3 py-1 border border-gray-400 text-center">
                    {depth}
                  </td>
                  <td className="px-3 py-1 border border-gray-400 text-center">
                    {r.qty}
                  </td>
                  <td className="px-3 py-1 border border-gray-400">
                    {r.location}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DetailTable;
