import { useState } from "react";

interface AddClusterModalProps {
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    description: string;
    sends: string[];     // array
    receives: string[];  // array
  }) => void;
}

export const AddClusterModal: React.FC<AddClusterModalProps> = ({
  onClose,
  onSubmit,
}) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sends, setSends] = useState<string[]>([]);
  const [receives, setReceives] = useState<string[]>([]);

  const toggleSend = (val: string) => {
    setSends((prev) =>
      prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]
    );
  };

  const toggleReceive = (val: string) => {
    setReceives((prev) =>
      prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
      <div className="bg-white p-4 rounded shadow w-96">
        <h3 className="font-bold mb-2">Tambah Cluster</h3>

        <label className="text-sm">Nama Cluster</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nama Cluster"
          className="border p-1 w-full mb-2"
        />

        <label className="text-sm">Deskripsi</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Deskripsi (opsional)"
          className="border p-1 w-full mb-2"
        />

        <label className="text-sm">Sends</label>
        <div className="flex gap-4 mb-2">
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={sends.includes("NEW")}
              onChange={() => toggleSend("NEW")}
            />
            NEW
          </label>
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={sends.includes("DC")}
              onChange={() => toggleSend("DC")}
            />
            DC
          </label>
        </div>

        <label className="text-sm">Receives</label>
        <div className="flex gap-4 mb-2">
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={receives.includes("NEW")}
              onChange={() => toggleReceive("NEW")}
            />
            NEW
          </label>
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={receives.includes("DC")}
              onChange={() => toggleReceive("DC")}
            />
            DC
          </label>
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1 border rounded">
            Batal
          </button>
          <button
            onClick={() =>
              onSubmit({
                name,
                description,
                sends,
                receives,
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
