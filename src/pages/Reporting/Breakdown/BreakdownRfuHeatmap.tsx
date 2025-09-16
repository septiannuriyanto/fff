import React, { useState, useEffect } from 'react';
import UnitHeatmap from './component/UnitHeatmap';
import MonthPicker from './component/MonthPicker';
import ReadinessSummaryChart from './component/ReadinessSummaryChart';

type Storage = {
  warehouse_id: string;
  unit_id: string;
};

interface BreakdownRfuHeatmapProps {
  storages: Storage[];
}

const BreakdownRfuHeatmap: React.FC<BreakdownRfuHeatmapProps> = ({
  storages,
}) => {
  // state bulan
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // state mode: monthly / thisWeek / lastWeek
  const [mode, setMode] = useState<'monthly' | 'thisWeek' | 'lastWeek'>('monthly');

  // auto lock bulan ketika mode bukan monthly
  useEffect(() => {
    if (mode !== 'monthly') {
      const now = new Date();
      setMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
    }
  }, [mode]);

  return (
    <div className="p-6">
      <h2 className="mb-2 font-bold text-black dark:text-white sm:text-title-sm w-full">
        Readiness Summary
      </h2>

      <div className="my-2">
        <ReadinessSummaryChart units={storages} month={month} />
      </div>

      <h2 className="mb-2 font-bold text-black dark:text-white sm:text-title-sm w-full">
        Breakdown RFU Heatmap
      </h2>

      {/* Picker bulan + mode */}
      <div className="mb-2 flex items-center gap-2">
        {/* Dropdown mode */}
        <select
          className="border rounded px-2 py-1 dark:bg-gray-800 dark:text-white"
          value={mode}
          onChange={(e) => setMode(e.target.value as any)}
        >
          <option value="monthly">Monthly</option>
          <option value="thisWeek">This Week (Thu–Wed)</option>
          <option value="lastWeek">Last Week (Thu–Wed)</option>
        </select>

        {/* MonthPicker */}
        <MonthPicker
          value={month}
          onChange={setMonth}
          disabled={mode !== 'monthly'}
        />
      </div>

      {/* Heatmap per unit */}
      {storages.map((storage) => (
        <UnitHeatmap
          key={storage.warehouse_id}
          unit={storage}
          month={month}
          mode={mode} // kirim mode ke komponen kalau butuh hitung date range
        />
      ))}
    </div>
  );
};

export default BreakdownRfuHeatmap;
