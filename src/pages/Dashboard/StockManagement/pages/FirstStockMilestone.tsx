import { useEffect, useMemo, useState } from 'react';
import ThemedPanelContainer from '../../../../common/ThemedComponents/ThemedPanelContainer';
import { supabase } from '../../../../db/SupabaseClient';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

type DailyMovement = {
  date: string;
  openingStock: number;
  ritasi: number;
  usage: number;
  closingStock: number;
};

type MovementRow = {
  date: string;
  qty: number;
  warehouseId?: string;
  unitId?: string;
};

type OpeningStockRow = {
  date?: string;
  unit_number?: string;
  warehouse_id?: string;
  shift?: number;
  qty_awal?: number;
  qty_akhir?: number;
};

type RawMilestoneRow = {
  date?: string;
  shift?: number;
  warehouse_id?: string;
  unit_id?: string;
  unit_number?: string;
  no_surat_jalan?: string;
  qty_awal?: number;
  qty_akhir?: number;
  qty?: number;
  value?: number;
};

type FormState = {
  inputDate?: string;
  inputShift?: '1' | '2';
};

const formatValue = (value: number) =>
  Number(value || 0).toLocaleString('id-ID', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

const formatDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDisplayDate = (dateStr: string) =>
  new Date(`${dateStr}T00:00:00`).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

export default function FirstStockMilestone() {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [openStock, setOpenStock] = useState<number>(0);
  const [openingStockByDate, setOpeningStockByDate] = useState<Record<string, number>>({});
  const [stockRows, setStockRows] = useState<OpeningStockRow[]>([]);
  const [ritasiRows, setRitasiRows] = useState<MovementRow[]>([]);
  const [usageRows, setUsageRows] = useState<MovementRow[]>([]);
  const [inputDate, setInputDate] = useState<string>(() => formatDateKey(new Date()));
  const [inputShift, setInputShift] = useState<'1' | '2'>('1');
  const [isLoading, setIsLoading] = useState(false);
  const FORM_LS_KEY = 'firstStockMilestone-form-v1';

  useEffect(() => {
    try {
      const raw = localStorage.getItem(FORM_LS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as FormState;
      if (typeof parsed.inputDate === 'string') setInputDate(parsed.inputDate);
      if (parsed.inputShift === '1' || parsed.inputShift === '2') setInputShift(parsed.inputShift);
    } catch (error) {
      console.error('Failed to restore FirstStockMilestone form state:', error);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        FORM_LS_KEY,
        JSON.stringify({
          inputDate,
          inputShift,
        } as FormState),
      );
    } catch (error) {
      console.error('Failed to persist FirstStockMilestone form state:', error);
    }
  }, [FORM_LS_KEY, inputDate, inputShift]);

  const daysInMonth = useMemo(() => {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();

    const days: Date[] = [];
    for (let day = 1; day <= lastDay; day += 1) {
      days.push(new Date(year, month, day));
    }
    return days;
  }, [selectedMonth]);

  const movementByDate = useMemo(() => {
    const ritasiMap = new Map<string, number>();
    const usageMap = new Map<string, number>();

    ritasiRows.forEach(row => {
      ritasiMap.set(row.date, (ritasiMap.get(row.date) || 0) + Number(row.qty || 0));
    });

    usageRows.forEach(row => {
      usageMap.set(row.date, (usageMap.get(row.date) || 0) + Number(row.qty || 0));
    });

    return { ritasiMap, usageMap };
  }, [ritasiRows, usageRows]);

  const lastCompleteDate = useMemo(() => {
    let lastDate = '';
    for (const day of daysInMonth) {
      const dateStr = formatDateKey(day);
      if (movementByDate.ritasiMap.has(dateStr) && movementByDate.usageMap.has(dateStr)) {
        lastDate = dateStr;
      }
    }
    return lastDate;
  }, [daysInMonth, movementByDate]);

  const dailyMovements = useMemo<DailyMovement[]>(() => {
    let runningStock = Number(openStock || 0);

    return daysInMonth.map((day) => {
      const dateStr = formatDateKey(day);
      const ritasi = Number(movementByDate.ritasiMap.get(dateStr) || 0);
      const usage = Number(movementByDate.usageMap.get(dateStr) || 0);
      const isResetDay = day.getDate() === 1 || day.getDate() === 26;
      const openingStock = isResetDay
        ? Number(openingStockByDate[dateStr] ?? runningStock)
        : runningStock;
      const closingStock = openingStock + ritasi - usage;

      runningStock = closingStock;

      return {
        date: dateStr,
        openingStock,
        ritasi,
        usage,
        closingStock,
      };
    });
  }, [daysInMonth, movementByDate, openStock, openingStockByDate]);

  const endingStock = dailyMovements.length > 0
    ? dailyMovements[dailyMovements.length - 1].closingStock
    : openStock;

  const reportTitle = lastCompleteDate
    ? `First Stock Report MTD ${lastCompleteDate}`
    : 'First Stock Report MTD';

  const handleExportExcel = () => {
    const exportRows = dailyMovements.filter(item => !lastCompleteDate || item.date <= lastCompleteDate).map((item) => ({
      Date: formatDisplayDate(item.date),
      Site: 'GMO',
      kontraktor: 'Pama GMO',
      'Fuel Truck': 'Skidtank GMO',
      'Stock Awal (L)': item.openingStock,
      'Pengambilan dari BC (L)': item.ritasi,
      'Penggunaan Fuel (L)': item.usage,
      'Stock Akhir (L)': item.closingStock,
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows, {
      header: [
        'Date',
        'Site',
        'kontraktor',
        'Fuel Truck',
        'Stock Awal (L)',
        'Pengambilan dari BC (L)',
        'Penggunaan Fuel (L)',
        'Stock Akhir (L)',
      ],
    });

    const headerFill = { patternType: 'solid', fgColor: { rgb: 'C6E0B4' } };
    const rowFill = { patternType: 'solid', fgColor: { rgb: 'FFF200' } };
    const border = {
      top: { style: 'thin', color: { rgb: '808080' } },
      bottom: { style: 'thin', color: { rgb: '808080' } },
      left: { style: 'thin', color: { rgb: '808080' } },
      right: { style: 'thin', color: { rgb: '808080' } },
    };

    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:H1');
    for (let c = range.s.c; c <= range.e.c; c += 1) {
      const headerCell = ws[XLSX.utils.encode_cell({ r: 0, c })];
      if (headerCell) {
        const existingStyle = headerCell.s || {};
        headerCell.s = {
          fill: headerFill,
          font: {
            ...(existingStyle as any).font,
            bold: true,
            color: { rgb: '000000' },
          },
          border,
          alignment: { horizontal: 'center', vertical: 'center' },
        };
      }
    }

    for (let r = 1; r <= range.e.r; r += 1) {
      for (let c = range.s.c; c <= range.e.c; c += 1) {
        const cell = ws[XLSX.utils.encode_cell({ r, c })];
        if (!cell) continue;
        cell.s = {
          fill: rowFill,
          border,
          alignment: {
            horizontal: c >= 4 ? 'right' : 'center',
            vertical: 'center',
          },
        };
      }
    }

    ws['!cols'] = [
      { wch: 16 },
      { wch: 12 },
      { wch: 16 },
      { wch: 18 },
      { wch: 16 },
      { wch: 22 },
      { wch: 20 },
      { wch: 18 },
    ];

    for (let r = 1; r <= range.e.r; r += 1) {
      for (let c = 4; c <= 7; c += 1) {
        const cellRef = XLSX.utils.encode_cell({ r, c });
        const cell = ws[cellRef];
        if (!cell) continue;
        cell.z = '#,##0.0';
      }
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'First Stock');
    const exportTag = lastCompleteDate || `${selectedMonth.getFullYear()}-${(selectedMonth.getMonth() + 1).toString().padStart(2, '0')}-01`;
    XLSX.writeFile(wb, `First Stock Report MTD ${exportTag}.xlsx`);
  };

  const handleExportDetailedExcel = async () => {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    const startOfMonth = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const endOfMonth = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    const exportDays = daysInMonth.filter(day => !lastCompleteDate || formatDateKey(day) <= lastCompleteDate);

    const { data: rawPack, error: rawError } = await supabase.rpc('get_first_stock_milestone_raw_monthly', {
      p_start_date: startOfMonth,
      p_end_date: endOfMonth,
    });

    if (rawError) {
      toast.error(rawError.message || 'Failed to fetch detailed raw data');
      return;
    }

    const rawStockRows = (rawPack?.stock || []) as RawMilestoneRow[];
    const rawUsageRows = (rawPack?.usage || []) as RawMilestoneRow[];
    const rawRitasiRows = (rawPack?.ritasi || []) as RawMilestoneRow[];

    const stockLookup = new Map<string, { qtyAwal: number; qtyAkhir: number; unitId: string }>();
    const usageLookup = new Map<string, number>();
    const ritasiLookup = new Map<string, number>();
    const ritasiSjLookup = new Map<string, string[]>();
    const labelMap = new Map<string, string>();

    const stockKey = (date: string, shift: number, warehouseId: string) => `${date}:${shift}:${warehouseId}`;

    rawStockRows.forEach(row => {
      if (!row.date || row.shift == null) return;
      const warehouseId = row.warehouse_id || row.unit_number || '';
      if (!warehouseId) return;
      const unitId = row.unit_id || row.unit_number || '';
      const key = stockKey(row.date, Number(row.shift), warehouseId);
      const current = stockLookup.get(key) || { qtyAwal: 0, qtyAkhir: 0, unitId };
      current.qtyAwal += Number(row.qty_awal ?? 0);
      current.qtyAkhir += Number(row.qty_akhir ?? 0);
      current.unitId = current.unitId || unitId;
      stockLookup.set(key, current);
      if (!labelMap.has(warehouseId) && unitId) {
        labelMap.set(warehouseId, unitId);
      }
    });

    rawUsageRows.forEach(row => {
      if (!row.date || row.shift == null) return;
      const warehouseId = row.warehouse_id || '';
      if (!warehouseId) return;
      const key = stockKey(row.date, Number(row.shift), warehouseId);
      usageLookup.set(key, (usageLookup.get(key) || 0) + Number(row.qty ?? 0));
      if (row.unit_id && !labelMap.has(warehouseId)) {
        labelMap.set(warehouseId, row.unit_id);
      }
    });

    rawRitasiRows.forEach(row => {
      if (!row.date || row.shift == null) return;
      const warehouseId = row.warehouse_id || '';
      if (!warehouseId) return;
      const key = stockKey(row.date, Number(row.shift), warehouseId);
      ritasiLookup.set(key, (ritasiLookup.get(key) || 0) + Number(row.value ?? 0));
      if (row.no_surat_jalan) {
        const current = ritasiSjLookup.get(key) || [];
        current.push(row.no_surat_jalan);
        ritasiSjLookup.set(key, current);
      }
      if (row.unit_id && !labelMap.has(warehouseId)) {
        labelMap.set(warehouseId, row.unit_id);
      }
    });

    const rows: Array<Record<string, string | number>> = [];
    exportDays.forEach(day => {
      const dateStr = formatDateKey(day);
      const shifts = new Set<number>();

      rawStockRows.forEach(row => {
        if (row.date === dateStr && row.shift != null) shifts.add(Number(row.shift));
      });
      rawUsageRows.forEach(row => {
        if (row.date === dateStr && row.shift != null) shifts.add(Number(row.shift));
      });
      rawRitasiRows.forEach(row => {
        if (row.date === dateStr && row.shift != null) shifts.add(Number(row.shift));
      });

      Array.from(shifts)
        .sort((a, b) => a - b)
        .forEach(shift => {
          const warehouseIds = new Set<string>();

          rawStockRows.forEach(row => {
            if (row.date === dateStr && Number(row.shift) === shift) {
              const warehouseId = row.warehouse_id || row.unit_number || '';
              if (warehouseId) warehouseIds.add(warehouseId);
            }
          });
          rawUsageRows.forEach(row => {
            if (row.date === dateStr && Number(row.shift) === shift && row.warehouse_id) {
              warehouseIds.add(row.warehouse_id);
            }
          });
          rawRitasiRows.forEach(row => {
            if (row.date === dateStr && Number(row.shift) === shift && row.warehouse_id) {
              warehouseIds.add(row.warehouse_id);
            }
          });

          Array.from(warehouseIds)
            .sort((a, b) => {
              const sjA = Array.from(new Set(ritasiSjLookup.get(stockKey(dateStr, shift, a)) || []))
                .sort((left, right) => left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' }))
                .join(' | ');
              const sjB = Array.from(new Set(ritasiSjLookup.get(stockKey(dateStr, shift, b)) || []))
                .sort((left, right) => left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' }))
                .join(' | ');
              return (
                sjA.localeCompare(sjB, undefined, { numeric: true, sensitivity: 'base' }) ||
                a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
              );
            })
            .forEach(warehouseId => {
              const key = stockKey(dateStr, shift, warehouseId);
              const stockInfo = stockLookup.get(key);
              const ritasi = Number(ritasiLookup.get(key) || 0);
              const usage = Number(usageLookup.get(key) || 0);
              const opening = Number(stockInfo?.qtyAwal ?? 0);
              const closing = Number(stockInfo?.qtyAkhir ?? (opening + ritasi - usage));
              const unitId = stockInfo?.unitId || labelMap.get(warehouseId) || '';
              const noSuratJalan = Array.from(new Set(ritasiSjLookup.get(key) || []))
                .sort((left, right) => left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' }))
                .join(', ');

              rows.push({
                Date: formatDisplayDate(dateStr),
                Shift: `Shift ${shift}`,
                Site: 'GMO',
                kontraktor: 'Pama GMO',
                'Fuel Truck': 'Skidtank GMO',
                Warehouse: unitId ? `${warehouseId} (${unitId})` : warehouseId,
                'Stock Awal (L)': opening,
                'Pengambilan dari BC (L)': ritasi,
                'Penggunaan Fuel (L)': usage,
                'Stock Akhir (L)': closing,
                'No Surat Jalan': noSuratJalan || '-',
              });
            });
        });
    });

    const ws = XLSX.utils.json_to_sheet(rows, {
      header: [
        'Date',
        'Shift',
        'Site',
        'kontraktor',
        'Fuel Truck',
        'Warehouse',
        'Stock Awal (L)',
        'Pengambilan dari BC (L)',
        'Penggunaan Fuel (L)',
        'Stock Akhir (L)',
        'No Surat Jalan',
      ],
    });

    const headerFill = { patternType: 'solid', fgColor: { rgb: 'C6E0B4' } };
    const rowFill = { patternType: 'solid', fgColor: { rgb: 'FFF200' } };
    const border = {
      top: { style: 'thin', color: { rgb: '808080' } },
      bottom: { style: 'thin', color: { rgb: '808080' } },
      left: { style: 'thin', color: { rgb: '808080' } },
      right: { style: 'thin', color: { rgb: '808080' } },
    };

    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:K1');
    for (let c = range.s.c; c <= range.e.c; c += 1) {
      const headerCell = ws[XLSX.utils.encode_cell({ r: 0, c })];
      if (headerCell) {
        const existingStyle = headerCell.s || {};
        headerCell.s = {
          fill: headerFill,
          font: {
            ...(existingStyle as any).font,
            bold: true,
            color: { rgb: '000000' },
          },
          border,
          alignment: { horizontal: 'center', vertical: 'center' },
        };
      }
    }

    for (let r = 1; r <= range.e.r; r += 1) {
      for (let c = range.s.c; c <= range.e.c; c += 1) {
        const cell = ws[XLSX.utils.encode_cell({ r, c })];
        if (!cell) continue;
        cell.s = {
          fill: rowFill,
          border,
          alignment: {
            horizontal: c >= 6 && c <= 9 ? 'right' : c === 10 ? 'left' : 'center',
            vertical: 'center',
          },
        };
      }
    }

    ws['!cols'] = [
      { wch: 16 },
      { wch: 10 },
      { wch: 12 },
      { wch: 16 },
      { wch: 18 },
      { wch: 24 },
      { wch: 16 },
      { wch: 22 },
      { wch: 20 },
      { wch: 18 },
      { wch: 24 },
    ];

    for (let r = 1; r <= range.e.r; r += 1) {
      for (let c = 6; c <= 9; c += 1) {
        const cellRef = XLSX.utils.encode_cell({ r, c });
        const cell = ws[cellRef];
        if (!cell) continue;
        cell.z = '#,##0.0';
      }
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'First Stock Detail');
    const exportTag = lastCompleteDate || `${selectedMonth.getFullYear()}-${(selectedMonth.getMonth() + 1).toString().padStart(2, '0')}-01`;
    XLSX.writeFile(wb, `First Stock Report MTD Detail ${exportTag}.xlsx`);
  };

  const fetchData = async () => {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    const startOfMonth = `${year}-${(month + 1).toString().padStart(2, '0')}-01`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const endOfMonth = `${year}-${(month + 1).toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
    const day1 = `${year}-${(month + 1).toString().padStart(2, '0')}-01`;
    const day26 = `${year}-${(month + 1).toString().padStart(2, '0')}-26`;

    setIsLoading(true);
    try {
      const { data: reportPack, error: rpcError } = await supabase.rpc('get_fuel_stock_management_monthly', {
        p_start_date: startOfMonth,
        p_end_date: endOfMonth,
      });

      if (rpcError) throw rpcError;

      const stockSource = (reportPack?.stock || []) as OpeningStockRow[];
      const openingMap: Record<string, number> = {};
      setStockRows(stockSource);
      const day1Opening = stockSource
        .filter(row => row?.date === day1)
        .reduce((sum, row) => sum + Number(row.qty_awal ?? 0), 0);
      const day26Opening = stockSource
        .filter(row => row?.date === day26)
        .reduce((sum, row) => sum + Number(row.qty_awal ?? 0), 0);

      openingMap[day1] = day1Opening;
      openingMap[day26] = day26Opening;

      setOpeningStockByDate(openingMap);
      setOpenStock(Number(openingMap[day1] ?? 0));

      const ritasiSource = (reportPack?.ritasi || []) as Array<{ date?: string; warehouse_id?: string; value?: number }>;
      const usageSource = (reportPack?.usage || []) as Array<{ date?: string; warehouse_code?: string; qty?: number }>;

      setRitasiRows(
        ritasiSource
          .filter(row => row?.date)
          .map(row => ({
            date: row.date as string,
            qty: Number(row.value ?? 0),
            warehouseId: row.warehouse_id || '',
          }))
      );
      setUsageRows(
        usageSource
          .filter(row => row?.date)
          .map(row => ({
            date: row.date as string,
            qty: Number(row.qty ?? 0),
            warehouseId: row.warehouse_code || '',
          }))
      );
    } catch (error: any) {
      console.error('Failed to load first stock milestone data:', error);
      toast.error(error?.message || 'Failed to load milestone data');
      setOpenStock(0);
      setStockRows([]);
      setRitasiRows([]);
      setUsageRows([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedMonth]);

  return (
    <ThemedPanelContainer title={reportTitle}>
      <div className="p-4 bg-white dark:bg-boxdark rounded-lg shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
          <div className="flex items-center gap-3">
            <input
              type="month"
              value={`${selectedMonth.getFullYear()}-${(selectedMonth.getMonth() + 1).toString().padStart(2, '0')}`}
              onChange={(e) => {
                const [y, m] = e.target.value.split('-');
                setSelectedMonth(new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1));
              }}
              className="appearance-none bg-white dark:bg-meta-4 border border-stroke dark:border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 dark:text-white shadow-sm hover:border-primary transition-all outline-none cursor-pointer"
            />
            <button
              onClick={fetchData}
              className="flex items-center gap-2.5 bg-primary text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all active:scale-95"
            >
              Refresh
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-stroke dark:border-white/10 bg-slate-50 dark:bg-white/5 px-4 py-3">
              <p className="text-[10px] uppercase tracking-widest text-slate-500">Opening Stock</p>
              <p className="text-lg font-black text-slate-800 dark:text-white">{formatValue(openStock)} L</p>
            </div>
            <div className="rounded-2xl border border-stroke dark:border-white/10 bg-slate-50 dark:bg-white/5 px-4 py-3">
              <p className="text-[10px] uppercase tracking-widest text-slate-500">Ending Stock</p>
              <p className="text-lg font-black text-slate-800 dark:text-white">{formatValue(endingStock)} L</p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto pb-4 scrollbar-hide">
          <table className="min-w-full border-collapse border border-stroke dark:border-strokedark text-sm">
            <thead>
              <tr>
            <th className="border border-stroke dark:border-strokedark border-r-2 p-2 bg-[#F1F5F9] dark:bg-[#1A2233] min-w-[190px] sticky left-0 top-0 z-30 shadow-[2px_2px_5px_rgba(0,0,0,0.1)]">
                  Metric / Date
                </th>
                {daysInMonth.map((day) => (
                  <th
                    key={day.getDate()}
                    className={`border border-stroke dark:border-strokedark p-2 min-w-[80px] text-center sticky top-0 z-20 ${
                      day.getDate() === 1
                        ? 'bg-emerald-300 text-emerald-950'
                        : day.getDate() === 26
                          ? 'bg-orange-300 text-orange-950'
                          : 'bg-[#F8FAFC] dark:bg-[#1A2233]'
                    }`}
                  >
                    {day.getDate()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-stroke dark:border-strokedark border-r-2 p-2 font-medium bg-white dark:bg-boxdark sticky left-0 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                  Site Stock Awal
                </td>
                {dailyMovements.map((item, idx) => (
                  <td key={`opening-${idx}`} className="border border-stroke dark:border-strokedark p-2 text-right">
                    {formatValue(item.openingStock)}
                  </td>
                ))}
              </tr>

              <tr>
                <td className="border border-stroke dark:border-strokedark border-r-2 p-2 font-medium bg-white dark:bg-boxdark sticky left-0 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                  Ritasi (L)
                </td>
                {dailyMovements.map((item, idx) => (
                  <td key={`ritasi-${idx}`} className="border border-stroke dark:border-strokedark p-2 text-right">
                    {formatValue(item.ritasi)}
                  </td>
                ))}
              </tr>

              <tr>
                <td className="border border-stroke dark:border-strokedark border-r-2 p-2 font-medium bg-white dark:bg-boxdark sticky left-0 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                  Fuel Usage (L)
                </td>
                {dailyMovements.map((item, idx) => (
                  <td key={`usage-${idx}`} className="border border-stroke dark:border-strokedark p-2 text-right">
                    {formatValue(item.usage)}
                  </td>
                ))}
              </tr>

              <tr className="bg-blue-50 dark:bg-blue-900/10">
                <td className="border border-stroke dark:border-strokedark border-r-2 p-2 font-bold text-blue-700 bg-[#EEF2FF] dark:bg-[#1E293B] sticky left-0 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                  Site Stock (L)
                </td>
                {dailyMovements.map((item, idx) => (
                  <td key={`closing-${idx}`} className="border border-stroke dark:border-strokedark p-2 text-right font-semibold">
                    {formatValue(item.closingStock)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-5 flex flex-col gap-1 text-xs text-slate-500 italic">
          <p className="flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-slate-400"></span>
            Tabel tampil full month, export hanya sampai tanggal terakhir yang punya ritasi dan usage lengkap
          </p>
          <p className="flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-slate-400"></span>
            Perhitungan harian: Site Stock Hari Ini + Ritasi - Fuel Usage = Site Stock Hari Berikutnya
          </p>
          <p className="flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-slate-400"></span>
            Constraint report valid apabila : Laporan stock dari fuelman sudah masuk semua, dan qty ritasi dari `ritasi_fuel.qty_sj` sudah sesuai
          </p>
          {isLoading && (
            <p className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-slate-400"></span>
              Loading data...
            </p>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <div className="flex items-center gap-3">
            <button
              onClick={handleExportDetailedExcel}
              className="flex items-center gap-2.5 bg-slate-700 text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-slate-700/20 hover:shadow-slate-700/40 hover:-translate-y-0.5 transition-all active:scale-95"
            >
              Export Detailed Report
            </button>
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-2.5 bg-emerald-600 text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/40 hover:-translate-y-0.5 transition-all active:scale-95"
            >
              Export to Excel
            </button>
          </div>
        </div>
      </div>
    </ThemedPanelContainer>
  );
}
