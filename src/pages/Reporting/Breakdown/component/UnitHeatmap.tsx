import React, { useState, useEffect, useRef, useMemo } from 'react';
import { statusColors } from './statuscolor';
import { supabase } from '../../../../db/SupabaseClient';
import { criticalHours } from './criticalHours';

type UnitHeatmapProps = {
  unit: { unit_id: string };
  month: string; // YYYY-MM
  mode: 'monthly' | 'thisWeek' | 'lastWeek';
};

const UnitHeatmap: React.FC<UnitHeatmapProps> = ({ unit, month, mode }) => {
  const [expanded, setExpanded] = useState(true);
  const [allData, setAllData] = useState<any[]>([]); // hasil fetch bulanan
  const [tooltip, setTooltip] = useState<{ content: string; x: number; y: number } | null>(null);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const cellWidth = 22;

  // tanggal sekarang
  const today = useMemo(() => new Date(), []);
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;
  const currentDay = today.getDate();
  const currentHour = today.getHours();

  // range bulan penuh
  const monthStart = useMemo(() => {
    const [y, m] = month.split('-').map(Number);
    return new Date(y, m - 1, 1, 0, 0, 0);
  }, [month]);

  const monthEnd = useMemo(() => {
    const [y, m] = month.split('-').map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    return new Date(y, m - 1, daysInMonth, 23, 59, 59);
  }, [month]);

  // range untuk render
  const { startDate, endDate, renderDays } = useMemo(() => {
    if (mode === 'monthly') {
      const daysInMonth = new Date(
        Number(month.split('-')[0]),
        Number(month.split('-')[1]),
        0
      ).getDate();
      const rd =
        Number(month.split('-')[0]) === currentYear &&
        Number(month.split('-')[1]) === currentMonth
          ? currentDay
          : daysInMonth;
      return {
        startDate: monthStart,
        endDate: monthEnd,
        renderDays: rd,
      };
    }

    // minggu sekarang/lalu
    const now = new Date();
    const day = now.getDay();
    const thursdayOffset = day >= 4 ? day - 4 : 7 - (4 - day);
    const thursdayThisWeek = new Date(now);
    thursdayThisWeek.setDate(now.getDate() - thursdayOffset);
    thursdayThisWeek.setHours(0, 0, 0, 0);

    const thursdayLastWeek = new Date(thursdayThisWeek);
    thursdayLastWeek.setDate(thursdayThisWeek.getDate() - 7);

    if (mode === 'thisWeek') {
      const end = new Date(thursdayThisWeek);
      end.setDate(thursdayThisWeek.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      const diff =
        Math.ceil((end.getTime() - thursdayThisWeek.getTime()) / 86400000) + 1;
      return { startDate: thursdayThisWeek, endDate: end, renderDays: diff };
    } else {
      const end = new Date(thursdayLastWeek);
      end.setDate(thursdayLastWeek.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      const diff =
        Math.ceil((end.getTime() - thursdayLastWeek.getTime()) / 86400000) + 1;
      return { startDate: thursdayLastWeek, endDate: end, renderDays: diff };
    }
  }, [mode, month, currentYear, currentMonth, currentDay, monthStart, monthEnd]);

  // fetch data bulanan sekali
  useEffect(() => {
    const fetchStatus = async () => {
      const { data, error } = await supabase
        .from('rfu_status')
        .select('status, reported_at, next_status_timestamp, remark')
        .eq('unit_id', unit.unit_id)
        .gte('reported_at', monthStart.toISOString())
        .lte('reported_at', monthEnd.toISOString())
        .order('reported_at', { ascending: true });

      if (!error && data) {
        setAllData(data);
      } else {
        setAllData([]);
      }
    };

    fetchStatus();
  }, [unit.unit_id, monthStart, monthEnd]);

  // bangun grid sesuai mode dari data bulanan
  const grid = useMemo(() => {
    const newGrid: { status: string; remark: string | null }[][] =
      Array.from({ length: renderDays }, () =>
        Array.from({ length: 24 }, () => ({ status: 'RFU', remark: null }))
      );

    allData.forEach((row) => {
      const start = new Date(row.reported_at);
      const end = row.next_status_timestamp
        ? new Date(row.next_status_timestamp)
        : new Date();

      const effectiveStart = start < startDate ? startDate : start;
      const effectiveEnd = end > endDate ? endDate : end;

      let startDayIndex = Math.floor(
        (effectiveStart.getTime() - startDate.getTime()) / 86400000
      );
      const endDayIndex = Math.floor(
        (effectiveEnd.getTime() - startDate.getTime()) / 86400000
      );
      if (startDayIndex < 0) startDayIndex = 0;

      for (let d = startDayIndex; d <= endDayIndex; d++) {
        if (d >= renderDays) break;
        const hStart = d === startDayIndex ? effectiveStart.getHours() : 0;
        const hEnd = d === endDayIndex ? effectiveEnd.getHours() : 23;
        for (let h = hStart; h <= hEnd; h++) {
          newGrid[d][h] = { status: row.status, remark: row.remark };
        }
      }
    });

    if (
      mode === 'monthly' &&
      Number(month.split('-')[0]) === currentYear &&
      Number(month.split('-')[1]) === currentMonth
    ) {
      for (let h = currentHour + 1; h < 24; h++) {
        if (currentDay - 1 >= 0 && currentDay - 1 < renderDays) {
          newGrid[currentDay - 1][h] = { status: 'FUTURE', remark: null };
        }
      }
    }

    return newGrid;
  }, [
    allData,
    startDate,
    endDate,
    renderDays,
    mode,
    month,
    currentYear,
    currentMonth,
    currentDay,
    currentHour,
  ]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
  }, [renderDays]);

  const handleMouseMove = (
    e: React.MouseEvent,
    status: string,
    remark: string | null,
    date: Date
  ) => {
    if (status === 'BD' || status === 'PS') {
      const rect = containerRef.current?.getBoundingClientRect();
      const offsetX = rect ? e.clientX - rect.left : e.clientX;
      const offsetY = rect ? e.clientY - rect.top : e.clientY;
      const tooltipContent = `Unit: ${unit.unit_id}\nTanggal: ${date.toLocaleDateString()}\nRemark: ${
        remark || 'N/A'
      }`;
      setTooltip({
        content: tooltipContent,
        x: offsetX + 12,
        y: offsetY + 12,
      });
    } else {
      setTooltip(null);
    }
  };

  return (
    <div className="mb-4 border rounded relative" ref={containerRef}>
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
                {new Date(startDate.getTime() + d * 86400000).getDate()}
              </div>
            ))}
          </div>

          {/* Grid jam */}
          {Array.from({ length: 24 }, (_, i) => (
            <div
              key={i}
              className="grid ml-2 gap-x-[4px] gap-y-[1px]"
              style={{
                gridTemplateColumns: `80px repeat(${renderDays}, ${cellWidth}px)`,
              }}
            >
              <div className="text-[10px] border-r whitespace-nowrap">
                {i.toString().padStart(2, '0')}:00
              </div>
              {Array.from({ length: renderDays }, (_, d) => {
                const cellData = grid[d]?.[i];
                const status = cellData?.status || 'RFU';
                const remark = cellData?.remark || null;
                const isCritical = criticalHours.includes(i);
                const cellDate = new Date(startDate.getTime() + d * 86400000);

                const colorClass =
                  status === 'FUTURE'
                    ? 'bg-gray-300'
                    : statusColors[status] || 'bg-gray-200';

                return (
                  <div
                    key={d}
                    className={`h-5 rounded-sm cursor-pointer ${colorClass} ${
                      !isCritical ? 'opacity-30' : ''
                    }`}
                    style={{ width: cellWidth }}
                    onMouseMove={(e) =>
                      handleMouseMove(e, status, remark, cellDate)
                    }
                    onMouseLeave={() => setTooltip(null)}
                  />
                );
              })}
            </div>
          ))}
        </div>
      )}

      {tooltip && (
        <div
          className="absolute z-50 p-2 text-xs text-white bg-slate-500 rounded-lg shadow-lg pointer-events-none"
          style={{ top: tooltip.y, left: tooltip.x }}
        >
          {tooltip.content.split('\n').map((line, index) => (
            <div key={index}>{line}</div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UnitHeatmap;
