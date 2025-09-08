import React, { useState, useEffect, useRef } from 'react';
import { statusColors } from './statuscolor';
import { supabase } from '../../../../db/SupabaseClient';
import { criticalHours } from './criticalHours';

const UnitHeatmap: React.FC<{ unit: any; month: string }> = ({ unit, month }) => {
  const [expanded, setExpanded] = useState(true);
  const [grid, setGrid] = useState<string[][]>([]);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const cellWidth = 22;
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;
  const currentDay = today.getDate();
  const currentHour = today.getHours();

  const startHour = 0;
  const daysInMonth = new Date(Number(month.split('-')[0]), Number(month.split('-')[1]), 0).getDate();

  const renderDays =
    Number(month.split('-')[0]) === currentYear && Number(month.split('-')[1]) === currentMonth
      ? currentDay
      : daysInMonth;

  useEffect(() => {
    const fetchStatus = async () => {
      // 1. Fetch a wider range of data to properly handle status transitions across months.
      // We need the last status from the previous month and the first status from the next month.
      const prevMonth = new Date(Number(month.split('-')[0]), Number(month.split('-')[1]) - 2, 1);
      const startOfMonth = new Date(Number(month.split('-')[0]), Number(month.split('-')[1]) - 1, 1);
      const endOfMonth = new Date(Number(month.split('-')[0]), Number(month.split('-')[1]), 0, 23, 59, 59);

      const { data, error } = await supabase
        .from('rfu_status')
        .select('status, reported_at, next_status_timestamp')
        .eq('unit_id', unit.unit_id)
        .gte('reported_at', prevMonth.toISOString()) // Fetch from the previous month
        .lte('reported_at', endOfMonth.toISOString())
        .order('reported_at', { ascending: true });

      if (error) {
        console.error(error);
        const defaultGrid: string[][] = Array.from({ length: renderDays }, () => Array.from({ length: 24 }, () => 'RFU'));
        setGrid(defaultGrid);
        return;
      }
      
      // 2. Initialize the grid with a default status.
      const newGrid: string[][] = Array.from({ length: renderDays }, () =>
        Array.from({ length: 24 }, () => 'RFU')
      );

      // 3. Process the data to fill the grid.
      // The `next_status_timestamp` is crucial for determining the duration.
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const startDate = new Date(row.reported_at);
        
        // Skip data from the previous month unless it's the very first entry.
        // This is to correctly apply a status that started in the previous month.
        if (startDate.getMonth() !== startOfMonth.getMonth() && i > 0) continue;

        let endDate: Date;
        if (row.next_status_timestamp) {
          endDate = new Date(row.next_status_timestamp);
        } else {
          // If next_status_timestamp is null, the status is ongoing.
          endDate = new Date(); // Use current time as the end date.
        }

        // Clip the start and end dates to the current month's boundaries.
        const effectiveStart = startDate < startOfMonth ? startOfMonth : startDate;
        const effectiveEnd = endDate > endOfMonth ? endOfMonth : endDate;

        let startDayIndex = effectiveStart.getDate() - 1;
        let startHourIndex = effectiveStart.getHours();
        const endDayIndex = effectiveEnd.getDate() - 1;
        const endHourIndex = effectiveEnd.getHours();
        
        // Ensure the loop starts from the correct day in the grid (day 1 of the current month).
        if (startDayIndex < 0) startDayIndex = 0;

        // Loop through each day and hour within the effective range.
        for (let d = startDayIndex; d <= endDayIndex; d++) {
          if (d >= renderDays) break;

          const hStart = (d === startDayIndex) ? startHourIndex : 0;
          const hEnd = (d === endDayIndex) ? endHourIndex : 23;
          
          for (let h = hStart; h <= hEnd; h++) {
            newGrid[d][h] = row.status;
          }
        }
      }

      // 4. Mark future hours for today.
      if (Number(month.split('-')[0]) === currentYear && Number(month.split('-')[1]) === currentMonth) {
        for (let h = currentHour + 1; h < 24; h++) {
          if (currentDay - 1 >= 0 && currentDay - 1 < renderDays) {
            newGrid[currentDay - 1][h] = 'FUTURE';
          }
        }
      }

      setGrid(newGrid);
    };

    fetchStatus();
  }, [unit, month, renderDays, daysInMonth, currentHour, currentDay, currentMonth, currentYear]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
  }, [renderDays]);

  return (
    <div className="mb-4 border rounded">
      <div className="flex justify-between items-center cursor-pointer bg-gray-100 p-2" onClick={() => setExpanded(!expanded)}>
        <div className="font-bold">{unit.unit_id}</div>
        <div className="text-xs text-blue-600">{expanded ? '▼ Collapse' : '► Expand'}</div>
      </div>

      {expanded && (
        <div ref={scrollRef} className="overflow-x-auto">
          {/* Header untuk tanggal */}
          <div
            className="grid gap-x-[4px] gap-y-[1px]"
            style={{ gridTemplateColumns: `80px repeat(${renderDays}, ${cellWidth}px)` }}
          >
            <div></div>
            {Array.from({ length: renderDays }, (_, d) => (
              <div key={d} className="text-center text-[10px] whitespace-nowrap">{d + 1}</div>
            ))}
          </div>

          {/* Grid untuk jam */}
          {Array.from({ length: 24 }, (_, i) => {
            const h = (i + startHour) % 24;
            return (
              <div
                key={h}
                className="grid ml-2 gap-x-[4px] gap-y-[1px]"
                style={{ gridTemplateColumns: `80px repeat(${renderDays}, ${cellWidth}px)` }}
              >
                <div className="text-[10px] border-r whitespace-nowrap">{h.toString().padStart(2, '0')}:00</div>
                {Array.from({ length: renderDays }, (_, d) => {
                  const status = grid[d]?.[h] || 'RFU';
                  const isCritical = criticalHours.includes(h);
                  return (
                    <div
                      key={d}
                      className={`h-5 rounded-sm ${status === 'FUTURE' ? 'bg-gray-300' : statusColors[status]} ${!isCritical ? 'opacity-30' : ''}`}
                      style={{ width: cellWidth }}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default UnitHeatmap;