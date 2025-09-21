import { RotateCcw, RotateCw, X } from "lucide-react";
import React, { useState } from "react";

interface PhotoPreviewWithRotateProps {
  photoPreview: string; // url blob utk preview
  originalFile: File;   // file asli
  onRotatedFile?: (file: File) => void; // callback setelah dapat file hasil rotasi
}

const PhotoPreviewWithRotate: React.FC<PhotoPreviewWithRotateProps> = ({
  photoPreview,
  originalFile,
  onRotatedFile,
}) => {
  const [rotation, setRotation] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const rotateLeft = () => setRotation((r) => r - 90);
  const rotateRight = () => setRotation((r) => r + 90);

  // fungsi menghasilkan file hasil rotasi sesuai rotation saat ini
  const generateRotatedFile = async () => {
    const img = new Image();
    const loadPromise = new Promise<HTMLImageElement>((resolve) => {
      img.onload = () => resolve(img);
    });
    img.src = photoPreview;
    const loadedImg = await loadPromise;

    // tentukan ukuran canvas
    const angle = ((rotation % 360) + 360) % 360; // normalisasi
    let canvasWidth = loadedImg.width;
    let canvasHeight = loadedImg.height;
    if (angle === 90 || angle === 270) {
      // swap width & height untuk rotasi tegak lurus
      canvasWidth = loadedImg.height;
      canvasHeight = loadedImg.width;
    }

    const canvas = document.createElement("canvas");
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.save();

    // translasi ke tengah canvas & rotate
    ctx.translate(canvasWidth / 2, canvasHeight / 2);
    ctx.rotate((angle * Math.PI) / 180);
    ctx.drawImage(
      loadedImg,
      -loadedImg.width / 2,
      -loadedImg.height / 2,
      loadedImg.width,
      loadedImg.height
    );
    ctx.restore();

    return new Promise<File | null>((resolve) => {
      canvas.toBlob((blob) => {
        if (!blob) return resolve(null);
        const newFile = new File([blob], originalFile.name, { type: blob.type });
        resolve(newFile);
      }, originalFile.type);
    });
  };

  const handleGetRotatedFile = async () => {
    const newFile = await generateRotatedFile();
    if (newFile && onRotatedFile) {
      onRotatedFile(newFile);
    }
  };

  return (
    <>
      <div className="mt-2 flex flex-col items-center">
        {/* container persegi */}
        <div
          className="w-64 h-64 border rounded flex items-center justify-center overflow-hidden cursor-pointer"
          onClick={() => setIsModalOpen(true)}
        >
          <img
            src={photoPreview}
            alt="Preview Surat Jalan"
            className="max-w-full max-h-full object-contain"
            style={{ transform: `rotate(${rotation}deg)`, transition: "transform 0.3s" }}
          />
        </div>
        {/* tombol rotate */}
        <div className="flex gap-4 mt-2">
          <button
            type="button"
            onClick={rotateLeft}
            className="p-2 rounded-full hover:bg-gray-200"
            title="Rotate Left"
          >
            <RotateCcw className="w-6 h-6 text-black" />
          </button>
          <button
            type="button"
            onClick={rotateRight}
            className="p-2 rounded-full hover:bg-gray-200"
            title="Rotate Right"
          >
            <RotateCw className="w-6 h-6 text-black" />
          </button>
          {/* tombol ambil file hasil rotasi */}
          <button
            type="button"
            onClick={handleGetRotatedFile}
            className="p-2 rounded bg-blue-500 text-white hover:bg-blue-600"
          >
            Simpan Rotasi
          </button>
        </div>
      </div>

      {/* Modal full size */}
      {isModalOpen && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
          onClick={() => setIsModalOpen(false)} // klik di overlay close modal
        >
          <div
            className="relative max-w-4xl max-h-[90vh]"
            onClick={(e) => e.stopPropagation()} // klik di dalam gambar tidak close
          >
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-2 right-2 p-2 bg-white rounded-full hover:bg-gray-200"
            >
              <X className="w-5 h-5 text-black" />
            </button>
            <img
              src={photoPreview}
              alt="Full Preview"
              className="max-w-full max-h-[90vh] object-contain rounded"
              style={{ transform: `rotate(${rotation}deg)`, transition: "transform 0.3s" }}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default PhotoPreviewWithRotate;
