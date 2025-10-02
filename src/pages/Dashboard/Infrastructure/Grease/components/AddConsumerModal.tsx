import { useState } from "react";
import { GreaseCluster } from "../types/greaseCluster";
import { StorageUnit } from "../types/storageUnit";

interface AddConsumerModalProps {
  clusters: GreaseCluster[];
  units: StorageUnit[];
  onClose: () => void;
  onSubmit: (data: {
    grease_cluster_id: string | null;
    description: string;
    unit_id: string | null;
  }) => void;
}

export const AddConsumerModal: React.FC<AddConsumerModalProps> = ({
  clusters,
  units,
  onClose,
  onSubmit,
}) => {
  const [clusterId, setClusterId] = useState<string | "">("");
  const [description, setDescription] = useState("");
  const [unitId, setUnitId] = useState<string | "">("");

  const selectedUnit = units.find((u) => u.unit_id === unitId);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
      <div className="bg-white p-4 rounded shadow w-96">
        <h3 className="font-bold mb-2">Tambah Consumer Unit</h3>

        <label className="text-sm">Cluster (opsional)</label>
        <select
  value={clusterId}
  onChange={(e) => setClusterId(e.target.value)}
  className="border p-1 w-full mb-2"
>
  <option value="">-- Tanpa Cluster --</option>
  {clusters
    .filter(
      (c) =>
        c.sends.includes("DC") && c.receives.includes("NEW")
    )
    .map((c) => (
      <option key={c.id} value={c.id}>
        {c.name}
      </option>
    ))}
</select>


        <label className="text-sm">Unit (opsional)</label>
        <select
          value={unitId}
          onChange={(e) => setUnitId(e.target.value)}
          className="border p-1 w-full mb-2"
        >
          <option value="">-- Tanpa Unit --</option>
          {units.map((u) => (
            <option key={u.unit_id} value={u.unit_id}>
              {u.unit_id} ({u.type})
            </option>
          ))}
        </select>

        {selectedUnit && (
          <p className="text-xs text-gray-600 mb-2">
            Tipe otomatis: <b>{selectedUnit.type}</b>
          </p>
        )}

        <label className="text-sm">Deskripsi</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Deskripsi (opsional)"
          className="border p-1 w-full mb-2"
        />

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1 border rounded">
            Batal
          </button>
          <button
            onClick={() =>
              onSubmit({
                grease_cluster_id: clusterId || null,
                description,
                unit_id: unitId || null,
              })
            }
            className="px-3 py-1 bg-blue-500 text-white rounded"
          >
            Simpan
          </button>
        </div>
      </div>
    </div>
  );
};
