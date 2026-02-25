import React, { useState, useEffect } from "react";
import { supabase } from "../../../db/SupabaseClient";
import { useTheme } from "../../../contexts/ThemeContext";
import ThemedGlassmorphismPanel from "../../../common/ThemedComponents/ThemedGlassmorphismPanel";
import {
    formatDateForSupabase,
    formatDateToString,
    getOperationalDate,
    getOperationalShift,
} from "../../../Utils/DateUtility";
import toast, { Toaster } from "react-hot-toast";
import ThemedGrid from "../../../common/ThemedComponents/ThemedGrid";
import { shareMessageToWhatsapp } from "../../../functions/share_message";
import { createPortal } from "react-dom";
import { FaWhatsapp, FaTimes, FaCheckCircle } from "react-icons/fa";
import DatePickerOne from "../../../components/Forms/DatePicker/DatePickerOne";
import ShiftDropdown from "../../../components/Forms/SelectGroup/ShiftDropdown";

// Number formatting helpers
const formatDots = (val: string | number) => {
    if (val === undefined || val === null || val === "") return "";
    const numStr = val.toString().replace(/\D/g, "");
    return numStr.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

// Simple Section component if not exported from FuelmanReport
const LocalSection = ({ title, children }: { title: string; children: React.ReactNode }) => {
    const { activeTheme } = useTheme();
    return (
        <ThemedGlassmorphismPanel className="p-4 space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider opacity-60 px-1" style={{ color: activeTheme.popup.textColor }}>
                {title}
            </h2>
            {children}
        </ThemedGlassmorphismPanel>
    );
};

export default function CoordinatorReport() {
    const { activeTheme } = useTheme();
    const [reports, setReports] = useState<any[]>([]);
    const [selectedReport, setSelectedReport] = useState<any | null>(null);
    const [reportDetail, setReportDetail] = useState<{
        ritasi: any[],
        transfers: any[],
        flowmeter: any[],
        tmr: any[],
        stock: any[]
    } | null>(null);
    const [isLoadingDetail, setIsLoadingDetail] = useState(false);

    // FT Readiness state
    const [ftReadiness, setFtReadiness] = useState<any[]>([]);
    const [isLoadingFT, setIsLoadingFT] = useState(false);

    // Filters for Readiness
    const [filterDate, setFilterDate] = useState<Date>(getOperationalDate());
    const [filterShift, setFilterShift] = useState<boolean>(getOperationalShift() === 1);

    useEffect(() => {
        fetchRecentReports();
        fetchFTReadiness();
    }, [filterDate, filterShift]);

    const fetchFTReadiness = async () => {
        setIsLoadingFT(true);
        try {
            const targetDate = formatDateForSupabase(filterDate);
            const targetShift = filterShift ? 1 : 2;

            // 1. Get fuelman reports for today/shift
            const { data: reportsData, error: reportsError } = await supabase
                .from('fuelman_reports')
                .select('id')
                .eq('report_date', targetDate)
                .eq('shift', targetShift);

            if (reportsError) throw reportsError;

            if (!reportsData || reportsData.length === 0) {
                setFtReadiness([]);
                return;
            }

            const reportIds = reportsData.map(r => r.id);

            // 2. Get existing readiness for these reports
            const { data: readData, error: readError } = await supabase
                .from('fuelman_report_readiness')
                .select('*')
                .in('report_id', reportIds);

            if (readError) throw readError;

            // Map it to fit the UI and WhatsApp formatter
            setFtReadiness((readData || []).map(r => ({
                unit_id: r.warehouse_id, // Map warehouse_id to unit_id for formatter
                warehouse_id: r.warehouse_id,
                readiness: r.status,
                location: r.location || '',
                remark: r.remark || '',
                isSaved: true
            })));
        } catch (err) {
            console.error("Failed to fetch FT readiness:", err);
            toast.error("Failed to fetch FT readiness data.");
        } finally {
            setIsLoadingFT(false);
        }
    };

    const fetchRecentReports = async () => {
        try {
            const targetDate = formatDateForSupabase(filterDate);
            const targetShift = filterShift ? 1 : 2;

            const { data, error } = await supabase
                .from('fuelman_reports')
                .select(`
          *,
          fuelman:manpower!fuelman_reports_fuelman_id_fkey(nama),
          operator:manpower!fuelman_reports_operator_id_fkey(nama)
        `)
                .eq('report_date', targetDate)
                .eq('shift', targetShift)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;
            setReports(data || []);
        } catch (err) {
            console.error("Failed to fetch reports:", err);
        }
    };

    const handleRowClicked = async (event: any) => {
        const reportId = event.data.id;
        setSelectedReport(event.data);
        setIsLoadingDetail(true);
        try {
            const { data: ritasi } = await supabase.from('fuelman_report_ritasi').select('*').eq('report_id', reportId);
            const { data: transfers } = await supabase.from('fuelman_report_transfers').select('*').eq('report_id', reportId);
            const { data: flowmeter } = await supabase.from('fuelman_report_flowmeter').select('*').eq('report_id', reportId);
            const { data: tmr } = await supabase.from('fuelman_report_tmr').select('*, area:area(major_area)').eq('report_id', reportId);
            const { data: stock } = await supabase.from('fuelman_report_stock').select('*').eq('report_id', reportId);

            setReportDetail({
                ritasi: ritasi || [],
                transfers: transfers || [],
                flowmeter: flowmeter || [],
                tmr: tmr || [],
                stock: stock || []
            });
        } catch (err) {
            console.error("Failed to fetch report details:", err);
            toast.error("Failed to load details");
        } finally {
            setIsLoadingDetail(false);
        }
    };

    const handleShareDailyReport = async () => {
        try {
            const targetDate = formatDateForSupabase(filterDate);
            const targetShift = filterShift ? 1 : 2;

            toast.loading("Gathering reports for " + targetDate + " Shift " + targetShift);

            const { data: reportsData, error: reportsError } = await supabase
                .from('fuelman_reports')
                .select('id, ft_number')
                .eq('report_date', targetDate)
                .eq('shift', targetShift);

            if (reportsError) throw reportsError;

            console.log(`Debug: Fetched ${reportsData?.length} fuelman reports for ${targetDate} Shift ${targetShift}`);
            if (reportsData) {
                console.log("Available Report FTs in Database:", reportsData.map(r => `[${r.ft_number}]`).join(", "));
            }

            if (!reportsData || reportsData.length === 0) {
                toast.dismiss();
                toast.error("No reports found for this date/shift");
                return;
            }

            const reportIds = reportsData.map((r: any) => r.id);

            const [ritasiRes, transfersRes, flowmeterRes, stockRes] = await Promise.all([
                supabase.from('fuelman_report_ritasi').select('ft_number, value').in('report_id', reportIds),
                supabase.from('fuelman_report_transfers').select('transfer_from, destination, transfer_out').in('report_id', reportIds),
                supabase.from('fuelman_report_flowmeter').select('unit_number, fm_awal, fm_akhir, usage').in('report_id', reportIds),
                supabase.from('fuelman_report_stock').select('unit_number, sonding_awal, sonding_akhir').in('report_id', reportIds),
            ]);

            const ritasi = ritasiRes.data || [];
            const transfers = transfersRes.data || [];
            const flowmeter = flowmeterRes.data || [];
            const stock = stockRes.data || [];

            toast.dismiss();

            let msg = `*REPORT DAILY FAO*\n`;
            msg += `*TANGGAL : ${formatDateToString(filterDate)}*\n`;
            msg += `*SHIFT : ${targetShift}*\n\n`;

            msg += `*ISSUING OUT (LITER)*\n`;
            flowmeter?.forEach(f => {
                msg += `${f.unit_number} = ${formatDots(f.usage || 0)}\n`;
            });
            const totalOutValue = flowmeter?.reduce((acc, f) => acc + Number(f.usage || 0), 0) || 0;
            msg += `*TOTAL FUEL OUT = ${formatDots(totalOutValue)} (LITER)*\n\n`;

            msg += `*RITASI (LITER)*\n`;
            ritasi?.forEach(r => {
                msg += `${r.ft_number} = ${formatDots(r.value || 0)}\n`;
            });
            const totalInValue = ritasi?.reduce((acc, r) => acc + Number(r.value || 0), 0) || 0;
            msg += `*TOTAL FUEL IN = ${formatDots(totalInValue)} LITER*\n\n`;

            msg += `*WAREHOUSE TRANSFER*\n`;
            transfers?.forEach(t => {
                msg += `${t.transfer_from} > ${t.destination} = ${formatDots(t.transfer_out || 0)} (LTR)\n`;
            });
            msg += `\n`;

            msg += `*READINESS FT*\n`;
            ftReadiness.forEach((ft: any) => {
                msg += `${ft.unit_id} = ${ft.readiness} (${ft.location})\n`;
            });
            const rfuCount = ftReadiness.filter(ft => ft.readiness === 'RFU').length;
            msg += `*TOTAL FT RFU : ${rfuCount} UNIT*\n\n`;

            msg += `*SONDING AWAL - AKHIR (CM)*\n`;
            stock?.forEach(s => {
                msg += `${s.unit_number} = ${s.sonding_awal} - ${s.sonding_akhir}\n`;
            });
            msg += `\n`;

            msg += `*FLOWMETER AWAL - AKHIR*\n`;
            flowmeter?.forEach(f => {
                msg += `${f.unit_number} = ${formatDots(f.fm_awal || 0)}-${formatDots(f.fm_akhir || 0)}\n`;
            });
            msg += `\n`;
            msg += `*NOTE :*\n`;

            const bdUnits = ftReadiness.filter(ft => ft.readiness === 'BD');
            if (bdUnits.length > 0) {
                bdUnits.forEach(ft => {
                    msg += `- ${ft.unit_id} (${ft.location}) : ${ft.remark}\n`;
                });
            } else {
                msg += `-\n`;
            }
            msg += `\n`;

            shareMessageToWhatsapp(msg);
        } catch (err: any) {
            console.error("Share aggregation error:", err);
            toast.error("Failed to share daily report");
        }
    };

    const columnDefs = [
        { headerName: "Date", field: "report_date", width: 120, valueFormatter: (p: any) => p.value ? formatDateToString(new Date(p.value)) : "" },
        { headerName: "Shift", field: "shift", width: 80 },
        { headerName: "FT", field: "ft_number", width: 120 },
        { headerName: "Fuelman", valueGetter: (p: any) => p.data.fuelman?.nama || p.data.fuelman_id },
        { headerName: "Operator", valueGetter: (p: any) => p.data.operator?.nama || p.data.operator_id },
        { headerName: "Created", field: "created_at", width: 150, valueFormatter: (p: any) => new Date(p.value).toLocaleTimeString() },
    ];

    return (
        <div className="min-h-screen flex justify-center p-4">
            <Toaster />
            <div className="w-full max-w-md space-y-6">
                <ThemedGlassmorphismPanel className="p-4 space-y-4">
                    <h1 className="text-lg font-semibold" style={{ color: activeTheme.popup.textColor }}>
                        Coordinator Dashboard
                    </h1>
                    <p className="text-sm opacity-60" style={{ color: activeTheme.popup.textColor }}>
                        Monitoring and verifying fuelman reports for the current shift.
                    </p>
                    <button
                        onClick={fetchRecentReports}
                        className="w-full py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all text-xs font-semibold"
                        style={{ color: activeTheme.popup.textColor }}
                    >
                        Refresh Reports
                    </button>
                </ThemedGlassmorphismPanel>

                <LocalSection title="Recent Reports">
                    <div className="h-[500px] w-full mt-2">
                        <ThemedGrid
                            rowData={reports}
                            columnDefs={columnDefs}
                            onRowClicked={handleRowClicked}
                            pagination={true}
                            paginationPageSize={15}
                        />
                    </div>
                </LocalSection>

                {/* FT READINESS SUMMARY (VIEW ONLY) */}
                <LocalSection title="FT Readiness Summary">
                    <div className="space-y-4">
                        {isLoadingFT ? (
                            <div className="py-4 text-center flex flex-col items-center gap-2 opacity-50">
                                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                                <span className="text-xs">Fetching readiness...</span>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {ftReadiness.length > 0 ? (
                                    ftReadiness.map((ft, idx) => (
                                        <div key={ft.unit_id || idx} className="p-3 bg-white/5 border border-white/10 rounded-xl flex flex-col gap-1">
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="font-bold" style={{ color: activeTheme.popup.textColor }}>
                                                    {ft.warehouse_id}
                                                </span>
                                                <span className={`font-bold ${ft.readiness === 'BD' ? 'text-red-500' : 'text-green-500'}`}>
                                                    {ft.readiness}
                                                </span>
                                            </div>
                                            <div className="text-[10px] opacity-60" style={{ color: activeTheme.popup.textColor }}>
                                                {ft.location || 'No Location'}
                                                {ft.remark && <span className="text-orange-400 ml-1 italic">- {ft.remark}</span>}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="py-4 text-center text-xs opacity-50" style={{ color: activeTheme.popup.textColor }}>
                                        No readiness data submitted yet.
                                    </div>
                                )}
                            </div>
                        )}

                        <button
                            onClick={handleShareDailyReport}
                            className="w-full py-3 mt-4 flex items-center justify-center gap-2 bg-green-600/20 text-green-500 border border-green-500/20 rounded-xl hover:bg-green-600 hover:text-white transition-all font-semibold"
                        >
                            <FaWhatsapp size={20} />
                            Send Daily Report to Group
                        </button>
                    </div>
                </LocalSection>

                {/* SELECTED REPORT DETAIL MODAL */}
                {
                    selectedReport && createPortal(
                        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
                            <ThemedGlassmorphismPanel className="w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden relative shadow-2xl border border-white/20">
                                <button
                                    onClick={() => setSelectedReport(null)}
                                    className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors z-10"
                                    style={{ color: activeTheme.popup.textColor }}
                                >
                                    <FaTimes />
                                </button>

                                <div className="p-6 overflow-y-auto">
                                    <h2 className="font-bold text-xl mb-6 pr-8" style={{ color: activeTheme.popup.textColor }}>
                                        Report Detail: {selectedReport.ft_number}
                                        <span className="block text-sm font-normal opacity-50 mt-1">
                                            {formatDateToString(new Date(selectedReport.report_date))} • {selectedReport.shift === 1 ? 'Shift 1' : 'Shift 2'}
                                        </span>
                                    </h2>

                                    {isLoadingDetail ? (
                                        <div className="py-20 text-center flex flex-col items-center gap-4">
                                            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                                            <p className="opacity-50">Fetching detail data...</p>
                                        </div>
                                    ) : reportDetail && (
                                        <div className="space-y-6">
                                            {/* Ritasi */}
                                            <DetailSegment title="Ritasi" data={reportDetail.ritasi} renderItem={(r) => (
                                                <div className="flex justify-between w-full">
                                                    <span>{r.ft_number}</span>
                                                    <span className="font-bold">{formatDots(r.value)} L</span>
                                                </div>
                                            )} />

                                            {/* Flowmeter */}
                                            <DetailSegment title="Flowmeter / Issuing" data={reportDetail.flowmeter} renderItem={(f) => (
                                                <div className="w-full">
                                                    <div className="flex justify-between text-sm">
                                                        <span>{f.unit_number}</span>
                                                        <span className="font-bold text-primary">{formatDots(f.usage)} L</span>
                                                    </div>
                                                    <div className="text-[10px] opacity-40 mt-1 flex justify-between">
                                                        <span>FM Awal: {formatDots(f.fm_awal)}</span>
                                                        <span>FM Akhir: {formatDots(f.fm_akhir)}</span>
                                                    </div>
                                                </div>
                                            )} />

                                            {/* Transfers */}
                                            <DetailSegment title="Warehouse Transfers" data={reportDetail.transfers} renderItem={(t) => (
                                                <div className="flex justify-between w-full">
                                                    <span>{t.transfer_from} → {t.destination}</span>
                                                    <span className="font-bold">{formatDots(t.transfer_out)} L</span>
                                                </div>
                                            )} />

                                            {/* Stock */}
                                            <DetailSegment title="Stock / Sonding" data={reportDetail.stock} renderItem={(s) => (
                                                <div className="w-full">
                                                    <div className="flex justify-between font-bold text-sm">
                                                        <span>{s.unit_number}</span>
                                                    </div>
                                                    <div className="text-xs opacity-70 mt-1">
                                                        Sonding: <span className="text-primary">{s.sonding_awal}</span> - <span className="text-primary">{s.sonding_akhir}</span> (CM)
                                                    </div>
                                                </div>
                                            )} />

                                            {/* TMR */}
                                            <DetailSegment title="TMR / Maintenance" data={reportDetail.tmr} renderItem={(item) => (
                                                <div className="w-full">
                                                    <div className="flex justify-between text-sm mb-1">
                                                        <span className="font-bold">{item.loader_id}</span>
                                                        <span className="opacity-60">{item.time_refueling}</span>
                                                    </div>
                                                    <div className="text-[10px] opacity-40">
                                                        {item.area?.major_area} • {item.location_detail}
                                                    </div>
                                                    {item.reason && (
                                                        <div className="text-[10px] mt-2 p-2 bg-white/5 rounded border border-white/5 italic">
                                                            "{item.reason}"
                                                        </div>
                                                    )}
                                                </div>
                                            )} />
                                        </div>
                                    )}
                                </div>

                                <div className="p-4 border-t border-white/10">
                                    <button
                                        onClick={() => setSelectedReport(null)}
                                        className="w-full py-4 bg-primary text-white rounded-xl font-bold shadow-lg hover:brightness-110 transition-all active:scale-[0.98]"
                                    >
                                        Done
                                    </button>
                                </div>
                            </ThemedGlassmorphismPanel>
                        </div>,
                        document.body
                    )
                }
            </div >
        </div >
    );
}
const DetailSegment = ({ title, data, renderItem }: { title: string, data: any[], renderItem: (item: any) => React.ReactNode }) => {
    const { activeTheme } = useTheme();
    if (!data || data.length === 0) return null;
    return (
        <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-widest opacity-40 ml-1" style={{ color: activeTheme.popup.textColor }}>{title}</h3>
            <div className="space-y-2">
                {data.map((item, idx) => (
                    <ThemedCard key={idx} className="p-4 shadow-sm">
                        {renderItem(item)}
                    </ThemedCard>
                ))}
            </div>
        </div>
    );
};

const ThemedCard = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => {
    const { activeTheme } = useTheme();
    return (
        <div
            className={`rounded-xl border border-white/10 bg-white/5 ${className}`}
            style={{ color: activeTheme.popup.textColor }}
        >
            {children}
        </div>
    );
};
