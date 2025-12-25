import React, { useEffect, useState } from 'react';
import ReactApexChart from 'react-apexcharts';
import { supabase } from '../../../../db/SupabaseClient';
import { ApexOptions } from 'apexcharts';

// Helper to truncate names
const formatName = (name: string, limit: number = 20) => {
    if (name.length > limit) return name.substring(0, limit) + '...';
    return name;
};

const DesktopChart = ({ data }: { data: any[] }) => {
    const labelColors = data.map(d => d.loto_count > 0 ? '#ffffff' : '#000000');

    const chartOptions: ApexOptions = {
        chart: { type: 'bar', height: 450, toolbar: { show: false } },
        plotOptions: {
            bar: {
                borderRadius: 4,
                columnWidth: '60%',
                distributed: true,
                dataLabels: { position: 'center' }
            }
        },
        dataLabels: {
            enabled: true,
            offsetY: 0,
            style: { fontSize: '11px', colors: labelColors, fontWeight: 'bold' }
        },
        fill: {
            type: 'gradient',
            gradient: {
                shade: 'light',
                type: 'vertical',
                shadeIntensity: 0.2,
                gradientToColors: ['#60a5fa'],
                inverseColors: false,
                opacityFrom: 1,
                opacityTo: 0.9,
                stops: [0, 100]
            }
        },
        colors: ['#2563eb'],
        xaxis: {
            categories: data.map(d => [formatName(d.name, 20), d.nrp]),
            labels: {
                rotate: -90,
                rotateAlways: true,
                hideOverlappingLabels: false,
                trim: true,
                maxHeight: 180,
                style: { colors: '#374151', fontSize: '10px', fontFamily: 'Inter, sans-serif', fontWeight: 700 }
            },
            axisBorder: { show: false },
            axisTicks: { show: false }
        },
        yaxis: {
            axisBorder: { show: false },
            axisTicks: { show: false },
            labels: { show: true, formatter: (val) => val.toFixed(0) }
        },
        grid: {
            borderColor: '#f3f4f6',
            strokeDashArray: 4,
            padding: { top: 20, left: 10, right: 20, bottom: 10 }
        },
        legend: { show: false },
        tooltip: { y: { formatter: (val) => val.toFixed(0) + ' Lotos' } }
    };

    const series = [{ name: 'Total Loto', data: data.map(d => d.loto_count) }];

    return (
        <div className="w-full overflow-x-auto pb-4">
            <div style={{ minWidth: `${Math.max(300, data.length * 40)}px` }}>
                <ReactApexChart options={chartOptions} series={series} type="bar" height={450} />
            </div>
        </div>
    );
};

const MobileChart = ({ data }: { data: any[] }) => {
    const labelColors = data.map(d => d.loto_count > 0 ? '#ffffff' : '#000000');

    const chartOptions: ApexOptions = {
        chart: { 
            type: 'bar', 
            height: Math.max(350, data.length * 50), // Explicit height calculation
            toolbar: { show: false } 
        },
        plotOptions: {
            bar: {
                horizontal: true,
                borderRadius: 4,
                barHeight: '70%',
                distributed: true,
                dataLabels: { position: 'center' }
            }
        },
        dataLabels: {
            enabled: true,
            textAnchor: 'middle',
            offsetX: 0,
            style: { fontSize: '11px', colors: labelColors, fontWeight: 'bold' },
            formatter: (val, opts) => {
                 return val?.toString()
            }
        },
        fill: {
            type: 'gradient',
            gradient: {
                shade: 'light',
                type: 'horizontal',
                shadeIntensity: 0.2,
                gradientToColors: ['#60a5fa'],
                inverseColors: false,
                opacityFrom: 1,
                opacityTo: 0.9,
                stops: [0, 100]
            }
        },
        colors: ['#2563eb'],
        xaxis: {
            categories: data.map(d => formatName(d.name, 15)), // Shorter name for mobile axis
            labels: {
                style: { colors: '#374151', fontSize: '10px', fontFamily: 'Inter, sans-serif', fontWeight: 700 }
            }
        },
        yaxis: {
            labels: { 
                show: true, 
                style: { fontSize: '10px', fontFamily: 'Inter, sans-serif', fontWeight: 600 },
                maxWidth: 100 // Constrain label width
            }
        },
        grid: {
            borderColor: '#f3f4f6',
            strokeDashArray: 4,
            padding: { top: 0, left: 10, right: 20, bottom: 0 }
        },
        legend: { show: false },
        tooltip: { y: { formatter: (val) => val.toFixed(0) + ' Lotos' } }
    };

    const series = [{ name: 'Total Loto', data: data.map(d => d.loto_count) }];

    return (
        <div className="w-full">
             {/* No fixed height container, let chart define height */}
            <ReactApexChart options={chartOptions} series={series} type="bar" height={Math.max(350, data.length * 50)} />
        </div>
    );
};


const LotoCountByFuelman = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data: result, error } = await supabase.rpc('get_loto_ranking_nrp', { days_back: 30 });
      if (error) {
        console.error('Error fetching fuelman data', error);
      } else {
        const sorted = (result || []).sort((a: any, b: any) => b.loto_count - a.loto_count);
        setData(sorted);
      }
      setLoading(false);
    };

    fetchData();
  }, []);

  return (
    <div className="w-full bg-white rounded-xl shadow-sm border border-gray-100 p-6">
       <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-800">Loto Contributions by Fuelman (Beta)</h3>
            <p className="text-xs text-gray-500">Ranking based on activity (Last 30 Days)</p>
       </div>

       {loading ? (
         <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
         </div>
       ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <span className="text-4xl mb-2">📊</span>
              <span className="text-sm font-medium">No LOTO records found in the last 30 days</span>
          </div>
       ) : (
          isMobile ? <MobileChart data={data} /> : <DesktopChart data={data} />
       )}
    </div>
  )
}

export default LotoCountByFuelman;