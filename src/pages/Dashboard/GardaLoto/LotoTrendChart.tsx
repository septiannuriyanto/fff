import React, { useEffect, useState } from 'react';
import ReactApexChart from 'react-apexcharts';
import { supabase } from '../../../db/SupabaseClient';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, parseISO, isAfter } from 'date-fns';
import { ApexOptions } from 'apexcharts';

type SeriesType = 'Trend' | 'Shift 1 Only' | 'Shift 2 Only' | 'All Series';

interface DailyData {
  date: Date;
  planS1: number;
  planS2: number;
  actualS1: number;
  actualS2: number;
}

interface LotoTrendChartProps {
  onDataPointClick?: (date: Date) => void;
  selectedDate: Date | null;
}

const LotoTrendChart: React.FC<LotoTrendChartProps> = ({ onDataPointClick, selectedDate }) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedSeries, setSelectedSeries] = useState<SeriesType>('Trend');
  const [chartData, setChartData] = useState<any>([]); // ApexChart series
  const [chartOptions, setChartOptions] = useState<ApexOptions>({});
  const [footerData, setFooterData] = useState({ lastPlanned: '-', lastLoto: '-' });
  const [lastPlannedDate, setLastPlannedDate] = useState<string | null>(null);
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [loading, setLoading] = useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  // Month names for selector
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Generate Year Options (e.g., 2023 - 2030)
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  useEffect(() => {
    fetchData();
  }, [selectedMonth, selectedYear, selectedSeries]);

  // Scroll to Last Planned Date
  useEffect(() => {
    if (scrollRef.current && lastPlannedDate && chartData.length > 0) {
      const date = parseISO(lastPlannedDate);
      
      // Check if last planned date is in the currently selected month
      if (date.getMonth() === selectedMonth && date.getFullYear() === selectedYear) {
        const dayOfMonth = date.getDate(); // 1-31
        
        // Calculate position
        const itemWidth = 50; // Approximated from minWidth logic
        // We want the item to be at the right edge if possible
        const targetScrollLeft = (dayOfMonth * itemWidth) - scrollRef.current.clientWidth + 100; // +100 padding
        
        scrollRef.current.scrollTo({
            left: Math.max(0, targetScrollLeft),
            behavior: 'smooth'
        });
      } else {
        // Fallback: Scroll to end if showing a past month, or start if future?
        // Defaulting to end for now as it's a trend chart
        scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
      }
    }
  }, [lastPlannedDate, chartData, selectedMonth, selectedYear]);

  const fetchData = async () => {
    setLoading(true);
    const startDate = startOfMonth(new Date(selectedYear, selectedMonth));
    const endDate = endOfMonth(new Date(selectedYear, selectedMonth));
    // 1. Fetch Trend Data via RPC
    const { data: trendData, error: trendError } = await supabase
      .rpc('get_loto_achievement_trend', { days_back: 1000 }); // Query generous range to cover selected month

    // 2. Fetch Footer Dates
    const { data: lastVerif } = await supabase
      .from('loto_verification')
      .select('issued_date, shift, session_code')
      .order('session_code', { ascending: false })
      .limit(1)
      .single();

    const { data: lastSession } = await supabase
      .from('loto_sessions')
      .select('created_at, create_shift, session_code')
      .order('session_code', { ascending: false })
      .limit(1)
      .single(); 

    if (trendError) {
        console.error('Error fetching trend data', trendError);
        setLoading(false);
        return;
    }

    // Process Footer Data
    const formatDateShift = (dateStr: string | null, shift: number | null) => {
      if (!dateStr) return '-';
      const date = parseISO(dateStr); 
      return `${format(date, 'dd-MMM-yyyy')}, Shift ${shift || '?'}`;
    };

    setLastPlannedDate(lastVerif?.issued_date || null);
    setFooterData({
      lastPlanned: lastVerif ? formatDateShift(lastVerif.issued_date, lastVerif.shift) : '-',
      lastLoto: lastSession ? formatDateShift(lastSession.created_at, lastSession.create_shift) : '-'
    });

    // Process Chart Data
    const daysInMonth = eachDayOfInterval({ start: startDate, end: endDate });
    
    const processedData: DailyData[] = daysInMonth.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      
      // Filter RPC data for this day
      // RPC returns date as string usually
      const dayStats = trendData?.filter((d: any) => d.date === dayStr) || [];
      
      const s1 = dayStats.find((d: any) => d.shift === 1);
      const s2 = dayStats.find((d: any) => d.shift === 2);

      return {
        date: day,
        planS1: s1?.total_verification || 0,
        planS2: s2?.total_verification || 0,
        actualS1: s1?.total_loto || 0,
        actualS2: s2?.total_loto || 0
      };
    });

    setDailyData(processedData);

    const cutoffDate = lastVerif?.issued_date ? parseISO(lastVerif.issued_date) : null;
    buildChart(processedData, cutoffDate);
    setLoading(false);
  };

  const buildChart = (data: DailyData[], cutoffDate: Date | null) => {
    const categories = data.map(d => format(d.date, 'dd')); // Label 1-31
    let series: any[] = [];
    let colors: string[] = [];

    // Helper to calc achievement
    const calcAch = (act: number, plan: number) => plan > 0 ? (act / plan) * 100 : 0;
    const formatAch = (val: number) => parseFloat(val.toFixed(1));
    
    const isFuture = (d: DailyData) => cutoffDate && isAfter(d.date, cutoffDate);

    // Prepare data points
    const trendData = data.map(d => {
       if(isFuture(d)) return { x: format(d.date, 'dd MMM'), y: null };
       const totalPlan = d.planS1 + d.planS2;
       const totalActual = d.actualS1 + d.actualS2;
       return { x: format(d.date, 'dd MMM'), y: formatAch(calcAch(totalActual, totalPlan)) };
    });

    const s1Data = data.map(d => {
       if(isFuture(d)) return { x: format(d.date, 'dd MMM'), y: null };
       return { x: format(d.date, 'dd MMM'), y: formatAch(calcAch(d.actualS1, d.planS1)) };
    });

    const s2Data = data.map(d => {
       if(isFuture(d)) return { x: format(d.date, 'dd MMM'), y: null };
       return { x: format(d.date, 'dd MMM'), y: formatAch(calcAch(d.actualS2, d.planS2)) };
    });

    if (selectedSeries === 'Trend') {
      series = [{ name: 'Achievement', type: 'line', data: trendData }];
      colors = ['#00E396'];
    } else if (selectedSeries === 'Shift 1 Only') {
      series = [{ name: 'S1 Achievement', type: 'line', data: s1Data }];
      colors = ['#008FFB'];
    } else if (selectedSeries === 'Shift 2 Only') {
      series = [{ name: 'S2 Achievement', type: 'line', data: s2Data }];
      colors = ['#775DD0'];
    } else {
      // All Series: Show S1 and S2 lines (and maybe Trend?)
      series = [
        { name: 'S1 Achievement', type: 'line', data: s1Data },
        { name: 'S2 Achievement', type: 'line', data: s2Data },
        { name: 'Trend', type: 'line', data: trendData, dashArray: 5 } // Dashed for total
      ];
       colors = ['#008FFB', '#775DD0', '#00E396'];
    }

    // Calculate max value for Y-axis scaling
    const allValues = [...trendData, ...s1Data, ...s2Data]
        .map(d => d.y)
        .filter(y => y !== null) as number[];
    const maxVal = Math.max(...allValues, 0);

    setChartData(series);
    setChartOptions({
      chart: {
        type: 'line',
        height: 350,
        toolbar: { show: false },
        zoom: { enabled: false },
        events: {
            markerClick: function(_e, _chart, { dataPointIndex }) {
                if (onDataPointClick && data[dataPointIndex]) {
                    onDataPointClick(data[dataPointIndex].date);
                }
            }
        }
      },
      colors: colors,
      stroke: {
        width: selectedSeries === 'All Series' ? [2, 2, 4] : 3,
        curve: 'smooth',
        dashArray: selectedSeries === 'All Series' ? [0, 0, 5] : 0
      },
      markers: {
        size: 4,
        strokeWidth: 0,
        hover: {
          size: 6
        }
      },
      dataLabels: { enabled: false },
      xaxis: {
        categories: categories,
        tooltip: { enabled: false },
        axisBorder: { show: false },
        axisTicks: { show: false }
      },
      yaxis: {
        title: { text: 'Achievement (%)' },
        min: 0,
        max: Math.max(100, maxVal + 10), // Ensure at least 100, add buffer if higher
        labels: { formatter: (val) => val.toFixed(0) }
      },
      grid: { borderColor: '#f1f1f1' },
      tooltip: {
        shared: true,
        intersect: false,
        y: { formatter: (y) => typeof y !== "undefined" ? y.toFixed(1) + '%' : y },
        custom: function({ dataPointIndex }) {
            const d = data[dataPointIndex];
            const dateStr = format(d.date, 'dd MMM yyyy');
            
            const renderRow = (label: string, plan: number, act: number, colorClass: string) => {
                const ach = plan > 0 ? ((act / plan) * 100).toFixed(1) : '0.0';
                const achColor = parseFloat(ach) >= 100 ? 'text-green-600' : 'text-amber-600';
                return `
                 <div class="mb-2 last:mb-0">
                    <div class="text-xs font-bold ${colorClass} mb-0.5">${label}</div>
                    <div class="flex justify-between gap-4 text-xs">
                        <span>Plan: <b class="text-gray-700">${plan}</b></span>
                        <span>Act: <b class="text-gray-700">${act}</b></span>
                        <span class="${achColor} font-bold">${ach}%</span>
                    </div>
                 </div>
                `;
            };

            let content = '';
            if (selectedSeries === 'Shift 1 Only') {
                content = renderRow('Shift 1', d.planS1, d.actualS1, 'text-blue-600');
            } else if (selectedSeries === 'Shift 2 Only') {
                content = renderRow('Shift 2', d.planS2, d.actualS2, 'text-purple-600');
            } else if (selectedSeries === 'All Series') {
                 content += renderRow('Shift 1', d.planS1, d.actualS1, 'text-blue-600');
                 content += renderRow('Shift 2', d.planS2, d.actualS2, 'text-purple-600');
                 content += `<div class="my-1 border-t border-gray-100"></div>`;
                 content += renderRow('Total Trend', d.planS1 + d.planS2, d.actualS1 + d.actualS2, 'text-green-600');
            } else {
                 content = renderRow('Achievement', d.planS1 + d.planS2, d.actualS1 + d.actualS2, 'text-green-600');
            }

            return `
              <div class="px-3 py-2 bg-white border border-gray-200 rounded shadow-lg text-sm text-gray-700 min-w-[150px]">
                <div class="font-bold mb-2 border-b pb-1 text-gray-900">${dateStr}</div>
                ${content}
              </div>
            `;
        }
      },
      legend: { position: 'top', horizontalAlign: 'right' }
    });
  };

  const handleSeriesChange = (s: SeriesType) => {
    setSelectedSeries(s);
  };

  const renderTooltipCard = (date: Date) => {
      const dayData = dailyData.find(d => format(d.date, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd'));
      if (!dayData) return null;

      const dateStr = format(dayData.date, 'dd MMM yyyy');
      
      const renderRow = (label: string, plan: number, act: number, colorClass: string) => {
          const ach = plan > 0 ? ((act / plan) * 100).toFixed(1) : '0.0';
          const achColor = parseFloat(ach) >= 100 ? 'text-green-600' : 'text-amber-600';
          return (
             <div className="mb-2 last:mb-0">
                <div className={`text-xs font-bold ${colorClass} mb-0.5`}>{label}</div>
                <div className="flex justify-between gap-4 text-xs">
                    <span>Plan: <b className="text-gray-700 dark:text-gray-300">{plan}</b></span>
                    <span>Act: <b className="text-gray-700 dark:text-gray-300">{act}</b></span>
                    <span className={`${achColor} font-bold`}>{ach}%</span>
                </div>
             </div>
          );
      };

      return (
          <div className="px-4 py-3 bg-white dark:bg-boxdark border border-gray-200 dark:border-strokedark rounded shadow-xl text-sm min-w-[180px] animate-in fade-in slide-in-from-top-2 duration-200">
             <div className="font-bold mb-2 border-b border-gray-100 dark:border-strokedark pb-1 text-gray-900 dark:text-white flex justify-between items-center">
                 <span>{dateStr}</span>
                 <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded">Selected</span>
             </div>
             
             {selectedSeries === 'Shift 1 Only' && renderRow('Shift 1', dayData.planS1, dayData.actualS1, 'text-blue-600')}
             
             {selectedSeries === 'Shift 2 Only' && renderRow('Shift 2', dayData.planS2, dayData.actualS2, 'text-purple-600')}
             
             {selectedSeries === 'All Series' && (
                 <>
                    {renderRow('Shift 1', dayData.planS1, dayData.actualS1, 'text-blue-600')}
                    {renderRow('Shift 2', dayData.planS2, dayData.actualS2, 'text-purple-600')}
                    <div className="my-2 border-t border-gray-100 dark:border-strokedark"></div>
                    {renderRow('Total Trend', dayData.planS1 + dayData.planS2, dayData.actualS1 + dayData.actualS2, 'text-green-600')}
                 </>
             )}
             
             {selectedSeries === 'Trend' && renderRow('Achievement', dayData.planS1 + dayData.planS2, dayData.actualS1 + dayData.actualS2, 'text-green-600')}
          </div>
      );
  }

  return (
    <div className="w-full bg-white dark:bg-boxdark rounded-xl shadow-sm border border-gray-100 dark:border p-6">
      
      {/* Header Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
           <h3 className="text-lg font-bold text-gray-800 dark:text-white">Loto Trend Overview</h3>
           <p className="text-sm text-gray-500 dark:text-gray-400">Monitoring verification vs actual records</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
            {/* Month Year Selector */}
            <div className="flex items-center bg-gray-50 dark:bg-boxdark rounded-lg p-1 border border-bod">
                <select 
                    value={selectedMonth} 
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="bg-transparent border-none text-sm font-medium text-gray-700 dark:text-gray-300 focus:ring-0 cursor-pointer py-1 pl-2 pr-6"
                >
                    {months.map((m, i) => (
                        <option key={i} value={i}>{m}</option>
                    ))}
                </select>
                <div className="h-4 w-[1px] bg-gray-300 mx-1"></div>
                <select 
                    value={selectedYear} 
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="bg-transparent border-none text-sm font-medium text-gray-700 dark:text-gray-300 focus:ring-0 cursor-pointer py-1 pl-2 pr-6"
                >
                    {years.map((y) => (
                        <option key={y} value={y}>{y}</option>
                    ))}
                </select>
            </div>
        </div>
      </div>

       {/* Series Selector - Tabs Style */}
       <div className="flex items-center gap-1 mb-6 bg-gray-100/50 dark:bg-meta-4/30 p-1 rounded-lg w-fit">
            {(['Trend', 'Shift 1 Only', 'Shift 2 Only', 'All Series'] as SeriesType[]).map((seriesType) => (
                <button
                    key={seriesType}
                    onClick={() => handleSeriesChange(seriesType)}
                    className={`
                        px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200
                        ${selectedSeries === seriesType 
                            ? 'bg-white dark:bg-boxdark text-blue-600 dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10' 
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200/50 dark:hover:bg-meta-4'}
                    `}
                >
                    {seriesType}
                </button>
            ))}
        </div>

      {/* Chart */}
      <div className="relative border border-gray-100 dark:border-strokedark rounded-lg bg-white dark:bg-boxdark-2 overflow-hidden" >
        {loading && (
             <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
             </div>
        )}
        
        {/* Persistent Tooltip Overlay */}
        {selectedDate && !loading && (
            <div className="absolute top-4 right-4 z-20 pointer-events-none">
                {renderTooltipCard(selectedDate)}
            </div>
        )}

        <div className="overflow-x-auto transition-all duration-500" ref={scrollRef}>
            <div style={{ minWidth: `${Math.max(600, chartData[0]?.data?.length * 50)}px` }}>
                <ReactApexChart options={chartOptions} series={chartData} type="line" height={350} />
            </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-6 pt-4 border-t border-gray-100 grid grid-cols-2 gap-4 text-center md:text-left">
        <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100 flex flex-col">
            <span className="text-xs text-blue-400 dark:text-white font-semibold uppercase tracking-wider block mb-1">Last Planned Date</span>
            <span className="text-md font-bold text-boxdark dark:text-white">{footerData.lastPlanned}</span>
        </div>
        <div className="bg-indigo-50/50 p-3 rounded-lg border border-indigo-100">
            <span className="text-xs text-indigo-400 dark:text-white font-semibold uppercase tracking-wider block mb-1">Last LOTO Date</span>
            <span className="text-md font-bold text-boxdark dark:text-white">{footerData.lastLoto}</span>
        </div>
      </div>

    </div>
  )
}

export default LotoTrendChart