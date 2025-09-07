import React, { useEffect, useState } from 'react';
import { supabase } from '../../../../db/SupabaseClient';
import Chart from 'react-apexcharts';
import { readinessTarget } from './criticalHours';

interface Unit {
  unit_id: string;
}

interface Props {
  units: Unit[];
  month: string; // format YYYY-MM
}

const criticalHours = [6, 7, 8, 12, 18, 19, 20, 0];

const ReadinessSummaryChart: React.FC<Props> = ({ units, month }) => {
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [readinessData, setReadinessData] = useState<
    { unit: string; readiness: number }[]
  >([]);

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;
  const currentDay = today.getDate();
  const currentHour = today.getHours();

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
    const fetchAll = async () => {
      const start = `${month}-01`;
      const end = `${month}-${String(daysInMonth).padStart(2, '0')}`;

      const { data, error } = await supabase
        .from('rfu_status')
        .select('unit_id,status,reported_at')
        .gte('reported_at', start)
        .lte('reported_at', end);

      if (error) {
        console.error(error);
        return;
      }

      const result: { unit: string; readiness: number }[] = [];

      for (const u of units) {
        const rows = (data || []).filter((r: any) => r.unit_id === u.unit_id);

        // buat grid hari x jam
        const grid: string[][] = Array.from({ length: renderDays }, (_, d) =>
          Array.from({ length: 24 }, (_, h) => {
            if (
              Number(month.split('-')[0]) === currentYear &&
              Number(month.split('-')[1]) === currentMonth &&
              (d > currentDay - 1 || (d === currentDay - 1 && h > currentHour))
            ) {
              return 'FUTURE';
            }
            return 'RFU';
          })
        );

        // isi grid dengan data yang ada
        rows.forEach((row: any) => {
          const date = new Date(row.reported_at);
          const dayIndex = date.getDate() - 1;
          const hourIndex = date.getHours();
          if (dayIndex >= 0 && dayIndex < renderDays) {
            grid[dayIndex][hourIndex] = row.status;
          }
        });

        // propagasi status dari hari ke hari
        let lastStatus = 'RFU';
        for (let d = 0; d < renderDays; d++) {
          for (let h = 0; h < 24; h++) {
            if (grid[d][h] === 'FUTURE') continue;
            if (grid[d][h] !== 'RFU') {
              lastStatus = grid[d][h];
            } else {
              grid[d][h] = lastStatus;
            }
          }
        }

        // HITUNG readiness
        let total = 0;
        let rfuCount = 0;

        if (period === 'daily') {
          const d = currentDay - 1;
          criticalHours.forEach((h) => {
            if (h <= currentHour && grid[d] && grid[d][h] !== 'FUTURE') {
              total++;
              if (grid[d][h] === 'RFU') rfuCount++;
            }
          });
        }

        if (period === 'weekly') {
          // Kamis–Rabu
          const now = new Date();
          const dayOfWeek = now.getDay(); // 0: Sunday, 4: Thursday
          const offset = (dayOfWeek - 4 + 7) % 7;
          let startDayIndex = currentDay - 1 - offset; // Kamis
          if (startDayIndex < 0) startDayIndex = 0;
          const endDayIndex = Math.min(renderDays - 1, startDayIndex + 6); // sampai Rabu

          for (let d = startDayIndex; d <= endDayIndex; d++) {
            criticalHours.forEach((h) => {
              if (d === currentDay - 1 && h > currentHour) return;
              if (grid[d] && grid[d][h] !== 'FUTURE') {
                total++;
                if (grid[d][h] === 'RFU') rfuCount++;
              }
            });
          }
        }

        if (period === 'monthly') {
          for (let d = 0; d < renderDays; d++) {
            criticalHours.forEach((h) => {
              if (d === currentDay - 1 && h > currentHour) return;
              if (grid[d] && grid[d][h] !== 'FUTURE') {
                total++;
                if (grid[d][h] === 'RFU') rfuCount++;
              }
            });
          }
        }

        result.push({
          unit: u.unit_id,
          readiness: total === 0 ? 0 : (rfuCount / total) * 100,
        });
      }

      setReadinessData(result);
    };

    fetchAll();
  }, [units, month, period, renderDays, daysInMonth, currentDay, currentHour]);

  const categories = readinessData.map((r) => r.unit);
  const seriesData = readinessData.map((r) => Number(r.readiness.toFixed(1)));

  const barColors = seriesData.map((val) =>
    val >= readinessTarget ? '#22c55e' : '#ef4444'
  );

  return (
    <div className="border rounded p-4">
      <div className="flex justify-between items-center mb-2">
        <div className="font-bold">Summary Readiness</div>

        <select
          className="border rounded px-2 py-1 text-sm"
          value={period}
          onChange={(e) =>
            setPeriod(e.target.value as 'daily' | 'weekly' | 'monthly')
          }
        >
          <option value="daily">Daily</option>
          <option value="weekly">Weekly (Kamis–Rabu)</option>
          <option value="monthly">Monthly</option>
        </select>
      </div>

      <Chart
        type="bar"
        height={300}
        series={[
          {
            name: 'Readiness %',
            data: seriesData,
          },
        ]}
        options={{
          chart: { toolbar: { show: false } },
          plotOptions: {
            bar: {
              distributed: true,
              columnWidth: '50%',
            },
          },
          colors: barColors,
          dataLabels: {
            enabled: true,
            formatter: (val: any) => `${val}%`,
          },
          xaxis: {
            categories,
            title: { text: 'Unit' },
          },
          yaxis: {
            max: 100,
            title: { text: 'Readiness (%)' },
          },
        }}
      />
    </div>
  );
};

export default ReadinessSummaryChart;
