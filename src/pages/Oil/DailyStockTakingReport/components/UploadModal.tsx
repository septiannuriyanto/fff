import React from "react";

interface UploadModalProps {
  open: boolean;
  onClose: () => void;
  onUpload: (files: File[]) => void; // panggil handleUploadMultiple di parent
}

const UploadModal: React.FC<UploadModalProps> = ({ open, onClose, onUpload }) => {
  const [selectedFiles, setSelectedFiles] = React.useState<File[]>([]);

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    setSelectedFiles(Array.from(files));
  };

  const handleSubmit = () => {
    onUpload(selectedFiles);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white dark:bg-slate-800 p-4 rounded shadow-md w-96">
        <h4 className="mb-2 font-semibold">Upload beberapa file</h4>

        <div
          onDrop={(e) => {
            e.preventDefault();
            handleFileSelect(e.dataTransfer.files);
          }}
          onDragOver={(e) => e.preventDefault()}
          className="border-2 border-dashed border-gray-400 rounded p-6 text-center cursor-pointer"
          onClick={() => document.getElementById('fileInput')?.click()}
        >
          {selectedFiles.length > 0 ? (
            <ul className="text-left">
              {selectedFiles.map((f) => (
                <li key={f.name}>{f.name}</li>
              ))}
            </ul>
          ) : (
            <p>Drag & drop beberapa file di sini atau klik untuk memilih file</p>
          )}
        </div>
        <input
          id="fileInput"
          type="file"
          className="hidden"
          multiple
          onChange={(e) => handleFileSelect(e.target.files)}
        />

        <div className="mt-3 flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1 bg-gray-300 rounded">
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedFiles.length}
            className="px-3 py-1 bg-blue-500 text-white rounded disabled:opacity-50"
          >
            Upload
          </button>
        </div>
      </div>
    </div>
  );
};

export default UploadModal;
