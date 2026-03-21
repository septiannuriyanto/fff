import React, { useState, useEffect } from 'react';
import { supabase } from '../../../db/SupabaseClient';
import PanelTemplate from '../../../components/Panels/PanelTemplate';
import ThemedGlassmorphismPanel from '../../../common/ThemedComponents/ThemedGlassmorphismPanel';
import { useTheme } from '../../../contexts/ThemeContext';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import ReactApexChart from 'react-apexcharts';
import { Calendar, BarChart2, Activity } from 'lucide-react';
import { ApexOptions } from 'apexcharts';

const IssuingFuel: React.FC = () => {
    const { activeTheme } = useTheme();

    const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));
    const [trendData, setTrendData] = useState<any[]>([]);
    const [unitData, setUnitData] = useState<any[]>([]);
    const [trendView, setTrendView] = useState<'Total' | 'Phase'>('Total');
    const [avgPhaseFilter, setAvgPhaseFilter] = useState<string>('All');
    const [loading, setLoading] = useState<boolean>(false);

    useEffect(() => {
        const loadDashboardData = async () => {
            if (!selectedMonth) return;
            setLoading(true);

            // Parse selected month
            const yearStr = selectedMonth.split('-')[0];
            const monthStr = selectedMonth.split('-')[1];
            const startDateObj = new Date(Number(yearStr), Number(monthStr) - 1, 1);
            
            const startStr = format(startOfMonth(startDateObj), 'yyyy-MM-dd');
            const endStr = format(endOfMonth(startDateObj), 'yyyy-MM-dd');

            try {
                // Fetch Daily Trend
                const { data: trendRes, error: trendErr } = await supabase.rpc('get_issuing_daily_trend', {
                    p_start_date: startStr,
                    p_end_date: endStr
                });

                if (!trendErr && trendRes) {
                    setTrendData(trendRes.map((item: any) => ({
                        date: format(new Date(item.issued_date), 'dd MMM'),
                        Total: Number(item.total_qty || 0),
                        'Phase 1': Number(item.phase_1_qty || 0),
                        'Phase 2': Number(item.phase_2_qty || 0),
                        'Phase 3': Number(item.phase_3_qty || 0)
                    })));
                }

                // Fetch Unit Averages
                const { data: unitRes, error: unitErr } = await supabase.rpc('get_average_daily_usage_by_unit_phase', {
                    p_start_date: startStr,
                    p_end_date: endStr
                });

                if (!unitErr && unitRes) {
                    setUnitData(unitRes.map((item: any) => ({
                        unit: item.unit_id,
                        'Phase All': Number(item.phase_all || 0),
                        'Phase 1': Number(item.phase_1 || 0),
                        'Phase 2': Number(item.phase_2 || 0),
                        'Phase 3': Number(item.phase_3 || 0)
                    })));
                }
            } catch (err) {
                console.error("Failed fetching analysis data:", err);
            } finally {
                setLoading(false);
            }
        };

        loadDashboardData();
    }, [selectedMonth]);

    // Theme Configs for ApexCharts
    const getBaseOptions = (): ApexOptions => ({
        chart: {
            toolbar: { show: false },
            background: 'transparent',
            foreColor: activeTheme?.isDark || activeTheme?.baseTheme === 'dark' ? '#94a3b8' : '#64748b',
        },
        theme: {
            mode: activeTheme?.isDark || activeTheme?.baseTheme === 'dark' ? 'dark' : 'light',
        },
        tooltip: {
            theme: activeTheme?.isDark || activeTheme?.baseTheme === 'dark' ? 'dark' : 'light',
        },
        dataLabels: { enabled: false },
        stroke: { curve: 'smooth', width: 2 },
        grid: {
            borderColor: activeTheme?.isDark || activeTheme?.baseTheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
            strokeDashArray: 4,
        }
    });

    // Chart 1 Options/Series - Trend
    const trendCategories = trendData.map(d => d.date);
    const trendOptions: ApexOptions = {
        ...getBaseOptions(),
        xaxis: { categories: trendCategories, tickPlacement: 'on' },
        colors: trendView === 'Total' 
            ? ['#3B82F6'] 
            : ['#10B981', '#F59E0B', '#6366F1']
    };

    const trendSeries = trendView === 'Total' 
        ? [{ name: 'Total Volume', data: trendData.map(d => d.Total) }]
        : [
            { name: 'Phase 1', data: trendData.map(d => d['Phase 1']) },
            { name: 'Phase 2', data: trendData.map(d => d['Phase 2']) },
            { name: 'Phase 3', data: trendData.map(d => d['Phase 3']) }
          ];

    // Chart 2 Options/Series - Unit Averages
    const unitCategories = unitData.map(d => d.unit);
    const unitOptions: ApexOptions = {
        ...getBaseOptions(),
        xaxis: { 
            categories: unitCategories, 
            tickPlacement: 'on',
            labels: {
                rotate: -45,
                style: { fontSize: '11px' }
            }
        },
        colors: avgPhaseFilter === 'All'
            ? ['#10B981', '#F59E0B', '#6366F1']
            : avgPhaseFilter === 'Phase 1' ? ['#10B981']
            : avgPhaseFilter === 'Phase 2' ? ['#F59E0B']
            : ['#6366F1'],
        plotOptions: {
            bar: {
                borderRadius: 4,
                columnWidth: '60%',
                dataLabels: {
                    position: 'top',
                }
            }
        },
        dataLabels: {
            enabled: true,
            offsetY: -18,
            style: {
                fontSize: '10px',
                fontWeight: 500,
                colors: [activeTheme?.isDark || activeTheme?.baseTheme === 'dark' ? '#CBD5E1' : '#334155'],
            },
            formatter: (val: number) => val > 0 ? val.toLocaleString('id-ID', { maximumFractionDigits: 0 }) : '',
        }
    };

    const unitSeries = avgPhaseFilter === 'All'
        ? [
            { name: 'Phase 1', data: unitData.map(d => d['Phase 1']) },
            { name: 'Phase 2', data: unitData.map(d => d['Phase 2']) },
            { name: 'Phase 3', data: unitData.map(d => d['Phase 3']) }
          ]
        : [{ 
            name: avgPhaseFilter, 
            data: unitData.map(d => d[avgPhaseFilter as keyof typeof d]) 
          }];


    return (
        <PanelTemplate>
            <div className="flex flex-col space-y-6 animate-fade-in-up pb-10">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-text-primary-light dark:text-text-primary-dark">
                            Issuing Analysis
                        </h1>
                        <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mt-1">
                            Analyze fuel issuing verification logs based on volume and refueling phases.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div 
                            className="flex items-center gap-2 px-3 py-2 border transition-all"
                            style={{
                                backgroundColor: activeTheme?.input?.color || 'transparent',
                                borderColor: activeTheme?.input?.borderColor || 'transparent',
                                borderRadius: activeTheme?.input?.borderRadius || '8px',
                            }}
                        >
                            <Calendar className="w-5 h-5 text-blue-500" />
                            <input
                                type="month"
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                style={{
                                    backgroundColor: 'transparent',
                                    color: activeTheme?.input?.textColor || 'inherit',
                                }}
                                className="border-none outline-none text-sm w-full cursor-pointer"
                            />
                        </div>
                    </div>
                </div>

                {/* Trend Chart Panel */}
                <ThemedGlassmorphismPanel activeTheme={activeTheme} className="p-5 overflow-visible">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                        <h2 className="text-lg font-semibold flex items-center gap-2 text-text-primary-light dark:text-text-primary-dark">
                            <Activity className="w-5 h-5 text-blue-500" />
                            Daily Issuing Volume
                        </h2>
                        
                        <div className="flex p-1 bg-element-light dark:bg-element-dark rounded-lg">
                            <button
                                onClick={() => setTrendView('Total')}
                                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                                    trendView === 'Total' 
                                    ? 'bg-blue-600 text-white shadow-md' 
                                    : 'text-text-secondary-light dark:text-text-secondary-dark hover:text-text-primary-light dark:hover:text-text-primary-dark'
                                }`}
                            >
                                Total
                            </button>
                            <button
                                onClick={() => setTrendView('Phase')}
                                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                                    trendView === 'Phase' 
                                    ? 'bg-blue-600 text-white shadow-md' 
                                    : 'text-text-secondary-light dark:text-text-secondary-dark hover:text-text-primary-light dark:hover:text-text-primary-dark'
                                }`}
                            >
                                By Phase
                            </button>
                        </div>
                    </div>

                    <div className="w-full h-[350px]">
                        {loading ? (
                            <div className="w-full h-full flex items-center justify-center text-text-secondary-light dark:text-text-secondary-dark">Loading chart data...</div>
                        ) : (
                            <ReactApexChart 
                                options={trendOptions} 
                                series={trendSeries} 
                                type={trendView === 'Total' ? 'area' : 'bar'} 
                                height="100%" 
                            />
                        )}
                    </div>
                </ThemedGlassmorphismPanel>

                {/* Unit Average Usage Panel */}
                <ThemedGlassmorphismPanel activeTheme={activeTheme} className="p-5 overflow-visible">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                        <h2 className="text-lg font-semibold flex items-center gap-2 text-text-primary-light dark:text-text-primary-dark">
                            <BarChart2 className="w-5 h-5 text-emerald-500" />
                            Average Unit Usage
                        </h2>
                        
                        <div className="relative">
                            <select
                                value={avgPhaseFilter}
                                onChange={(e) => setAvgPhaseFilter(e.target.value)}
                                style={{
                                    backgroundColor: activeTheme?.input?.color || 'transparent',
                                    color: activeTheme?.input?.textColor || 'inherit',
                                    borderColor: activeTheme?.input?.borderColor || 'transparent',
                                    borderRadius: activeTheme?.input?.borderRadius || '8px',
                                }}
                                className="appearance-none border text-sm px-4 py-2 pr-8 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer transition-all"
                            >
                                <option value="All" style={{ background: activeTheme?.input?.color, color: activeTheme?.input?.textColor }}>All Phases</option>
                                <option value="Phase 1" style={{ background: activeTheme?.input?.color, color: activeTheme?.input?.textColor }}>Phase 1 (Before 11:45)</option>
                                <option value="Phase 2" style={{ background: activeTheme?.input?.color, color: activeTheme?.input?.textColor }}>Phase 2 (Rest 11:45 - 13:15)</option>
                                <option value="Phase 3" style={{ background: activeTheme?.input?.color, color: activeTheme?.input?.textColor }}>Phase 3 (After 13:15)</option>
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2" style={{ color: activeTheme?.input?.textColor || 'inherit' }}>
                                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="w-full h-[400px]">
                        {loading ? (
                            <div className="w-full h-full flex items-center justify-center text-text-secondary-light dark:text-text-secondary-dark">Loading chart data...</div>
                        ) : (
                            <ReactApexChart 
                                options={unitOptions} 
                                series={unitSeries} 
                                type="bar" 
                                height="100%" 
                            />
                        )}
                    </div>
                </ThemedGlassmorphismPanel>

            </div>
        </PanelTemplate>
    );
};

export default IssuingFuel;
