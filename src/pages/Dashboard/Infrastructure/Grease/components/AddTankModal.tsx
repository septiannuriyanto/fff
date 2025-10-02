import { useState } from "react";

interface AddTankModalProps {
  onClose: () => void;
  onSubmit: (data: {
    tipe: "ALBIDA" | "ALVANIA";
    nomor_gt: string;
    qty: number;
    status: "NEW" | "DC";
  }) => void;
}

export const AddTankModal: React.FC<AddTankModalProps> = ({ onClose, onSubmit }) => {
  const [tipe, setTipe] = useState<"ALBIDA" | "ALVANIA">("ALBIDA");
  const [nomorGT, setNomorGT] = useState("");
  const [qty, setQty] = useState(1);
  const [status, setStatus] = useState<"NEW" | "DC">("NEW");

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
      <div className="bg-white p-4 rounded shadow w-96">
        <h3 className="font-bold mb-2">Tambah Grease Tank</h3>

        <label className="text-sm">Tipe</label>
        <select
          value={tipe}
          onChange={(e) => setTipe(e.target.value as any)}
          className="border p-1 w-full mb-2"
        >
          <option value="ALBIDA">ALBIDA</option>
          <option value="ALVANIA">ALVANIA</option>
        </select>

        <label className="text-sm">Nomor GT</label>
        <input
          value={nomorGT}
          onChange={(e) => setNomorGT(e.target.value)}
          placeholder="Nomor Tank"
          className="border p-1 w-full mb-2"
        />

        <label className="text-sm">Qty</label>
        <input
          type="number"
          min={1}
          value={qty}
          onChange={(e) => setQty(Number(e.target.value))}
          className="border p-1 w-full mb-2"
        />

        <label className="text-sm">Status</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as any)}
          className="border p-1 w-full mb-2"
        >
          <option value="NEW">NEW</option>
          <option value="DC">DC</option>
        </select>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1 border rounded">
            Batal
          </button>
          <button
            onClick={() => onSubmit({ tipe, nomor_gt: nomorGT, qty, status })}
            className="px-3 py-1 bg-blue-500 text-white rounded"
          >
            Simpan
          </button>
        </div>
      </div>
    </div>
  );
};
