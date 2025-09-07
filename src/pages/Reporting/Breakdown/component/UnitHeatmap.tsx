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

  // jam pertama yang mau ditampilkan
  const startHour = 0; // ubah ke 6 kalau mau mulai 06:00

  const daysInMonth = new Date(
    Number(month.split('-')[0]),
    Number(month.split('-')[1]),
    0
  ).getDate();

  const renderDays =
    Number(month.split('-')[0]) === currentYear &&
    Number(month.split('-')[1]) === currentMonth
      ? currentDay
      : daysInMonth;


  useEffect(() => {
    const fetchStatus = async () => {
      // default semua RFU / FUTURE
      const defaultGrid: string[][] = Array.from({ length: renderDays }, (_, d) =>
        Array.from({ length: 24 }, (_, h) => {
          // jam-jam FUTURE
          if (
            Number(month.split('-')[0]) === currentYear &&
            Number(month.split('-')[1]) === currentMonth &&
            (d > currentDay - 1 || (d === currentDay - 1 && h > currentHour))
          ) {
            return 'FUTURE'; // abu-abu
          }
          return 'RFU';
        })
      );

      // ambil data Supabase
      const start = `${month}-01`;
      const end = `${month}-${String(daysInMonth).padStart(2, '0')}`;

      const { data, error } = await supabase
        .from('rfu_status')
        .select('status, reported_at')
        .eq('unit_id', unit.unit_id)
        .gte('reported_at', start)
        .lte('reported_at', end)
        .order('reported_at', { ascending: true });

      if (error) {
        console.error(error);
        setGrid(defaultGrid);
        return;
      }

      // plotkan status sesuai data Supabase
      data.forEach((row) => {
        const date = new Date(row.reported_at);
        const dayIndex = date.getDate() - 1;
        const hourIndex = date.getHours();
        if (dayIndex < renderDays) {
          defaultGrid[dayIndex][hourIndex] = row.status;
        }
      });

      // propagate status terakhir (misal BD) sampai status baru / FUTURE
      for (let d = 0; d < renderDays; d++) {
        let lastStatus = 'RFU';
        for (let h = 0; h < 24; h++) {
          if (defaultGrid[d][h] === 'FUTURE') {
            // skip jam FUTURE
            continue;
          }
          if (defaultGrid[d][h] !== 'RFU') {
            lastStatus = defaultGrid[d][h];
          } else {
            // RFU → ambil status sebelumnya
            defaultGrid[d][h] = lastStatus;
          }
        }
      }

      setGrid(defaultGrid);
    };

    fetchStatus();
  }, [unit, month, renderDays, daysInMonth, currentHour]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
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
          {/* header hari */}
          <div
            className="grid gap-x-[4px] gap-y-[1px]"
            style={{
              gridTemplateColumns: `80px repeat(${renderDays}, ${cellWidth}px)`,
            }}
          >
            <div></div>
            {Array.from({ length: renderDays }, (_, d) => (
              <div
                key={d}
                className="text-center text-[10px] whitespace-nowrap"
              >
                {d + 1}
              </div>
            ))}
          </div>

          {/* grid jam */}
          {Array.from({ length: 24 }, (_, i) => {
            // urutan jam mulai startHour (misal 6–23, lalu 0–5)
            const h = (i + startHour) % 24;
            return (
              <div
                key={h}
                className="grid ml-2 gap-x-[4px] gap-y-[1px]"
                style={{
                  gridTemplateColumns: `80px repeat(${renderDays}, ${cellWidth}px)`,
                }}
              >
                <div className="text-[10px] border-r whitespace-nowrap">
                  {h.toString().padStart(2, '0')}:00
                </div>
                {Array.from({ length: renderDays }, (_, d) => {
                  const status = grid[d]?.[h] || 'RFU';
                  // cek apakah jam ini kritis
                  const isCritical = criticalHours.includes(h);
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
