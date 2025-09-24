import React, { useEffect, useState } from 'react';
import {
  RotateCw,
  RotateCcw,
  Clipboard,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { supabase } from '../../../db/SupabaseClient';
import { RitasiFuel } from '../component/ritasiFuel';
import toast from 'react-hot-toast';

interface Props {
  records: RitasiFuel[];
  currentIndex: number;
  onChangeIndex: (newIndex: number) => void;
  onClose: () => void;
  onUpdate?: (newRotation: number) => void;
  onValidationChange?: (validated: boolean) => void;
  onUpdateRecord?: (index: number, newRecord: RitasiFuel) => void;
}

const ImagePreviewModal: React.FC<Props> = ({
  records,
  currentIndex,
  onChangeIndex,
  onClose,
  onUpdate,
  onValidationChange,
  onUpdateRecord,
}) => {
  const [localRecords, setLocalRecords] = useState<RitasiFuel[]>(records);
  useEffect(() => setLocalRecords(records), [records]);

  const selectedRecord = localRecords[currentIndex];

  const [rotation, setRotation] = useState<number>(selectedRecord?.rotate_constant ?? 0);
  const [isValidated, setIsValidated] = useState<boolean>(selectedRecord?.isValidated ?? false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setRotation(selectedRecord?.rotate_constant ?? 0);
    setIsValidated(selectedRecord?.isValidated ?? false);
  }, [currentIndex, selectedRecord]);

  const updateRecordLocally = (patch: Partial<RitasiFuel>) => {
    setLocalRecords((prev) =>
      prev.map((r, i) => (i === currentIndex ? { ...r, ...patch } : r))
    );
    if (onUpdateRecord && selectedRecord) {
      onUpdateRecord(currentIndex, { ...selectedRecord, ...patch });
    }
  };

  const handleRotateCW = () => setRotation((prev) => ((prev ?? 0) + 90) % 360);
  const handleRotateCCW = () => setRotation((prev) => ((prev ?? 0) - 90 + 360) % 360);

  const handleSave = async () => {
    if (!selectedRecord) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('ritasi_fuel')
        .update({ rotate_constant: rotation })
        .eq('no_surat_jalan', selectedRecord.no_surat_jalan);
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

  const handlePoAllocationUpdate = async (newVal: string) => {
    if (!selectedRecord) return;
    try {
      const { error } = await supabase
        .from('ritasi_fuel')
        .update({ po_allocation: newVal })
        .eq('no_surat_jalan', selectedRecord.no_surat_jalan);
      if (error) throw error;

      updateRecordLocally({ po_allocation: newVal });
      toast.success('PO Allocation updated');
    } catch (err) {
      console.error(err);
      toast.error('Failed to update PO Allocation');
    }
  };

  const handlePoAllocationDelete = async () => {
    if (!selectedRecord) return;
    try {
      const { error } = await supabase
        .from('ritasi_fuel')
        .update({ po_allocation: null })
        .eq('no_surat_jalan', selectedRecord.no_surat_jalan);
      if (error) throw error;

      updateRecordLocally({ po_allocation: undefined });
      toast.success('PO Allocation deleted');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete PO Allocation');
    }
  };

  const fieldLabels: Partial<Record<keyof RitasiFuel, string>> = {
    no_surat_jalan: 'No Surat Jalan',
    ritation_date: 'Tanggal Ritasi',
    shift: 'Shift',
    unit_id: 'Unit',
    qty_sj: 'Qty SJ',
    qty_sonding: 'Qty Sonding',
    sonding_before_front: 'Sonding B. Front',
    sonding_before_rear: 'Sonding B. Rear',
    sonding_after_front: 'Sonding A. Front',
    sonding_after_rear: 'Sonding A. Rear',
    qty_sonding_before: 'Qty Sonding Before',
    qty_sonding_after: 'Qty Sonding After',
    qty_flowmeter_before: 'Qty FM Before',
    qty_flowmeter_after: 'Qty FM After',
    photo_url: 'Photo URL',
    fuelman_name: 'Fuelman',
    operator_name: 'Operator',
    petugas_pencatatan_name: 'Petugas Pencatatan',
    rotate_constant: 'Rotate Constant',
    isValidated: 'Validated',
    po_allocation: 'PO Allocation',
  };

  const renderCell = (val: any, lbl: string, key?: string) => {
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
            <input
              type="checkbox"
              checked={isValidated}
              onChange={(e) => handleValidationToggle(e.target.checked)}
              className="h-4 w-4 accent-green-600"
            />
          </div>
        </td>
      );
    }

    if (key === 'po_allocation') {
      const [isEditing, setIsEditing] = useState(false);

      if (val && !isEditing) {
        return (
          <td className="py-2 px-3 w-1/3">
            <div className="flex items-center gap-2">
              <span className="text-blue-600 font-medium">{val}</span>
              <button
                className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                onClick={() => setIsEditing(true)}
              >
                ✏️
              </button>
              <button
                className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                onClick={handlePoAllocationDelete}
              >
                🗑️
              </button>
            </div>
          </td>
        );
      }

      return (
        <td className="py-2 px-3 w-1/3">
          <input
            type="text"
            autoFocus
            defaultValue={val ?? ''}
            placeholder="Input PO Allocation"
            className="w-full border rounded px-2 py-1 text-sm"
            onKeyDown={async (e) => {
              if (e.key === 'Enter') {
                const newVal = (e.target as HTMLInputElement).value;
                await handlePoAllocationUpdate(newVal);
                setIsEditing(false);
              }
            }}
          />
        </td>
      );
    }

    const isUrl = lbl.toLowerCase().includes('url');
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

    return <td className="py-2 px-3 break-words w-1/3">{String(val ?? '')}</td>;
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
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          <div className="flex flex-col md:w-1/2 p-4 border-b md:border-b-0 md:border-r">
            <div className="w-full h-[400px] flex items-center justify-center bg-gray-100 rounded overflow-hidden">
              <img
                src={selectedRecord?.photo_url ?? ''}
                alt="preview"
                className="max-h-full max-w-full object-contain rounded shadow"
                style={{ transform: `rotate(${rotation}deg)` }}
              />
            </div>
            <div className="mt-2 flex gap-2 flex-wrap justify-center">
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

          <div className="md:w-1/2 p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Detail Ritasi</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => onChangeIndex(currentIndex - 1)}
                  disabled={currentIndex === 0}
                  className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${
                    currentIndex === 0 ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  onClick={() => onChangeIndex(currentIndex + 1)}
                  disabled={currentIndex === records.length - 1}
                  className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${
                    currentIndex === records.length - 1
                      ? 'opacity-50 cursor-not-allowed'
                      : ''
                  }`}
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>

            <table className="w-full text-sm border border-gray-300 dark:border-gray-600 table-fixed">
              <tbody>
                {Object.entries(fieldLabels).reduce<JSX.Element[]>((acc, [key, label], idx, arr) => {
                  if (idx % 2 === 0) {
                    const [k1, l1] = [key, label];
                    const v1 = selectedRecord ? selectedRecord[k1 as keyof RitasiFuel] : null;

                    const next = arr[idx + 1];
                    const [k2, l2] = next ?? [];
                    const v2 = selectedRecord && k2 ? selectedRecord[k2 as keyof RitasiFuel] : null;

                    acc.push(
                      <tr key={k1 + (k2 ?? '')} className="border-b border-gray-200 dark:border-gray-700">
                        <td className="py-2 px-3 font-medium w-1/4">{l1}</td>
                        {renderCell(v1, l1, k1)}
                        {k2 ? (
                          <>
                            <td className="py-2 px-3 font-medium w-1/4">{l2}</td>
                            {renderCell(v2, l2, k2)}
                          </>
                        ) : (
                          <>
                            <td></td>
                            <td></td>
                          </>
                        )}
                      </tr>
                    );
                  }
                  return acc;
                }, [])}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImagePreviewModal;
