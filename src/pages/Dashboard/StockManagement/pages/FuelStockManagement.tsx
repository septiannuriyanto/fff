import React, { useState, useEffect, useMemo } from 'react';
import ReactApexChart from 'react-apexcharts';
import { supabase } from '../../../../db/SupabaseClient';
import PanelContainer from '../../../PanelContainer';
import * as XLSX from 'xlsx';

const FuelStockManagement = () => {
    const [selectedMonth, setSelectedMonth] = useState(new Date());
    const [data, setData] = useState<any[]>([]);
    const [lastInputDate, setLastInputDate] = useState<string | null>(null);

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
        const startOfMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1).toISOString().split('T')[0];
        const endOfMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0).toISOString().split('T')[0];

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

    // Find last date with data
    const lastDataDay = useMemo(() => {
        let lastDay = 0;
        for (let i = daysInMonth.length - 1; i >= 0; i--) {
            const day = daysInMonth[i].getDate();
            const item = dataMap.get(day);
            if (item && (item.site_stock > 0 || item.port_stock > 0 || item.site_usage > 0)) {
                lastDay = day;
                break;
            }
        }
        return lastDay;
    }, [daysInMonth, dataMap]);

    // Chart Data Preparation - limit to last data point
    const chartSeries = useMemo(() => {
        return [
            {
                name: 'Site Stock',
                data: daysInMonth.map(d => {
                    const day = d.getDate();
                    if (day > lastDataDay) return null;
                    return dataMap.get(day)?.site_stock || 0;
                })
            },
            {
                name: 'Port Stock',
                data: daysInMonth.map(d => {
                    const day = d.getDate();
                    if (day > lastDataDay) return null;
                    return dataMap.get(day)?.port_stock || 0;
                })
            },
            {
                name: 'Fuel Usage',
                data: daysInMonth.map(d => {
                    const day = d.getDate();
                    if (day > lastDataDay) return null;
                    return dataMap.get(day)?.site_usage || 0;
                })
            }
        ];
    }, [daysInMonth, dataMap, lastDataDay]);

    const chartOptions: any = {
        chart: { type: 'line', height: 350, toolbar: { show: false } },
        stroke: { curve: 'smooth', width: 2 },
        colors: ['#3C50E0', '#10B981', '#F0950C'],
        xaxis: { categories: daysInMonth.map(d => d.getDate()) },
        yaxis: { 
            title: { text: 'Volume (L)' },
            labels: {
                formatter: (val: number) => {
                    if (val === null || val === undefined) return '';
                    return Math.round(val).toLocaleString('id-ID');
                }
            }
        },
        legend: { position: 'top' },
        dataLabels: { enabled: false },
        fill: { opacity: 1 },
        tooltip: { 
            y: { 
                formatter: (val: number) => {
                    if (val === null || val === undefined) return '';
                    return Math.round(val).toLocaleString('id-ID') + ' L';
                }
            } 
        }
    };

    // Calculate ITO and Achievement
    const getITO = (siteStock: number, portStock: number, usage: number) => {
        if (!usage || usage === 0) return 0;
        return (siteStock + portStock) / usage;
    };

    const getAchievement = (ito: number) => {
        return ito > 3 ? 100 : 0;
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
        XLSX.writeFile(wb, `stock_monitoring_${selectedMonth.toISOString().slice(0, 7)}.xlsx`);
    };


  return (
    <PanelContainer title='Fuel Stock Management'>
        <div className="p-4 bg-white dark:bg-boxdark rounded-lg shadow-sm">
            {/* Header Controls */}
            <div className="flex justify-between items-center mb-6">
                <div className="flex gap-4 items-center">
                    <input 
                        type="month" 
                        value={selectedMonth.toISOString().slice(0, 7)}
                        onChange={(e) => setSelectedMonth(new Date(e.target.value))}
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
            <div className="mb-8">
                <ReactApexChart options={chartOptions} series={chartSeries} type="line" height={350} />
            </div>

            {/* Horizontal Scrollable Table */}
            <div className="overflow-x-auto pb-4">
                <table className="min-w-full border-collapse border border-stroke dark:border-strokedark text-sm">
                    <thead>
                        <tr>
                            <th className="border border-stroke dark:border-strokedark p-2 bg-gray-100 dark:bg-meta-4 min-w-[150px] sticky left-0 z-10">Metric / Date</th>
                            {daysInMonth.map(d => (
                                <th key={d.getDate()} className="border border-stroke dark:border-strokedark p-2 min-w-[80px] text-center">
                                    {d.getDate()}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {/* Site Stock Row */}
                        <tr>
                            <td className="border border-stroke dark:border-strokedark p-2 font-medium bg-gray-50 dark:bg-boxdark sticky left-0 z-10">Site Stock (L)</td>
                            {daysInMonth.map(d => (
                                <td key={d.getDate()} className="border border-stroke dark:border-strokedark p-2 text-right">
                                    {(dataMap.get(d.getDate())?.site_stock || 0).toLocaleString('id-ID')}
                                </td>
                            ))}
                        </tr>
                         {/* Port Stock Row */}
                         <tr>
                            <td className="border border-stroke dark:border-strokedark p-2 font-medium bg-gray-50 dark:bg-boxdark sticky left-0 z-10">Port Stock (L)</td>
                            {daysInMonth.map(d => (
                                <td key={d.getDate()} className="border border-stroke dark:border-strokedark p-2 text-right">
                                    {(dataMap.get(d.getDate())?.port_stock || 0).toLocaleString('id-ID')}
                                </td>
                            ))}
                        </tr>
                        {/* Fuel Usage Row */}
                         <tr>
                            <td className="border border-stroke dark:border-strokedark p-2 font-medium bg-gray-50 dark:bg-boxdark sticky left-0 z-10">Fuel Usage (L)</td>
                            {daysInMonth.map(d => (
                                <td key={d.getDate()} className="border border-stroke dark:border-strokedark p-2 text-right">
                                    {(dataMap.get(d.getDate())?.site_usage || 0).toLocaleString('id-ID')}
                                </td>
                            ))}
                        </tr>
                        {/* ITO Row */}
                        <tr className="bg-blue-50 dark:bg-blue-900/10">
                            <td className="border border-stroke dark:border-strokedark p-2 font-bold text-blue-700 sticky left-0 z-10">ITO (Days)</td>
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
                            <td className="border border-stroke dark:border-strokedark p-2 font-bold text-green-700 sticky left-0 z-10">Achievement (%)</td>
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

export default FuelStockManagement