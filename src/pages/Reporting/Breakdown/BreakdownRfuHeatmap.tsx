import React, { useState } from 'react';
import UnitHeatmap from './component/UnitHeatmap';
import MonthPicker from './component/MonthPicker';

type Storage = {
  id: number;
  warehouse_id: string;
  unit_id: string;
};

interface BreakdownRfuHeatmapProps {
  storages: Storage[]; // daftar unit yang diterima dari parent
}

const BreakdownRfuHeatmap: React.FC<BreakdownRfuHeatmapProps> = ({ storages }) => {
  // state bulan lokal
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  return (
    <div className="p-6">
      <h2 className="mb-2 font-bold text-black dark:text-white sm:text-title-sm w-full ">
        Breakdown RFU Heatmap
      </h2>

      {/* Picker bulan */}
      <div className='mb-2'>
        <MonthPicker value={month} onChange={setMonth} />
      </div>

      {/* Heatmap per unit */}
      {storages.map((storage) => (
        <UnitHeatmap key={storage.id} unit={storage} month={month} />
      ))}
    </div>
  );
};

export default BreakdownRfuHeatmap;
