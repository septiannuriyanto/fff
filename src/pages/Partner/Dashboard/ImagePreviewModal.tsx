import React, { useState } from 'react';
import { RotateCw, RotateCcw, Clipboard } from 'lucide-react';
import { supabase } from '../../../db/SupabaseClient';
import { RitasiFuel } from '../component/ritasiFuel';
import toast from 'react-hot-toast';

interface Props {
  selectedRecord: RitasiFuel;
  onClose: () => void;
  onUpdate?: (newRotation: number) => void;
  onValidationChange?: (validated: boolean) => void; // baru
}

const ImagePreviewModal: React.FC<Props> = ({
  selectedRecord,
  onClose,
  onUpdate,
  onValidationChange
}) => {
  const [rotation, setRotation] = useState(selectedRecord.rotate_constant ?? 0);
  const [isSaving, setIsSaving] = useState(false);
  const [isValidated, setIsValidated] = useState<boolean>(
    selectedRecord.isValidated ?? false,
  );

  // rotasi kanan/kiri
  const handleRotateCW = () => setRotation((prev) => ((prev ?? 0) + 90) % 360);
  const handleRotateCCW = () =>
    setRotation((prev) => ((prev ?? 0) - 90 + 360) % 360);

  // simpan rotasi
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('ritasi_fuel')
        .update({ rotate_constant: rotation })
        .eq('no_surat_jalan', selectedRecord.no_surat_jalan);

      if (error) throw error;
      onUpdate && onUpdate(rotation);
      toast.success('Rotation saved');
      onClose();
    } catch (e) {
      console.error('Failed to update rotation:', e);
      toast.error('Failed to update rotation');
    } finally {
      setIsSaving(false);
    }
  };

  // toggle validated
  const handleValidationToggle = async (checked: boolean) => {
  setIsValidated(checked);
  try {
    const { error } = await supabase
      .from('ritasi_fuel')
      .update({ isValidated: checked })
      .eq('no_surat_jalan', selectedRecord.no_surat_jalan);

    if (error) throw error;
    toast.success(`Validation ${checked ? 'enabled' : 'disabled'}`);
    onValidationChange && onValidationChange(checked); // trigger induk
  } catch (err) {
    console.error(err);
    toast.error('Failed to update validation');
  }
};


  // label field yang ditampilkan
  const fieldLabels: Partial<Record<keyof RitasiFuel, string>> = {
    no_surat_jalan: 'No Surat Jalan',
    ritation_date: 'Tanggal Ritasi',
    shift: 'Shift',
    unit_id: 'Unit',
    qty_sj: 'Qty SJ',
    qty_sonding: 'Qty Sonding',
    sonding_before_front: 'Sonding Before Front',
    sonding_before_rear: 'Sonding Before Rear',
    sonding_after_front: 'Sonding After Front',
    sonding_after_rear: 'Sonding After Rear',
    qty_sonding_before: 'Qty Sonding Before',
    qty_sonding_after: 'Qty Sonding After',
    qty_flowmeter_before: 'Qty Flowmeter Before',
    qty_flowmeter_after: 'Qty Flowmeter After',
    photo_url: 'Photo URL',
    fuelman_name: 'Fuelman Name',
    operator_name: 'Operator Name',
    petugas_pencatatan_name: 'Petugas Pencatatan Name',
    rotate_constant: 'Rotate Constant',
    isValidated: 'Validated',
  };

  // render cell table kanan
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

    return (
      <td className="py-2 px-3 break-words w-1/3">{String(val ?? '')}</td>
    );
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[99]"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          {/* Panel kiri */}
          <div className="flex flex-col items-center justify-start md:w-1/2 p-4 border-b md:border-b-0 md:border-r overflow-hidden">
            <div className="w-full h-[400px] flex items-center justify-center bg-gray-100 rounded">
              <img
                src={selectedRecord.photo_url ?? ''}
                alt="preview"
                className="max-h-full max-w-full object-contain rounded shadow"
                style={{ transform: `rotate(${rotation}deg)` }}
              />
            </div>
            <div className="mt-2 flex gap-2 flex-wrap">
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

          {/* Panel kanan */}
          <div className="md:w-1/2 p-4 overflow-y-auto">
            <h3 className="text-lg font-semibold mb-3">Detail Ritasi</h3>
            <table className="w-full text-sm border border-gray-300 dark:border-gray-600 table-fixed">
              <tbody>
                {Object.entries(fieldLabels).reduce<JSX.Element[]>(
                  (acc, [key, label], idx, arr) => {
                    if (idx % 2 === 0) {
                      const [k1, l1] = [key, label];
                      const v1 = selectedRecord[k1 as keyof RitasiFuel];

                      const next = arr[idx + 1];
                      const [k2, l2] = next ?? [];
                      const v2 = k2
                        ? selectedRecord[k2 as keyof RitasiFuel]
                        : null;

                      acc.push(
                        <tr
                          key={k1 + (k2 ?? '')}
                          className="border-b border-gray-200 dark:border-gray-700"
                        >
                          <td className="py-2 px-3 font-medium w-1/4">{l1}</td>
                          {renderCell(v1, l1, k1)}
                          {k2 ? (
                            <>
                              <td className="py-2 px-3 font-medium w-1/4">
                                {l2}
                              </td>
                              {renderCell(v2, l2, k2)}
                            </>
                          ) : (
                            <>
                              <td></td>
                              <td></td>
                            </>
                          )}
                        </tr>,
                      );
                    }
                    return acc;
                  },
                  [],
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImagePreviewModal;
