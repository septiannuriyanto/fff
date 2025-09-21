import React, { useState, useMemo } from 'react';
import { TeraPoint } from '../types/teraPoint';

interface ViewTeraModalProps {
  visible: boolean;
  onClose: () => void;
  teraData: TeraPoint[];
  units: string[];
}

const ViewTeraModal: React.FC<ViewTeraModalProps> = ({ visible, onClose, teraData, units }) => {
  const [filterUnit, setFilterUnit] = useState('');

  // filteredData tetap selalu dihitung di atas
  const filteredData = useMemo(() => {
    return filterUnit
      ? teraData.filter((t) => t.unit_id === filterUnit)
      : teraData;
  }, [filterUnit, teraData]);

  // jika modal tidak visible, tetap return null
  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg w-[50%] max-w-4xl max-h-[60%] overflow-hidden flex flex-col p-4 border border-gray">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-300 dark:border-gray-600">
          <h3 className="text-lg font-bold text-black dark:text-white">View Tera Tangki</h3>
          <button className="text-red-500 hover:text-red-700 font-bold" onClick={onClose}>
            Close
          </button>
        </div>

        {/* Filter Unit + Count */}
        <div className="p-2 border-b border-gray-300 dark:border-gray-600 flex justify-between items-center">
          <div>
            <label className="mr-2">Filter Unit:</label>
            <select
              className="border rounded p-1"
              value={filterUnit}
              onChange={(e) => setFilterUnit(e.target.value)}
            >
              <option value="">All</option>
              {units.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-300">
            {filteredData.length} record{filteredData.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-auto flex-1">
          <table className="min-w-full border-collapse">
            <thead className="bg-gray dark:bg-slate-600 sticky top-0 z-10">
              <tr>
                <th className="p-2 border border-gray-300 dark:border-gray-600 text-left">Unit ID</th>
                <th className="p-2 border border-gray-300 dark:border-gray-600 text-left">Height (mm)</th>
                <th className="p-2 border border-gray-300 dark:border-gray-600 text-left">Qty (liter)</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((t, idx) => (
                <tr key={idx} className="hover:bg-gray-100 dark:hover:bg-gray-700">
                  <td className="p-2 border border-gray-300 dark:border-gray-600">{t.unit_id}</td>
                  <td className="p-2 border border-gray-300 dark:border-gray-600">{t.height_mm}</td>
                  <td className="p-2 border border-gray-300 dark:border-gray-600">{t.qty_liter}</td>
                </tr>
              ))}
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan={3} className="p-2 text-center text-gray-500">
                    No data
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
};

export default ViewTeraModal;
