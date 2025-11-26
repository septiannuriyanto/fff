import React, { useState } from "react";
import axios from "axios";


const ACCESS_TOKEN = import.meta.env.VITE_HUGGING_FACE_API_KEY;

const DonutOCR = () => {
  const [image, setImage] = useState<File | null>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setImage(file);
  };

  const runOCR = async () => {
    if (!image) return;
    setLoading(true);

    const formData = new FormData();
    formData.append("file", image);

    try {
      const res = await axios.post(
        "https://api-inference.huggingface.co/models/microsoft/trocr-base-printed",
        formData,
        {
          headers: {
            Authorization: `Bearer ${ACCESS_TOKEN}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );
      setResult(res.data);
    } catch (err) {
      console.error(err);
      setResult({ error: "Gagal membaca dokumen." });
    }
    setLoading(false);
  };

  return (
    <div className="p-6 bg-white dark:bg-boxdark rounded-lg border border-gray-300 shadow">
      <h2 className="text-xl font-semibold mb-4">📄 Fleet HD Table Recognition</h2>

      <input type="file" accept="image/*" onChange={handleFileChange} className="mb-4" />

      <button
        onClick={runOCR}
        disabled={loading || !image}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Menganalisis..." : "Jalankan Model"}
      </button>

      {result && (
        <div className="mt-4 bg-gray-50 p-3 rounded text-sm">
          <h3 className="font-bold mb-2">Hasil JSON:</h3>
          <pre className="overflow-x-auto text-xs">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default DonutOCR;
