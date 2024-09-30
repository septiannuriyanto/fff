import { useState } from 'react';

interface DropZoneProps {
  id:string;
  onFileUpload: (id:string, file: File) => void;
}

const DropZoneMini: React.FC<DropZoneProps> = ({ id, onFileUpload }) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      onFileUpload(id, file);
      e.dataTransfer.clearData();
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      onFileUpload(id, file);
    }
  };

  return (
    <div className="dropzone__container">
      <div
        className={`flex bg-white items-center justify-center  w-full ${
          isDragOver
            ? 'bg-blue-100 dark:bg-blue-800 border-blue-400 dark:border-blue-600'
            : 'bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600'
        } border-2 border-dashed rounded-lg cursor-pointer`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <label
          htmlFor={id}
          className="flex flex-col items-center justify-center w-full h-full"
        >
          <div className="flex flex-col items-center justify-center cursor-pointer">
            <svg
              className="w-8 h-8 m-2 text-gray-500 dark:text-gray-400"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 20 16"
            >
              <path
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"
              />
            </svg>
          </div>
          <input
            id={id}
            type="file"
            className="hidden"
            accept=".png, .jpg, .jpeg"
            onChange={handleFileChange}
          />
        </label>
      </div>
    </div>
  );
};

export default DropZoneMini;
