import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Material, StorageSetup } from './storagetypes';
import { Plus } from 'lucide-react';
import { supabase } from '../../../../db/SupabaseClient';

interface AddMaterialModalProps {
  warehouseId: string;
  storageSetup: any[];
  materials: any[];
  selectedMaterial: string;
  setSelectedMaterial: React.Dispatch<React.SetStateAction<string>>;
  tankNumber: number;
  setTankNumber: React.Dispatch<React.SetStateAction<number>>;
  onClose: () => void;
  onSubmit: (payload: any) => void; // <--- tambahkan ini
}

type SortColumn = keyof Material | null;
type SortDirection = 'asc' | 'desc';

const AddMaterialModal: React.FC<AddMaterialModalProps> = ({
  warehouseId,
  materials,
  storageSetup,
  selectedMaterial,
  setSelectedMaterial,
  tankNumber,
  setTankNumber,
  onClose,
  onSubmit,
}) => {
  const navigate = useNavigate();
  const [filterText, setFilterText] = useState('');
  const [sortColumn, setSortColumn] = useState<SortColumn>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // states
  const [uoi, setUoi] = useState<'LITR' | 'IBC' | 'DRUM' | 'PAIL' | 'KG'>('LITR');
  const [conversionFactor, setConversionFactor] = useState<number | ''>('');
  const [storageModels, setStorageModels] = useState<string[]>([]);
  const [selectedStorageModel, setSelectedStorageModel] = useState<string>('');

  // fetch storage_model (filter material_group = 'OIL')
  useEffect(() => {
    const fetchModels = async () => {
      const { data, error } = await supabase
        .from('storage_model')
        .select('model')
        .neq('model', 'CONTAINERIZED')
        .eq('material_group', 'OIL');
      if (error) {
        console.error('fetch storage_model error', error.message);
        return;
      }
      const models = (data || []).map((d: any) => d.model);
      setStorageModels(models);
    };
    fetchModels();
  }, []);

  // Whenever UOI changes, enforce rules:
// Whenever UOI changes, enforce rules:
useEffect(() => {
  if (uoi === 'LITR') {
    // reset selection
    setSelectedStorageModel('');
    setConversionFactor('');
  } else {
    // non-LITR: force CONTAINERIZED
    setSelectedStorageModel('CONTAINERIZED');

    // set default conversion factor
    if (uoi === 'IBC') setConversionFactor(1000);
    if (uoi === 'DRUM') setConversionFactor(209);
    if (uoi === 'PAIL') setConversionFactor(20);
    if (uoi === 'KG') setConversionFactor(1);
  }
}, [uoi]);


  const handleSort = (col: SortColumn) => {
    if (sortColumn === col)
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    else {
      setSortColumn(col);
      setSortDirection('asc');
    }
  };

  const filteredMaterials = useMemo(
    () =>
      materials.filter(
        (m) =>
          m.material_code?.toLowerCase().includes(filterText.toLowerCase()) ||
          m.mnemonic?.toLowerCase().includes(filterText.toLowerCase()) ||
          m.item_description?.toLowerCase().includes(filterText.toLowerCase()),
      ),
    [materials, filterText],
  );

  const sortedMaterials = useMemo(() => {
    if (!sortColumn) return filteredMaterials;
    return [...filteredMaterials].sort((a, b) => {
      const aVal = (a[sortColumn] || '').toString();
      const bVal = (b[sortColumn] || '').toString();
      return sortDirection === 'asc'
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    });
  }, [filteredMaterials, sortColumn, sortDirection]);

  const isDuplicate = useMemo(
    () =>
      !!storageSetup.find(
        (s) =>
          s.material_code === selectedMaterial && s.tank_number === tankNumber,
      ),
    [storageSetup, selectedMaterial, tankNumber],
  );

  const [loading, setLoading] = useState(false);

  // AddMaterialModal.tsx
const handleSubmit = () => {
  if (!selectedMaterial) return;

  const payload = {
    warehouse_id: warehouseId,
    material_code: selectedMaterial,
    tank_number: tankNumber,
    uoi,
    storage_model: selectedStorageModel || null,
    conversion_factor: uoi === 'LITR' ? null : conversionFactor || null,
  };

  onSubmit(payload); // kirim ke parent
  onClose();         // close modal
};


  return (
    <div className="absolute inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
      <div className="bg-white rounded shadow w-2/3 max-h-[80vh] flex flex-col p-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-bold text-lg">Add Material for {warehouseId}</h3>
          <button
            className="p-1 bg-green-500 text-white rounded hover:bg-green-600 flex items-center gap-1"
            onClick={() => navigate('/master/addmaterial')}
          >
            <Plus size={16} /> Add New
          </button>
        </div>

        {/* Search box */}
        <input
          type="text"
          placeholder="Search material, mnemonic or description..."
          className="border p-2 mb-2 w-full rounded"
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
        />

        
        {/* Tank number */}
        <div className="mt-2 mb-2">
          <label className="block mb-1">Assign to Tank Number</label>
          <select
            className="border p-2 w-full rounded"
            value={tankNumber}
            onChange={(e) => setTankNumber(Number(e.target.value))}
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="overflow-auto flex-1 max-h-[55vh] border rounded my-4">
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 z-20 bg-slate-200">
              <tr>
                {[
                  'material_code',
                  'mnemonic',
                  'item_description',
                  'material_group',
                ].map((col) => (
                  <th
                    key={col}
                    className="p-2 text-left cursor-pointer select-none"
                    onClick={() => handleSort(col as SortColumn)}
                  >
                    {col.replace('_', ' ')}
                    {sortColumn === col
                      ? sortDirection === 'asc'
                        ? ' ▲'
                        : ' ▼'
                      : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedMaterials.map((m) => {
                const duplicate = storageSetup.some(
                  (s) =>
                    s.material_code === m.material_code &&
                    s.tank_number === tankNumber,
                );
                return (
                  <tr
                    key={m.material_code}
                    className={`border-b hover:bg-blue-100 cursor-pointer ${
                      selectedMaterial === m.material_code ? 'bg-blue-50' : ''
                    } ${duplicate ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={() => {
                      if (!duplicate) setSelectedMaterial(m.material_code);
                    }}
                  >
                    <td className="p-2">{m.material_code}</td>
                    <td className="p-2">{m.mnemonic}</td>
                    <td className="p-2">{m.item_description}</td>
                    <td className="p-2">{m.material_group}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>


        {/* UOI + Storage Model + Conversion Factor */}
        <div className="flex flex-col sm:flex-row gap-2 mb-2">
          {/* UOI */}
          <div className="flex-1">
            <label className="block mb-1">Set UOI</label>
            <select
              className="border p-2 w-full rounded"
              value={uoi}
              onChange={(e) => setUoi(e.target.value as any)}
            >
              <option value="LITR">LITR</option>
              <option value="IBC">IBC</option>
              <option value="DRUM">DRUM</option>
              <option value="PAIL">PAIL</option>
              <option value="KG">KG</option>
            </select>
          </div>

          {/* Storage Model */}
          <div className="flex-1">
            <label className="block mb-1">Storage Model</label>
            <select
              className="border p-2 w-full rounded"
              value={selectedStorageModel}
              onChange={(e) => setSelectedStorageModel(e.target.value)}
              disabled={uoi !== 'LITR'} // non-LITR: disable select
            >
              {uoi === 'LITR' ? (
                <>
                  <option value="">-- Select Model --</option>
                  {storageModels.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </>
              ) : (
                <option value="CONTAINERIZED">CONTAINERIZED</option>
              )}
            </select>
            {uoi !== 'LITR' && (
              <p className="text-xs text-gray-500 mt-1">
                Non-LITR items use <strong>CONTAINERIZED</strong> storage model.
              </p>
            )}
          </div>

          {/* Conversion Factor */}
          {uoi !== 'LITR' && (
            <div className="flex-1">
              <label className="block mb-1">
                Set Conversion Factor (L / unit)
              </label>
              <input
                type="number"
                className="border p-2 w-full rounded"
                value={conversionFactor}
                onChange={(e) => {
                  const v = e.target.value;
                  setConversionFactor(v === '' ? '' : Number(v));
                }}
                min={0}
                step="any"
              />
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-2">
          <button
            className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            onClick={handleSubmit}
            disabled={
              loading ||
              !selectedMaterial ||
              isDuplicate ||
              (uoi !== 'LITR' && !conversionFactor) ||
              (uoi === 'LITR' && !selectedStorageModel)
            }
          >
            {loading ? 'Saving...' : 'OK'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddMaterialModal;
