import React, { useEffect, useState } from 'react';
import Chart from 'react-apexcharts';

interface DailyRitationChartProps {
  chartDataInput: { date: string; total: number }[]; // Data grouped by date
  chartDataReconcile: { date: string; total: number }[]; // Data grouped by date
  chartDataCumulative?: { date: string; total: number | null }[]; // Cumulative qty_sj data
  chartDataPoBalance?: { date: string; total: number | null }[]; // Remaining PO balance data
}

const DailyRitationChart: React.FC<DailyRitationChartProps> = ({
  chartDataInput,
  chartDataReconcile,
  chartDataCumulative,
  chartDataPoBalance
}) => {
  // Prepare data for the chart
  const [date, setDate] = useState<string[]>([]);
  const [qty, setQty] = useState<number[]>([]);
  const [reconcileQty, setReconcileQty] = useState<number[]>([]); // New state for cumulative daily ritation

  const [cumulativeRitation, setCumulativeRitation] = useState<(number | null)[]>([]); // New state for cumulative daily ritation
  const [poBalance, setPoBalance] = useState<(number | null)[]>([]); // New state for PO balance qty
  
  useEffect(() => {
    // const daysInMonth = new Date(
    //   new Date().getFullYear(),
    //   new Date().getMonth() + 1,
    //   0,
    // ).getDate();

    const dates: string[] = [];
    const qtys: number[] = [];
    const qtyReconcile: number[] = [];
    const qtyCumulative: (number | null)[] = [];
    const qtyPoBalance: (number | null)[] = [];

    // Fill in the dates and quantities from chartDataInput
    for (let index = 0; index < chartDataInput.length; index++) {
      dates.push(new Date(chartDataInput[index].date).getDate().toString());
      qtys.push(chartDataInput[index].total);
      qtyReconcile.push(chartDataReconcile[index]?.total || 0); // Use optional chaining to avoid undefined
      qtyCumulative.push(chartDataCumulative?.[index]?.total ?? null); // Keep null for line termination
      qtyPoBalance.push(chartDataPoBalance?.[index]?.total ?? null);
    }

    // const dailyTarget = totalPlan / daysInMonth;

    // Calculate daily targets, cumulative plan, and cumulative ritation
    // let dailyTotal = 0;
    // let cumulativePlanData: number[] = [];
    // let cumulativeRitationData: number[] = [];

    // for (let index = 0; index < daysInMonth; index++) {
    //   dailyTotal += dailyTarget;
    //   cumulativePlanData.push(dailyTotal); // Add to cumulative plan
      
    //   // Calculate cumulative ritation
    //   if (index < qtys.length) {
    //     cumulativeRitationData.push(
    //       (cumulativeRitationData[index - 1] || 0) + qtys[index]
    //     ); // Add the current qty to the last cumulative ritation
    //   } else {
    //     cumulativeRitationData.push(cumulativeRitationData[index - 1] || 0); // Keep the last cumulative ritation if no data for that day
    //   }
    // }

    setDate(dates);
    setQty(qtys);
    setReconcileQty(qtyReconcile); // Set reconcile quantities
    setCumulativeRitation(qtyCumulative); // Set cumulative ritation
    setPoBalance(qtyPoBalance); // Set PO balance quantities
  }, [chartDataInput, chartDataReconcile, chartDataCumulative, chartDataPoBalance]);

  const [normalize, setNormalize] = useState(false);
  
  // Create an array for the daily target line
  const chartData = {
    series: [
      {
        name: 'Ritation Qty',
        type: 'bar',
        data: qty,
      },
      {
        name: 'Sonding Qty',
        type: 'bar',
        data: reconcileQty,
      },
      {
        name: 'Cumulative Qty SJ',
        type: 'area',
        data: cumulativeRitation,
      },
      {
        name: 'PO Qty Balance',
        type: 'area',
        data: poBalance,
      },
    ],
    options: {
      chart: {
        fontFamily: 'Satoshi, sans-serif',
        height: 200,
        type: 'line' as 'line',
        stacked: false,
        toolbar: {
          show: false,
        },
      },
      // High Contrast Palette: Amber/Primary Blue for daily bars, ChartOne Sky Blue/Emerald for area progress
      colors: ['#fbbf24', '#3c50e0', '#80caee', '#10b981'], 
      stroke: {
        width: [0, 0, 2, 2], // Outlines only for the areas
        curve: 'smooth' as 'smooth',
      },
      fill: {
        type: ['solid', 'solid', 'gradient', 'gradient'],
        gradient: {
          shade: 'light',
          type: 'vertical',
          shadeIntensity: 0,
          inverseColors: false,
          opacityFrom: 0.45,
          opacityTo: 0,
          stops: [0, 100]
        }
      },
      markers: {
        size: [0, 0, 4, 4], 
        colors: '#fff',
        strokeColors: ['#fbbf24', '#3c50e0', '#80caee', '#10b981'],
        strokeWidth: 2,
        strokeOpacity: 0.9,
        strokeDashArray: 0,
        fillOpacity: 1,
        discrete: [],
        hover: {
          size: undefined,
          sizeOffset: 4,
        },
      },
      plotOptions: {
        bar: {
          columnWidth: '50%',
          borderRadius: 2,
        },
      },
      xaxis: {
        categories: date,
        axisBorder: {
          show: false,
        },
        axisTicks: {
          show: false,
        },
      },
      yaxis: normalize 
        ? [
            {
              title: { text: 'Daily Volume', style: { color: '#fbbf24', fontWeight: 600 } },
              labels: { formatter: (val: number) => val?.toLocaleString('id-ID') },
            },
            {
              opposite: true,
              title: { text: 'Cumulative Volume', style: { color: '#80caee', fontWeight: 600 } },
              labels: { formatter: (val: number) => val?.toLocaleString('id-ID') },
            }
          ]
        : {
            title: { style: { fontSize: '0px' } },
            labels: { formatter: (value: number) => value.toLocaleString('id-ID') },
          },
      legend: {
        show: false,
      },
      grid: {
        xaxis: {
          lines: {
            show: true,
          },
        },
        yaxis: {
          lines: {
            show: true,
          },
        },
      },
      tooltip: {
        shared: true,
        intersect: false,
        padding: 0,
        style: {
          fontSize: '11px',
        },
        y: {
          formatter: (value: number) => {
            if (value === null || value === undefined || value === 0) return '';
            return value.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
          },
        },
      },
    },
  };
  
  
  

  const scrollRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (scrollRef.current && qty.length > 0) {
        // Find the last index with a value > 0
        let lastActiveIndex = 0;
        for (let i = qty.length - 1; i >= 0; i--) {
          if (qty[i] > 0 || reconcileQty[i] > 0) {
            lastActiveIndex = i;
            break;
          }
        }

        const totalWidth = scrollRef.current.scrollWidth;
        const clientWidth = scrollRef.current.clientWidth;
        const itemWidth = totalWidth / qty.length;
        
        // Calculate position so the last active point + 2 spaces is at the right edge
        // lastActiveIndex + 1 (to get count) + 2 (requested margin)
        const targetScroll = (lastActiveIndex + 1 + 2) * itemWidth - clientWidth;
        scrollRef.current.scrollLeft = Math.max(0, targetScroll);
      }
    }, 100); // Small delay to allow chart rendering

    return () => clearTimeout(timer);
  }, [qty, reconcileQty]);

  return (
    <div className="w-full overflow-hidden">
      <div className="flex items-center justify-between mb-4 px-2">
        <h4 className="font-bold text-gray-700 dark:text-gray-300 text-sm">Daily Ritation Chart</h4>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Normalize View</span>
          <button 
            onClick={() => setNormalize(!normalize)}
            className={`w-9 h-5 rounded-full transition-all relative border-2 ${
              normalize 
                ? 'bg-emerald-500 border-emerald-500 shadow-inner' 
                : 'bg-gray-200 dark:bg-gray-800 border-gray-300 dark:border-gray-600 shadow-sm'
            }`}
          >
            <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-all ${
              normalize 
                ? 'left-[20px]' 
                : 'left-0.5 border-[1.5px] border-black'
            }`} />
          </button>
        </div>
      </div>
      <div 
        ref={scrollRef}
        className="w-full overflow-x-auto no-scrollbar scroll-smooth pb-2"
      >
        <div className="min-w-[1200px] md:min-w-full">
          <Chart
            options={chartData.options}
            series={chartData.series}
            type="line"
            height={220}
          />
        </div>
      </div>
    </div>
  );
};

export default DailyRitationChart;
