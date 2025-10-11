import React, { useEffect, useState } from 'react';
import {
  RotateCw,
  RotateCcw,
  Clipboard,
  ChevronLeft,
  ChevronRight,
  Trash2,
  X,
  Edit,
  Undo,
  Save,
} from 'lucide-react';
import { supabase } from '../../../db/SupabaseClient';
import { RitasiFuel } from '../component/ritasiFuel';
import toast from 'react-hot-toast';
import ExclusiveWidget from '../../../common/TrialWrapper/ExclusiveWidget';
import { ADMIN } from '../../../store/roles';

interface Props {
  records: RitasiFuel[];
  currentIndex: number;
  onChangeIndex: (newIndex: number) => void;
  onClose: () => void;
  onUpdate?: (newRotation: number) => void;
  onValidationChange?: (validated: boolean) => void;
  onUpdateRecord?: (index: number, newRecord: RitasiFuel) => void;
  onDeleteRecord?: (index: number) => void;
}

const ImagePreviewModal: React.FC<Props> = ({
  records,
  currentIndex,
  onChangeIndex,
  onClose,
  onUpdate,
  onValidationChange,
  onUpdateRecord,
  onDeleteRecord,
}) => {
  const [localRecords, setLocalRecords] = useState<RitasiFuel[]>(records);
  const [localIndex, setLocalIndex] = useState(currentIndex);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);

  const selectedRecord = localRecords[localIndex];

  const [rotation, setRotation] = useState<number>(
    selectedRecord?.rotate_constant ?? 0,
  );
  const [isValidated, setIsValidated] = useState<boolean>(
    selectedRecord?.isValidated ?? false,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [editValues, setEditValues] = useState<Partial<RitasiFuel>>({});
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  useEffect(() => {
    setLocalRecords(records);
  }, [records]);

  useEffect(() => {
    if (selectedRecord) {
      setRotation(selectedRecord.rotate_constant ?? 0);
      setIsValidated(selectedRecord.isValidated ?? false);
      setEditValues(selectedRecord);
    }
  }, [localIndex, selectedRecord]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const updateRecordLocally = (patch: Partial<RitasiFuel>) => {
    setLocalRecords((prev) =>
      prev.map((r, i) => (i === localIndex ? { ...r, ...patch } : r)),
    );
    if (onUpdateRecord && selectedRecord) {
      onUpdateRecord(localIndex, { ...selectedRecord, ...patch });
    }
  };

  const handleRotateCW = () => setRotation((prev) => ((prev ?? 0) + 90) % 360);
  const handleRotateCCW = () =>
    setRotation((prev) => ((prev ?? 0) - 90 + 360) % 360);

  const handleSaveRotation = async () => {
    if (!selectedRecord) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('ritasi_fuel')
        .update({ rotate_constant: rotation })
        .eq('id', selectedRecord.id);
      if (error) throw error;

      updateRecordLocally({ rotate_constant: rotation });
      onUpdate?.(rotation);
      toast.success('Rotation saved');
    } catch (e) {
      console.error(e);
      toast.error('Failed to save rotation');
    } finally {
      setIsSaving(false);
    }
  };

  const handleValidationToggle = async (checked: boolean) => {
    if (!selectedRecord) return;
    setIsValidated(checked);
    try {
      const { error } = await supabase
        .from('ritasi_fuel')
        .update({ isValidated: checked })
        .eq('no_surat_jalan', selectedRecord.no_surat_jalan);
      if (error) throw error;

      updateRecordLocally({ isValidated: checked });
      onValidationChange?.(checked);
      toast.success(`Validation ${checked ? 'enabled' : 'disabled'}`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to update validation');
    }
  };

  const handleDelete = async () => {
    if (!selectedRecord) return;
    try {
      const { error } = await supabase
        .from('ritasi_fuel')
        .delete()
        .eq('id', selectedRecord.id);
      if (error) throw error;

      toast.success('Record deleted successfully');
      onDeleteRecord?.(localIndex);
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete record');
    } finally {
      setIsDeleteConfirmOpen(false);
    }
  };

  const handleEditChange = (key: string, value: any) => {
    setEditValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleToggleValidate = () => {
    handleValidationToggle(!isValidated);
  };

  const handleSaveEdit = () => {
    if (
      !editValues.remark_modification ||
      editValues.remark_modification.trim() === ''
    ) {
      toast.error('Remark Modification wajib diisi!');
      return;
    }
    setIsConfirmOpen(true);
  };

  const confirmSave = async () => {
    setIsConfirmOpen(false);
    setIsSaving(true);
    try {
      if (!selectedRecord) return;

      const allowedKeys: (keyof RitasiFuel)[] = [
        'id',
        'no_surat_jalan',
        'queue_num',
        'ritation_date',
        'warehouse_id',
        'qty_sj',
        'qty_sonding',
        'sonding_before_front',
        'sonding_before_rear',
        'sonding_after_front',
        'sonding_after_rear',
        'flowmeter_before_url',
        'flowmeter_after_url',
        'qty_sonding_before',
        'qty_sonding_after',
        'operator_id',
        'fuelman_id',
        'qty_flowmeter_before',
        'qty_flowmeter_after',
        'isValidated',
        'petugas_pencatatan',
        'shift',
        'photo_url',
        'po_allocation',
        'rotate_constant',
        'remark_modification',
      ];

      const cleanValues = Object.fromEntries(
        Object.entries(editValues)
          .filter(([key]) => allowedKeys.includes(key as keyof RitasiFuel))
          .map(([key, value]) => [key, value ?? null]),
      );

      // pastikan id-nya ikut
      if (!cleanValues.id && selectedRecord.id)
        cleanValues.id = selectedRecord.id;

      // ✅ gunakan update by id (bukan upsert by no_surat_jalan)
      const { error } = await supabase
        .from('ritasi_fuel')
        .update(cleanValues)
        .eq('id', selectedRecord.id);

      if (error) throw error;

      updateRecordLocally({ ...selectedRecord, ...editValues });
      toast.success('Record updated successfully');
      setIsEditMode(false);
    } catch (err) {
      console.error(err);
      toast.error('Failed to update record');
    } finally {
      setIsSaving(false);
    }
  };

  const fieldLabels: Partial<Record<keyof RitasiFuel, string>> = {
    id: 'ID',
    no_surat_jalan: 'No Surat Jalan',
    queue_num: 'Queue Num',
    ritation_date: 'Tanggal Ritasi',
    warehouse_id: 'Warehouse ID',
    qty_sj: 'Qty SJ',
    qty_sonding: 'Qty Sonding',
    sonding_before_front: 'Sonding Before Front',
    sonding_before_rear: 'Sonding Before Rear',
    sonding_after_front: 'Sonding After Front',
    sonding_after_rear: 'Sonding After Rear',
    qty_sonding_before: 'Qty Sonding Before',
    qty_sonding_after: 'Qty Sonding After',
    operator_name: 'Operator',
    fuelman_name: 'Fuelman',
    qty_flowmeter_before: 'Qty FM Before',
    qty_flowmeter_after: 'Qty FM After',
    isValidated: 'Validated',
    petugas_pencatatan: 'Petugas Pencatatan',
    shift: 'Shift',
    photo_url: 'Photo URL',
    po_allocation: 'PO Allocation',
    rotate_constant: 'Rotate Constant',
    remark_modification: 'Remark Modification',
  };

  const renderCell = (val: any, lbl: string, key?: string) => {
    const isUrl = lbl.toLowerCase().includes('url');

    if (key === 'isValidated') {
      return (
        <td className="py-2 px-3 w-1/3">
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-1 text-xs rounded-full ${
                isValidated
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {isValidated ? 'Validated' : 'Not Validated'}
            </span>
            <ExclusiveWidget allowedRoles={ADMIN}>
              <input
              type="checkbox"
              checked={isValidated}
              onChange={(e) => handleValidationToggle(e.target.checked)}
              className="h-4 w-4 accent-green-600"
            /></ExclusiveWidget>
          </div>
        </td>
      );
    }

    if (isEditMode && key !== 'isValidated') {
      return (
        <td className="py-2 px-3 w-1/3">
          <input
            type="text"
            value={String(editValues[key as keyof RitasiFuel] ?? '')}
            onChange={(e) => handleEditChange(key!, e.target.value)}
            className="w-full border rounded px-2 py-1 text-sm"
          />
        </td>
      );
    }

    if (isUrl) {
      return (
        <td className="py-2 px-3 w-1/3">
          <div className="flex items-center gap-1 min-w-0">
            <span
              className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap"
              title={String(val ?? '')}
            >
              {String(val ?? '')}
            </span>
            {val && (
              <button
                className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 flex-shrink-0"
                onClick={() => {
                  navigator.clipboard.writeText(String(val));
                  toast.success('URL copied!');
                }}
                title="Copy URL"
              >
                <Clipboard size={16} />
              </button>
            )}
          </div>
        </td>
      );
    }
    // Highlight khusus untuk Qty SJ
    if (key === 'qty_sj') {
      return (
        <td className="py-2 px-3 w-1/3">
          <span className="font-bold text-blue-800 underline">
            {String(val ?? '')}
          </span>
        </td>
      );
    }

    return <td className="py-2 px-3 break-words w-1/3">{String(val ?? '')}</td>;
  };

  const goPrev = () => {
    const newIndex =
      (localIndex - 1 + localRecords.length) % localRecords.length;
    setLocalIndex(newIndex);
    onChangeIndex(newIndex);
  };

  const goNext = () => {
    const newIndex = (localIndex + 1) % localRecords.length;
    setLocalIndex(newIndex);
    onChangeIndex(newIndex);
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-[99]"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="font-semibold text-lg">
            Detail Ritasi ({localIndex + 1}/{localRecords.length})
          </h3>
          <div className="flex gap-2">
            {!isEditMode && (
              <button
                onClick={() => setIsDeleteConfirmOpen(true)}
                className="px-3 py-1 rounded bg-red-500 hover:bg-red-600 text-white flex items-center gap-1"
              >
                <Trash2 size={16} />
              </button>
            )}
            <ExclusiveWidget allowedRoles={ADMIN}>
              <button
              onClick={() => setIsEditMode((p) => !p)}
              className="px-3 py-1 rounded bg-yellow-400 hover:bg-yellow-500 text-black"
            >
              {isEditMode ? <Undo size={16} /> : <Edit size={16} />}
            </button>
            </ExclusiveWidget>
            {isEditMode && (
              <button
                onClick={handleSaveEdit}
                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                <Save size={16} />
              </button>
            )}
            <button
              onClick={onClose}
              className="px-3 py-1  text-red-500 rounded hover:bg-red-600 hover:text-white"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          {/* Left Image */}
          <div className="relative flex flex-col md:w-1/2 p-4 border-b md:border-b-0 md:border-r">
            <div className="relative w-full h-[70vh] bg-gray-100 rounded overflow-hidden flex items-center justify-center">
              <img
                src={selectedRecord?.photo_url ?? ''}
                alt="preview"
                onDoubleClick={() => setIsZoomed((prev) => !prev)}
                className={`transition-transform duration-300 rounded shadow ${
                  isZoomed
                    ? 'w-full h-auto object-contain'
                    : 'max-h-full object-contain'
                }`}
                style={{ transform: `rotate(${rotation}deg)` }}
              />

              {/* Chevron Left */}
              <button
                onClick={goPrev}
                className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-gray-700 bg-opacity-60 hover:bg-opacity-80 text-white rounded-full p-2"
                title="Previous"
              >
                <div className="bg-black/40 backdrop-blur-sm rounded-full p-2 shadow-lg hover:bg-black/60 transition">
                  <ChevronLeft className="w-6 h-6 text-white" />
                </div>
              </button>

              {/* Chevron Right */}
              <button
                onClick={goNext}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-gray-700 bg-opacity-60 hover:bg-opacity-80 text-white rounded-full p-2"
                title="Next"
              >
                <div className="bg-black/40 backdrop-blur-sm rounded-full p-2 shadow-lg hover:bg-black/60 transition">
                  <ChevronRight className="w-6 h-6 text-white" />
                </div>
              </button>
            </div>

            <div className="mt-3 flex flex-wrap justify-center gap-2">
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
                className="p-2 bg-slate-200 rounded hover:bg-white"
                onClick={() => setIsZoomed((prev) => !prev)}
              >
                {isZoomed ? 'Actual Size' : 'Fit Width'}
              </button>
              <ExclusiveWidget allowedRoles={ADMIN}>
                <button
                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                onClick={handleSaveRotation}
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save Rotation'}
              </button>
              <button
                className={`px-3 py-1 rounded text-white ${
                  isValidated
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
                onClick={handleToggleValidate}
              >
                {isValidated ? 'Invalidate' : 'Validate'}
              </button>
              </ExclusiveWidget>
            </div>
          </div>

          {/* Right Table */}
          <div className="md:w-1/2 p-4 overflow-y-auto">
            <table className="w-full text-sm border border-gray-300 dark:border-gray-600 table-fixed">
              <tbody>
                {Object.entries(fieldLabels).map(([key, label]) => (
                  <tr
                    key={key}
                    className="border-b border-gray-200 dark:border-gray-700"
                  >
                    <td className="py-2 px-3 font-medium w-1/4">{label}</td>
                    {renderCell(
                      isEditMode
                        ? editValues[key as keyof RitasiFuel]
                        : selectedRecord?.[key as keyof RitasiFuel],
                      label,
                      key,
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Confirmation Modal */}
        {isConfirmOpen && (
          <div
            className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-[100]"
            onClick={() => setIsConfirmOpen(false)}
          >
            <div
              className="bg-white rounded-lg shadow-lg p-6 w-96"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold mb-3">Confirm Update</h3>
              <p className="mb-5">
                Apakah Anda yakin ingin menyimpan perubahan ini?
              </p>
              <div className="flex justify-end gap-3">
                <button
                  className="px-3 py-1 bg-gray-300 rounded hover:bg-gray-400"
                  onClick={() => setIsConfirmOpen(false)}
                >
                  Cancel
                </button>
                <button
                  className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                  onClick={confirmSave}
                >
                  Yes, Save
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Delete Confirmation Modal */}
        {isDeleteConfirmOpen && (
          <div
            className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-[100]"
            onClick={() => setIsDeleteConfirmOpen(false)}
          >
            <div
              className="bg-white rounded-lg shadow-lg p-6 w-96"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold mb-3 text-red-600">
                Confirm Delete
              </h3>
              <p className="mb-5 text-gray-700">
                Apakah Anda yakin ingin menghapus record ini?
              </p>
              <div className="flex justify-end gap-3">
                <button
                  className="px-3 py-1 bg-gray-300 rounded hover:bg-gray-400"
                  onClick={() => setIsDeleteConfirmOpen(false)}
                >
                  Cancel
                </button>
                <button
                  className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                  onClick={handleDelete}
                >
                  Yes, Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImagePreviewModal;
