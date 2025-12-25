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

const LotoAchievementByWarehouse: React.FC<Props> = ({ selectedDate, selectedWarehouse, onSelectWarehouse }) => {
  const [data, setData] = useState<any[]>([]);
  const [historyData, setHistoryData] = useState<any[]>([]);
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
    let rpcName = 'get_loto_achievement_warehouse';
    let params: any = { days_back: 30 };

    if (selectedDate) {
       rpcName = 'get_loto_warehouse_daily_achievement';
       params = { target_date: format(selectedDate, 'yyyy-MM-dd') };
    }

    const { data: result, error } = await supabase.rpc(rpcName, params);
    
    if (error) {
        console.error('Error fetching warehouse achievement', error);
    } else {
        setData(result || []);
    }
    setLoading(false);
  };

  const fetchHistory = async (warehouse: string) => {
    const { data: result, error } = await supabase
        .rpc('get_loto_warehouse_history', { 
            target_warehouse: warehouse, 
            days_back: 30 
        });
    
    if (error) {
        console.error('Error fetching history', error);
    } else {
        setHistoryData(result || []);
    }
  };

  const getColor = (pct: number) => {
      if (pct >= 90) return 'bg-green-500';
      if (pct >= 70) return 'bg-orange-400';
      return 'bg-red-500';
  };

  const renderMiniChart = () => {
      if (!historyData.length) return null;

      let discreteMarkers: any[] = [];
      if (selectedDate) {
          const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
          const dataIndex = historyData.findIndex(d => d.date === selectedDateStr);
          if (dataIndex !== -1) {
              discreteMarkers.push({
                  seriesIndex: 0,
                  dataPointIndex: dataIndex,
                  fillColor: '#8b5cf6', // Violet-500
                  strokeColor: '#fff',
                  size: 6
              });
          }
      }

      const chartOptions: ApexOptions = {
          chart: { 
              type: 'line', 
              height: 120, 
              toolbar: { show: false },
              zoom: { enabled: false },
              sparkline: { enabled: false } // Disable sparkline to show axes
          },
          stroke: { curve: 'smooth', width: 2 },
          colors: ['#3b82f6'],
          markers: { 
              size: 3, 
              hover: { size: 5 },
              discrete: discreteMarkers
          }, // Show markers
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
                  format: 'dd', // Show day only
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
                  title: { formatter: () => 'Ach: ' },
                  formatter: (val) => val.toFixed(1) + '%'
              },
              marker: { show: false }
          }
      };
      
      const series = [{
          name: 'Achievement',
          data: historyData.map(d => ({
              x: d.date,
              y: d.percentage
          }))
      }];

      return (
          <div className="w-full">
              <div className="text-xs font-semibold text-blue-600 mb-2 pl-2 border-l-2 border-blue-500">
                  Transaction History (30 Days)
              </div>
              <ReactApexChart options={chartOptions} series={series} type="line" height={100} />
          </div>
      );
  };

  // ------------------------------------
  // Render Gauge Item
  // ------------------------------------
  const renderGauge = (item: any) => {
      const isSelected = selectedWarehouse === item.warehouse_code;
      const pct = parseFloat(item.percentage);

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
              track: { background: '#f3f4f6', strokeWidth: '100%' },
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
             ${isSelected ? 'col-span-2 row-span-1 ring-1 ring-blue-500 shadow-lg z-10' : 'col-span-1 shadow-sm hover:shadow border-gray-100'}
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

                     {/* Info Stats (Shown only when expanded) */}
                     {isSelected && (
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
                    <div className="w-full mt-2 pt-2 border-t border-gray-100 animate-in fade-in zoom-in-95 duration-300">
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
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/50 backdrop-blur-[1px] rounded-xl transition-all duration-300">
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

export default LotoAchievementByWarehouse