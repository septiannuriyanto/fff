import React, { useEffect, useState, useMemo, memo } from 'react';
import Chart from 'react-apexcharts';

interface DeviationChartProps {
  chartDataDaily: { date: string; total: number | null }[]; // Allow null for dates without data
  chartDataCumulative: { date: string; total: number | null }[]; // Allow null for dates without data
}

const DeviationChart: React.FC<DeviationChartProps> = ({
  chartDataDaily,
  chartDataCumulative,
}) => {
  const [normalize, setNormalize] = useState(false);
  const [date, setDate] = useState<string[]>([]);
  const [dailyDeviation, setDailyDeviation] = useState<(number | null)[]>([]);
  const [cumulativeDeviation, setCumulativeDeviation] = useState<(number | null)[]>([]);

  useEffect(() => {
    const dates: string[] = [];
    const daily: number[] = [];
    const cumulative: (number | null)[] = [];

    // Fill in the dates and deviations
    for (let index = 0; index < chartDataDaily.length; index++) {
      dates.push(new Date(chartDataDaily[index].date).getDate().toString());
      daily.push(chartDataDaily[index].total ?? 0); // Use 0 if null for bars
      cumulative.push(chartDataCumulative[index]?.total ?? null); // Keep null for line termination
    }

    setDate(dates);
    setDailyDeviation(daily);
    setCumulativeDeviation(cumulative);
  }, [chartDataDaily, chartDataCumulative]);

  const chartData = useMemo(() => ({
    series: [
      {
        name: 'Deviasi Harian',
        type: 'bar',
        data: dailyDeviation,
      },
      {
        name: 'Deviasi Kumulatif',
        type: 'area',
        data: cumulativeDeviation,
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
      // Professional high-contrast palette: Vibrant Red/Green for bars, Primary Blue for the area chart
      colors: ['#ef4444', '#3c50e0'], 
      stroke: {
        width: [0, 2], // 2px for a clear but elegant line
        curve: 'smooth' as 'smooth',
      },
      fill: {
        type: ['solid', 'gradient'] as any[],
        gradient: {
          shade: 'light',
          type: 'vertical',
          shadeIntensity: 0,
          inverseColors: false,
          opacityFrom: 0.55, // Semi-transparent at top
          opacityTo: 0,   // Fully transparent at bottom
          stops: [0, 100],
        }
      },
      markers: {
        size: [0, 5], 
        colors: '#fff',
        strokeColors: dailyDeviation.map(val => (val !== null && val < 0 ? '#ef4444' : '#3c50e0')),
        strokeWidth: 3,
        strokeOpacity: 0.9,
        strokeDashArray: 0,
        fillOpacity: 1,
        discrete: [],
        hover: {
          size: undefined,
          sizeOffset: 5,
        },
      },
      plotOptions: {
        bar: {
          columnWidth: '45%',
          borderRadius: 4,
          colors: {
            ranges: [
              {
                from: -1000000,
                to: -0.01,
                color: '#ef4444', // Vibrant Red
              },
              {
                from: 0,
                to: 1000000,
                color: '#22c55e', // Vibrant Green
              },
            ],
          },
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
              title: { text: 'Daily Deviation', style: { color: '#ef4444', fontWeight: 600 } },
              labels: { formatter: (val: number) => val?.toLocaleString('id-ID') },
            },
            {
              opposite: true,
              title: { text: 'Cumulative Deviation', style: { color: '#3c50e0', fontWeight: 600 } },
              labels: { formatter: (val: number) => val?.toLocaleString('id-ID') },
            }
          ]
        : {
            title: {
              style: {
                fontSize: '0px',
              },
            },
            labels: {
              formatter: (value: number) => value.toLocaleString('id-ID'),
            },
          } as any,
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
            if (value === null || value === undefined) return '';
            return value.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
          },
        },
      },
    },
  }), [dailyDeviation, cumulativeDeviation, date, normalize]);

  const scrollRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (scrollRef.current && dailyDeviation.length > 0) {
        // Find the last index with a non-zero/non-null value
        let lastActiveIndex = 0;
        for (let i = dailyDeviation.length - 1; i >= 0; i--) {
          if (dailyDeviation[i] !== 0 && dailyDeviation[i] !== null) {
            lastActiveIndex = i;
            break;
          }
        }

        const totalWidth = scrollRef.current.scrollWidth;
        const clientWidth = scrollRef.current.clientWidth;
        const itemWidth = totalWidth / dailyDeviation.length;
        
        // Calculate position so the last active point + 2 spaces is at the right edge
        const targetScroll = (lastActiveIndex + 1 + 2) * itemWidth - clientWidth;
        scrollRef.current.scrollLeft = Math.max(0, targetScroll);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [dailyDeviation]);

  return (
    <div className="w-full overflow-hidden">
      <div className="flex items-center justify-between mb-4 px-2">
        <h4 className="font-bold text-gray-700 dark:text-gray-300 text-sm">Monthly Measurement Deviation by Date</h4>
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

export default memo(DeviationChart);
