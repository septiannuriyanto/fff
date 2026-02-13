import React, { useState, useEffect, useRef } from 'react';
import DatePickerOne from '../../../../components/Forms/DatePicker/DatePickerOne';
import {
  convertDateToYYYYMM,
  formatDateForSupabase,
  formatDateToString,
} from '../../../../Utils/DateUtility';
import { supabase } from '../../../../db/SupabaseClient';
import RitationAction from '../components/RitationAction';
import toast, { Toaster } from 'react-hot-toast';
import { formatNumberWithSeparator } from '../../../../Utils/NumberUtility';
import {
  constructMessage,
  shareMessageToWhatsapp,
} from '../../../../functions/share_message';
import RitationSubtotalByFTChart from '../components/RitationSubtotalByFTChart';
import LeftRightPanel from '../../../../components/LeftRightPanel';
import RitationValidationChart from '../components/RitationValidationChart';
import DailyRitationChart from '../components/DailyRitationChart';
import DeviationChart from '../components/DeviationChart';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFileExport,
  faRotateLeft,
  faRotateRight,
  faUpload,
} from '@fortawesome/free-solid-svg-icons';
import {
  baseStorageUrl,
  uploadImage,
} from '../../../../services/ImageUploader';
import Swal from 'sweetalert2';
import { DateRangePicker } from 'rsuite';
import './datestyles.css';
import { predefinedRanges } from './dateRanges';
import { downloadExcel } from '../../../../services/ExportToExcel';
import AlertError from '../../../UiElements/Alerts/AlertError';
import { useNavigate } from 'react-router-dom';
import { ReconcileFuelData } from './ReconcileFuelData';
import RitationStatsPanel from './components/RitationStatsPanel';

const MetricCard = ({ title, value, unit = '' }: { title: string; value: string | number; unit?: string }) => (
  <div className="p-2 rounded-xl bg-[#f0f2f5] dark:bg-[#1a1c1e] shadow-[4px_4px_8px_#d1d9e6,-4px_-4px_8px_#ffffff] dark:shadow-[4px_4px_8px_#000000,-4px_-4px_6px_#2a2c2e] border border-white/40 dark:border-white/5 flex flex-col gap-0.5 hover:scale-[1.02] transition-all group">
    <span className="text-[8px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{title}</span>
    <div className="flex items-baseline gap-1">
      <span className="text-base font-black dark:text-white tabular-nums group-hover:bg-clip-text group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-blue-500 group-hover:to-emerald-500 transition-all">{value}</span>
      {unit && <span className="text-[8px] text-gray-400 font-medium">{unit}</span>}
    </div>
  </div>
);

const Ritation = () => {
  const [date, setDate] = useState<Date | null>(new Date());
  const [dataRitasi, setDataRitasi] = useState<RitasiFuelData[]>([]);
  const [dataReconcile, setDataReconcile] = useState<ReconcileFuelData[]>([]);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [expandedImageId, setExpandedImageId] = useState<string | null>(null);
  const [rotationAngle, setRotationAngle] = useState<{ [key: string]: number }>(
    {},
  );
  const [ritationQtyPlan, setRitationQtyPlan] = useState<number>(0);
  const [ritationQtyTotal, setRitationQtyTotal] = useState<number>(0);
  const [ritationQtyToday, setRitationQtyToday] = useState<number>(0);
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

  const navigate = useNavigate();

  const getDaysInMonth = (d: Date) => {
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  };

  const calculateTotalQtySj = (data: RitasiFuelData[]): number => {
    return data.reduce((total, item) => total + item.qty_sj, 0);
  };

  const fetchRitationReport = async () => {
    const { data: dataRitasi, error: errorRitasi } = await supabase
      .from('ritasi_fuel')
      .select(
        `
        *,
        fuelman:manpower!ritasi_fuel_fuelman_id_fkey(nrp, nama),
        operator:manpower!ritasi_fuel_operator_id_fkey(nrp, nama),
        unit:storage!ritasi_fuel_warehouse_id_fkey(warehouse_id, unit_id)
      `,
      )
      .eq('ritation_date', formatDateToString(date!))
      .order('no_surat_jalan');

    if (errorRitasi) {
      console.log(errorRitasi);
      return;
    }

    const enrichedData = dataRitasi.map((item: any) => ({
      ...item,
      fuelman_name: item.fuelman?.nama || 'Unknown',
      operator_name: item.operator?.nama || 'Unknown',
      unit: item.unit?.unit_id || 'Unknown',
    }));

    const totalRitasi = calculateTotalQtySj(enrichedData as RitasiFuelData[]);
    setRitationQtyToday(totalRitasi);
    setDataRitasi(enrichedData as RitasiFuelData[]);

    const todayReconcile = enrichedData.map((item: any) => ({
      report_date: item.ritation_date,
      unit_id: item.warehouse_id,
      qty: item.qty_sonding || 0,
    })) as ReconcileFuelData[];
    setDataReconcile(todayReconcile);
  };

  const processAnalyticalDailyData = (analytics: any, currentPlan: number) => {
    const { daily_actuals, daily_reconciles, last_ritation_date } = analytics;
    
    const selectedDate = date || new Date();
    const dInMonth = getDaysInMonth(selectedDate);
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();

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
    if (!date) return null;
    const periodStr = convertDateToYYYYMM(date);
    const periodNum = parseInt(periodStr);
    const periodPrefix = `G${(date.getFullYear() % 100).toString().padStart(2, '0')}${(date.getMonth() + 1).toString().padStart(2, '0')}%`;
    
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
    const fetchAllData = async () => {
      if (!date) return;
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

        const daysInMonth = getDaysInMonth(date);
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

        await fetchRitationReport();
      }
      setIsLoading(false);
    };
    fetchAllData();
  }, [date]);


  const handleDateChange = async (date: Date | null) => {
    setDate(date);
  };

  // const handleDelete = async (id: string) => {
  //   console.log(id);

  // }

  const handleDelete = async (id: string) => {
    // Use SweetAlert2 for the confirmation dialog

    console.log(id);
    Swal.fire({
      title: 'Delete?',
      text: 'Tindakan ini tidak dapat dibatalkan',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Ya, Hapus Record!',
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          // Step 1: Delete the files within the folder (folder name is the 'id')
          const { data: fileList, error: listFilesError } =
            await supabase.storage
              .from('ritation_upload') // Replace with your actual bucket name
              .list(`${extractFullYear(id)}/${id}`); // List all files in the folder (the folder name is `id`)

          if (listFilesError) {
            console.error('Error listing folder contents:', listFilesError);
            Swal.fire('Error', 'Error listing folder contents.', 'error');
            return;
          }

          if (fileList && fileList.length > 0) {
            const filePaths = fileList.map(
              (file) => `${extractFullYear(id)}/${id}/${file.name}`,
            );
            const { error: deleteFilesError } = await supabase.storage
              .from('ritation_upload')
              .remove(filePaths);

            if (deleteFilesError) {
              console.error(
                'Error deleting files from storage:',
                deleteFilesError,
              );
              Swal.fire('Error', 'Error deleting files from storage.', 'error');
              return;
            }

            console.log('All files deleted from the folder.');
          } else {
            console.log('Folder is already empty or does not exist.');
            toast.error('Folder is already empty or does not exist.');
          }

          console.log('Folder deleted from Supabase storage.');

          // Step 2: Delete the record from Supabase
          const { error: deleteRecordError } = await supabase
            .from('ritasi_fuel') // Replace with your actual table name
            .delete()
            .eq('no_surat_jalan', id);

          if (deleteRecordError) {
            console.error('Error deleting record:', deleteRecordError);
            toast.error('Terjadi kesalahan saat menghapus record');
            return;
          }
          console.log('Record deleted from Supabase.');

          // Step 3: Remove from client-side records
          setDataRitasi((prevRecords) =>
            prevRecords.filter((record) => record.no_surat_jalan !== id),
          );

          toast.success('Record Deleted');
        } catch (error) {
          console.error('Error during deletion process:', error);
          toast.error('Terjadi kesalahan saat menghapus record');
        }
      }
    });
  };

  const handleEdit = async (id: string) => {
    console.log(id);
    navigate(`/reporting/ritation/${id}`);
  };

  const handleApprove = async (id: string) => {
    const targetRow = dataRitasi.find((row) => row.no_surat_jalan === id);

    if (!targetRow) {
      console.error('Row not found');
      return;
    }

    const newValidationState = !targetRow.isValidated;

    const { error } = await supabase
      .from('ritasi_fuel')
      .update({ isValidated: newValidationState })
      .eq('no_surat_jalan', id);

    if (error) {
      console.error('Error updating validation state:', error);
      return;
    }
    toast.success('Approved');
    setDataRitasi((prevRows) =>
      prevRows.map((row) =>
        row.no_surat_jalan === id
          ? { ...row, isValidated: !row.isValidated }
          : row,
      ),
    );
  };

  const handleShare = (row: any) => {
    const info = constructMessage(row);
    shareMessageToWhatsapp(info);
  };

  const handleImageClick = (id: string) => {
    setExpandedImageId(expandedImageId === id ? null : id);
    setRotationAngle((prev) => ({
      ...prev,
      [id]: 0,
    }));
  };

  const rotateLeft = (id: string) => {
    setRotationAngle((prev) => ({
      ...prev,
      [id]: (prev[id] || 0) - 90,
    }));
  };

  const rotateRight = (id: string) => {
    setRotationAngle((prev) => ({
      ...prev,
      [id]: (prev[id] || 0) + 90,
    }));
  };

  function extractFullYear(input: string) {
    // Use a regular expression to match the year part
    const match = input.match(/G(\d{2})/);
    if (match && match[1]) {
      const lastTwoDigits = match[1]; // Extract last two digits
      // Convert to full year by adding 2000 or 2100 depending on the context
      const fullYear = parseInt(lastTwoDigits, 10) + 2000;
      return fullYear; // Return the full year as a number
    }
    return null; // Return null if no match found
  }

  const getFileName = (urlType: string) => {
    if (urlType == 'flowmeter_before_url') {
      return 'fm-before';
    }
    if (urlType == 'flowmeter_after_url') {
      return 'fm-after';
    }
    if (urlType == 'sj_url') {
      return 'surat-jalan';
    } else return null;
  };

  const reuploadImage = async (id: string, urlType: string) => {

    // Create a file input element
    const fileInput = document.createElement('input');
    fileInput.type = 'file';

    // Trigger the file selection dialog
    fileInput.click();

    // Handle file selection
    fileInput.onchange = async (event) => {
      const target = event.target as HTMLInputElement | null;
      const file = target?.files?.[0]; // Get the selected file
      if (!file) {
        alert('No file selected.');
        return;
      }

      try {
        const { imageUrl, error } = await uploadImage(
          file,
          getFileName(urlType) || 'none',
          id,
          (progress: number) => {
            console.log(progress);
          },
        );

        if (error) {
          alert(error);
          return;
        }

        console.log('File Uploaded:', imageUrl);
      } catch (error) {
        console.error('Error uploading file:', error);
        alert('Error uploading file, please try again.');
      } finally {
        await fetchRitationReport();
      }
    };
  };

  const [dateStart, setDateStart] = useState<string>();
  const [dateEnd, setDateEnd] = useState<string>();

  function handleChangeDate(value: any) {
    console.log(value);
    setDateStart(formatDateToString(value[0]));
    setDateEnd(formatDateToString(value[1]));
  }

  const handleExportToFile = async () => {
    if (!dateStart || !dateEnd) {
      toast.error('Isi range tanggal terlebih dahulu!');
      return;
    }
    console.log(dateStart);
    console.log(dateEnd);
    await downloadExcel(dateStart!, dateEnd!);
  };

  return (
    <div className={`flex flex-col gap-4 transition-all duration-300 ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}>
      <div className="w-full">
        <div className="w-full">
          <div className="header block sm:flex mb-4 items-center justify-between border-b border-gray-100 dark:border-white/5 pb-2">
            <h2 className="mb-0 font-bold text-black dark:text-white text-xl">
              Ritation Dashboard
            </h2>
            <Toaster />
            <div className="flex items-center gap-4">
              <DatePickerOne
                enabled={true}
                handleChange={handleDateChange}
                setValue={date ? formatDateToString(new Date(date)) : ''}
              />
            </div>
          </div>

          <div className="ritation__table w-full space-y-4">
            <div className="rounded-xl bg-white/40 dark:bg-black/20 backdrop-blur-md border border-white/20 dark:border-white/5 p-4 shadow-lg">
               <DailyRitationChart
                chartDataInput={Object.entries(ritationDaily).map(
                  ([date, total]) => ({ date, total }),
                )}
                chartDataReconcile={Object.entries(reconcileDaily).map(
                  ([date, total]) => ({ date, total }),
                )}
                chartDataCumulative={Object.entries(cumulativeQtySj).map(
                  ([date, total]) => ({ date, total }),
                )}
                chartDataPoBalance={Object.entries(poQtyRemaining).map(
                  ([date, total]) => ({ date, total }),
                )}
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-4 pt-1">
              <MetricCard title="Plan Qty" value={formatNumberWithSeparator(ritationQtyPlan)} unit="Liter" />
              <MetricCard title="Total Ritasi MTD" value={formatNumberWithSeparator(ritationQtyTotal)} unit="Liter" />
              <MetricCard title="Avg Ritasi / Day" value={formatNumberWithSeparator(parseFloat(metrics.avgRitasiPerDay.toFixed(1)))} unit="Liter" />
              <MetricCard title="Qty Fuel / Rit" value={formatNumberWithSeparator(parseFloat(metrics.qtyFuelPerRitasi.toFixed(1)))} unit="L/Rit" />
              <MetricCard title="Sisa PO MTD" value={formatNumberWithSeparator(parseFloat(metrics.sisaPoMtd.toFixed(0)))} unit="Liter" />
              <MetricCard title="PO Qty" value={formatNumberWithSeparator(poDoc?.po_qty || 0)} unit="Liter" />
              <MetricCard title="Progress Ritasi" value={metrics.progressMtd.toFixed(2)} unit="%" />
              <MetricCard title="Prediksi Sisa Qty" value={formatNumberWithSeparator(parseFloat(metrics.prediksiSisaQty.toFixed(0)))} unit="Liter" />
              <MetricCard title="Prediksi Total Qty" value={formatNumberWithSeparator(parseFloat(metrics.prediksiTotalQty.toFixed(0)))} unit="Liter" />
              <MetricCard title="Plan vs Actual" value={metrics.planVsActual.toFixed(2)} unit="%" />
            </div>

            <div className="rounded-xl bg-white/40 dark:bg-black/20 backdrop-blur-md border border-white/20 dark:border-white/5 p-4 shadow-lg mb-4">
              <DeviationChart
                chartDataDaily={Object.entries(deviationDaily).map(
                  ([date, total]) => ({ date, total: total ?? 0 }),
                )}
                chartDataCumulative={Object.entries(deviationCumulative).map(
                  ([date, total]) => ({ date, total }),
                )}
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

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <RitationStatsPanel
                  panelTitle="Monthly Progress (Liter)"
                  titleLeft="Progress Fulfill"
                  ritationProgress={
                    formatNumberWithSeparator(
                      parseFloat(
                        (
                          (ritationQtyTotal / ritationQtyPlan) *
                          100
                        ).toFixed(2),
                      ),
                    ) + '%'
                  }
                  receiveProgress={
                    formatNumberWithSeparator(
                      parseFloat(
                        (
                          (((poDoc?.po_qty || 0) - (poDoc?.remaining_qty || 0)) / (ritationQtyTotal || 1)) *
                          100
                        ).toFixed(2),
                      ),
                    ) + '%'
                  }
                  ritationQty={ritationQtyTotal}
                  planQty={ritationQtyPlan}
                  receivedQty={(poDoc?.po_qty || 0) - (poDoc?.remaining_qty || 0)}
                  poDoc={poDoc?.po_number}
                  onShowPoDoc={() => {
                    showPoDetail(poDoc?.doc_url);
                  }}
                  onShowBaRequest={() => {
                    showBaRequestDetail(baRequest);
                  }}
                />
              </div>
              <div className="flex flex-col gap-6">
                <LeftRightPanel
                  panelTitle="Daily Ritation Stats (Liter)"
                  title1="Ritation Qty (liter)"
                  total1={formatNumberWithSeparator(ritationQtyToday)}
                  title2="Ritation Count"
                  total2={dataRitasi.length.toString()}
                  titleColor="text-orange-600 dark:text-orange-400"
                  panelColor="bg-orange-50/50 dark:bg-orange-900/20"
                />
                <LeftRightPanel
                  panelTitle="Daily Reconcile Stats (Liter)"
                  title1="Reconcile Qty (liter)"
                  total1={formatNumberWithSeparator(
                    dataReconcile.reduce((acc, item) => acc + item.qty, 0),
                  )}
                  title2="Reconcile Count"
                  total2={dataReconcile.length.toString()}
                  titleColor="text-blue-600 dark:text-blue-400"
                  panelColor="bg-blue-50/50 dark:bg-blue-900/20"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="rounded-2xl bg-white/40 dark:bg-black/20 backdrop-blur-md border border-white/20 dark:border-white/5 p-6 shadow-xl">
                 <RitationSubtotalByFTChart data={dataRitasi} />
               </div>
               <div className="rounded-2xl bg-white/40 dark:bg-black/20 backdrop-blur-md border border-white/20 dark:border-white/5 p-6 shadow-xl">
                 <RitationValidationChart data={dataRitasi} />
               </div>
            </div>

            <div className="my-8 rounded-2xl bg-white/40 dark:bg-black/20 backdrop-blur-md border border-white/20 dark:border-white/5 p-8 shadow-xl">
              <h4 className="text-lg font-bold mb-4 dark:text-white">Export Report</h4>
              <p className="text-sm text-gray-500 mb-6">Specify date range to download the detailed report</p>
              <div className="flex flex-col md:flex-row gap-4 items-center">
                <div className="w-full">
                  <DateRangePicker
                    size="lg"
                    format="dd.MM.yyyy"
                    ranges={predefinedRanges as any}
                    placeholder="Select Date Range"
                    className="w-full"
                    onShortcutClick={(shortcut) => {
                      handleChangeDate(shortcut.value);
                    }}
                  />
                </div>
                <button
                  onClick={handleExportToFile}
                  className="w-full md:w-auto flex items-center justify-center gap-3 rounded-xl bg-emerald-500 py-3 px-8 text-center font-bold text-white hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 whitespace-nowrap"
                >
                  <FontAwesomeIcon icon={faFileExport} />
                  Export to File
                </button>
              </div>
            </div>

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
                                    <div className="relative group overflow-hidden rounded-xl border border-white/20 dark:border-white/5 shadow-md aspect-[4/3] bg-gray-100 dark:bg-black/40">
                                      {row[urlType] ? (
                                        <>
                                          <img 
                                            src={`${baseStorageUrl}/ritation_upload/${extractFullYear(row.no_surat_jalan)}/${row.no_surat_jalan}/${row[urlType]}`} 
                                            style={{ 
                                              transform: `rotate(${rotationAngle[`${row.no_surat_jalan}-${urlType}`] || 0}deg)`,
                                              transition: 'transform 0.5s ease-in-out'
                                            }}
                                            className={`w-full h-full object-cover transition-all duration-700 ${expandedImageId === `${row.no_surat_jalan}-${urlType}` ? 'scale-100' : 'group-hover:scale-110'}`}
                                            alt={urlType}
                                            onClick={() => handleImageClick(`${row.no_surat_jalan}-${urlType}`)}
                                          />
                                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2">
                                            <button className="w-8 h-8 bg-white/20 backdrop-blur-md hover:bg-white/40 rounded-full text-white transition-all transform hover:scale-110" onClick={() => rotateLeft(`${row.no_surat_jalan}-${urlType}`)}><FontAwesomeIcon icon={faRotateLeft} /></button>
                                            <button className="w-8 h-8 bg-white/20 backdrop-blur-md hover:bg-white/40 rounded-full text-white transition-all transform hover:scale-110" onClick={() => rotateRight(`${row.no_surat_jalan}-${urlType}`)}><FontAwesomeIcon icon={faRotateRight} /></button>
                                            <button className="w-8 h-8 bg-blue-500 hover:bg-blue-600 rounded-full text-white transition-all transform hover:scale-110" onClick={() => reuploadImage(row.no_surat_jalan, urlType)}><FontAwesomeIcon icon={faUpload} /></button>
                                          </div>
                                        </>
                                      ) : (
                                        <div className="flex flex-col items-center justify-center h-full text-xs text-gray-400 italic">No Image</div>
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
          </div>
        </div>
      </div>

      {isModalOpen && pdfUrl && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div ref={modalRef} className="relative w-full max-w-5xl h-[90vh] bg-white dark:bg-boxdark rounded-3xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300 border border-white/20">
            <div className="flex items-center justify-between p-6 border-b dark:border-white/5 bg-gray-50/50 dark:bg-black/20">
              <h3 className="text-xl font-bold dark:text-white">Document Detail</h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors text-gray-500 font-bold"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 bg-gray-100 dark:bg-black/20 text-center">
              <iframe src={pdfUrl} className="w-full h-full border-none" title="PDF Preview" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Ritation;
