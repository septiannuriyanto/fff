import React from 'react';
import { Storage } from './storagetypes';

interface Props {
  storages: Storage[]
  selectedStorage: Storage | null;
  onSelect: (s: Storage) => void;
}

const StorageTable: React.FC<Props> = ({ storages, selectedStorage, onSelect }) => {
  return (
    <div className="w-1/2 border rounded p-4 bg-white">
      <h2 className="mb-4 font-bold text-lg">Storage Population</h2>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-50 border-b">
            <th className="p-2 text-left">Warehouse ID</th>
            <th className="p-2 text-left">Unit ID</th>
            <th className="p-2 text-left">Location</th>
          </tr>
        </thead>
        <tbody>
          {storages.map((s) => (
            <tr
              key={s.id}
              className={`hover:bg-blue-100 border-b ${selectedStorage?.warehouse_id === s.warehouse_id ? 'bg-blue-50' : ''}`}
              onClick={() => onSelect(s)}
            >
              <td className="p-2">{s.warehouse_id}</td>
              <td className="p-2">{s.unit_id}</td>
              <td className="p-2">{s.location || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default StorageTable;
