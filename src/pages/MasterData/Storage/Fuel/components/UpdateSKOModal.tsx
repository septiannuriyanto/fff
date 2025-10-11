import React, { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { X, Upload, Camera } from 'lucide-react';
import { supabase } from '../../../../../db/SupabaseClient';

interface UpdateSKOModalProps {
  isOpen: boolean;
  onClose: () => void;
  unitId: string;
  onSuccess: () => void;
}

const UpdateSKOModal: React.FC<UpdateSKOModalProps> = ({
  isOpen,
  onClose,
  unitId,
  onSuccess,
}) => {
  const [formData, setFormData] = useState({
    sko_code: '',
    issued_date: '',
    expired_date: '',
    status: 'AKTIF',
    notes: '',
  });
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/') && !file.type.includes('pdf')) {
      toast.error('Please select an image or PDF file');
      return;
    }

    setDocumentFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const uploadDocumentToSupabase = async (file: File): Promise<string> => {
    try {
      const timestamp = Date.now();
      const extension = file.type.includes('pdf') ? 'pdf' : 'jpg';
      const fileName = `${formData.sko_code}_${timestamp}.${extension}`;
      const filePath = `sko/${unitId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file, { upsert: false });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      const { data: publicUrlData } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      if (!publicUrlData?.publicUrl) {
        throw new Error('Failed to get public URL');
      }

      return publicUrlData.publicUrl;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to upload document');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.sko_code.trim()) {
      toast.error('SKO Code is required');
      return;
    }

    if (!documentFile) {
      toast.error('Please select a document/image');
      return;
    }

    try {
      setIsUploading(true);

      // Upload document to Supabase
      const stickerUrl = await uploadDocumentToSupabase(documentFile);

      // Insert SKO record to database
      const { error: insertError } = await supabase
        .from('sko')
        .insert({
          unit_id: unitId,
          sko_code: formData.sko_code,
          issued_date: formData.issued_date,
          expired_date: formData.expired_date,
          sticker_url: stickerUrl,
          status: formData.status,
          notes: formData.notes,
        });

      if (insertError) throw new Error(insertError.message);

      toast.success('SKO record added successfully!');
      setFormData({
        sko_code: '',
        issued_date: '',
        expired_date: '',
        status: 'AKTIF',
        notes: '',
      });
      setDocumentFile(null);
      setPreviewUrl(null);
      onClose();
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add SKO record');
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 border-b px-6 py-4 flex justify-between items-center bg-white">
          <h3 className="text-lg font-semibold text-gray-800">
            Add SKO Record for {unitId}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Document Upload Section */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gray-50">
            <div className="flex gap-3 mb-4">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors flex items-center justify-center gap-2"
              >
                <Upload className="w-4 h-4" />
                {isUploading ? 'Uploading...' : 'Upload Document'}
              </button>
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                disabled={isUploading}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors flex items-center justify-center gap-2"
              >
                <Camera className="w-4 h-4" />
                {isUploading ? 'Uploading...' : 'Take Photo'}
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileInputChange}
              className="hidden"
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleCameraCapture}
              className="hidden"
            />

            {/* Preview */}
            {previewUrl && (
              <div className="mt-4">
                <p className="text-sm text-gray-600 mb-2">Preview:</p>
                {documentFile?.type.includes('pdf') ? (
                  <div className="max-h-64 bg-gray-200 rounded-lg flex items-center justify-center p-4">
                    <div className="text-center">
                      <p className="text-2xl mb-2">📄</p>
                      <p className="text-sm text-gray-600">{documentFile.name}</p>
                    </div>
                  </div>
                ) : (
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="max-h-64 mx-auto rounded-lg object-contain"
                  />
                )}
              </div>
            )}
          </div>

          {/* SKO Code */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              SKO Code <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="sko_code"
              value={formData.sko_code}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., KWVLE6CQ"
              disabled={isUploading}
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Issued Date
              </label>
              <input
                type="date"
                name="issued_date"
                value={formData.issued_date}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                disabled={isUploading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expiration Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="expired_date"
                value={formData.expired_date}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                disabled={isUploading}
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              disabled={isUploading}
            >
              <option value="AKTIF">Active</option>
              <option value="NONAKTIF">Inactive</option>
              <option value="EXPIRED">Expired</option>
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Additional notes..."
              disabled={isUploading}
            />
          </div>

          {/* Actions */}
          <div className="pt-4 flex justify-end gap-3 border-t">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading || !documentFile}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
            >
              {isUploading ? 'Adding...' : 'Add SKO Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UpdateSKOModal;