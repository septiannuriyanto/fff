import React, { useEffect, useState, useRef } from 'react';
import ReactApexChart from 'react-apexcharts';
import { supabase } from '../../../db/SupabaseClient';
import { format } from 'date-fns';
import { ApexOptions } from 'apexcharts';
import LotoVerificationDialog from '../../../common/LotoVerificationDialog';

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
  const [historyDataMap, setHistoryDataMap] = useState<Record<string, HistoryItem[]>>({});
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'overview' | 'detail' | 'table'>('overview');
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

  // Auto switch to detail on date select
  useEffect(() => {
    if (selectedDate) {
        setViewMode('detail');
    }
  }, [selectedDate]);

  // Fetch History logic
  useEffect(() => {
    // If Detail Mode, fetch for ALL
    if (viewMode === 'detail' && data.length > 0) {
        data.forEach(item => {
            if (!historyDataMap[item.warehouse_code]) {
                fetchHistory(item.warehouse_code);
            }
        });
    }
    // If Overview Mode but one is selected, fetch for that one
    else if (viewMode === 'overview' && selectedWarehouse) {
        if (!historyDataMap[selectedWarehouse]) {
            fetchHistory(selectedWarehouse);
        }
    }
  }, [viewMode, data, selectedWarehouse, historyDataMap]);

  const fetchData = async () => {
    setLoading(true);

    try {
        let rawData;
        
        if (selectedDate) {
             const { data, error } = await supabase.rpc('get_loto_warehouse_daily_achievement_by_shift', { 
                target_date: format(selectedDate, 'yyyy-MM-dd') 
            });
            if (error) throw error;
            rawData = data;
        } else {
            // Use the NEW derived 'by shift' RPC for 30 days as well
            const { data, error } = await supabase.rpc('get_loto_achievement_warehouse_by_shift', { days_back: 30 });
            if (error) throw error;
            rawData = data;
        }

        // Common Processing Logic
        const processedMap = new Map<string, WarehouseStats>();

        (rawData || []).forEach((r: any) => {
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

            const sData = { 
                loto: r.total_loto,     // Actual
                plan: r.total_verification, // Plan
                pct: parseFloat(r.percentage) 
            };

            if (r.shift === 1) existing.shift1 = sData;
            else if (r.shift === 2) existing.shift2 = sData;

            processedMap.set(r.warehouse_code, existing);
        });

        const finalData = Array.from(processedMap.values()).map(item => {
            const pct = item.total_verification > 0 
                ? (item.total_loto / item.total_verification) * 100 
                : 0;
            return { ...item, percentage: pct.toFixed(2) };
        });

        setData(finalData);

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
        setHistoryDataMap(prev => ({ ...prev, [warehouse]: result || [] }));
    }
  };

  const renderMiniChart = (history: HistoryItem[]) => {
      if (!history || !history.length) {
          return (
             <div className="h-[130px] flex items-center justify-center text-xs text-slate-400 italic">
                 {loading ? 'Loading history...' : 'No history data'}
             </div>
          );
      }

      // Extract unique dates for X-axis
      const dates = Array.from(new Set(history.map(d => d.date)));
      
      const s1Series = dates.map(date => {
        const item = history.find(d => d.date === date && d.shift === 1);
        return { x: date, y: item ? item.percentage : null }; 
      });

      const s2Series = dates.map(date => {
        const item = history.find(d => d.date === date && d.shift === 2);
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
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 pl-2 border-l-2 border-primary">
                  Shift History (30 Days)
              </div>
              <ReactApexChart options={chartOptions} series={series} type="bar" height={130} />
          </div>
      );
  };

  const renderTable = () => {
      // Calculate Totals
      const totals = data.reduce((acc, item) => ({
          s1Plan: acc.s1Plan + (item.shift1?.plan || 0),
          s1Loto: acc.s1Loto + (item.shift1?.loto || 0),
          s2Plan: acc.s2Plan + (item.shift2?.plan || 0),
          s2Loto: acc.s2Loto + (item.shift2?.loto || 0),
      }), { s1Plan: 0, s1Loto: 0, s2Plan: 0, s2Loto: 0 });

      const s1TotalPct = totals.s1Plan > 0 ? (totals.s1Loto / totals.s1Plan) * 100 : 0;
      const s2TotalPct = totals.s2Plan > 0 ? (totals.s2Loto / totals.s2Plan) * 100 : 0;

      return (
          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-strokedark animate-in fade-in zoom-in-95 duration-300">
              <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                  <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-meta-4 dark:text-slate-400">
                      <tr>
                          <th rowSpan={2} className="px-6 py-3 border-r border-b border-slate-200 dark:border-strokedark text-center align-middle">Warehouse</th>
                          <th colSpan={3} className="px-6 py-2 border-b border-r border-slate-200 dark:border-strokedark text-center bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">Shift 1</th>
                          <th colSpan={3} className="px-6 py-2 border-b border-slate-200 dark:border-strokedark text-center bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400">Shift 2</th>
                      </tr>
                      <tr>
                          {/* S1 Headers */}
                          <th className="px-4 py-2 text-center border-r border-b border-slate-200 dark:border-strokedark">Plan</th>
                          <th className="px-4 py-2 text-center border-r border-b border-slate-200 dark:border-strokedark">Actual</th>
                          <th className="px-4 py-2 text-center border-r border-b border-slate-200 dark:border-strokedark">Achv</th>
                          
                          {/* S2 Headers */}
                          <th className="px-4 py-2 text-center border-r border-b border-slate-200 dark:border-strokedark">Plan</th>
                          <th className="px-4 py-2 text-center border-r border-b border-slate-200 dark:border-strokedark">Actual</th>
                          <th className="px-4 py-2 text-center border-b border-slate-200 dark:border-strokedark">Achv</th>
                      </tr>
                  </thead>
                  <tbody>
                      {data.map((item) => {
                          const s1Plan = item.shift1?.plan || 0;
                          const s1Achv = s1Plan > 0 ? (item.shift1?.pct || 0).toFixed(0) + '%' : 'N/A';
                          const s1Class = s1Plan > 0 
                                ? ((item.shift1?.pct || 0) >= 100 ? 'text-green-500' : 'text-amber-500')
                                : 'text-slate-400 font-normal';

                          const s2Plan = item.shift2?.plan || 0;
                          const s2Achv = s2Plan > 0 ? (item.shift2?.pct || 0).toFixed(0) + '%' : 'N/A';
                          const s2Class = s2Plan > 0 
                                ? ((item.shift2?.pct || 0) >= 100 ? 'text-green-500' : 'text-amber-500')
                                : 'text-slate-400 font-normal';

                          return (
                            <tr key={item.warehouse_code} className="bg-white border-b dark:bg-boxdark dark:border-strokedark hover:bg-slate-50 dark:hover:bg-meta-4/30 transition-colors">
                                <td className="px-6 py-4 font-medium text-slate-900 dark:text-white whitespace-nowrap border-r border-slate-200 dark:border-strokedark">
                                    {selectedDate ? (
                                        <button 
                                            onClick={() => handleWarehouseClick(item.warehouse_code)}
                                            className="font-bold text-blue-600 hover:text-blue-800 hover:underline text-left"
                                            title="Click to view unit verification status"
                                        >
                                            {item.warehouse_code}
                                        </button>
                                    ) : (
                                        item.warehouse_code
                                    )}
                                </td>
                                
                                {/* S1 Data */}
                                <td className={`px-4 py-4 text-center border-r border-slate-100 dark:border-strokedark ${s1Plan === 0 ? 'bg-slate-200 dark:bg-meta-4/20 text-slate-400' : ''}`}>
                                    {s1Plan}
                                </td>
                                <td className={`px-4 py-4 text-center border-r border-slate-100 dark:border-strokedark ${s1Plan === 0 ? 'bg-slate-200 dark:bg-meta-4/20 text-slate-400' : ''}`}>
                                    {item.shift1?.loto || 0}
                                </td>
                                <td className={`px-4 py-4 text-center border-r border-slate-200 dark:border-strokedark font-bold ${s1Class} ${s1Plan === 0 ? 'bg-slate-100 dark:bg-meta-4/20' : ''}`}>
                                    {s1Achv}
                                </td>

                                {/* S2 Data */}
                                <td className={`px-4 py-4 text-center border-r border-slate-100 dark:border-strokedark ${s2Plan === 0 ? 'bg-slate-200 dark:bg-meta-4/20 text-slate-400' : ''}`}>
                                    {s2Plan}
                                </td>
                                <td className={`px-4 py-4 text-center border-r border-slate-100 dark:border-strokedark ${s2Plan === 0 ? 'bg-slate-200 dark:bg-meta-4/20 text-slate-400' : ''}`}>
                                    {item.shift2?.loto || 0}
                                </td>
                                <td className={`px-4 py-4 text-center font-bold ${s2Class} ${s2Plan === 0 ? 'bg-slate-200 dark:bg-meta-4/20' : ''}`}>
                                    {s2Achv}
                                </td>
                            </tr>
                          );
                      })}
                      {/* Total Row */}
                       <tr className="bg-slate-200 dark:bg-slate-800 font-bold border-t-2 border-slate-300 dark:border-strokedark shadow-sm">
                              <td className="px-6 py-4 text-slate-900 dark:text-white border-r border-slate-300 dark:border-strokedark">
                                  TOTAL
                              </td>
                              
                              {/* S1 Totals */}
                              <td className="px-4 py-4 text-center border-r border-slate-200 dark:border-strokedark">{totals.s1Plan}</td>
                              <td className="px-4 py-4 text-center border-r border-slate-200 dark:border-strokedark">{totals.s1Loto}</td>
                              <td className={`px-4 py-4 text-center border-r border-slate-200 dark:border-strokedark ${s1TotalPct >= 100 ? 'text-green-600' : 'text-amber-600'}`}>
                                  {totals.s1Plan > 0 ? s1TotalPct.toFixed(0) + '%' : 'N/A'}
                              </td>

                              {/* S2 Totals */}
                              <td className="px-4 py-4 text-center border-r border-slate-200 dark:border-strokedark">{totals.s2Plan}</td>
                              <td className="px-4 py-4 text-center border-r border-slate-200 dark:border-strokedark">{totals.s2Loto}</td>
                              <td className={`px-4 py-4 text-center ${s2TotalPct >= 100 ? 'text-green-600' : 'text-amber-600'}`}>
                                  {totals.s2Plan > 0 ? s2TotalPct.toFixed(0) + '%' : 'N/A'}
                              </td>
                          </tr>
                  </tbody>
              </table>
          </div>
      )
  };



  // ------------------------------------
  // Render Gauge Item
  // ------------------------------------
  const renderGauge = (item: WarehouseStats) => {
      const isSelected = selectedWarehouse === item.warehouse_code;
      const isExpanded = viewMode === 'detail' || isSelected;
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
             ${isExpanded ? 'col-span-2 row-span-1 ring-1 ring-blue-500 shadow-lg z-10' : 'col-span-1 shadow-sm hover:shadow border-slate-100 dark:border-strokedark'}
        `}>
             <div 
                onClick={(e) => {
                    e.stopPropagation(); 
                    if(viewMode === 'overview') {
                        if (!isSelected) {
                            onSelectWarehouse(item.warehouse_code);
                        } else {
                            onSelectWarehouse(null);
                        }
                    }
                }}
                className={`p-3 flex flex-col items-center h-full ${viewMode === 'overview' ? 'cursor-pointer' : ''}`}
             >
                {/* Gauge Area */}
                <div className={`flex w-full ${isExpanded ? 'items-start justify-between' : 'items-center justify-center'}`}>
                    <div className="relative pointer-events-none flex-shrink-0">
                         <ReactApexChart key={item.warehouse_code + pct} options={radialOptions} series={[pct]} type="radialBar" height={140} width={140} />
                    </div>

                     {/* Breakdown Grid (Shown only when expanded) */}
                     {isExpanded && item.shift1 && item.shift2 ? (
                         <div className="flex-grow px-2 self-center">
                            <table className="w-full text-xs text-center border-collapse">
                                <thead>
                                    <tr className="text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-700">
                                        <th className="pb-1 font-medium text-left">Metric</th>
                                        <th className="pb-1 font-medium text-blue-500">S1</th>
                                        <th className="pb-1 font-medium text-purple-500">S2</th>
                                    </tr>
                                </thead>
                                <tbody className="text-slate-700 dark:text-slate-300">
                                    <tr className="border-b border-slate-50 dark:border-slate-800">
                                        <td className="py-1.5 text-left font-semibold text-slate-500">LOTO</td>
                                        <td className="py-1.5 font-bold">{item.shift1?.loto || 0}</td>
                                        <td className="py-1.5 font-bold">{item.shift2?.loto || 0}</td>
                                    </tr>
                                    <tr className="border-b border-slate-50 dark:border-slate-800">
                                        <td className="py-1.5 text-left font-semibold text-slate-500">PLAN</td>
                                        <td className="py-1.5 font-bold">{item.shift1?.plan || 0}</td>
                                        <td className="py-1.5 font-bold">{item.shift2?.plan || 0}</td>
                                    </tr>
                                    <tr>
                                        <td className="py-1.5 text-left font-semibold text-slate-500">ACHV</td>
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
                     ) : isExpanded && (
                        <div className="flex flex-col gap-2 mt-4 text-xs text-slate-500 flex-grow px-4">
                              <div className="flex justify-between items-center border-b pb-1">
                                  <span className="text-slate-400 font-medium">LOTO</span>
                                  <span className="text-sm font-bold text-slate-700">{item.total_loto}</span>
                              </div>
                              <div className="flex justify-between items-center border-b pb-1">
                                  <span className="text-slate-400 font-medium">PLAN</span>
                                  <span className="text-sm font-bold text-slate-700">{item.total_verification}</span>
                              </div>
                          </div>
                     )}
                </div>

                {/* Mini Chart Injection */}
                {isExpanded && (
                    <div className="w-full mt-2 pt-2 border-t border-slate-100 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-300">
                         {renderMiniChart(historyDataMap[item.warehouse_code])}
                    </div>
                )}
             </div>
        </div>
      );
  };

  const renderSkeleton = (index: number) => {
      const isDetail = viewMode === 'detail';
      return (
        <div key={`skeleton-${index}`} className={`
             relative bg-white dark:bg-boxdark rounded-xl border border-slate-100 dark:border-strokedark overflow-hidden
             ${isDetail ? 'col-span-1 min-h-[350px]' : 'col-span-1 min-h-[160px]'}
             animate-pulse
        `}>
             <div className="p-4 flex flex-col items-center h-full gap-4">
                 {/* Gauge Placeholder */}
                 <div className="relative w-32 h-32 rounded-full border-8 border-slate-100 dark:border-strokedark flex items-center justify-center">
                     <div className="w-24 h-24 rounded-full bg-slate-50 dark:bg-meta-4/30"></div>
                 </div>
                 
                 {isDetail && (
                     <>
                        {/* Table Placeholder */}
                        <div className="w-full space-y-2 px-2 mt-2">
                            <div className="grid grid-cols-3 gap-2">
                                <div className="h-3 bg-slate-100 dark:bg-strokedark rounded col-span-1"/>
                                <div className="h-3 bg-slate-100 dark:bg-strokedark rounded col-span-1"/>
                                <div className="h-3 bg-slate-100 dark:bg-strokedark rounded col-span-1"/>
                            </div>
                            <div className="h-px bg-slate-100 dark:bg-strokedark w-full my-2"/>
                            <div className="grid grid-cols-3 gap-2">
                                <div className="h-3 bg-slate-100 dark:bg-strokedark rounded col-span-1"/>
                                <div className="h-3 bg-slate-200 dark:bg-meta-4 rounded col-span-1"/>
                                <div className="h-3 bg-slate-200 dark:bg-meta-4 rounded col-span-1"/>
                            </div>
                             <div className="grid grid-cols-3 gap-2 mt-1">
                                <div className="h-3 bg-slate-100 dark:bg-strokedark rounded col-span-1"/>
                                <div className="h-3 bg-slate-200 dark:bg-meta-4 rounded col-span-1"/>
                                <div className="h-3 bg-slate-200 dark:bg-meta-4 rounded col-span-1"/>
                            </div>
                        </div>
                        {/* Mini Chart Placeholder */}
                        <div className="w-full mt-auto pt-4 border-t border-slate-100 dark:border-strokedark">
                            <div className="h-3 w-1/3 bg-slate-100 dark:bg-strokedark rounded mb-2"/>
                            <div className="h-[100px] w-full bg-slate-50 dark:bg-meta-4/20 rounded-lg flex items-end gap-1 p-2 justify-between">
                                {[...Array(10)].map((_, i) => (
                                    <div key={i} style={{ height: `${Math.random() * 100}%` }} className="w-full bg-slate-200 dark:bg-strokedark rounded-t-sm"></div>
                                ))}
                            </div>
                        </div>
                     </>
                 )}
             </div>
        </div>
      );
  };

  /* -------------------------------------------------------------------------- */
  /*                            UNIT STATUS DIALOG LOGIC                        */
  /* -------------------------------------------------------------------------- */
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogWarehouse, setDialogWarehouse] = useState<string | null>(null);

  const handleWarehouseClick = (warehouse: string) => {
      if (!selectedDate) return; 
      setDialogWarehouse(warehouse);
      setDialogOpen(true);
  };

  const handleCloseDialog = () => {
      setDialogOpen(false);
      setDialogWarehouse(null);
  };

  return (
      <div ref={wrapperRef} className="space-y-4">
          {/* Header Control */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-boxdark p-4 rounded-xl border border-slate-200 dark:border-strokedark shadow-sm">
            <div>
                <h3 className="text-lg font-bold text-black dark:text-white">Warehouse Performance</h3>
                <p className="text-xs text-slate-500">
                    {selectedDate 
                        ? `Achievement for ${format(selectedDate, 'dd MMM yyyy')}` 
                        : 'Average Achievement (Last 30 Days)'
                    }
                </p>
            </div>

            <div className="flex items-center gap-2">
                {/* View Mode Toggle */}
                <div className="flex bg-slate-100 dark:bg-meta-4 rounded-lg p-1">
                        <button onClick={() => setViewMode('overview')} className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${viewMode === 'overview' ? 'bg-white dark:bg-boxdark text-black dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-black dark:hover:text-white'}`}>Overview</button>
                        <button onClick={() => setViewMode('detail')} className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${viewMode === 'detail' ? 'bg-white dark:bg-boxdark text-black dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-black dark:hover:text-white'}`}>Detail</button>
                        <button onClick={() => setViewMode('table')} className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${viewMode === 'table' ? 'bg-white dark:bg-boxdark text-black dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-black dark:hover:text-white'}`}>Table</button>
                </div>

                {selectedWarehouse && viewMode === 'overview' && (
                    <button onClick={() => onSelectWarehouse(null)} className="text-xs text-red-500 hover:underline">
                        Clear Selection
                    </button>
                )}
            </div>
          </div>

          {/* Main Content */}
          {viewMode === 'table' ? (
              renderTable()
          ) : (
              <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 ${viewMode === 'detail' ? 'lg:grid-cols-2 xl:grid-cols-2' : ''}`}>
                  {loading ? (
                      Array.from({ length: viewMode === 'detail' ? 4 : 8 }).map((_, i) => renderSkeleton(i))
                  ) : data.length > 0 ? (
                      data.map(renderGauge)
                  ) : (
                      <div className="col-span-full text-center py-8 text-slate-400 text-sm">No data available</div>
                  )}
              </div>
          )}

          <LotoVerificationDialog 
            isOpen={dialogOpen}
            onClose={handleCloseDialog}
            warehouseCode={dialogWarehouse}
            date={selectedDate}
          />
      </div>
  );
};

export default LotoAchievementByWarehouse;
