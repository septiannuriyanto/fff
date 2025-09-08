import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Material, StorageSetup } from './storagetypes';
import { Plus } from 'lucide-react';

interface Props {
  materials: Material[];
  storageSetup: StorageSetup[];
  selectedMaterial: string;
  setSelectedMaterial: (val: string) => void;
  tankNumber: number;
  setTankNumber: (val: number) => void;
  onClose: () => void;
  onSubmit: () => void;
  warehouseId: string;
}

type SortColumn = keyof Material | null;
type SortDirection = 'asc' | 'desc';

const AddMaterialModal: React.FC<Props> = ({
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
  const navigate = useNavigate(); // untuk routing
  const [filterText, setFilterText] = useState('');
  const [sortColumn, setSortColumn] = useState<SortColumn>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (col: SortColumn) => {
    if (sortColumn === col) setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
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
      return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
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

  return (
    <div className="absolute inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
      <div className="bg-white rounded shadow w-2/3 max-h-[80vh] flex flex-col p-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-bold text-lg">
            Add Material for {warehouseId}
          </h3>
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

        {/* Table */}
        <div className="overflow-auto flex-1 max-h-[55vh] border rounded">
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 z-20 bg-slate-200">
              <tr>
                {['material_code', 'mnemonic', 'item_description', 'material_group'].map((col) => (
                  <th
                    key={col}
                    className="p-2 text-left cursor-pointer select-none"
                    onClick={() => handleSort(col as SortColumn)}
                  >
                    {col.replace('_', ' ')}
                    {sortColumn === col ? (sortDirection === 'asc' ? ' ▲' : ' ▼') : ''}
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

        {/* Tank number */}
        <div className="mt-2 mb-2">
          <label className="block mb-1">Assign to Tank Number</label>
          <select
            className="border p-2 w-full rounded"
            value={tankNumber}
            onChange={(e) => setTankNumber(Number(e.target.value))}
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-2">
          <button className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400" onClick={onClose}>
            Cancel
          </button>
          <button
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            onClick={onSubmit}
            disabled={!selectedMaterial || isDuplicate}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddMaterialModal;
