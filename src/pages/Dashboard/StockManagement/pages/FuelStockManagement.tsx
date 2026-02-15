import { useState, useEffect, useMemo } from 'react';
import ReactApexChart from 'react-apexcharts';
import { supabase } from '../../../../db/SupabaseClient';
import PanelContainer from '../../../PanelContainer';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';

export default function FuelStockManagement() {
    const [selectedMonth, setSelectedMonth] = useState(new Date());
    const [data, setData] = useState<any[]>([]);
    const [lastInputDate, setLastInputDate] = useState<string | null>(null);
    const [editingPortDay, setEditingPortDay] = useState<number | null>(null);
    const [editValue, setEditValue] = useState<string>('');

    // Generate date range for selected month
    const daysInMonth = useMemo(() => {
        const year = selectedMonth.getFullYear();
        const month = selectedMonth.getMonth();
        const tempDate = new Date(year, month, 1);
        const days = [];
        while (tempDate.getMonth() === month) {
            days.push(new Date(tempDate));
            tempDate.setDate(tempDate.getDate() + 1);
        }
        return days;
    }, [selectedMonth]);

    useEffect(() => {
        fetchData();
        fetchLastInput();
    }, [selectedMonth]);

    const fetchLastInput = async () => {
        const { data: lastData, error } = await supabase
            .from('stock_monitoring')
            .select('date, created_at')
            .order('created_at', { ascending: false })
            .limit(1);

        if (!error && lastData && lastData.length > 0) {
            setLastInputDate(lastData[0].date);
        }
    };

    const fetchData = async () => {
        const year = selectedMonth.getFullYear();
        const month = selectedMonth.getMonth();
        const startOfMonth = `${year}-${(month + 1).toString().padStart(2, '0')}-01`;
        const lastDay = new Date(year, month + 1, 0).getDate();
        const endOfMonth = `${year}-${(month + 1).toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;

        const { data: result, error } = await supabase
            .from('stock_monitoring')
            .select('*')
            .gte('date', startOfMonth)
            .lte('date', endOfMonth)
            .order('date', { ascending: true });

        if (error) {
            console.error('Error fetching stock data:', error);
        } else {
            setData(result || []);
        }
    };

    // Prepare data for mapping (Day -> Value) - stock_monitoring already has aggregated data
    const dataMap = useMemo(() => {
        const map = new Map();
        data.forEach(item => {
            const day = new Date(item.date).getDate();
            map.set(day, {
                site_stock: item.site_stock || 0,
                port_stock: item.port_stock || 0,
                site_usage: item.site_usage || 0
            });
        });
        return map;
    }, [data]);

    // Find last date with data - New rule: all metrics must be complete
    const lastDataDay = useMemo(() => {
        let lastDay = 0;
        for (let i = daysInMonth.length - 1; i >= 0; i--) {
            const day = daysInMonth[i].getDate();
            const item = dataMap.get(day);
            // Must have site stock AND port stock AND usage to be considered complete
            if (item && item.site_stock > 0 && item.port_stock > 0 && item.site_usage > 0) {
                lastDay = day;
                break;
            }
        }
        return lastDay;
    }, [daysInMonth, dataMap]);

    // Calculate ITO and Achievement
    const getITO = (siteStock: number, portStock: number, usage: number) => {
        if (!usage || usage === 0) return 0;
        return (siteStock + portStock) / usage;
    };

    const getAchievement = (ito: number) => {
        return ito > 3 ? 100 : 0;
    };

    // Calculate MTD Achievement Average
    const mtdAchievement = useMemo(() => {
        if (lastDataDay === 0) return 0;
        let totalAchievement = 0;
        let countedDays = 0;
        
        for (let day = 1; day <= lastDataDay; day++) {
            const item = dataMap.get(day);
            if (item) {
                const ito = getITO(item.site_stock, item.port_stock, item.site_usage);
                totalAchievement += getAchievement(ito);
                countedDays++;
            } else {
                // If there's no entry recorded for a day before lastDataDay, we can either skip it or count it as 0
                // Based on "hingga tanggal data terakhir saja", we'll count existing records
                // But usually in reporting, if we have a hole in data, it depends.
                // Here we'll only count days that actually have records in the DB up to lastDataDay
            }
        }
        
        return countedDays > 0 ? (totalAchievement / countedDays) : 0;
    }, [lastDataDay, dataMap]);

    const periodString = selectedMonth.toLocaleString('id-ID', { month: 'long', year: 'numeric' });
    const lastDataDateStr = lastDataDay > 0 
        ? `${lastDataDay.toString().padStart(2, '0')}/${(selectedMonth.getMonth() + 1).toString().padStart(2, '0')}/${selectedMonth.getFullYear()}`
        : '-';

    // Chart Data Preparation - limit to last data point
    const chartSeries = useMemo(() => {
        return [
            {
                name: 'Port Stock',
                type: 'area', // Light blue background
                data: daysInMonth.map(d => {
                    const day = d.getDate();
                    if (day > lastDataDay) return null;
                    return dataMap.get(day)?.port_stock || 0;
                })
            },
            {
                name: 'Site Stock',
                type: 'area', // Dark blue foreground
                data: daysInMonth.map(d => {
                    const day = d.getDate();
                    if (day > lastDataDay) return null;
                    return dataMap.get(day)?.site_stock || 0;
                })
            },
            {
                name: 'Fuel Usage',
                type: 'bar', // Fuel usage is now a bar chart
                data: daysInMonth.map(d => {
                    const day = d.getDate();
                    if (day > lastDataDay) return null;
                    return dataMap.get(day)?.site_usage || 0;
                })
            },
            {
                name: 'ITO (Days)',
                type: 'line',
                data: daysInMonth.map(d => {
                    const day = d.getDate();
                    if (day > lastDataDay) return null;
                    const item = dataMap.get(day);
                    const ito = getITO(item?.site_stock || 0, item?.port_stock || 0, item?.site_usage || 0);
                    return ito > 0 ? parseFloat(ito.toFixed(1)) : 0;
                })
            },
            {
                name: 'ITO Target',
                type: 'line',
                data: daysInMonth.map(() => 3)
            }
        ];
    }, [daysInMonth, dataMap, lastDataDay]);

    const chartOptions: any = {
        chart: { 
            fontFamily: 'Satoshi, sans-serif',
            height: 350, 
            type: 'line', 
            stacked: false,
            toolbar: { show: false },
            zoom: { enabled: false },
            dropShadow: {
              enabled: true,
              color: '#623CEA14',
              top: 10,
              blur: 4,
              left: 0,
              opacity: 0.1,
            }
        },
        colors: ['#80CAEE', '#3C50E0', '#CBD5E1', '#00D1FF', '#94A3B8'], // Reverted to sky blue for Port Stock
        stroke: { 
            width: [1.5, 1.5, 0, 5, 2.5], 
            curve: 'straight',
            dashArray: [0, 0, 0, 0, 10]
        },
        fill: {
            type: ['gradient', 'gradient', 'solid', 'solid', 'solid'],
            gradient: {
                shade: 'light',
                type: 'vertical',
                shadeIntensity: 0.5,
                inverseColors: false,
                opacityFrom: [0.4, 0.5, 0.3, 1, 1], // Fine-tuned opacities
                opacityTo: [0.1, 0.15, 0.3, 1, 1],
                stops: [0, 100]
            }
        },
        markers: {
            size: [0, 0, 0, 6, 0], 
            colors: ['#fff', '#fff', '#fff', '#fff', '#fff'],
            strokeColors: ['#80CAEE', '#3C50E0', '#CBD5E1', '#00D1FF', '#94A3B8'],
            strokeWidth: 3,
            hover: { sizeOffset: 4 }
        },
        xaxis: { 
            categories: daysInMonth.map(d => d.getDate()),
            axisBorder: { show: false },
            axisTicks: { show: false }
        },
        yaxis: [
            {
                seriesName: 'Port Stock',
                title: { text: 'Volume (L)', style: { color: '#3C50E0', fontWeight: 600 } },
                labels: {
                    formatter: (val: number) => val ? Math.round(val).toLocaleString('id-ID') : 0
                }
            },
            {
                seriesName: 'Port Stock',
                show: false,
            },
            {
                seriesName: 'Port Stock',
                show: false,
            },
            {
                seriesName: 'ITO (Days)',
                opposite: true,
                title: { text: 'ITO (Days)', style: { color: '#00D1FF', fontWeight: 700 } },
                min: 0,
                max: 10,
                labels: {
                    formatter: (val: number) => val?.toFixed(1)
                }
            },
            {
                seriesName: 'ITO (Days)',
                show: false,
                opposite: true,
            }
        ],
        plotOptions: {
            bar: {
                columnWidth: '50%',
                borderRadius: 2,
            },
        },
        legend: { 
            show: true,
            position: 'top',
            horizontalAlign: 'left',
            offsetY: 0,
            itemMargin: { horizontal: 10, vertical: 10 }
        },
        grid: {
            borderColor: '#f1f1f1',
            strokeDashArray: 4,
            padding: { top: 20 },
            xaxis: { lines: { show: true } },
            yaxis: { lines: { show: true } }
        },
        dataLabels: { enabled: false },
        tooltip: { 
            shared: true,
            intersect: false,
            y: { 
                formatter: (val: number, { seriesIndex }: any) => {
                    if (val === null || val === undefined) return '';
                    if (seriesIndex >= 3) return val.toFixed(1) + ' Days';
                    return Math.round(val).toLocaleString('id-ID') + ' L';
                }
            } 
        }
    };

    const handleStartEdit = (day: number) => {
        setEditingPortDay(day);
        setEditValue(''); // Start blank as requested
    };

    const handleUpdatePortStock = async (day: number) => {
        if (editingPortDay === null) return;
        
        // Remove thousand separators before parsing
        const cleanValue = editValue.replace(/\./g, '').replace(/,/g, '');
        const newVal = parseFloat(cleanValue) || 0;
        
        const dayDate = daysInMonth.find(d => d.getDate() === day);
        if (!dayDate) return;
        
        const dateStr = `${dayDate.getFullYear()}-${(dayDate.getMonth() + 1).toString().padStart(2, '0')}-${dayDate.getDate().toString().padStart(2, '0')}`;
        
        // Find existing record to see if current stock is different
        const existing = dataMap.get(day);
        if (existing && existing.port_stock === newVal) {
            setEditingPortDay(null);
            return;
        }

        const loadingToast = toast.loading('Updating Port Stock...');
        setEditingPortDay(null); // Close input immediately for responsiveness

        try {
            const { error } = await supabase
                .from('stock_monitoring')
                .upsert({ 
                    date: dateStr, 
                    port_stock: newVal,
                    site_stock: existing?.site_stock || 0,
                    site_usage: existing?.site_usage || 0
                }, { onConflict: 'date' });

            if (error) throw error;
            
            toast.success(`Port Stock for ${day} updated!`, { id: loadingToast });
            fetchData(); // Refresh data
        } catch (err: any) {
            toast.error('Failed to update: ' + err.message, { id: loadingToast });
            fetchData(); // Reset to current state on error
        }
    };

    const handleExport = () => {
        // Create horizontal table structure like the display
        const ws_data: any[][] = [];
        
        // Header row with dates
        const headerRow = ['Metric / Date', ...daysInMonth.map(d => d.getDate())];
        ws_data.push(headerRow);
        
        // Site Stock row
        const siteStockRow = ['Site Stock (L)', ...daysInMonth.map(d => dataMap.get(d.getDate())?.site_stock || 0)];
        ws_data.push(siteStockRow);
        
        // Port Stock row
        const portStockRow = ['Port Stock (L)', ...daysInMonth.map(d => dataMap.get(d.getDate())?.port_stock || 0)];
        ws_data.push(portStockRow);
        
        // Fuel Usage row
        const usageRow = ['Fuel Usage (L)', ...daysInMonth.map(d => dataMap.get(d.getDate())?.site_usage || 0)];
        ws_data.push(usageRow);
        
        // ITO row
        const itoRow = ['ITO (Days)', ...daysInMonth.map(d => {
            const item = dataMap.get(d.getDate());
            const ito = getITO(item?.site_stock || 0, item?.port_stock || 0, item?.site_usage || 0);
            return ito > 0 ? parseFloat(ito.toFixed(1)) : '-';
        })];
        ws_data.push(itoRow);
        
        // Achievement row
        const achievementRow = ['Achievement (%)', ...daysInMonth.map(d => {
            const item = dataMap.get(d.getDate());
            const ito = getITO(item?.site_stock || 0, item?.port_stock || 0, item?.site_usage || 0);
            const achievement = getAchievement(ito);
            return ito > 0 ? achievement : '-';
        })];
        ws_data.push(achievementRow);
        
        // Create worksheet
        const ws = XLSX.utils.aoa_to_sheet(ws_data);
        
        // Create workbook
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Stock Monitoring');
        
        // Export
        const monthStr = `${selectedMonth.getFullYear()}-${(selectedMonth.getMonth() + 1).toString().padStart(2, '0')}`;
        XLSX.writeFile(wb, `stock_monitoring_${monthStr}.xlsx`);
    };


  return (
    <PanelContainer title='Fuel Stock Management'>
        <div className="p-4 bg-white dark:bg-boxdark rounded-lg shadow-sm">
            {/* Header Controls */}
            <div className="flex justify-between items-center mb-6">
                <div className="flex gap-4 items-center">
                    <input 
                        type="month" 
                        value={`${selectedMonth.getFullYear()}-${(selectedMonth.getMonth() + 1).toString().padStart(2, '0')}`}
                        onChange={(e) => {
                            const [y, m] = e.target.value.split('-');
                            setSelectedMonth(new Date(parseInt(y), parseInt(m) - 1, 1));
                        }}
                        className="border rounded px-3 py-2 text-sm dark:bg-boxdark dark:border-strokedark"
                    />
                    {lastInputDate && (
                        <div className="text-sm text-gray-600 dark:text-gray-400 ml-4">
                            <span className="font-semibold">Last Inputted Data:</span>{' '}
                            Tanggal {new Date(lastInputDate).toLocaleDateString('id-ID')}
                        </div>
                    )}
                </div>
                <button 
                    onClick={handleExport}
                    className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                         <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                    Export XLSX
                </button>
            </div>

            {/* Chart Section */}
            <div className="mb-6">
                <ReactApexChart options={chartOptions} series={chartSeries} type="line" height={350} />
            </div>

            {/* MTD Performance Info - Glassmorphism Design */}
            <div className="mb-8 relative overflow-hidden p-6 rounded-2xl border border-white/40 dark:border-white/10 bg-white/30 dark:bg-white/5 backdrop-blur-xl shadow-xl flex items-center justify-between group transition-all hover:shadow-2xl">
                {/* Decorative background glow */}
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-all duration-700"></div>
                <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-400/10 rounded-full blur-3xl group-hover:bg-blue-400/20 transition-all duration-700"></div>

                <div className="relative flex items-center gap-5">
                    <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-blue-600 shadow-lg shadow-primary/30 transform group-hover:scale-110 transition-transform duration-500">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="white" className="w-8 h-8">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" />
                        </svg>
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">
                            Fuel Stock Availability <span className="text-gray-400 font-normal">| {periodString}</span>
                        </h4>
                        <div className="flex items-baseline gap-3">
                            <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-600 dark:from-blue-400 dark:to-cyan-400 tracking-tighter">
                                {mtdAchievement.toFixed(2).replace('.', ',')}%
                            </span>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-white bg-primary/80 dark:bg-primary px-2 py-0.5 rounded-full shadow-sm shadow-primary/20">
                                    MTD {lastDataDateStr}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="relative hidden md:flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400">Target Availability</span>
                        <span className={`text-xs font-black ${mtdAchievement >= 100 ? 'text-green-500' : 'text-primary'}`}>
                            {mtdAchievement >= 100 ? 'ON TRACK' : 'BELOW TARGET'}
                        </span>
                    </div>
                    <div className="w-48 h-3 bg-gray-200/50 dark:bg-white/10 rounded-full overflow-hidden backdrop-blur-sm border border-white/20">
                        <div 
                            className={`h-full relative transition-all duration-1000 ease-out-expo ${mtdAchievement >= 100 ? 'bg-gradient-to-r from-green-400 to-emerald-600' : 'bg-gradient-to-r from-primary to-blue-600'}`} 
                            style={{ 
                                width: `${Math.min(mtdAchievement, 100)}%`,
                                boxShadow: mtdAchievement >= 100 ? '0 0 15px rgba(16, 185, 129, 0.4)' : '0 0 15px rgba(60, 80, 224, 0.4)'
                            }}
                        >
                            <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent"></div>
                        </div>
                    </div>
                    <p className="text-[10px] text-gray-400 italic font-medium">Calculation based on Avg. Daily Achievement</p>
                </div>
            </div>

            {/* Horizontal Scrollable Table */}
            <div className="overflow-x-auto pb-4">
                <table className="min-w-full border-collapse border border-stroke dark:border-strokedark text-sm">
                    <thead>
                        <tr>
                            <th className="border border-stroke dark:border-strokedark p-2 bg-[#F1F5F9] dark:bg-[#1A2233] min-w-[150px] sticky left-0 top-0 z-30 shadow-[2px_2px_5px_rgba(0,0,0,0.1)]">Metric / Date</th>
                            {daysInMonth.map(d => (
                                <th key={d.getDate()} className="border border-stroke dark:border-strokedark p-2 min-w-[80px] text-center bg-[#F8FAFC] dark:bg-[#1A2233] sticky top-0 z-20">
                                    {d.getDate()}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {/* Site Stock Row */}
                        <tr>
                            <td className="border border-stroke dark:border-strokedark p-2 font-medium bg-white dark:bg-boxdark sticky left-0 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">Site Stock (L)</td>
                            {daysInMonth.map(d => (
                                <td key={d.getDate()} className="border border-stroke dark:border-strokedark p-2 text-right">
                                    {(dataMap.get(d.getDate())?.site_stock || 0).toLocaleString('id-ID')}
                                </td>
                            ))}
                        </tr>
                         {/* Port Stock Row */}
                         <tr>
                            <td className="border border-stroke dark:border-strokedark p-2 font-medium bg-white dark:bg-boxdark sticky left-0 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">Port Stock (L)</td>
                            {daysInMonth.map(d => {
                                const day = d.getDate();
                                const currentStock = dataMap.get(day)?.port_stock || 0;
                                const isEditing = editingPortDay === day;
                                
                                return (
                                    <td 
                                        key={day} 
                                        className={`border border-stroke dark:border-strokedark p-2 text-right cursor-pointer hover:bg-slate-50 dark:hover:bg-meta-4/20 transition-colors ${isEditing ? '!p-0' : ''}`}
                                        onClick={() => !isEditing && handleStartEdit(day)}
                                    >
                                        {isEditing ? (
                                            <input
                                                autoFocus
                                                type="text"
                                                className="w-full h-full p-2 text-right outline-none bg-blue-50 dark:bg-blue-900/20 border-2 border-primary font-bold"
                                                value={editValue}
                                                placeholder={currentStock.toLocaleString('id-ID')}
                                                onChange={(e) => {
                                                    // Only allow numbers
                                                    const val = e.target.value.replace(/[^0-9]/g, '');
                                                    if (val === '') {
                                                        setEditValue('');
                                                    } else {
                                                        // Format with dots as thousand separator
                                                        const formatted = parseInt(val).toLocaleString('id-ID');
                                                        setEditValue(formatted);
                                                    }
                                                }}
                                                onBlur={() => handleUpdatePortStock(day)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleUpdatePortStock(day);
                                                    if (e.key === 'Escape') setEditingPortDay(null);
                                                }}
                                            />
                                        ) : (
                                            currentStock.toLocaleString('id-ID')
                                        )}
                                    </td>
                                );
                            })}
                        </tr>
                        {/* Fuel Usage Row */}
                         <tr>
                            <td className="border border-stroke dark:border-strokedark p-2 font-medium bg-white dark:bg-boxdark sticky left-0 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">Fuel Usage (L)</td>
                            {daysInMonth.map(d => (
                                <td key={d.getDate()} className="border border-stroke dark:border-strokedark p-2 text-right">
                                    {(dataMap.get(d.getDate())?.site_usage || 0).toLocaleString('id-ID')}
                                </td>
                            ))}
                        </tr>
                        {/* ITO Row */}
                        <tr className="bg-blue-50 dark:bg-blue-900/10">
                            <td className="border border-stroke dark:border-strokedark p-2 font-bold text-blue-700 bg-[#EEF2FF] dark:bg-[#1E293B] sticky left-0 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">ITO (Days)</td>
                            {daysInMonth.map(d => {
                                const item = dataMap.get(d.getDate());
                                const ito = getITO(item?.site_stock || 0, item?.port_stock || 0, item?.site_usage || 0);
                                return (
                                    <td key={d.getDate()} className="border border-stroke dark:border-strokedark p-2 text-right font-semibold">
                                        {ito > 0 ? ito.toFixed(1) : '-'}
                                    </td>
                                );
                            })}
                        </tr>
                        {/* Achievement Row */}
                         <tr className="bg-green-50 dark:bg-green-900/10">
                            <td className="border border-stroke dark:border-strokedark p-2 font-bold text-green-700 bg-[#F0FDF4] dark:bg-[#064E3B] sticky left-0 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">Achievement (%)</td>
                            {daysInMonth.map(d => {
                                const item = dataMap.get(d.getDate());
                                const ito = getITO(item?.site_stock || 0, item?.port_stock || 0, item?.site_usage || 0);
                                const achievement = getAchievement(ito);
                                return (
                                    <td key={d.getDate()} className={`border border-stroke dark:border-strokedark p-2 text-right font-bold ${achievement >= 100 ? 'text-green-600' : 'text-red-500'}`}>
                                        {ito > 0 ? `${achievement}%` : '-'}
                                    </td>
                                );
                            })}
                        </tr>
                    </tbody>
                </table>
            </div>

            <div className="mt-4 text-xs text-gray-500 italic">
                * ITO Formula: (Site Stock + Port Stock) / Fuel Usage<br/>
                * Achievement: 100% if ITO &gt; 3 Days
            </div>
        </div>
    </PanelContainer>
  )
}