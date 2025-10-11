// components/MasterStorage/StorageModal.tsx

import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { StorageData } from './components/storageData';

interface StorageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: StorageData) => void;
  initialData: StorageData | null;
}

const initialFormState: StorageData = {
    warehouse_id: '', unit_id: '', max_capacity: null, manufacturer: '', callibration_date: null, expired_date: null, 
    type: '', status: 'ACTIVE', fm_seal_number: null, fm_seal_img: null, filter_id: null, daily_check_days: null, 
    filter_config: null, notes: null, sko:null,
};


const StorageModal: React.FC<StorageModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const [formData, setFormData] = useState<StorageData>(initialFormState);

  const isEdit = !!initialData?.id;

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        // Format tanggal ke string YYYY-MM-DD
        callibration_date: initialData.callibration_date ? new Date(initialData.callibration_date).toISOString().substring(0, 10) : null,
        expired_date: initialData.expired_date ? new Date(initialData.expired_date).toISOString().substring(0, 10) : null,
      });
    } else {
      setFormData(initialFormState);
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: (type === 'number' || type === 'date') ? (value ? value : null) : value,
    }));
  };

  const handleSealChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const numbers = value.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
    setFormData(prev => ({ ...prev, fm_seal_number: numbers.length > 0 ? numbers : null }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.warehouse_id || !formData.unit_id) {
        toast.error('Warehouse ID and Unit ID are mandatory.');
        return;
    }
    
    // Konversi real numbers
    const dataToSave = {
        ...formData,
        max_capacity: formData.max_capacity ? parseFloat(formData.max_capacity as unknown as string) : null,
    };
    
    onSave(dataToSave);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header dan Form Sesuai kode sebelumnya */}
        <div className="border-b p-5 flex justify-between items-center sticky top-0 bg-white">
          <h3 className="text-xl font-bold text-gray-800">{isEdit ? 'Edit Storage Unit' : 'Create New Storage Unit'}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 grid grid-cols-2 gap-4">
          
          {/* Warehouse ID & Unit ID */}
          <div className="col-span-2 md:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Warehouse ID (Wajib)</label>
            <input type="text" name="warehouse_id" value={formData.warehouse_id} onChange={handleChange} required
                   className="w-full px-3 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500" disabled={isEdit} />
          </div>
          <div className="col-span-2 md:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Unit ID (Wajib)</label>
            <input type="text" name="unit_id" value={formData.unit_id || ''} onChange={handleChange} required
                   className="w-full px-3 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500" />
          </div>

          {/* Type & Status */}
          <div className="col-span-2 md:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select name="type" value={formData.type || ''} onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-lg bg-white focus:ring-blue-500 focus:border-blue-500">
                <option value="">-- Select Type --</option>
                <option value="FT">Fuel Truck (FT)</option>
                <option value="MTG">Main Tank Grease (MTG)</option>
                <option value="ST">Static Tank (ST)</option>
            </select>
          </div>
          <div className="col-span-2 md:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select name="status" value={formData.status || 'ACTIVE'} onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-lg bg-white focus:ring-blue-500 focus:border-blue-500">
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
                <option value="OUT">OUT (Discarded)</option>
            </select>
          </div>
          
          {/* Capacity & Manufacturer */}
          <div className="col-span-2 md:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Max Capacity (L)</label>
            <input type="number" name="max_capacity" value={formData.max_capacity || ''} onChange={handleChange} step="0.01"
                   className="w-full px-3 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <div className="col-span-2 md:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Manufacturer</label>
            <input type="text" name="manufacturer" value={formData.manufacturer || ''} onChange={handleChange}
                   className="w-full px-3 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500" />
          </div>

          {/* Dates */}
          <div className="col-span-2 md:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Callibration Date</label>
            <input type="date" name="callibration_date" value={formData.callibration_date || ''} onChange={handleChange}
                   className="w-full px-3 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <div className="col-span-2 md:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Expired Date</label>
            <input type="date" name="expired_date" value={formData.expired_date || ''} onChange={handleChange}
                   className="w-full px-3 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500" />
          </div>

          {/* Seal Numbers & Image */}
          <div className="col-span-2 md:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">FM Seal Number (Comma separated)</label>
            <input type="text" name="fm_seal_number" value={formData.fm_seal_number?.join(', ') || ''} onChange={handleSealChange}
                   className="w-full px-3 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500" placeholder="e.g., 1234, 5678" />
          </div>
          <div className="col-span-2 md:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">FM Seal Image URL</label>
            <input type="text" name="fm_seal_img" value={formData.fm_seal_img || ''} onChange={handleChange}
                   className="w-full px-3 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500" placeholder="http://..." />
          </div>
          
          {/* Image Configs */}
          <div className="col-span-2 md:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Main Image URL</label>

          </div>
          <div className="col-span-2 md:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Image Directory (Folder)</label>

          </div>

          {/* Daily Check */}
          <div className="col-span-2 md:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Daily Check Days (Smallint)</label>
            <input type="number" name="daily_check_days" value={formData.daily_check_days || ''} onChange={handleChange} min="1" max="365"
                   className="w-full px-3 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <div className="col-span-2 md:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Filter ID (Material Code)</label>
            <input type="text" name="filter_id" value={formData.filter_id || ''} onChange={handleChange}
                   className="w-full px-3 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500" />
          </div>
          
          <div className="col-span-2 pt-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              {isEdit ? 'Save Changes' : 'Create Unit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StorageModal;