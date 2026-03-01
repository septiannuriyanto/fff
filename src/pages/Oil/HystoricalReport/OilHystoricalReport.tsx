import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../db/SupabaseClient';
import { useTheme } from '../../../contexts/ThemeContext';
import { SelectPicker, DatePicker, Loader, Toggle } from 'rsuite';
import { formatDateForSupabase } from '../../../Utils/DateUtility';
import ThemedPanelContainer from '../../../common/ThemedComponents/ThemedPanelContainer';
import DeviationChart from '../../Dashboard/Operational/components/DeviationChart';
import { Toaster, toast } from 'react-hot-toast';
import ImportWarehouseTransferModal from './components/ImportWarehouseTransferModal';
import { Upload, ArrowRightLeft, Info, Filter } from 'lucide-react';

const OilHystoricalReport = () => {
    const { activeTheme } = useTheme();
    const theme = activeTheme;
    const isDark = theme.baseTheme === 'dark';
    const cardOpacity = theme.card.opacity;

    const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
    const [selectedCategory, setSelectedCategory] = useState<'Main' | 'Workshop' | 'Lubcar'>('Main');
    const [isLoading, setIsLoading] = useState(false);
    const [excludedTransferIds, setExcludedTransferIds] = useState<Set<string>>(new Set());
    const [reportData, setReportData] = useState<{ stocks: any[], transfers: any[] }>({ stocks: [], transfers: [] });
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    // Filter states
    const [selectedWarehouse, setSelectedWarehouse] = useState<string | null>(null);
    const [selectedOilType, setSelectedOilType] = useState<string | null>(null);

    const categoryPrefix = useMemo(() => {
        switch (selectedCategory) {
            case 'Main': return 'OM%';
            case 'Workshop': return 'OW%';
            case 'Lubcar': return 'OL%';
            default: return 'OM%';
        }
    }, [selectedCategory]);

    useEffect(() => {
        // Reset filters when category changes
        setSelectedWarehouse(null);
        setSelectedOilType(null);
    }, [selectedCategory]);

    const warehouseOptions = useMemo(() => {
        const warehouses = Array.from(new Set(reportData.stocks.map(s => s.warehouse_id)));
        return warehouses.sort().map(w => ({ label: w, value: w }));
    }, [reportData.stocks]);

    const oilTypeOptions = useMemo(() => {
        const types = Array.from(new Set(reportData.stocks.map(s => s.item_description)));
        return types.sort().map(t => ({ label: t, value: t }));
    }, [reportData.stocks]);

    const fetchOilDeviationData = async () => {
        setIsLoading(true);
        try {
            const year = selectedMonth.getFullYear();
            const month = selectedMonth.getMonth();

            const startDate = new Date(year, month, 0); // Last day of previous month
            const endDate = new Date(year, month + 1, 0);

            const { data, error } = await supabase.rpc('get_oil_historical_report', {
                p_start_date: formatDateForSupabase(startDate),
                p_end_date: formatDateForSupabase(endDate),
                p_category_prefix: categoryPrefix
            });

            if (error) throw error;

            if (!data || (data.stocks.length === 0 && data.transfers.length === 0)) {
                setReportData({ stocks: [], transfers: [] });
                toast.error('No data found for the selected period and category');
                return;
            }

            setReportData(data);
        } catch (err: any) {
            console.error('Error fetching oil data:', err);
            toast.error('Failed to fetch data');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchOilDeviationData();
    }, [selectedMonth, selectedCategory]);

    const toggleTransfer = (id: string) => {
        setExcludedTransferIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const processedData = useMemo(() => {
        if (!reportData.stocks.length) return {};

        const year = selectedMonth.getFullYear();
        const month = selectedMonth.getMonth();
        const endDate = new Date(year, month + 1, 0);
        const daysInMonth = endDate.getDate();

        // Group stocks by warehouse_id | item_description
        const groupedStocks: { [key: string]: any[] } = {};
        reportData.stocks.forEach((item: any) => {
            const groupKey = `${item.warehouse_id} | ${item.item_description}`;
            if (!groupedStocks[groupKey]) groupedStocks[groupKey] = [];
            groupedStocks[groupKey].push(item);
        });

        // Group transfers by wh_to | item_description
        const groupedTransfers: { [key: string]: any[] } = {};
        reportData.transfers.forEach((tr: any) => {
            const groupKey = `${tr.wh_to} | ${tr.item_description}`;
            if (!groupedTransfers[groupKey]) groupedTransfers[groupKey] = [];
            groupedTransfers[groupKey].push(tr);
        });

        const charts: { [key: string]: any } = {};

        Object.keys(groupedStocks).forEach((groupKey) => {
            const records = groupedStocks[groupKey];
            const transfers = groupedTransfers[groupKey] || [];

            const daily: any[] = [];
            const cumulative: any[] = [];
            const stock: any[] = [];
            let cumulativeDev = 0;

            for (let day = 1; day <= daysInMonth; day++) {
                const currentTargetDate = new Date(year, month, day);
                const currentTargetDateStr = formatDateForSupabase(currentTargetDate);

                const yesterdayDate = new Date(year, month, day - 1);
                const yesterdayDateStr = formatDateForSupabase(yesterdayDate);

                const currentDateRecords = records.filter(r => r.date_dst === currentTargetDateStr);
                const yesterdayDateRecords = records.filter(r => r.date_dst === yesterdayDateStr);

                const qtyToday = currentDateRecords.reduce((sum, r) => sum + parseFloat(r.qty || '0'), 0);
                const qtyYesterday = yesterdayDateRecords.length > 0
                    ? yesterdayDateRecords.reduce((sum, r) => sum + parseFloat(r.qty || '0'), 0)
                    : (currentDateRecords.length > 0 ? qtyToday : 0);

                let deviation = currentDateRecords.length > 0 && yesterdayDateRecords.length > 0 ? qtyToday - qtyYesterday : 0;

                // Adjust based on included transfers
                const dailyTransfers = transfers.filter(t => t.transfer_date === currentTargetDateStr && !excludedTransferIds.has(t.transfer_id));
                const totalTransferReceived = dailyTransfers.reduce((sum, t) => sum + parseFloat(t.qty || '0'), 0);
                deviation = deviation - totalTransferReceived;

                daily.push({ date: currentTargetDateStr, total: deviation });
                cumulativeDev += deviation;
                cumulative.push({ date: currentTargetDateStr, total: cumulativeDev });
                stock.push({ date: currentTargetDateStr, total: qtyToday });
            }

            charts[groupKey] = { daily, cumulative, stock, transfers };
        });

        return charts;
    }, [reportData, selectedMonth, excludedTransferIds]);

    const filteredProcessedData = useMemo(() => {
        if (!selectedWarehouse && !selectedOilType) return processedData;

        const filtered: { [key: string]: any } = {};
        Object.keys(processedData).forEach(key => {
            const [warehouse, oilType] = key.split(' | ');
            const matchWarehouse = !selectedWarehouse || warehouse === selectedWarehouse;
            const matchOilType = !selectedOilType || oilType === selectedOilType;

            if (matchWarehouse && matchOilType) {
                filtered[key] = processedData[key];
            }
        });
        return filtered;
    }, [processedData, selectedWarehouse, selectedOilType]);

    return (
        <div className="flex flex-col gap-6 transition-all duration-300">
            <Toaster />
            <ThemedPanelContainer
                title="Oil Historical Stock Deviation"
                actions={
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-5 w-full lg:w-auto">
                        {/* Group 1: Scope & Period */}
                        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 w-full lg:w-auto">
                            {/* Category Selector */}
                            <div className="flex p-1 rounded-2xl bg-gray-100/30 dark:bg-white/5 backdrop-blur-md border border-white/20 dark:border-white/5 shadow-inner w-full md:w-auto">
                                {(['Main', 'Workshop', 'Lubcar'] as const).map((cat) => (
                                    <button
                                        key={cat}
                                        onClick={() => setSelectedCategory(cat)}
                                        className={`flex-1 md:flex-none relative px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${selectedCategory === cat
                                            ? 'bg-white dark:bg-white/10 shadow-[0_4px_12px_rgba(0,0,0,0.1)] text-blue-600 scale-[1.05]'
                                            : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                                            }`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>

                            {/* Month Picker */}
                            <div className="group flex items-center gap-2 px-3 py-1 rounded-2xl bg-white/10 dark:bg-white/5 backdrop-blur-md border border-white/20 dark:border-white/5 hover:border-blue-500/50 transition-all shadow-sm w-full md:w-auto">
                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-1 border-r border-gray-200 dark:border-white/10 pr-2 mr-1">Period</span>
                                <div className="flex-1 md:w-[125px]">
                                    <DatePicker
                                        format="MMMM yyyy"
                                        value={selectedMonth}
                                        onChange={(date) => date && setSelectedMonth(date)}
                                        cleanable={false}
                                        oneTap
                                        editable={false}
                                        appearance="subtle"
                                        size="xs"
                                        className="!w-full !bg-transparent custom-date-picker font-black text-blue-500 cursor-pointer"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="hidden lg:block h-6 w-[1px] bg-gray-200 dark:bg-white/10 mx-1" />

                        {/* Group 2: Contextual Filters */}
                        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 w-full lg:w-auto">
                            {/* Warehouse Filter */}
                            <div className="group flex items-center gap-2 px-3 py-1 rounded-2xl bg-white/10 dark:bg-white/5 backdrop-blur-md border border-white/20 dark:border-white/5 hover:border-blue-500/50 transition-all shadow-sm w-full md:w-auto">
                                <Filter className="w-3 h-3 text-gray-400 group-hover:text-blue-500 transition-colors" />
                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest border-r border-gray-200 dark:border-white/10 pr-2 mr-1">Whs</span>
                                <div className="flex-1 md:w-[100px]">
                                    <SelectPicker
                                        data={warehouseOptions}
                                        value={selectedWarehouse}
                                        onChange={setSelectedWarehouse}
                                        placeholder="All"
                                        size="xs"
                                        cleanable
                                        searchable={false}
                                        className="!bg-transparent custom-select-picker !text-[10px] font-bold"
                                        style={{ width: '100%' }}
                                    />
                                </div>
                            </div>

                            {/* Oil Type Filter */}
                            <div className="group flex items-center gap-2 px-3 py-1 rounded-2xl bg-white/10 dark:bg-white/5 backdrop-blur-md border border-white/20 dark:border-white/5 hover:border-blue-500/50 transition-all shadow-sm w-full md:w-auto">
                                <Filter className="w-3 h-3 text-gray-400 group-hover:text-blue-500 transition-colors" />
                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest border-r border-gray-200 dark:border-white/10 pr-2 mr-1">Oil</span>
                                <div className="flex-1 md:w-[120px]">
                                    <SelectPicker
                                        data={oilTypeOptions}
                                        value={selectedOilType}
                                        onChange={setSelectedOilType}
                                        placeholder="All"
                                        size="xs"
                                        cleanable
                                        searchable={false}
                                        className="!bg-transparent custom-select-picker !text-[10px] font-bold"
                                        style={{ width: '100%' }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="hidden lg:block h-6 w-[1px] bg-gray-200 dark:bg-white/10 mx-1" />

                        {/* Group 3: Global Actions */}
                        <div className="w-full lg:w-auto lg:ml-auto">
                            <button
                                onClick={() => setIsImportModalOpen(true)}
                                className="flex items-center justify-center gap-2 px-4 py-2 rounded-2xl bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.05] active:scale-95 group w-full"
                            >
                                <Upload className="w-3.5 h-3.5 group-hover:-translate-y-0.5 transition-transform" />
                                <span className="text-[10px] font-black uppercase tracking-wider">Import</span>
                            </button>
                        </div>
                    </div>
                }
            >
                <div
                    className="relative min-h-[400px] rounded-3xl p-8 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] overflow-hidden"
                    style={{
                        backgroundColor: isDark
                            ? `rgba(0, 0, 0, ${cardOpacity})`
                            : `rgba(255, 255, 255, ${cardOpacity})`,
                        backdropFilter: `blur(${cardOpacity * 40}px)`,
                        border: isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(255,255,255,0.3)',
                    }}
                >
                    {isLoading ? (
                        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/5 dark:bg-black/5 backdrop-blur-sm">
                            <div className="flex flex-col items-center gap-3">
                                <Loader size="md" content="Loading report..." vertical />
                            </div>
                        </div>
                    ) : Object.keys(filteredProcessedData).length > 0 ? (
                        <div className="grid grid-cols-1 gap-16">
                            {Object.keys(filteredProcessedData).map((groupKey) => (
                                <div key={groupKey} className="flex flex-col gap-6">
                                    <div className="flex items-center justify-between px-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-1.5 h-6 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
                                            <h3 className="text-lg font-black uppercase tracking-tight text-gray-800 dark:text-gray-100">
                                                {groupKey}
                                            </h3>
                                        </div>
                                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20">
                                            <Info className="w-3.5 h-3.5" />
                                            <span className="text-[9px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">
                                                Adjusted with selected transfers
                                            </span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                                        <div className="xl:col-span-2">
                                            <DeviationChart
                                                chartDataDaily={filteredProcessedData[groupKey].daily}
                                                chartDataCumulative={filteredProcessedData[groupKey].cumulative}
                                                chartDataStock={filteredProcessedData[groupKey].stock}
                                            />
                                        </div>

                                        <div className="flex flex-col gap-4">
                                            <div className="flex items-center gap-2 px-4">
                                                <ArrowRightLeft className="w-4 h-4 text-blue-500" />
                                                <h4 className="text-[11px] font-black uppercase tracking-widest text-gray-400">Warehouse Transfers</h4>
                                            </div>

                                            <div className="max-h-[300px] overflow-y-auto scrollbar-hide rounded-2xl overscroll-contain border border-gray-100 dark:border-white/10 shadow-inner">
                                                <table className="w-full text-left border-separate border-spacing-0">
                                                    <thead className="sticky top-0 z-[10]">
                                                        <tr>
                                                            <th className="sticky top-0 px-4 py-2.5 text-[9px] font-black uppercase tracking-tighter text-gray-500 bg-gray-100/90 dark:bg-white/10 backdrop-blur-md rounded-tl-2xl border-b border-gray-200/50 dark:border-white/5">Date/From</th>
                                                            <th className="sticky top-0 px-4 py-2.5 text-[9px] font-black uppercase tracking-tighter text-gray-500 text-right bg-gray-100/90 dark:bg-white/10 backdrop-blur-md border-b border-gray-200/50 dark:border-white/5">Qty</th>
                                                            <th className="sticky top-0 px-4 py-2.5 text-[9px] font-black uppercase tracking-tighter text-gray-500 text-center bg-gray-100/90 dark:bg-white/10 backdrop-blur-md rounded-tr-2xl border-b border-gray-200/50 dark:border-white/5">Use</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                                        {filteredProcessedData[groupKey].transfers.length > 0 ? (
                                                            filteredProcessedData[groupKey].transfers.map((tr: any) => (
                                                                <tr key={tr.transfer_id} className={`hover:bg-blue-500/5 transition-colors group ${excludedTransferIds.has(tr.transfer_id) ? 'opacity-40 grayscale' : ''}`}>
                                                                    <td className="px-4 py-2.5">
                                                                        <div className="flex flex-col">
                                                                            <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300">
                                                                                {new Date(tr.transfer_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                                                                            </span>
                                                                            <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest leading-none">
                                                                                {tr.wh_from}
                                                                            </span>
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-4 py-2.5 text-[10px] font-black text-gray-800 dark:text-gray-100 text-right">
                                                                        {parseFloat(tr.qty).toLocaleString()}
                                                                    </td>
                                                                    <td className="px-4 py-2.5 text-center">
                                                                        <Toggle
                                                                            size="xs"
                                                                            checked={!excludedTransferIds.has(tr.transfer_id)}
                                                                            onChange={() => toggleTransfer(tr.transfer_id)}
                                                                            className="scale-90"
                                                                        />
                                                                    </td>
                                                                </tr>
                                                            ))
                                                        ) : (
                                                            <tr>
                                                                <td colSpan={3} className="px-4 py-8 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest opacity-50">
                                                                    No transfers found
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-4">
                            <div className="p-6 rounded-full bg-gray-100 dark:bg-white/5">
                                <svg className="w-12 h-12 opacity-20" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c0 1.1.9-2 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 10h2v7H7zm4-3h2v10h-2zm4 6h2v4h-2z" />
                                </svg>
                            </div>
                            <p className="font-bold uppercase tracking-widest text-xs opacity-50">No report records found</p>
                        </div>
                    )}
                </div>
            </ThemedPanelContainer>

            <ImportWarehouseTransferModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onSuccess={() => fetchOilDeviationData()}
            />
        </div>
    );
};

export default OilHystoricalReport;