import React, { useEffect, useState, useRef } from 'react';
import ReactApexChart from 'react-apexcharts';
import { supabase } from '../../../db/SupabaseClient';
import { format } from 'date-fns';
import { ApexOptions } from 'apexcharts';

interface Props {
  selectedDate: Date | null;
  selectedWarehouse: string | null;
  onSelectWarehouse: (w: string | null) => void;
}

interface WarehouseStats {
  warehouse_code: string;
  total_loto: number;
  total_verification: number;
  percentage: number | string;
  shift1?: { loto: number; plan: number; pct: number };
  shift2?: { loto: number; plan: number; pct: number };
}

interface HistoryItem {
  date: string;
  shift: number;
  percentage: number;
}

const LotoAchievementByWarehouse: React.FC<Props> = ({ selectedDate, selectedWarehouse, onSelectWarehouse }) => {
  const [data, setData] = useState<WarehouseStats[]>([]);
  const [historyData, setHistoryData] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Click Outside to reset selected warehouse
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        if(selectedWarehouse) onSelectWarehouse(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [selectedWarehouse, onSelectWarehouse]);

  // Fetch Achievement Data
  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  // Fetch History when warehouse selected
  useEffect(() => {
    if (selectedWarehouse) {
      fetchHistory(selectedWarehouse);
    } else {
        setHistoryData([]);
    }
  }, [selectedWarehouse]);

  const fetchData = async () => {
    setLoading(true);

    try {
        if (selectedDate) {
            // DAILY VIEW WITH SHIFT BREAKDOWN
            const { data: raw, error } = await supabase.rpc('get_loto_warehouse_daily_achievement_by_shift', { 
                target_date: format(selectedDate, 'yyyy-MM-dd') 
            });
            
            if (error) throw error;

            // Process raw rows (w, s, loto, verif, pct) into aggregated view
            const processedMap = new Map<string, WarehouseStats>();

            (raw || []).forEach((r: any) => {
                const existing = processedMap.get(r.warehouse_code) || {
                    warehouse_code: r.warehouse_code,
                    total_loto: 0,
                    total_verification: 0,
                    percentage: 0,
                    shift1: { loto: 0, plan: 0, pct: 0 },
                    shift2: { loto: 0, plan: 0, pct: 0 }
                };

                // Add to Aggregates
                existing.total_loto += r.total_loto;
                existing.total_verification += r.total_verification;

                // Set Shift Data
                const sData = { 
                    loto: r.total_loto, 
                    plan: r.total_verification, 
                    pct: parseFloat(r.percentage) 
                };

                if (r.shift === 1) existing.shift1 = sData;
                else if (r.shift === 2) existing.shift2 = sData;

                processedMap.set(r.warehouse_code, existing);
            });

            // Recalculate Total Percentage
            const finalData = Array.from(processedMap.values()).map(item => {
                const pct = item.total_verification > 0 
                    ? (item.total_loto / item.total_verification) * 100 
                    : 0;
                return { ...item, percentage: pct.toFixed(2) };
            });

            setData(finalData);

        } else {
            // 30 DAY AVG VIEW (Keep existing simple RPC for now, or assume shift 1/2 avg is too complex to display currently?)
            // For now, we use the original RPC which gives totals only.
            const { data: raw, error } = await supabase.rpc('get_loto_achievement_warehouse', { days_back: 30 });
            if (error) throw error;
            
            // Map simple RPC result to WarehouseStats structure
            const simpleData = (raw || []).map((r: any) => ({
                warehouse_code: r.warehouse_code,
                total_loto: r.total_loto,
                total_verification: r.total_verification,
                percentage: r.percentage
                // No shift breakdowns available in this view yet
            }));
            
            setData(simpleData);
        }
    } catch (e) {
        console.error("Fetch Error:", e);
    } finally {
        setLoading(false);
    }
  };

  const fetchHistory = async (warehouse: string) => {
    const { data: result, error } = await supabase
        .rpc('get_loto_warehouse_history_by_shift', { 
            target_warehouse: warehouse, 
            days_back: 30 
        });
    
    if (error) {
        console.error('Error fetching history', error);
    } else {
        setHistoryData(result || []);
    }
  };

  const renderMiniChart = () => {
      if (!historyData.length) return null;

      // Extract unique dates for X-axis
      const dates = Array.from(new Set(historyData.map(d => d.date)));
      
      const s1Series = dates.map(date => {
        const item = historyData.find(d => d.date === date && d.shift === 1);
        return { x: date, y: item ? item.percentage : null }; // Use null for gap or 0?
      });

      const s2Series = dates.map(date => {
        const item = historyData.find(d => d.date === date && d.shift === 2);
        return { x: date, y: item ? item.percentage : null };
      });

      const chartOptions: ApexOptions = {
          chart: { 
              type: 'bar', 
              height: 120, 
              toolbar: { show: false },
              zoom: { enabled: false },
              sparkline: { enabled: false } 
          },
          plotOptions: {
              bar: {
                  horizontal: false,
                  columnWidth: '60%',
                  borderRadius: 2
              },
          },
          dataLabels: { enabled: false },
          stroke: { show: true, width: 2, colors: ['transparent'] },
          colors: ['#008FFB', '#775DD0'], // Blue for S1, Purple for S2
          grid: {
              show: true,
              borderColor: '#f3f4f6', 
              strokeDashArray: 3,
              padding: { top: 10, right: 10, bottom: 0, left: 10 }
          },
          xaxis: {
              type: 'datetime',
              labels: { 
                  show: true, 
                  format: 'dd', 
                  style: { fontSize: '10px', colors: '#9ca3af' }
              },
              axisBorder: { show: false },
              axisTicks: { show: false },
              tooltip: { enabled: false }
          },
          yaxis: {
              show: true,
              labels: { 
                  style: { fontSize: '10px', colors: '#9ca3af' },
                  formatter: (val) => val.toFixed(0)
              }
          },
          tooltip: {
              x: { format: 'dd MMM yyyy' },
              y: { 
                  formatter: (val) => typeof val !== 'undefined' ? val.toFixed(1) + '%' : '-'
              }
          },
          legend: { show: true, fontSize: '10px' }
      };
      
      const series = [
        { name: 'Shift 1', data: s1Series },
        { name: 'Shift 2', data: s2Series }
      ];

      return (
          <div className="w-full">
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 pl-2 border-l-2 border-primary">
                  Shift History (30 Days)
              </div>
              <ReactApexChart options={chartOptions} series={series} type="bar" height={130} />
          </div>
      );
  };

  // ------------------------------------
  // Render Gauge Item
  // ------------------------------------
  const renderGauge = (item: WarehouseStats) => {
      const isSelected = selectedWarehouse === item.warehouse_code;
      const pct = typeof item.percentage === 'string' ? parseFloat(item.percentage) : item.percentage;

      // Gradient Colors & Text Color
      let gradientColors = ['#22c55e', '#86efac']; // Green
      let textColor = '#22c55e';

      if (pct < 70) {
          gradientColors = ['#ef4444', '#fca5a5']; // Red
          textColor = '#ef4444';
      } else if (pct < 90) {
          gradientColors = ['#f59e0b', '#fcd34d']; // Amber (was Orange)
          textColor = '#f59e0b';
      }

      const radialOptions: ApexOptions = {
          chart: { type: 'radialBar', height: 160, sparkline: { enabled: true } },
          plotOptions: {
            radialBar: {
              startAngle: -135,
              endAngle: 135,
              hollow: { margin: 15, size: '60%' },
              track: { background: '#f3f4f6', strokeWidth: '100%' }, // Could adjust for dark mode
              dataLabels: {
                show: true,
                name: { offsetY: 30, show: true, color: '#9ca3af', fontSize: '10px', fontWeight: 500 },
                value: { offsetY: -8, color: textColor, fontSize: '16px', show: true, fontWeight: 'bold' }
              }
            }
          },
          stroke: { lineCap: 'round', dashArray: 0 },
          fill: { 
            type: 'gradient',
            gradient: {
                shade: 'light',
                type: 'horizontal',
                shadeIntensity: 0.5,
                gradientToColors: [gradientColors[1]], 
                inverseColors: true,
                opacityFrom: 1,
                opacityTo: 1,
                stops: [0, 100]
            }
          },
          colors: [gradientColors[0]],
          labels: [item.warehouse_code]
      };

      return (
        <div key={item.warehouse_code} className={`
             relative bg-white dark:bg-boxdark rounded-xl border transition-all duration-300 overflow-hidden
             ${isSelected ? 'col-span-2 row-span-1 ring-1 ring-blue-500 shadow-lg z-10' : 'col-span-1 shadow-sm hover:shadow border-gray-100 dark:border-strokedark'}
        `}>
             <div 
                onClick={(e) => {
                    e.stopPropagation(); 
                    if (!isSelected) {
                        onSelectWarehouse(item.warehouse_code);
                    } else {
                        onSelectWarehouse(null);
                    }
                }}
                className="p-3 flex flex-col items-center cursor-pointer h-full"
             >
                {/* Gauge Area */}
                <div className={`flex w-full ${isSelected ? 'items-start justify-between' : 'items-center justify-center'}`}>
                    <div className="relative pointer-events-none flex-shrink-0">
                         <ReactApexChart key={item.warehouse_code + pct} options={radialOptions} series={[pct]} type="radialBar" height={140} width={140} />
                    </div>

                     {/* Breakdown Grid (Shown only when expanded) */}
                     {isSelected && item.shift1 && item.shift2 ? (
                         <div className="flex-grow px-2 self-center">
                            <table className="w-full text-xs text-center border-collapse">
                                <thead>
                                    <tr className="text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-gray-700">
                                        <th className="pb-1 font-medium text-left">Metric</th>
                                        <th className="pb-1 font-medium text-blue-500">S1</th>
                                        <th className="pb-1 font-medium text-purple-500">S2</th>
                                    </tr>
                                </thead>
                                <tbody className="text-gray-700 dark:text-gray-300">
                                    <tr className="border-b border-gray-50 dark:border-gray-800">
                                        <td className="py-1.5 text-left font-semibold text-gray-500">LOTO</td>
                                        <td className="py-1.5 font-bold">{item.shift1?.loto || 0}</td>
                                        <td className="py-1.5 font-bold">{item.shift2?.loto || 0}</td>
                                    </tr>
                                    <tr className="border-b border-gray-50 dark:border-gray-800">
                                        <td className="py-1.5 text-left font-semibold text-gray-500">PLAN</td>
                                        <td className="py-1.5 font-bold">{item.shift1?.plan || 0}</td>
                                        <td className="py-1.5 font-bold">{item.shift2?.plan || 0}</td>
                                    </tr>
                                    <tr>
                                        <td className="py-1.5 text-left font-semibold text-gray-500">ACHV</td>
                                        <td className={`py-1.5 font-bold ${(item.shift1?.pct || 0) >= 100 ? 'text-green-500' : 'text-amber-500'}`}>
                                            {(item.shift1?.pct || 0).toFixed(0)}%
                                        </td>
                                        <td className={`py-1.5 font-bold ${(item.shift2?.pct || 0) >= 100 ? 'text-green-500' : 'text-amber-500'}`}>
                                            {(item.shift2?.pct || 0).toFixed(0)}%
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                         </div>
                     ) : isSelected && (
                        <div className="flex flex-col gap-2 mt-4 text-xs text-gray-500 flex-grow px-4">
                              <div className="flex justify-between items-center border-b pb-1">
                                  <span className="text-gray-400 font-medium">LOTO</span>
                                  <span className="text-sm font-bold text-gray-700">{item.total_loto}</span>
                              </div>
                              <div className="flex justify-between items-center border-b pb-1">
                                  <span className="text-gray-400 font-medium">PLAN</span>
                                  <span className="text-sm font-bold text-gray-700">{item.total_verification}</span>
                              </div>
                          </div>
                     )}
                </div>

                {/* Mini Chart Injection */}
                {isSelected && (
                    <div className="w-full mt-2 pt-2 border-t border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in-95 duration-300">
                         {renderMiniChart()}
                    </div>
                )}
             </div>
        </div>
      );
  };

  return (
    <div ref={wrapperRef} className="w-full bg-white dark:bg-boxdark rounded-xl shadow-sm border border-bodydark p-6">
      <div className="mb-6 flex flex-col md:flex-row justify-between md:items-end gap-2">
          <div>
            <h3 className="text-lg font-bold text-black dark:text-white">Warehouse Performance</h3>
            <p className="text-xs text-gray-500">
                {selectedDate 
                    ? `Achievement for ${format(selectedDate, 'dd MMM yyyy')}` 
                    : 'Average Achievement (Last 30 Days)'
                }
            </p>
          </div>
          {selectedWarehouse && (
               <button 
                  onClick={() => onSelectWarehouse(null)} 
                  className="text-xs text-red-500 hover:text-red-700 underline"
               >
                   Close Details
               </button>
          )}
      </div>

      <div className="relative min-h-[200px]">
          {loading && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/50 dark:bg-black/50 backdrop-blur-[1px] rounded-xl transition-all duration-300">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          )}
          
          <div className={`grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 transition-opacity duration-300 ${loading ? 'opacity-40' : 'opacity-100'}`}>
                {data.length > 0 ? data.map(renderGauge) : (
                    !loading && <div className="col-span-full text-center py-8 text-gray-400 text-sm">No data available</div>
                )}
          </div>
      </div>
    </div>
  )
}

export default LotoAchievementByWarehouse;