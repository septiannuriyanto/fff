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
      // Fetch a wider range of data to handle statuses that started before this month.
      const start = `${month}-01T00:00:00`;
      const end = `${month}-${String(daysInMonth).padStart(2, '0')}T23:59:59`;

      const { data, error } = await supabase
        .from('rfu_status')
        .select('unit_id, status, reported_at, next_status_timestamp')
        .gte('reported_at', start)
        .lte('reported_at', end)
        .order('reported_at', { ascending: true });

      if (error) {
        console.error(error);
        return;
      }
      
      const result: { unit: string; readiness: number }[] = [];

      // Process each unit one by one
      for (const u of units) {
        // Filter data for the current unit and sort by reported_at to ensure correct order
        const unitData = data.filter((row: any) => row.unit_id === u.unit_id);
        
        // Initialize grid with 'RFU' for all hours.
        const grid: string[][] = Array.from({ length: renderDays }, () =>
          Array.from({ length: 24 }, () => 'RFU')
        );

        // Fill the grid based on the reported status intervals
        let lastStatus = 'RFU';
        let lastTimestamp = new Date(start);

        // Use the fetched data to correctly populate the grid for each hour
        unitData.forEach(row => {
          const startDate = new Date(row.reported_at);
          let endDate = row.next_status_timestamp ? new Date(row.next_status_timestamp) : new Date(end);

          // If this is the last entry in the data for the current month, extend its duration to the present time
          if (!row.next_status_timestamp && month.split('-')[0] === String(currentYear) && month.split('-')[1] === String(currentMonth).padStart(2, '0')) {
             endDate = new Date();
          }

          // Loop through each hour from the start to the end of this status interval
          const current = new Date(startDate);
          while (current < endDate) {
            const dayIndex = current.getDate() - 1;
            const hourIndex = current.getHours();

            if (dayIndex >= 0 && dayIndex < renderDays) {
              grid[dayIndex][hourIndex] = row.status;
            }
            current.setHours(current.getHours() + 1);
          }
        });
        
        // Mark future hours for today
        if (Number(month.split('-')[0]) === currentYear && Number(month.split('-')[1]) === currentMonth) {
          const dayIndex = currentDay - 1;
          if (dayIndex >= 0 && dayIndex < renderDays) {
            for (let h = currentHour + 1; h < 24; h++) {
              grid[dayIndex][h] = 'FUTURE';
            }
          }
        }

        // Calculate readiness based on the correctly populated grid
        let totalCriticalHours = 0;
        let rfuCount = 0;

        if (period === 'daily') {
          const dayIndex = currentDay - 1;
          criticalHours.forEach(h => {
            if (grid[dayIndex] && grid[dayIndex][h] && grid[dayIndex][h] !== 'FUTURE') {
              totalCriticalHours++;
              if (grid[dayIndex][h] === 'RFU') {
                rfuCount++;
              }
            }
          });
        }

        if (period === 'weekly') {
          const now = new Date();
          const dayOfWeek = now.getDay();
          const offset = (dayOfWeek - 4 + 7) % 7;
          let startDayIndex = currentDay - 1 - offset;
          
          if (startDayIndex < 0) startDayIndex = 0;
          
          for (let d = startDayIndex; d <= currentDay - 1; d++) {
            criticalHours.forEach(h => {
              if (grid[d] && grid[d][h] && grid[d][h] !== 'FUTURE') {
                totalCriticalHours++;
                if (grid[d][h] === 'RFU') {
                  rfuCount++;
                }
              }
            });
          }
        }

        if (period === 'monthly') {
          for (let d = 0; d < renderDays; d++) {
            criticalHours.forEach(h => {
              if (grid[d] && grid[d][h] && grid[d][h] !== 'FUTURE') {
                totalCriticalHours++;
                if (grid[d][h] === 'RFU') {
                  rfuCount++;
                }
              }
            });
          }
        }
        
        const readiness = totalCriticalHours === 0 ? 0 : (rfuCount / totalCriticalHours) * 100;
        result.push({
          unit: u.unit_id,
          readiness: Number(readiness.toFixed(1)),
        });
      }

      setReadinessData(result);
    };

    fetchAll();
  }, [units, month, period, renderDays, daysInMonth, currentDay, currentHour, currentMonth, currentYear]);

  const categories = readinessData.map((r) => r.unit);
  const seriesData = readinessData.map((r) => r.readiness);

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
        // Baris ini yang perlu ditambahkan
        labels: {
            formatter: (val: number) => {
                return val.toFixed(1); // Bulatkan ke 1 angka di belakang koma
            },
        },
    },
}}
      />
    </div>
  );
};

export default ReadinessSummaryChart;