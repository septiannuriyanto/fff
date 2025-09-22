import React, { useState } from 'react';
import { RotateCw, RotateCcw } from 'lucide-react';
import { supabase } from '../../../db/SupabaseClient';

interface Props {
  imageUrl: string;
  onClose: () => void;
  onUpdate?: (newRotation: number) => void;
  noSuratJalan: string;
  currentRotation?: number | null;
}

const ImagePreviewModal: React.FC<Props> = ({
  imageUrl,
  onClose,
  onUpdate,
  noSuratJalan,
  currentRotation = 0,
}) => {
  const [rotation, setRotation] = useState(currentRotation);
  const [isSaving, setIsSaving] = useState(false);

  const handleRotateCW = () => setRotation((prev) => ((prev ?? 0) + 90) % 360);
  const handleRotateCCW = () => setRotation((prev) => ((prev ?? 0) - 90 + 360) % 360);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Update rotasi di database saja
      const { error } = await supabase
        .from('ritasi_fuel')
        .update({ rotate_constant: rotation })
        .eq('no_surat_jalan', noSuratJalan);

      if (error) throw error;

      onUpdate && onUpdate(rotation ?? 0); // kasih tahu parent
      onClose();
    } catch (e) {
      console.error('Failed to update rotation:', e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="max-w-4xl max-h-[90vh] flex flex-col items-center overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={imageUrl}
          alt="preview"
          className="w-auto h-auto max-w-full max-h-[80vh] rounded shadow-lg"
          style={{ transform: `rotate(${rotation}deg)` }}
        />
        <div className="mt-2 flex gap-2">
          <button
            className="p-2 bg-slate-200 rounded hover:bg-white"
            onClick={handleRotateCCW}
          >
            <RotateCcw size={20} />
          </button>
          <button
            className="p-2 bg-slate-200 rounded hover:bg-white"
            onClick={handleRotateCW}
          >
            <RotateCw size={20} />
          </button>
          <button
            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
          <button
            className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImagePreviewModal;
