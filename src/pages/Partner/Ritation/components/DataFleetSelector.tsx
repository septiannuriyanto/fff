import React from "react";

interface ManpowerItem {
  nrp: string;
  nama: string;
}
interface StorageItem {
  id: number;
  warehouse_id: string;
  unit_id: string;
}

interface DataFleetSelectorProps {
  unit: string;
  operator: string;
  fuelman: string;
  units: StorageItem[];
  operators: ManpowerItem[];
  fuelmans: ManpowerItem[];
  loading?: boolean;
  onChange: (field: "unit" | "operator" | "fuelman", value: string) => void;
}

const DataFleetSelector: React.FC<DataFleetSelectorProps> = ({
  unit,
  operator,
  fuelman,
  units,
  operators,
  fuelmans,
  loading,
  onChange,
}) => {
  const unitLocked = unit !== ""; // kalau sudah terisi, kunci

  return (
    <div className="mb-4 rounded p-4 border">
      <h3 className="text-center font-bold mb-3">Data Fleet</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block mb-1">Unit</label>
          <select
  value={unit}
  onChange={(e) => onChange("unit", e.target.value)}
  className="border rounded p-2 w-full"
  disabled={loading} // cuma disable kalau loading dropdown
>
  <option value="">Pilih FT</option>
  {units.map((u) => (
    <option key={`${u.id}-${u.unit_id}`} value={u.unit_id}>
      {u.unit_id} ({u.warehouse_id})
    </option>
  ))}
</select>

          {/* {unitLocked && (
            <p className="text-xs mt-1 text-gray-500">
              Unit sudah dipilih. Refresh untuk mengganti.
            </p>
          )} */}
        </div>

        <div>
          <label className="block mb-1">Nama Operator</label>
          <select
            value={operator}
            onChange={(e) => onChange("operator", e.target.value)}
            className="border rounded p-2 w-full"
            disabled={loading}
          >
            <option value="">Pilih Operator</option>
            {operators.map((op) => (
              <option key={op.nrp} value={op.nrp}>
                {op.nama}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block mb-1">Nama Fuelman</label>
          <select
            value={fuelman}
            onChange={(e) => onChange("fuelman", e.target.value)}
            className="border rounded p-2 w-full"
            disabled={loading}
          >
            <option value="">Pilih Fuelman</option>
            {fuelmans.map((fm) => (
              <option key={fm.nrp} value={fm.nrp}>
                {fm.nama}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default DataFleetSelector;
