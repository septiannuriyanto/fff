import React from 'react';
import { Storage, StorageSetup, Material } from './storagetypes';
import { Plus, Trash2 } from 'lucide-react';

interface Props {
  selectedStorage: Storage | null;
  storageSetup: StorageSetup[];
  materials: Material[];
  onDelete: (id: number) => void;
  onAddClick: () => void;
}

const StorageMaterialSetupTable: React.FC<Props> = ({
  selectedStorage,
  storageSetup,
  materials,
  onDelete,
  onAddClick,
}) => {
  return (
    <div className="w-1/2 border rounded p-4 bg-white relative">
      <h2 className="mb-4 font-bold text-lg flex justify-between items-center">
  {selectedStorage
    ? `Storage Material Setup: ${selectedStorage.warehouse_id} (${selectedStorage.unit_id})`
    : 'Storage Material Setup'}
  {selectedStorage && (
    <button
      className="p-1 bg-blue-500 text-white rounded hover:bg-blue-600"
      onClick={onAddClick}
    >
      <Plus size={18} />
    </button>
  )}
</h2>

      {selectedStorage ? (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="p-2 text-left">Material Code</th>
              <th className="p-2 text-left">Mnemonic</th>
              <th className="p-2 text-left">Item Description</th>
              <th className="p-2 text-left">Material Group</th>
              <th className="p-2 text-left">Tank</th>
              <th className="p-2 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {storageSetup.map((s) => {
              const mat = materials.find(
                (m) => m.material_code === s.material_code,
              );
              return (
                <tr key={s.id} className="hover:bg-gray-100 border-b">
                  <td className="p-2">{mat?.material_code}</td>
                  <td className="p-2">{mat?.mnemonic}</td>
                  <td className="p-2">{mat?.item_description}</td>
                  <td className="p-2">{mat?.material_group}</td>
                  <td className="p-2">{s.tank_number}</td>

                  <td className="p-2 text-center">
                    <button
                      className="text-red-500 hover:text-red-700"
                      onClick={() => onDelete(s.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <p>Select a storage to see materials.</p>
      )}
    </div>
  );
};

export default StorageMaterialSetupTable;
