import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  convertDateToYYYYMM,
  formatDateForSupabase,
} from '../../../../../Utils/DateUtility';
import { supabase } from '../../../../../db/SupabaseClient';
import RitationAction from '../../components/RitationAction';
import toast, { Toaster } from 'react-hot-toast';
import { formatNumberWithSeparator } from '../../../../../Utils/NumberUtility';
import '../utils/datestyles.css';
import {
  constructMessage,
  shareMessageToWhatsapp,
} from '../../../../../functions/share_message';
import RitationSubtotalByFTChart from '../../components/RitationSubtotalByFTChart';
import DailyRitationChart from '../../components/DailyRitationChart';
import DeviationChart from '../../components/DeviationChart';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faRotateLeft,
  faRotateRight,
  faUpload,
} from '@fortawesome/free-solid-svg-icons';
import {
  baseStorageUrl,
  uploadImage,
} from '../../../../../services/ImageUploader';
import Swal from 'sweetalert2';
import { DatePicker, Loader } from 'rsuite';
import AlertError from '../../../../UiElements/Alerts/AlertError';
import { useNavigate } from 'react-router-dom';
import { ReconcileFuelData } from '../ReconcileFuelData';
import RitationStatsPanel from '../components/RitationStatsPanel';

const MetricCard = ({ title, value, unit = '' }: { title: string; value: string | number; unit?: string }) => (
  <div className="p-2 rounded-xl bg-[#f0f2f5] dark:bg-[#1a1c1e] shadow-[4px_4px_8px_#d1d9e6,-4px_-4px_8px_#ffffff] dark:shadow-[4px_4px_8px_#000000,-4px_-4px_6px_#2a2c2e] border border-white/40 dark:border-white/5 flex flex-col gap-0.5 hover:scale-[1.02] transition-all group">
    <span className="text-[8px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{title}</span>
    <div className="flex items-baseline gap-1">
      <span className="text-base font-black dark:text-white tabular-nums group-hover:bg-clip-text group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-blue-500 group-hover:to-emerald-500 transition-all">{value}</span>
      {unit && <span className="text-[8px] text-gray-400 font-medium">{unit}</span>}
    </div>
  </div>
);

const RitationDashboard = () => {
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const [distributionViewMode, setDistributionViewMode] = useState<'day' | 'month'>('day');
  const [dataRitasi, setDataRitasi] = useState<RitasiFuelData[]>([]);
  const [dataRitasiMonthly, setDataRitasiMonthly] = useState<RitasiFuelData[]>([]);
  const [, setDataReconcile] = useState<ReconcileFuelData[]>([]);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [expandedImageId, setExpandedImageId] = useState<string | null>(null);
  const [rotationAngle, setRotationAngle] = useState<{ [key: string]: number }>(
    {},
  );
  const [ritationQtyPlan, setRitationQtyPlan] = useState<number>(0);
  const [ritationQtyTotal, setRitationQtyTotal] = useState<number>(0);
  const [metrics, setMetrics] = useState({
    avgRitasiPerDay: 0,
    prediksiSisaQty: 0,
    prediksiTotalQty: 0,
    planVsActual: 0,
    progressMtd: 0,
    sisaPoMtd: 0,
    qtyFuelPerRitasi: 0,
    totalDevMtd: 0,
    percentDevMtd: 0,
    avgDailyDev: 0,
    mostSingleDev: 0,
    leastSingleDev: 0
  });
  const [ritationDaily, setRitationDaily] = useState<Record<string, number>>(
    {},
  );
  const [reconcileDaily, setReconcileDaily] = useState<Record<string, number>>(
    {},
  );
  const [deviationDaily, setDeviationDaily] = useState<Record<string, number>>({});
  const [deviationCumulative, setDeviationCumulative] = useState<Record<string, number | null>>({});
  const [cumulativeQtySj, setCumulativeQtySj] = useState<Record<string, number | null>>({});
  const [poQtyRemaining, setPoQtyRemaining] = useState<Record<string, number | null>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isDistLoading, setIsDistLoading] = useState(false);

  const chartDataInput = useMemo(() => Object.entries(ritationDaily).map(([date, total]) => ({ date, total })), [ritationDaily]);
  const chartDataReconcile = useMemo(() => Object.entries(reconcileDaily).map(([date, total]) => ({ date, total })), [reconcileDaily]);
  const chartDataCumulativeInner = useMemo(() => Object.entries(cumulativeQtySj).map(([date, total]) => ({ date, total })), [cumulativeQtySj]);
  const chartDataPoBalance = useMemo(() => Object.entries(poQtyRemaining).map(([date, total]) => ({ date, total })), [poQtyRemaining]);
  const chartDataDeviationDaily = useMemo(() => Object.entries(deviationDaily).map(([date, total]) => ({ date, total: total ?? 0 })), [deviationDaily]);
  const chartDataDeviationCumulative = useMemo(() => Object.entries(deviationCumulative).map(([date, total]) => ({ date, total })), [deviationCumulative]);

  const navigate = useNavigate();

  const getDaysInMonth = (d: Date) => {
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  };

  const fetchRitationReport = async (targetDate: Date) => {
    setIsDistLoading(true);
    setDataRitasi([]); 
    
    const dateStr = formatDateForSupabase(targetDate);

    const { data: dataDaily, error: errorDaily } = await supabase
      .from('ritasi_fuel')
      .select(
        `
        *,
        fuelman:manpower!ritasi_fuel_fuelman_id_fkey(nrp, nama),
        operator:manpower!ritasi_fuel_operator_id_fkey(nrp, nama),
        unit:storage!ritasi_fuel_warehouse_id_fkey(warehouse_id, unit_id)
      `,
      )
      .eq('ritation_date', dateStr)
      .order('no_surat_jalan');

    if (errorDaily) {
      console.error(errorDaily);
      toast.error('Failed to fetch daily data');
      setIsDistLoading(false);
      return;
    }

    const enrichedData = (dataDaily || []).map((item: any) => ({
      ...item,
      fuelman_name: item.fuelman?.nama || 'Unknown',
      operator_name: item.operator?.nama || 'Unknown',
      unit: item.unit?.unit_id || 'Unknown',
    }));

    setDataRitasi(enrichedData as RitasiFuelData[]);

    const todayReconcile = enrichedData.map((item: any) => ({
      report_date: item.ritation_date,
      unit_id: item.warehouse_id,
      qty: item.qty_sonding || 0,
    })) as ReconcileFuelData[];
    setDataReconcile(todayReconcile);
    setIsDistLoading(false);
  };

  const fetchRitationMonthly = async (targetMonth: Date) => {
    const periodPrefix = `G${(targetMonth.getFullYear() % 100).toString().padStart(2, '0')}${(targetMonth.getMonth() + 1).toString().padStart(2, '0')}%`;

    setIsDistLoading(true);
    setDataRitasiMonthly([]); 
    
    const { data: dataMonthly, error: errorMonthly } = await supabase.rpc('rpc_get_fuel_trip_distribution_v2', {
      p_prefix: periodPrefix
    });

    if (errorMonthly) {
      console.error(errorMonthly);
      setIsDistLoading(false);
      return;
    }

    const reshapedData = (dataMonthly || []).map((item: any) => ({
      unit: item.unit_id || 'Unknown',
      qty_sj: item.total_qty || 0,
      frequency: item.frequency || 0,
    })) as unknown as RitasiFuelData[];

    setDataRitasiMonthly(reshapedData);
    setIsDistLoading(false);
  };

  const processAnalyticalDailyData = (analytics: any, currentPlan: number) => {
    const { daily_actuals, daily_reconciles, last_ritation_date } = analytics;
    
    const dInMonth = getDaysInMonth(selectedMonth);
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();

    const allDates: string[] = [];
    for (let d = 1; d <= dInMonth; d++) {
      allDates.push(formatDateForSupabase(new Date(year, month, d)) || '');
    }

    const lastDateStr = last_ritation_date ? last_ritation_date.split('T')[0] : null;

    const actualMap: Record<string, number> = {};
    const reconcileMap: Record<string, number> = {};
    
    allDates.forEach(dStr => {
      actualMap[dStr] = 0;
      reconcileMap[dStr] = 0;
    });

    (daily_actuals || []).forEach((item: any) => {
      const dStr = item.date.split('T')[0];
      actualMap[dStr] = item.qty;
    });
    setRitationDaily(actualMap);

    (daily_reconciles || []).forEach((item: any) => {
      const dStr = item.date.split('T')[0];
      reconcileMap[dStr] = item.qty;
    });
    setReconcileDaily(reconcileMap);

    let cumulativeSum = 0;
    let balance = currentPlan;
    const cumulativeObj: Record<string, number | null> = {};
    const poBalanceObj: Record<string, number | null> = {};
    const deviationByDate: Record<string, number> = {};
    let cumulativeDev = 0;
    const deviationCumulativeObj: Record<string, number | null> = {};

    allDates.forEach(dStr => {
      const qtyAct = actualMap[dStr] || 0;
      const qtyRec = reconcileMap[dStr] || 0;
      const dailyDev = qtyRec - qtyAct;
      deviationByDate[dStr] = dailyDev;

      if (lastDateStr && dStr <= lastDateStr) {
        cumulativeSum += qtyAct;
        balance -= qtyAct;
        cumulativeObj[dStr] = cumulativeSum;
        poBalanceObj[dStr] = balance;

        cumulativeDev += dailyDev;
        deviationCumulativeObj[dStr] = cumulativeDev;
      } else {
        cumulativeObj[dStr] = null;
        poBalanceObj[dStr] = null;
        deviationCumulativeObj[dStr] = null;
      }
    });

    setCumulativeQtySj(cumulativeObj);
    setPoQtyRemaining(poBalanceObj);
    setDeviationDaily(deviationByDate);
    setDeviationCumulative(deviationCumulativeObj);

    return { deviationByDate, lastDateStr };
  };

  const fetchRitationAnalytics = async () => {
    const periodStr = convertDateToYYYYMM(selectedMonth);
    const periodNum = parseInt(periodStr);
    const periodPrefix = `G${(selectedMonth.getFullYear() % 100).toString().padStart(2, '0')}${(selectedMonth.getMonth() + 1).toString().padStart(2, '0')}%`;
    
    const { data, error } = await supabase.rpc('rpc_get_ritation_dashboard_analytics', {
      p_prefix: periodPrefix,
      p_period: periodNum
    });

    if (error) {
      console.error('Error fetching consolidated analytics:', error.message);
      return null;
    }
    return data;
  };

  const [poDoc, setPoDoc] = useState<any>(undefined);
  const [baRequest, setBaRequest] = useState<string | undefined>(undefined);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setIsModalOpen(false);
      }
    };
    if (isModalOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isModalOpen]);

  const showPoDetail = (url: string | undefined) => {
    if (!url) { alert('PO document URL not available.'); return; }
    setPdfUrl(url);
    setIsModalOpen(true);
  };

  const showBaRequestDetail = (url: string | undefined) => {
    if (!url) { alert('BA request document URL not available.'); return; }
    setPdfUrl(url);
    setIsModalOpen(true);
  };

  useEffect(() => {
    const fetchMonthlyData = async () => {
      setIsLoading(true);
      const analytics = await fetchRitationAnalytics();
      if (analytics) {
        const {
          last_ritation_date,
          plan_qty,
          ba_request_url,
          po_number,
          po_doc_url,
          po_qty,
          po_remaining_qty,
          total_actual_qty,
          total_actual_count,
        } = analytics;

        setRitationQtyPlan(plan_qty);
        setRitationQtyTotal(total_actual_qty);
        setBaRequest(ba_request_url);
        setPoDoc({
          po_number,
          doc_url: po_doc_url,
          po_qty,
          remaining_qty: po_remaining_qty
        });

        const { deviationByDate: devDaily, lastDateStr: lds } = processAnalyticalDailyData(analytics, plan_qty);

        const deviationValues = Object.entries(devDaily)
          .filter(([dStr]) => lds && dStr <= lds)
          .map(([_, val]) => val);
        
        const totalDevMtd = deviationValues.reduce((acc, v) => acc + v, 0);

        const daysInMonth = getDaysInMonth(selectedMonth);
        const lastDateWithData = last_ritation_date ? new Date(last_ritation_date) : null;
        const elapsed = lastDateWithData ? lastDateWithData.getDate() : 0;
        const remaining = Math.max(0, daysInMonth - elapsed);

        const avg = total_actual_qty / (elapsed || 1);
        const sisaPred = avg * remaining;
        const totalPred = total_actual_qty + sisaPred;
        const vsPlan = plan_qty > 0 ? (totalPred / plan_qty) * 100 : 0;
        const progressMtd = plan_qty > 0 ? (total_actual_qty / plan_qty) * 100 : 0;

        setMetrics({
          avgRitasiPerDay: avg,
          prediksiSisaQty: sisaPred,
          prediksiTotalQty: totalPred,
          planVsActual: vsPlan,
          progressMtd: progressMtd,
          sisaPoMtd: Math.max(0, plan_qty - total_actual_qty),
          qtyFuelPerRitasi: total_actual_count > 0 ? total_actual_qty / total_actual_count : 0,
          totalDevMtd: totalDevMtd || 0,
          percentDevMtd: total_actual_qty > 0 ? (totalDevMtd / total_actual_qty) * 100 : 0,
          avgDailyDev: deviationValues.length > 0 ? totalDevMtd / deviationValues.length : 0,
          mostSingleDev: deviationValues.length > 0 ? Math.max(...deviationValues) : 0,
          leastSingleDev: deviationValues.length > 0 ? Math.min(...deviationValues) : 0
        });
      }
      setIsLoading(false);
    };
    fetchMonthlyData();
  }, [selectedMonth]);

  useEffect(() => {
    if (distributionViewMode === 'month') {
      fetchRitationMonthly(selectedMonth);
    }
  }, [selectedMonth, distributionViewMode]);

  useEffect(() => {
    if (distributionViewMode === 'day') {
      fetchRitationReport(selectedDay);
    }
  }, [selectedDay, distributionViewMode]);

  const handleMonthChange = async (date: Date | null) => {
    if (date) setSelectedMonth(date);
  };

  const handleDayChange = async (date: Date | null) => {
    console.log('Day Changed:', date);
    if (date) setSelectedDay(date);
  };

  const handleDelete = async (id: string) => {
    console.log(id);
    Swal.fire({
      title: 'Delete?',
      text: 'Tindakan ini tidak dapat dibatalkan',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Ya, Hapus!',
    }).then(async (result) => {
      if (result.isConfirmed) {
        const { error } = await supabase
          .from('ritasi_fuel')
          .delete()
          .eq('no_surat_jalan', id);
        if (error) {
          toast.error('Gagal menghapus data');
        } else {
          toast.success('Data terhapus');
          setDataRitasi((prevRecords) =>
            prevRecords.filter((record) => record.no_surat_jalan !== id),
          );
          // Trigger analytical refresh
          setIsLoading(true);
          const analytics = await fetchRitationAnalytics();
          if (analytics) {
            processAnalyticalDailyData(analytics, ritationQtyPlan);
          }
          setIsLoading(false);
        }
      }
    });
  };

  const handleEdit = (id: string) => {
    navigate(`/reporting/ritation/${id}`);
  };

  const handleApprove = async (id: string) => {
    const row = dataRitasi.find((row) => row.no_surat_jalan === id);
    if (!row) return;

    const { error } = await supabase
      .from('ritasi_fuel')
      .update({ is_approved: !row.is_approved })
      .eq('no_surat_jalan', id);

    if (error) {
      toast.error('Failed to update status');
    } else {
      toast.success(row.is_approved ? 'Approval revoked' : 'Approved');
      setDataRitasi((prevRows) =>
        prevRows.map((row) =>
          row.no_surat_jalan === id
            ? { ...row, is_approved: !row.is_approved }
            : row,
        ),
      );
    }
  };

  const handleShare = (row: RitasiFuelData) => {
    const msg = constructMessage(row);
    shareMessageToWhatsapp(msg);
  };

  const handleImageClick = (rowId: string, urlType: string) => {
    setExpandedImageId(expandedImageId === `${rowId}-${urlType}` ? null : `${rowId}-${urlType}`);
  };

  const rotateLeft = (rowId: string, urlType: string) => {
    setRotationAngle((prev) => ({
      ...prev,
      [`${rowId}-${urlType}`]: (prev[`${rowId}-${urlType}`] || 0) - 90,
    }));
  };

  const rotateRight = (rowId: string, urlType: string) => {
    setRotationAngle((prev) => ({
      ...prev,
      [`${rowId}-${urlType}`]: (prev[`${rowId}-${urlType}`] || 0) + 90,
    }));
  };

  const reuploadImage = async (rowId: string, urlType: string, file: File) => {
    try {
      const { imageUrl, error } = await uploadImage(
        file,
        urlType.replace('_url', ''),
        rowId,
        (progress) => console.log(progress),
      );
      if (error) throw new Error(error);
      const { error: dbError } = await supabase
        .from('ritasi_fuel')
        .update({ [urlType]: imageUrl })
        .eq('no_surat_jalan', rowId);
      if (dbError) throw dbError;
      toast.success('Image re-uploaded');
      fetchRitationReport(selectedDay);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="flex flex-col gap-4 transition-all duration-300">
      <div className="w-full">
        <div className="w-full">
          <div className="header flex mb-4 items-center justify-between border-b border-gray-100 dark:border-white/5 pb-2">
            <h2 className="mb-0 font-bold text-black dark:text-white text-xl">
              Ritation Dashboard
            </h2>
            <Toaster />
          </div>

          <div className="ritation__table w-full space-y-4">
            <div className="grid grid-cols-1 gap-6">
              <div className="w-full">
                <RitationStatsPanel
                  panelTitle="Monthly Progress (Liter)"
                  selectedMonth={selectedMonth}
                  onMonthChange={handleMonthChange}
                  isLoading={isLoading}
                  ritationProgress={
                    ((ritationQtyTotal / (ritationQtyPlan || 1)) * 100).toFixed(2) + '%'
                  }
                  ritationQty={ritationQtyTotal}
                  planQty={ritationQtyPlan}
                  poDoc={poDoc?.po_number}
                  onShowPoDoc={() => showPoDetail(poDoc?.doc_url)}
                  onShowBaRequest={() => showBaRequestDetail(baRequest)}
                />
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-1 gap-6">
                <DailyRitationChart chartDataInput={chartDataInput} chartDataReconcile={chartDataReconcile} chartDataCumulative={chartDataCumulativeInner} chartDataPoBalance={chartDataPoBalance} />
                <div className="rounded-2xl bg-white/40 dark:bg-black/20 backdrop-blur-md p-6 border border-white/20 dark:border-white/5 shadow-sm">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <MetricCard title="Avg Ritasi/Day" value={formatNumberWithSeparator(parseFloat(metrics.avgRitasiPerDay.toFixed(0)))} unit="Liter" />
                    <MetricCard title="Prediction Sisa" value={formatNumberWithSeparator(parseFloat(metrics.prediksiSisaQty.toFixed(0)))} unit="Liter" />
                    <MetricCard title="Prediction Total" value={formatNumberWithSeparator(parseFloat(metrics.prediksiTotalQty.toFixed(0)))} unit="Liter" />
                    <MetricCard title="Plan vs Actual" value={metrics.planVsActual.toFixed(1)} unit="%" />
                    <MetricCard title="Progress MTD" value={metrics.progressMtd.toFixed(1)} unit="%" />
                    <MetricCard title="Sisa PO MTD" value={formatNumberWithSeparator(parseFloat(metrics.sisaPoMtd.toFixed(0)))} unit="Liter" />
                    <MetricCard title="Qty/Ritasi" value={formatNumberWithSeparator(parseFloat(metrics.qtyFuelPerRitasi.toFixed(0)))} unit="Liter" />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <DeviationChart 
                  chartDataDaily={chartDataDeviationDaily}
                  chartDataCumulative={chartDataDeviationCumulative}
                />
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mt-4">
                  <MetricCard title="Total Deviasi MTD" value={formatNumberWithSeparator(parseFloat(metrics.totalDevMtd.toFixed(0)))} unit="Liter" />
                  <MetricCard title="Percent MTD Deviation" value={metrics.percentDevMtd.toFixed(2)} unit="%" />
                  <MetricCard title="Avg Daily Deviation" value={formatNumberWithSeparator(parseFloat(metrics.avgDailyDev.toFixed(1)))} unit="Liter" />
                  <MetricCard title="Most Single Deviation" value={formatNumberWithSeparator(parseFloat(metrics.mostSingleDev.toFixed(0)))} unit="Liter" />
                  <MetricCard title="Least Single Deviation" value={formatNumberWithSeparator(parseFloat(metrics.leastSingleDev.toFixed(0)))} unit="Liter" />
                </div>
              </div>

              {ritationQtyPlan <= 0 && (
                <AlertError
                  title="Plan Ritasi Belum Terinput"
                  subtitle="Upload berita acara plan ritasi bulan ini"
                  onClickEvent={() => navigate('/plan/fuelritationplan')}
                />
              )}

              <div className="relative rounded-3xl bg-white/20 dark:bg-black/30 backdrop-blur-xl border border-white/20 dark:border-white/5 p-8 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)]">
                {isDistLoading && (
                  <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/10 dark:bg-black/20 backdrop-blur-sm rounded-3xl">
                    <div className="flex flex-col items-center gap-3">
                      <Loader size="md" content="Loading data..." vertical />
                    </div>
                  </div>
                )}
                
                <div className={`transition-all duration-300 ${isDistLoading ? 'opacity-30 blur-[2px]' : ''}`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
                    <div className="flex flex-col gap-1.5">
                      <h4 className="text-xl font-black uppercase tracking-tight text-gray-800 dark:text-gray-100 flex items-center gap-3">
                        <div className="w-1.5 h-8 bg-blue-500 rounded-full"></div>
                        {distributionViewMode === 'day' ? 'Daily' : 'Monthly'} Fuel Trip Distribution
                      </h4>
                      <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] ml-4">
                        {distributionViewMode === 'day' ? (
                          <>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            Live stats per specific date
                          </>
                        ) : 'Full month performance overview'}
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="flex p-1.5 rounded-2xl bg-gray-100/30 dark:bg-white/5 backdrop-blur-md border border-white/20 dark:border-white/5 shadow-inner">
                        <button 
                          onClick={() => setDistributionViewMode('day')}
                          className={`relative px-6 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all duration-300 ${distributionViewMode === 'day' ? 'bg-white dark:bg-white/10 shadow-[0_4px_12px_rgba(0,0,0,0.1)] text-blue-600 scale-[1.05]' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}
                        >
                          Daily
                        </button>
                        <button 
                          onClick={() => setDistributionViewMode('month')}
                          className={`relative px-6 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all duration-300 ${distributionViewMode === 'month' ? 'bg-white dark:bg-white/10 shadow-[0_4px_12px_rgba(0,0,0,0.1)] text-blue-600 scale-[1.05]' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}
                        >
                          Monthly
                        </button>
                      </div>

                      {distributionViewMode === 'day' && (
                        <div className="group flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-white/10 dark:bg-white/5 backdrop-blur-md border border-white/20 dark:border-white/5 hover:border-blue-500/50 transition-all shadow-sm relative z-20">
                          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-2">Filter</span>
                          <div className="w-[120px]cursor-pointer">
                            <DatePicker
                              format="dd MMM yyyy"
                              value={selectedDay}
                              onChange={handleDayChange}
                              cleanable={false}
                              oneTap
                              editable={false}
                              appearance="subtle"
                              size="xs"
                              placement="bottomEnd"
                              container={document.body}
                              className="!w-full !bg-transparent custom-date-picker font-bold text-blue-600 cursor-pointer"
                            
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <RitationSubtotalByFTChart 
                    data={distributionViewMode === 'day' ? dataRitasi : dataRitasiMonthly} 
                    viewMode={distributionViewMode}
                  />
                </div>
              </div>

              {distributionViewMode === 'day' && (
                <div className="mt-4 overflow-hidden rounded-xl border border-white/20 dark:border-white/10 shadow-md bg-white/40 dark:bg-black/10 backdrop-blur-md">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-white/5">
                    <thead className="bg-gray-50/50 dark:bg-black/40">
                      <tr>
                        <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">No</th>
                        <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">No Surat Jalan</th>
                        <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Fuelman</th>
                        <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Operator</th>
                        <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Unit</th>
                        <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Qty SJ</th>
                        <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Qty Sonding</th>
                        <th className="px-3 py-2 text-center text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-white/5">
                      {dataRitasi.map((row: any, index) => (
                        <React.Fragment key={row.no_surat_jalan}>
                          <tr className="hover:bg-white/60 dark:hover:bg-white/5 transition-all duration-200 group">
                            <td className="px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 tabular-nums">{index + 1}</td>
                            <td className="px-3 py-1.5 text-xs font-bold text-blue-600 dark:text-blue-400">{row.no_surat_jalan}</td>
                            <td className="px-3 py-1.5 text-xs text-gray-900 dark:text-gray-300">{row.fuelman_name}</td>
                            <td className="px-3 py-1.5 text-xs text-gray-900 dark:text-gray-300">{row.operator_name}</td>
                            <td className="px-3 py-1.5 text-xs text-gray-900 dark:text-gray-300">
                              <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-black/30 rounded text-[10px] font-bold text-gray-600 dark:text-gray-400">
                                {row.unit}
                              </span>
                            </td>
                            <td className="px-3 py-1.5 text-xs text-gray-900 dark:text-gray-300 font-bold text-right tabular-nums">{formatNumberWithSeparator(row.qty_sj)}</td>
                            <td className="px-3 py-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold text-right tabular-nums">{formatNumberWithSeparator(row.qty_sonding || 0)}</td>
                            <td className="px-3 py-1.5 text-xs">
                              <div className="flex items-center justify-center gap-1">
                                <button 
                                  onClick={() => setExpandedRow(expandedRow === row.no_surat_jalan ? null : row.no_surat_jalan)}
                                  className={`w-6 h-6 flex items-center justify-center rounded-full transition-all ${expandedRow === row.no_surat_jalan ? 'bg-blue-500 text-white rotate-180' : 'hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500'}`}
                                >
                                  <span className="text-[10px]">▼</span>
                                </button>
                                <RitationAction
                                  data={row}
                                  onApprove={() => handleApprove(row.no_surat_jalan)}
                                  onEdit={() => handleEdit(row.no_surat_jalan)}
                                  onDelete={() => handleDelete(row.no_surat_jalan)}
                                  onShare={() => handleShare(row)}
                                />
                              </div>
                            </td>
                          </tr>
                          {expandedRow === row.no_surat_jalan && (
                            <tr>
                              <td colSpan={8} className="px-6 py-6 bg-gray-50/50 dark:bg-black/30 backdrop-blur-md">
                                <div className="flex flex-col gap-6">
                                  <h4 className="text-sm font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                    Documentation
                                  </h4>
                                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {['sj_url', 'flowmeter_before_url', 'flowmeter_after_url'].map((urlType) => (
                                      <div key={urlType} className="flex flex-col gap-2">
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 text-center">
                                          {urlType.replace('_url', '').replace('_', ' ')}
                                        </span>
                                        <div className="relative group overflow-hidden rounded-xl border border-white/20 dark:border-white/10 shadow-md aspect-[4/3] bg-gray-100 dark:bg-black/40">
                                          {row[urlType] ? (
                                            <>
                                              <img 
                                                src={`${baseStorageUrl}/ritation_upload/${row.no_surat_jalan.slice(1,5)}/${row.no_surat_jalan}/${row[urlType]}`} 
                                                style={{ 
                                                  transform: `rotate(${rotationAngle[`${row.no_surat_jalan}-${urlType}`] || 0}deg)`,
                                                  transition: 'transform 0.5s ease-in-out'
                                                }}
                                                className={`w-full h-full object-cover cursor-pointer transition-all duration-700 ${expandedImageId === `${row.no_surat_jalan}-${urlType}` ? 'scale-100' : 'group-hover:scale-110'}`}
                                                alt={urlType}
                                                onClick={() => handleImageClick(row.no_surat_jalan, urlType)}
                                              />
                                              <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => rotateLeft(row.no_surat_jalan, urlType)} className="p-1 bg-black/50 text-white rounded hover:bg-black/70"><FontAwesomeIcon icon={faRotateLeft} size="xs" /></button>
                                                <button onClick={() => rotateRight(row.no_surat_jalan, urlType)} className="p-1 bg-black/50 text-white rounded hover:bg-black/70"><FontAwesomeIcon icon={faRotateRight} size="xs" /></button>
                                                <label className="p-1 bg-black/50 text-white rounded hover:bg-black/70 cursor-pointer">
                                                  <FontAwesomeIcon icon={faUpload} size="xs" />
                                                  <input type="file" className="hidden" onChange={(e) => e.target.files && reuploadImage(row.no_surat_jalan, urlType, e.target.files[0])} />
                                                </label>
                                              </div>
                                            </>
                                          ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 gap-2 border-2 border-dashed border-gray-200 dark:border-white/5 rounded-xl">
                                              <span className="text-[10px] font-bold">NO {urlType.replace('_url', '').toUpperCase()}</span>
                                              <label className="px-3 py-1 bg-blue-500 text-white text-[10px] font-bold rounded-full cursor-pointer hover:bg-blue-600 transition-colors uppercase">
                                                Upload
                                                <input type="file" className="hidden" onChange={(e) => e.target.files && reuploadImage(row.no_surat_jalan, urlType, e.target.files[0])} />
                                              </label>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* PDF Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div ref={modalRef} className="bg-white dark:bg-boxdark w-full max-w-5xl h-[90vh] rounded-2xl shadow-2xl relative overflow-hidden">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center bg-black/50 text-white rounded-full hover:bg-black/70 transition-all"
            >
              ✕
            </button>
            <iframe src={pdfUrl!} className="w-full h-full border-none"></iframe>
          </div>
        </div>
      )}
    </div>
  );
};

export default RitationDashboard;