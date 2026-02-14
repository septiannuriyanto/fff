import React, { useMemo, memo, useState } from 'react';
import Chart from 'react-apexcharts';
import { formatNumberWithSeparator } from '../../../../Utils/NumberUtility';

interface CardPanelProps {
  data: RitasiFuelData[];
  viewMode: 'day' | 'month';
}

type SortField = 'unit' | 'frequency' | 'totalQty' | 'avgQty' | 'freqPercent' | 'qtyPercent';
type SortOrder = 'asc' | 'desc';

const RitationSubtotalByFTChart: React.FC<CardPanelProps> = ({ data, viewMode }) => {
  const [sortConfig, setSortConfig] = useState<{ field: SortField, order: SortOrder }>({
    field: 'totalQty',
    order: 'desc'
  });

  // Group data by unit: count frequency and sum qty_sj
  const unitArray = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    // Detect if data is already aggregated (from RPC)
    const firstItem = data[0] as any;
    const isAggregated = firstItem && 'frequency' in firstItem && 'qty_sj' in firstItem;

    let preProcessed;
    if (isAggregated) {
      preProcessed = data.map((item: any) => ({
        unit: item.unit || 'Unknown',
        frequency: Number(item.frequency) || 0,
        totalQty: Number(item.qty_sj) || 0,
      }));
    } else {
      // Raw records (daily view)
      const unitStats = data.reduce((acc: Record<string, { frequency: number; totalQty: number }>, item) => {
        const unitName = item.unit || 'Unknown';
        const qtyVal = Number(item.qty_sj) || 0;
        
        if (acc[unitName]) {
          acc[unitName].frequency += 1;
          acc[unitName].totalQty += qtyVal;
        } else {
          acc[unitName] = { frequency: 1, totalQty: qtyVal };
        }
        return acc;
      }, {});

      preProcessed = Object.entries(unitStats).map(([unit, stats]) => ({
        unit,
        ...stats
      }));
    }

    // Calculate Grand Totals for Percentages
    const totalF = preProcessed.reduce((s, i) => s + i.frequency, 0);
    const totalQ = preProcessed.reduce((s, i) => s + i.totalQty, 0);

    return preProcessed.map(item => ({
      ...item,
      avgQty: item.frequency > 0 ? item.totalQty / item.frequency : 0,
      freqPercent: totalF > 0 ? (item.frequency / totalF) * 100 : 0,
      qtyPercent: totalQ > 0 ? (item.totalQty / totalQ) * 100 : 0
    })).sort((a: any, b: any) => {
      const { field, order } = sortConfig;
      const valA = a[field];
      const valB = b[field];
      if (valA < valB) return order === 'asc' ? -1 : 1;
      if (valA > valB) return order === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortConfig]);

  // Calculate totals
  const totalFrequency = useMemo(() => unitArray.reduce((sum, item) => sum + item.frequency, 0), [unitArray]);
  const totalQty = useMemo(() => unitArray.reduce((sum, item) => sum + item.totalQty, 0), [unitArray]);

  const handleSort = (field: SortField) => {
    setSortConfig(prev => ({
      field,
      order: prev.field === field && prev.order === 'desc' ? 'asc' : 'desc'
    }));
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortConfig.field !== field) return <span className="ml-1 opacity-20">⇅</span>;
    return <span className="ml-1 text-blue-500">{sortConfig.order === 'asc' ? '↑' : '↓'}</span>;
  };

  const chartData = useMemo(() => ({
    series: unitArray.map(item => item.totalQty),
    options: {
      labels: unitArray.map(item => item.unit),
      chart: {
        type: 'donut' as const,
        fontFamily: 'Satoshi, sans-serif',
      },
      colors: ['#6366f1', '#10b981', '#38bdf8', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'],
      stroke: {
        show: true,
        width: 2,
        colors: ['transparent']
      },
      plotOptions: {
        pie: {
          donut: {
            size: '65%',
            labels: {
              show: true,
              total: {
                show: true,
                label: 'Total Qty',
                fontSize: '12px',
                fontWeight: 600,
                color: '#64748b',
                formatter: () => formatNumberWithSeparator(totalQty)
              },
              value: {
                fontSize: '18px',
                fontWeight: 700,
                color: '#1e293b',
              }
            },
          },
        },
      },
      dataLabels: {
        enabled: false,
      },
      legend: {
        position: 'bottom' as const,
        fontSize: '11px',
        fontWeight: 500,
        markers: {
          width: 8,
          height: 8,
          radius: 12,
        },
        itemMargin: {
          horizontal: 5,
          vertical: 2
        }
      },
      tooltip: {
        y: {
          formatter: (val: number) => `${formatNumberWithSeparator(val)} L`
        }
      },
    },
  }), [unitArray, totalQty]);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <h4 className="font-bold text-gray-700 dark:text-gray-300 text-sm tracking-tight">Trip By Fuel Truck Number</h4>
        <div className="flex items-center gap-2">
           <span className="text-[10px] font-black bg-blue-50 dark:bg-blue-900/30 text-blue-600 px-2 py-0.5 rounded uppercase tracking-widest">{viewMode} View</span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <div className="flex flex-col items-center justify-center bg-gray-50/30 dark:bg-white/5 rounded-2xl p-4 border border-gray-100 dark:border-white/5">
          <Chart options={chartData.options} series={chartData.series} type="donut" width="100%" height={280} />
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-white/10">
                <th 
                  className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-blue-500 transition-colors"
                  onClick={() => handleSort('unit')}
                >
                  Unit <SortIcon field="unit" />
                </th>
                <th 
                  className="px-4 py-3 text-center text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-blue-500 transition-colors"
                  onClick={() => handleSort('frequency')}
                >
                  Freq <SortIcon field="frequency" />
                </th>
                <th 
                  className="px-4 py-3 text-center text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-blue-500 transition-colors"
                  onClick={() => handleSort('freqPercent')}
                >
                  Freq % <SortIcon field="freqPercent" />
                </th>
                <th 
                  className="px-4 py-3 text-right text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-blue-500 transition-colors"
                  onClick={() => handleSort('totalQty')}
                >
                  Total Qty (L) <SortIcon field="totalQty" />
                </th>
                <th 
                  className="px-4 py-3 text-right text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-blue-500 transition-colors"
                  onClick={() => handleSort('qtyPercent')}
                >
                  Qty % <SortIcon field="qtyPercent" />
                </th>
                {viewMode === 'month' && (
                  <th 
                    className="px-4 py-3 text-right text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-blue-500 transition-colors"
                    onClick={() => handleSort('avgQty')}
                  >
                    Avg/Trip (L) <SortIcon field="avgQty" />
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
              {unitArray.map((item, idx) => (
                <tr key={idx} className="hover:bg-white/30 dark:hover:bg-white/5 transition-colors group">
                  <td className="px-4 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300 group-hover:text-blue-500">{item.unit}</td>
                  <td className="px-4 py-3 text-center text-sm font-medium text-gray-600 dark:text-gray-400">{item.frequency}</td>
                  <td className="px-4 py-3 text-center text-[11px] font-bold text-gray-400">
                    {item.freqPercent.toFixed(1)}%
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-bold text-blue-600 dark:text-blue-400">
                    {formatNumberWithSeparator(item.totalQty)}
                  </td>
                  <td className="px-4 py-3 text-right text-[11px] font-bold text-gray-400">
                    {item.qtyPercent.toFixed(1)}%
                  </td>
                  {viewMode === 'month' && (
                    <td className="px-4 py-3 text-right text-sm font-bold text-emerald-600 dark:text-emerald-400">
                      {formatNumberWithSeparator(Math.round(item.avgQty))}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-300 dark:border-white/20 bg-gray-50/50 dark:bg-white/5">
                <td className="px-4 py-3 text-sm font-bold text-gray-800 dark:text-gray-200 uppercase tracking-tighter">Total</td>
                <td className="px-4 py-3 text-center text-sm font-bold text-gray-800 dark:text-gray-200">{totalFrequency}</td>
                <td className="px-4 py-3 text-center text-xs font-bold text-gray-400 bg-gray-100/30">100%</td>
                <td className="px-4 py-3 text-right text-sm font-bold text-blue-700 dark:text-blue-100 bg-blue-600/10">
                  {formatNumberWithSeparator(totalQty)}
                </td>
                <td className="px-4 py-3 text-right text-xs font-bold text-gray-400 bg-gray-100/30">100%</td>
                {viewMode === 'month' && (
                  <td className="px-4 py-3 text-right text-sm font-bold text-emerald-700 dark:text-emerald-100 bg-emerald-600/10 rounded-br-xl">
                    {formatNumberWithSeparator(Math.round(totalQty / (totalFrequency || 1)))}
                  </td>
                )}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};

export default memo(RitationSubtotalByFTChart);
