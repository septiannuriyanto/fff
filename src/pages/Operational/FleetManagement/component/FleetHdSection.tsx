import React, { useState } from "react";
import Tesseract from "tesseract.js";

const FleetHDSection = () => {
  const [image, setImage] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      setImage(file);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleOCR = async () => {
    if (!image) return;
    setLoading(true);
    try {
      const result = await Tesseract.recognize(image, "eng", {
        logger: (m) => console.log(m),
      });
      setText(result.data.text);
    } catch (err) {
      console.error(err);
      setText("Gagal membaca gambar.");
    }
    setLoading(false);
  };

  return (
    <div className="border border-gray-300 rounded-lg p-6 mt-6 bg-white dark:bg-boxdark">
      <h3 className="text-lg font-semibold mb-4">Fleet HD Recognition</h3>

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="border-2 border-dashed border-blue-400 rounded-lg p-8 text-center cursor-pointer hover:bg-blue-50 transition"
      >
        {image ? (
          <img
            src={URL.createObjectURL(image)}
            alt="Uploaded"
            className="mx-auto max-h-64 object-contain"
          />
        ) : (
          <p className="text-gray-500">
            Drag & drop gambar Fleet HD di sini, atau klik untuk pilih
          </p>
        )}
      </div>

      <div className="mt-4 flex gap-4">
        <button
          onClick={handleOCR}
          disabled={!image || loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Membaca..." : "Mulai OCR"}
        </button>
        {image && (
          <button
            onClick={() => {
              setImage(null);
              setText("");
            }}
            className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
          >
            Reset
          </button>
        )}
      </div>

      {text && (
        <div className="mt-4 bg-gray-50 dark:bg-gray-800 p-4 rounded text-sm whitespace-pre-wrap">
          <h4 className="font-semibold mb-2">Hasil OCR:</h4>
          <pre>{text}</pre>
        </div>
      )}
    </div>
  );
};

export default FleetHDSection;
