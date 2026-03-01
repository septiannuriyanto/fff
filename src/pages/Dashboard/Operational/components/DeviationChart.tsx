import React, { useEffect, useState, useMemo, memo } from 'react';
import Chart from 'react-apexcharts';
import { useTheme } from '../../../../contexts/ThemeContext';

interface DeviationChartProps {
  chartDataDaily: { date: string; total: number | null }[]; // Allow null for dates without data
  chartDataCumulative: { date: string; total: number | null }[]; // Allow null for dates without data
  chartDataStock?: { date: string; total: number | null }[]; // Optional prop for stock today
}

const DeviationChart: React.FC<DeviationChartProps> = ({
  chartDataDaily,
  chartDataCumulative,
  chartDataStock,
}) => {
  const { activeTheme } = useTheme();
  const theme = activeTheme;
  const isDark = theme.baseTheme === 'dark';
  const cardOpacity = theme.card.opacity;

  const [normalize, setNormalize] = useState(false);
  const [date, setDate] = useState<string[]>([]);
  const [dailyDeviation, setDailyDeviation] = useState<(number | null)[]>([]);
  const [cumulativeDeviation, setCumulativeDeviation] = useState<(number | null)[]>([]);
  const [stockToday, setStockToday] = useState<(number | null)[]>([]);

  useEffect(() => {
    const dates: string[] = [];
    const daily: number[] = [];
    const cumulative: (number | null)[] = [];
    const stock: (number | null)[] = [];

    // Fill in the dates and deviations
    for (let index = 0; index < chartDataDaily.length; index++) {
      dates.push(new Date(chartDataDaily[index].date).getDate().toString());
      daily.push(chartDataDaily[index].total ?? 0); // Use 0 if null for bars
      cumulative.push(chartDataCumulative[index]?.total ?? null); // Keep null for line termination
      stock.push(chartDataStock ? (chartDataStock[index]?.total ?? null) : null);
    }

    setDate(dates);
    setDailyDeviation(daily);
    setCumulativeDeviation(cumulative);
    setStockToday(stock);
  }, [chartDataDaily, chartDataCumulative, chartDataStock]);

  const chartData = useMemo(() => {
    const series = [
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
    ];

    if (chartDataStock) {
      series.push({
        name: 'Stock Today',
        type: 'line',
        data: stockToday,
      } as any);
    }

    const labelColor = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)';
    const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';

    return {
      series,
      options: {
        chart: {
          fontFamily: 'Satoshi, sans-serif',
          height: 200,
          type: 'line' as 'line',
          stacked: false,
          toolbar: {
            show: false,
          },
          background: 'transparent',
          animations: {
            enabled: true,
            easing: 'easeinout' as 'easeinout',
            speed: 800,
          },
        },
        theme: {
          mode: isDark ? 'dark' : 'light' as any,
          palette: 'palette1',
        },
        colors: chartDataStock ? ['#ef4444', '#3c50e0', '#eab308'] : ['#ef4444', '#3c50e0'],
        stroke: {
          width: chartDataStock ? [0, 2, 2.5] : [0, 2],
          curve: 'smooth' as 'smooth',
          dashArray: chartDataStock ? [0, 0, 5] : [0, 0],
        },
        fill: {
          type: ['solid', 'gradient', 'solid'] as any[],
          gradient: {
            shade: isDark ? 'dark' : 'light',
            type: 'vertical',
            shadeIntensity: 0.5,
            inverseColors: false,
            opacityFrom: 0.55,
            opacityTo: 0,
            stops: [0, 100],
          }
        },
        markers: {
          size: [0, 5, 4],
          colors: isDark ? '#1e293b' : '#fff',
          strokeColors: ['#ef4444', '#3c50e0', '#eab308'],
          strokeWidth: 2,
          hover: {
            sizeOffset: 3,
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
                  to: -0.001,
                  color: '#ef4444',
                },
                {
                  from: 0,
                  to: 1000000,
                  color: '#10b981',
                },
              ],
            },
          },
        },
        xaxis: {
          categories: date,
          axisBorder: { show: false },
          axisTicks: { show: false },
          labels: {
            style: {
              colors: labelColor,
              fontSize: '10px',
              fontWeight: 500,
            }
          },
        },
        yaxis: normalize
          ? [
            {
              title: {
                text: 'Daily Dev',
                style: { color: '#ef4444', fontWeight: 700, fontSize: '10px' }
              },
              labels: {
                formatter: (val: number) => val?.toLocaleString('id-ID'),
                style: { colors: labelColor, fontSize: '10px' }
              },
            },
            {
              opposite: true,
              title: {
                text: 'Cumulative Dev',
                style: { color: '#3c50e0', fontWeight: 700, fontSize: '10px' }
              },
              labels: {
                formatter: (val: number) => val?.toLocaleString('id-ID'),
                style: { colors: labelColor, fontSize: '10px' }
              },
            }
          ]
          : {
            labels: {
              formatter: (value: number) => value.toLocaleString('id-ID'),
              style: { colors: labelColor, fontSize: '10px' }
            },
          } as any,
        grid: {
          borderColor: gridColor,
          strokeDashArray: 4,
          xaxis: { lines: { show: true } },
          yaxis: { lines: { show: true } },
        },
        legend: { show: false },
        tooltip: {
          theme: isDark ? 'dark' : 'light',
          shared: true,
          intersect: false,
          style: { fontSize: '11px' },
          y: {
            formatter: (value: number) => {
              if (value === null || value === undefined) return '';
              return value.toLocaleString('id-ID');
            },
          },
        },
      },
    };
  }, [dailyDeviation, cumulativeDeviation, stockToday, date, normalize, chartDataStock, isDark]);

  const scrollRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (scrollRef.current && dailyDeviation.length > 0) {
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
        const targetScroll = (lastActiveIndex + 1 + 2) * itemWidth - clientWidth;
        scrollRef.current.scrollLeft = Math.max(0, targetScroll);
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [dailyDeviation]);

  return (
    <div
      className="w-full rounded-2xl p-6 transition-all duration-500 relative overflow-hidden backdrop-blur-xl mb-6 shadow-2xl"
      style={{
        backgroundColor: isDark
          ? `rgba(15, 23, 42, ${cardOpacity * 0.8})`
          : `rgba(255, 255, 255, ${cardOpacity * 0.8})`,
        border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.05)',
      }}
    >
      <div className="flex items-center justify-between mb-6 px-2">
        <div className="flex flex-col gap-1">
          <h4 className={`font-black text-xs uppercase tracking-widest ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Operational Insights
          </h4>
          <h3 className={`font-black text-lg tracking-tight ${isDark ? 'text-white' : 'text-gray-800'}`}>
            Stock Deviation Analysis
          </h3>
        </div>
        <div className="flex items-center gap-3 bg-gray-100/50 dark:bg-white/5 p-1.5 rounded-xl border border-gray-200/50 dark:border-white/5 shadow-inner">
          <span className={`text-[10px] font-black uppercase tracking-widest pl-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Normalize
          </span>
          <button
            onClick={() => setNormalize(!normalize)}
            className={`w-10 h-5 rounded-full transition-all relative border-2 ${normalize
              ? 'bg-emerald-500 border-emerald-400'
              : isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-200 border-gray-300'
              }`}
          >
            <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-lg transition-all transform ${normalize
              ? 'translate-x-[20px]'
              : 'translate-x-0.5'
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
            options={chartData.options as any}
            series={chartData.series}
            type="line"
            height={240}
          />
        </div>
      </div>
    </div>
  );
};

export default memo(DeviationChart);
