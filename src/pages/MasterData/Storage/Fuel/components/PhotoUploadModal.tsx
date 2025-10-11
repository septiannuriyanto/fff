import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../../../../../db/SupabaseClient';
import { StoragePhoto } from './storageData';
import { PHOTO_CATEGORIES } from './constants';

interface PhotoUploadModalProps {
  isOpen: boolean;
  onClose: (uploaded?: boolean) => void;
  onSave: (photoData: StoragePhoto) => Promise<void>;
  unitId: string;
}

const initialFormData = {
  category: 'UNIT',
  name: '',
  remark: '',
  component: '',
  kondisi: 'GOOD',
  is_primary: false,
};

const PhotoUploadModal: React.FC<PhotoUploadModalProps> = ({ isOpen, onClose, onSave, unitId }) => {
  const [formData, setFormData] = useState(initialFormData);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setFormData(initialFormData);
      setFile(null);
      setPreviewUrl(null);
    }
  }, [isOpen]);

  const handleFileSelect = (selectedFile: File) => {
    if (!selectedFile.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }
    setFile(selectedFile);

    const reader = new FileReader();
    reader.onload = (e) => setPreviewUrl(e.target?.result as string);
    reader.readAsDataURL(selectedFile);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' && e.target instanceof HTMLInputElement ? e.target.checked : value,
    }));
  };

  const uploadFileToSupabase = async (file: File) => {
    try {
      setIsUploading(true);
      const ext = file.name.split('.').pop();
      const fileName = formData.is_primary ? `MAIN.${ext}` : `${Date.now()}_${file.name}`;
      const filePath = `storage_fuel/${unitId}/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('images').upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from('images').getPublicUrl(filePath);
      if (!publicUrlData.publicUrl) throw new Error('Failed to get public URL');

      return publicUrlData.publicUrl;
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!file) {
      toast.error('Please select an image');
      return;
    }

    try {
      const imageUrl = await uploadFileToSupabase(file);

      const photoData: StoragePhoto = {
        unit_id: unitId,
        image_url: imageUrl,
        category: formData.is_primary ? 'MAIN' : formData.category,
        component: formData.is_primary ? 'MAIN' : formData.component,
        kondisi: formData.kondisi,
        remark: formData.remark,
        name: formData.name,
        is_primary: formData.is_primary,
        created_at: new Date().toISOString(),
      };

      await onSave(photoData);
      onClose(true);
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="border-b px-5 py-4 flex justify-between items-center sticky top-0 bg-white">
          <h3 className="text-lg font-semibold text-gray-800">
            Upload Photo for Unit: <span className="text-blue-600">{unitId}</span>
          </h3>
          <button onClick={() => onClose()} className="text-gray-500 hover:text-gray-800 text-2xl leading-none">&times;</button>
        </div>

        <div className="p-6 space-y-4">
          {/* Image Upload */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gray-50">
            <div className="flex gap-3 mb-4">
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2">
                📁 {isUploading ? 'Uploading...' : 'Choose from Gallery'}
              </button>
              <button type="button" onClick={() => cameraInputRef.current?.click()} disabled={isUploading} className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2">
                📸 {isUploading ? 'Uploading...' : 'Take Photo'}
              </button>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files && handleFileSelect(e.target.files[0])} />
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files && handleFileSelect(e.target.files[0])} />
            {previewUrl && <img src={previewUrl} alt="Preview" className="max-h-64 mx-auto rounded-lg object-contain mt-4" />}
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-3 gap-4">
            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select name="category" value={formData.category} onChange={handleChange} disabled={formData.is_primary} className="w-full px-3 py-2 border rounded-lg bg-white disabled:bg-gray-100 disabled:text-gray-500">
                {PHOTO_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>

            {/* Component */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Component</label>
              <input type="text" name="component" value={formData.component} onChange={handleChange} disabled={formData.is_primary} className="w-full px-3 py-2 border rounded-lg bg-white disabled:bg-gray-100 disabled:text-gray-500" placeholder="e.g., Door, Tire" />
            </div>

            {/* Main Checkbox */}
            <div className="flex items-end pb-1">
              <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                <input type="checkbox" name="is_primary" checked={formData.is_primary} onChange={handleChange} className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                <span>Set as <strong>MAIN</strong></span>
              </label>
            </div>
          </div>

          {/* Kondisi */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kondisi</label>
            <select name="kondisi" value={formData.kondisi} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg bg-white">
              <option value="GOOD">Good</option>
              <option value="MINOR_DAMAGE">Minor Damage</option>
              <option value="MAJOR_DAMAGE">Major Damage</option>
            </select>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Photo Name</label>
            <input type="text" name="name" value={formData.name} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="e.g., Left Front" />
          </div>

          {/* Remark */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Remark</label>
            <textarea name="remark" value={formData.remark} onChange={handleChange} rows={2} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Additional notes..." />
          </div>

          {/* Actions */}
          <div className="pt-4 flex justify-end gap-3 border-t">
            <button type="button" onClick={() => onClose()} className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="button" onClick={handleSubmit} disabled={isUploading || !file} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400">
              {isUploading ? 'Uploading...' : 'Save Photo'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PhotoUploadModal;
