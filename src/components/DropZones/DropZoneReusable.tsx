import { useEffect, useState } from 'react';
import { renderFilePreview } from './components/RenderFilePreview';

interface DropZoneReusableProps {
  file: File | null;
  fileTypes?: string;
  title: string;
  id: string;
  onFileUpload: (file: File) => void;
}

const DropZoneReusable: React.FC<DropZoneReusableProps> = ({
  title,
  id,
  fileTypes,
  file,
  onFileUpload,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      setUploadedFile(droppedFile);
      onFileUpload(droppedFile);
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
      const selectedFile = e.target.files[0];
      setUploadedFile(selectedFile);
      onFileUpload(selectedFile);
    }
  };

  useEffect(()=>{
    setUploadedFile(file)
  },[file])

  return (
    <div className="dropzone__container">
      <h1 className="mb-1 text-center">{title}</h1>
      <div
        className={`flex bg-white items-center justify-center h-32 w-full ${
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
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            {uploadedFile ? renderFilePreview(uploadedFile) : (
              <div className='flex flex-col unloaded items-center'>
                <svg
                  className="w-8 h-8 mb-4 text-gray-500 dark:text-gray-400"
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
                <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                  <span className="font-semibold">Click to upload</span>
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  or drag and drop
                </p>
              </div>
            )}
          </div>
          <input
            id={id}
            type="file"
            className="hidden"
            accept={fileTypes || '*'}
            onChange={handleFileChange}
          />
        </label>
      </div>
    </div>
  );
};

export default DropZoneReusable;
