import React from 'react';
import Chart from 'react-apexcharts';
import DatePickerOne from '../../../../../components/Forms/DatePicker/DatePickerOne';

interface CombinedPanelProps {
  panelTitle: string;
  ritationQtyToday: string | number;
  ritationCount: string | number;
  data: any[]; // RitasiFuelData
  date: any;
  handleDateChange: (date: Date | null) => void;
  formatDateToString: (date: Date) => string;
  isLoading?: boolean;
}

const DailyRitationCombinedPanel: React.FC<CombinedPanelProps> = ({
  panelTitle,
  ritationQtyToday,
  ritationCount,
  data,
  date,
  handleDateChange,
  formatDateToString,
  isLoading
}) => {
  // Group data by unit and calculate frequency and total qty
  const unitSummary = data.reduce((acc: Record<string, { frequency: number; totalQty: number }>, item) => {
    const unit = item.unit || 'Unknown';
    if (acc[unit]) {
      acc[unit].frequency += 1;
      acc[unit].totalQty += item.qty_sj;
    } else {
      acc[unit] = { frequency: 1, totalQty: item.qty_sj };
    }
    return acc;
  }, {});

  const sortedUnits = Object.entries(unitSummary).sort((a, b) => b[1].totalQty - a[1].totalQty);

  const chartData = {
    series: Object.values(unitSummary).map(u => u.totalQty),
    options: {
      labels: Object.keys(unitSummary),
      chart: {
        type: 'donut' as const,
        fontFamily: 'Satoshi, sans-serif',
        dropShadow: {
            enabled: false
        }
      },
      colors: ['#6366f1', '#10b981', '#38bdf8', '#f59e0b', '#ef4444', '#8b5cf6'],
      stroke: {
        width: 0,
      },
      plotOptions: {
        pie: {
          donut: {
            size: '72%',
            labels: {
              show: true,
              total: {
                show: true,
                label: 'Unit Dist.',
                fontSize: '10px',
                fontWeight: 600,
                color: '#64748b',
                formatter: () => Object.keys(unitSummary).length.toString()
              },
              value: {
                fontSize: '16px',
                fontWeight: 800,
                color: '#1e293b',
                formatter: (val: string) => parseInt(val).toLocaleString('id-ID')
              }
            },
          },
        },
      },
      dataLabels: {
        enabled: false,
      },
      legend: {
        show: false
      },
      tooltip: {
        y: {
          formatter: (val: number) => `${val.toLocaleString('id-ID')} Liter`
        }
      },
      fill: {
        type: 'gradient',
      }
    },
  };

  return (
    <div className="backdrop-blur-md bg-white/40 dark:bg-black/20 rounded-xl border border-white/20 dark:border-white/5 shadow-lg p-5 transition-all duration-300 h-full flex flex-col">
        <div className="flex items-center justify-between pb-4">
          <h1 className="font-bold text-gray-700 dark:text-gray-300 text-sm tracking-tight">{panelTitle}</h1>
          <div className="w-[180px]">
             <DatePickerOne
                enabled={true}
                handleChange={handleDateChange}
                setValue={date ? formatDateToString(new Date(date)) : ''}
              />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-1 items-center">
          {/* Table Section */}
          <div className="self-stretch rounded-lg overflow-hidden border border-gray-100 dark:border-white/5 bg-gray-50/30 dark:bg-black/10">
            <table className="w-full h-full border-collapse">
              <thead>
                <tr className="bg-gray-100/80 dark:bg-white/5 border-b border-gray-200 dark:border-white/10">
                  <th className="text-[10px] font-black uppercase tracking-widest text-gray-500 py-2 px-3 text-left">Unit</th>
                  <th className="text-[10px] font-black uppercase tracking-widest text-gray-500 py-2 px-3 text-center">Freq</th>
                  <th className="text-[10px] font-black uppercase tracking-widest text-gray-500 py-2 px-3 text-right">Qty (L)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {sortedUnits.slice(0, 5).map(([unit, stats]) => (
                  <tr key={unit} className="group hover:bg-white/60 dark:hover:bg-white/5 transition-colors">
                    <td className="py-2 px-3 text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">{unit}</td>
                    <td className="py-2 px-3 text-xs font-bold text-gray-500 tabular-nums text-center">{stats.frequency}x</td>
                    <td className="py-2 px-3 text-xs font-black text-blue-600 dark:text-blue-400 tabular-nums text-right">{stats.totalQty.toLocaleString('id-ID')}</td>
                  </tr>
                ))}
                {/* Empty rows to maintain height if needed */}
                {Array.from({ length: Math.max(0, 5 - sortedUnits.length) }).map((_, i) => (
                  <tr key={`empty-${i}`} className="h-8">
                    <td colSpan={3}></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100/80 dark:bg-white/5 border-t border-gray-200 dark:border-white/10">
                  <td className="py-2 px-3 text-[10px] font-black text-gray-500 uppercase tracking-widest">Total</td>
                  <td className="py-2 px-3 text-xs font-black text-orange-600 dark:text-orange-400 text-center">{ritationCount}x</td>
                  <td className="py-2 px-3 text-xs font-black text-black dark:text-white text-right tabular-nums">{ritationQtyToday}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Chart Section */}
          <div className="flex justify-center items-center relative min-w-[180px]">
            <Chart options={chartData.options} series={chartData.series} type="donut" width="100%" height={260} />
            <div className="absolute -bottom-2 flex flex-wrap justify-center gap-x-3 gap-y-1">
                 {Object.keys(unitSummary).slice(0, 3).map((key, idx) => (
                     <div key={key} className="flex items-center gap-1.5">
                         <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: chartData.options.colors[idx] }} />
                         <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">{key}</span>
                     </div>
                 ))}
                 {Object.keys(unitSummary).length > 3 && (
                     <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">+{Object.keys(unitSummary).length - 3}</span>
                 )}
            </div>
          </div>
        </div>
    </div>
  );
};

export default DailyRitationCombinedPanel;
