import React, { useEffect, useRef, useState } from "react";
import { supabase } from "../../../../db/SupabaseClient";

interface AddInputModalProps {
  open: boolean;
  onClose: () => void;
  fetchRecords: () => void; // supaya kita bisa refetch setelah submit
  recordId: number; // id record yang mau diinput nilainya
}

const AddInputModal: React.FC<AddInputModalProps> = ({
  open,
  onClose,
  fetchRecords,
  recordId,
}) => {
  const [value, setValue] = useState<number | "">("");
  const inputRef = useRef<HTMLInputElement>(null);

  // autofocus dan reset value tiap buka modal
  useEffect(() => {
    if (open) {
      setValue("");
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [open]);

  const handleSubmit = async () => {
    if (value === "" || isNaN(Number(value))) return;

    // update input_value di tabel dst_oli
    const { error } = await supabase
      .from("dst_oli")
      .update({ input_value: value })
      .eq("id", recordId);

    if (error) {
      alert(error.message);
    } else {
      onClose();
      fetchRecords(); // refetch tabel terbaru setelah submit
    }
  };

  return (
    <div
      className={`fixed inset-0 bg-black/50 flex items-center justify-center ${
        open ? "block" : "hidden"
      }`}
    >
      <div className="bg-white p-4 rounded shadow w-80">
        <h3 className="font-semibold mb-2">Input Nilai</h3>
        <input
          ref={inputRef}
          type="number"
          className="w-full border px-2 py-1 rounded mb-3 text-center"
          value={value}
          onChange={(e) => setValue(e.target.value === "" ? "" : Number(e.target.value))}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSubmit();
            }
          }}
        />
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Simpan
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddInputModal;
