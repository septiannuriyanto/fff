import React, { useState, useEffect, useRef } from 'react';
import { statusColors } from './statuscolor';
import { supabase } from '../../../../db/SupabaseClient';
import { criticalHours } from './criticalHours';

type UnitHeatmapProps = {
  unit: any;
  month: string; // YYYY-MM
  mode: 'monthly' | 'thisWeek' | 'lastWeek';
};

const UnitHeatmap: React.FC<UnitHeatmapProps> = ({ unit, month, mode }) => {
  const [expanded, setExpanded] = useState(true);
  const [grid, setGrid] = useState<string[][]>([]);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const cellWidth = 22;
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;
  const currentDay = today.getDate();
  const currentHour = today.getHours();

  /** 
   * Hitung rentang tanggal berdasarkan mode.
   * - monthly => 1 bulan penuh
   * - thisWeek => Kamis minggu ini s/d Rabu depan
   * - lastWeek => Kamis minggu lalu s/d Rabu minggu ini
   */
  const { startDate, endDate, renderDays } = (() => {
    if (mode === 'monthly') {
      const year = Number(month.split('-')[0]);
      const mon = Number(month.split('-')[1]);
      const daysInMonth = new Date(year, mon, 0).getDate();
      const renderDays =
        year === currentYear && mon === currentMonth ? currentDay : daysInMonth;
      return {
        startDate: new Date(year, mon - 1, 1, 0, 0, 0),
        endDate: new Date(year, mon - 1, daysInMonth, 23, 59, 59),
        renderDays,
      };
    }

    const now = new Date();
    const day = now.getDay(); // Minggu=0 ... Sabtu=6
    const thursdayOffset = (day >= 4 ? day - 4 : 7 - (4 - day)); // jarak ke Kamis terakhir
    const thursdayThisWeek = new Date(now);
    thursdayThisWeek.setDate(now.getDate() - thursdayOffset);
    thursdayThisWeek.setHours(0, 0, 0, 0);

    const thursdayLastWeek = new Date(thursdayThisWeek);
    thursdayLastWeek.setDate(thursdayThisWeek.getDate() - 7);

    if (mode === 'thisWeek') {
      const end = new Date(thursdayThisWeek);
      end.setDate(thursdayThisWeek.getDate() + 6); // Rabu depan
      end.setHours(23, 59, 59, 999);
      const diff = Math.ceil(
        (end.getTime() - thursdayThisWeek.getTime()) / (1000 * 60 * 60 * 24)
      ) + 1;
      return {
        startDate: thursdayThisWeek,
        endDate: end,
        renderDays: diff,
      };
    } else {
      // lastWeek
      const end = new Date(thursdayLastWeek);
      end.setDate(thursdayLastWeek.getDate() + 6); // Rabu minggu ini
      end.setHours(23, 59, 59, 999);
      const diff = Math.ceil(
        (end.getTime() - thursdayLastWeek.getTime()) / (1000 * 60 * 60 * 24)
      ) + 1;
      return {
        startDate: thursdayLastWeek,
        endDate: end,
        renderDays: diff,
      };
    }
  })();

  useEffect(() => {
    const fetchStatus = async () => {
      // Ambil status dalam rentang startDate - endDate
      const { data, error } = await supabase
        .from('rfu_status')
        .select('status, reported_at, next_status_timestamp')
        .eq('unit_id', unit.unit_id)
        .gte('reported_at', startDate.toISOString())
        .lte('reported_at', endDate.toISOString())
        .order('reported_at', { ascending: true });

      if (error) {
        console.error(error);
        const defaultGrid: string[][] = Array.from({ length: renderDays }, () =>
          Array.from({ length: 24 }, () => 'RFU')
        );
        setGrid(defaultGrid);
        return;
      }

      const newGrid: string[][] = Array.from({ length: renderDays }, () =>
        Array.from({ length: 24 }, () => 'RFU')
      );

      // Fill grid
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const start = new Date(row.reported_at);
        const end = row.next_status_timestamp
          ? new Date(row.next_status_timestamp)
          : new Date();

        const effectiveStart = start < startDate ? startDate : start;
        const effectiveEnd = end > endDate ? endDate : end;

        let startDayIndex = Math.floor(
          (effectiveStart.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        const endDayIndex = Math.floor(
          (effectiveEnd.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (startDayIndex < 0) startDayIndex = 0;

        for (let d = startDayIndex; d <= endDayIndex; d++) {
          if (d >= renderDays) break;
          const hStart =
            d === startDayIndex ? effectiveStart.getHours() : 0;
          const hEnd =
            d === endDayIndex ? effectiveEnd.getHours() : 23;

          for (let h = hStart; h <= hEnd; h++) {
            newGrid[d][h] = row.status;
          }
        }
      }

      // tandai jam masa depan kalau mode monthly + bulan ini
      if (
        mode === 'monthly' &&
        Number(month.split('-')[0]) === currentYear &&
        Number(month.split('-')[1]) === currentMonth
      ) {
        for (let h = currentHour + 1; h < 24; h++) {
          if (currentDay - 1 >= 0 && currentDay - 1 < renderDays) {
            newGrid[currentDay - 1][h] = 'FUTURE';
          }
        }
      }

      setGrid(newGrid);
    };

    fetchStatus();
  }, [unit, month, mode, renderDays, startDate, endDate, currentHour, currentDay]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
  }, [renderDays]);

  return (
    <div className="mb-4 border rounded">
      <div
        className="flex justify-between items-center cursor-pointer bg-gray-100 p-2"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="font-bold">{unit.unit_id}</div>
        <div className="text-xs text-blue-600">
          {expanded ? '▼ Collapse' : '► Expand'}
        </div>
      </div>

      {expanded && (
        <div ref={scrollRef} className="overflow-x-auto">
          {/* Header tanggal */}
          <div
            className="grid gap-x-[4px] gap-y-[1px]"
            style={{ gridTemplateColumns: `80px repeat(${renderDays}, ${cellWidth}px)` }}
          >
            <div></div>
            {Array.from({ length: renderDays }, (_, d) => (
              <div key={d} className="text-center text-[10px] whitespace-nowrap">
                {new Date(startDate.getTime() + d * 86400000).getDate()}
              </div>
            ))}
          </div>

          {/* Grid jam */}
          {Array.from({ length: 24 }, (_, i) => {
            return (
              <div
                key={i}
                className="grid ml-2 gap-x-[4px] gap-y-[1px]"
                style={{ gridTemplateColumns: `80px repeat(${renderDays}, ${cellWidth}px)` }}
              >
                <div className="text-[10px] border-r whitespace-nowrap">
                  {i.toString().padStart(2, '0')}:00
                </div>
                {Array.from({ length: renderDays }, (_, d) => {
                  const status = grid[d]?.[i] || 'RFU';
                  const isCritical = criticalHours.includes(i);
                  return (
                    <div
                      key={d}
                      className={`h-5 rounded-sm ${
                        status === 'FUTURE'
                          ? 'bg-gray-300'
                          : statusColors[status]
                      } ${!isCritical ? 'opacity-30' : ''}`}
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
