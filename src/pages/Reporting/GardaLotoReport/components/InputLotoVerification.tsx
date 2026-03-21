import React, { useCallback, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { Loader2, Radio, Zap } from 'lucide-react';
import { supabase } from '../../../../db/SupabaseClient';
import ThemedGrid from '../../../../common/ThemedComponents/ThemedGrid';

/* =========================
   ALLOWED EGI (WHITELIST)
========================= */
const ALLOWED_EGI = new Set([
  'A40G',
  'D155A6R',
  'D375A6R',
  'D85ESS2',
  'EX12006',
  'FAW',
  'FM280',
  'FM340',
  'FMX440',
  'G460',
  'G460B8X4',
  'GD825A2',
  'HD7857',
  'HM4003R',
  'MD6290',
  'P360CB6X6',
  'P410',
  'P410B6X4',
  'P410CB6X6',
  'P410CB8X4',
  'P460',
  'PC125011R',
  'PC1250SP8',
  'PC200011R',
  'PC20008',
  'PC210',
  'PC300',
  'PC350',
  'PC8508R1',
  'SV526',
  'SV700',
  'CAT428',
  'FD508',
  'FM440',
  'GD7555R',
  'GR550EX',
  'MT1440',
  'P380CB6X6',
  'PC400SE8',
  'WA5006R',
]);

/* =========================
   TYPES
========================= */
interface LotoRow {
  id: any;
  session_code: string;
  no_logsheet: string;
  issued_date: string;
  shift: number;
  warehouse_code: string;
  cn_unit: string;
  EGI: string;
  equip_class: string;
  hm: number;
  qty: number;
  refueling_start: string;
  refueling_end: string;
  is_included: boolean;
}

/* =========================
   HELPERS
========================= */
const toTimestamptzGMT8 = (value: any) => {
  if (typeof value === 'number') {
    const d = XLSX.SSF.parse_date_code(value);
    const iso = new Date(
      Date.UTC(d.y, d.m - 1, d.d, d.H, d.M, d.S),
    ).toISOString();
    return iso.replace('Z', '+08:00');
  }
  return value;
};

const buildSessionCode = (
  issuedDate: string,
  shift: number,
  warehouse: string,
) => {
  const yyMMdd = issuedDate.replace(/-/g, '').slice(2);
  const shiftPad = String(shift).padStart(5, '0');
  const warehousePad = warehouse
    .toUpperCase()
    .slice(-4)
    .padStart(4, '0');

  return `${yyMMdd}${shiftPad}${warehousePad}`;
};

const getShiftDifference = (
  currentDateStr: string,
  currentShift: number,
  lastDateStr: string,
  lastShift: number,
) => {
  const oneDay = 24 * 60 * 60 * 1000;
  const d1 = new Date(currentDateStr);
  const d2 = new Date(lastDateStr);

  // Calculate difference in days (ignoring time)
  // Ensure we compare midnight to midnight
  const date1 = new Date(d1.getFullYear(), d1.getMonth(), d1.getDate());
  const date2 = new Date(d2.getFullYear(), d2.getMonth(), d2.getDate());

  const diffDays = Math.round(
    (date1.getTime() - date2.getTime()) / oneDay,
  );

  return diffDays * 2 + (currentShift - lastShift);
};

const getCurrentShiftInfo = () => {
  const now = new Date();
  // Indo Time GMT+?: Assuming local time or consistency with server.
  // Code uses GMT+8 usually.
  // Logic: Shift 1 = 06:00 - 17:59, Shift 2 = 18:00 - 05:59
  const hour = now.getHours();
  // Adjust date if Shift 2 is technically "next day" but belongs to "previous date" shift wise?
  // Usually Shift 2 of aligned w/ Date X starts at 18:00 on Date X.
  // So if it is 03:00 AM on Date Y (Date X+1), it is still Shift 2 of Date X.

  let shift = 1;
  let shiftDate = now;

  if (hour >= 6 && hour < 18) {
    shift = 1;
  } else {
    shift = 2;
    // If it's before 6 AM, it belongs to the previous day's Shift 2
    if (hour < 6) {
      shiftDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
  }

  const yyyy = shiftDate.getFullYear();
  const mm = String(shiftDate.getMonth() + 1).padStart(2, '0');
  const dd = String(shiftDate.getDate()).padStart(2, '0');

  return {
    date: `${yyyy}-${mm}-${dd}`,
    shift,
  };
};

/* =========================
   COMPONENT
========================= */
const InputLotoVerification: React.FC = () => {
  const [rowData, setRowData] = useState<LotoRow[]>([]);
  const [issuedDate, setIssuedDate] = useState<string>('');
  const [shift, setShift] = useState<number | ''>('');
  const [filtering, setFiltering] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadMode, setUploadMode] = useState<'unique' | 'upsert'>('unique');
  const [lastVerification, setLastVerification] = useState<{
    session_code: string;
    issued_date: string;
    shift: number;
    created_at?: string;
  } | null>(null);

  React.useEffect(() => {
    fetchLastVerification();
  }, []);

  const fetchLastVerification = async () => {
    const { data, error } = await supabase
      .from('loto_verification')
      .select('session_code, issued_date, shift')
      .order('session_code', { ascending: false })
      .limit(1)
      .single();

    if (!error && data) {
      setLastVerification(data);
    }
  };

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  /* =========================
     AG GRID COLUMNS
  ========================= */
  const columnDefs = useMemo<any[]>(
    () => [
      { field: 'id', headerName: 'ND', width: 100 },
      { 
        field: 'is_included', 
        headerName: 'Included', 
        width: 100,
        cellRenderer: (params: any) => (
          params.value ? (
            <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-bold">Yes</span>
          ) : (
            <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded text-xs font-bold">No</span>
          )
        )
      },
      { field: 'session_code', headerName: 'Session Code' },
      { field: 'no_logsheet', headerName: 'No Logsheet' },
      { field: 'issued_date', headerName: 'Issued Date' },
      { field: 'shift', headerName: 'Shift' },
      { field: 'warehouse_code', headerName: 'Warehouse' },
      { field: 'cn_unit', headerName: 'CN Unit' },
      { field: 'EGI' },
      { field: 'equip_class', headerName: 'Equip Class' },
      { field: 'hm', headerName: 'HM' },
      { field: 'qty', headerName: 'Qty' },
      { field: 'refueling_start', headerName: 'Jam Start' },
      { field: 'refueling_end', headerName: 'Jam End' },
    ],
    [],
  );

  /* =========================
     SUMMARY
  ========================= */
  const summaryByEquipClass = useMemo(() => {
    const includedOnly = rowData.filter(r => r.is_included);
    const map = new Map<string, number>();
    for (const row of includedOnly) {
      map.set(row.equip_class, (map.get(row.equip_class) || 0) + 1);
    }
    return Array.from(map.entries());
  }, [rowData]);

  const summaryByWarehouse = useMemo(() => {
    const includedOnly = rowData.filter(r => r.is_included);
    const map = new Map<string, Set<string>>();
    for (const row of includedOnly) {
      if (!map.has(row.warehouse_code)) {
        map.set(row.warehouse_code, new Set());
      }
      map.get(row.warehouse_code)!.add(row.cn_unit);
    }
    return Array.from(map.entries()).map(([warehouse, units]) => ({
      warehouse,
      totalUnit: units.size,
    }));
  }, [rowData]);

  /* =========================
     EXCEL PARSER + FILTER
  ========================= */
  const handleFile = useCallback((file: File) => {
    setFiltering(true);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = evt.target?.result;
      if (!data) return;

      const workbook = XLSX.read(data, { type: 'binary' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<any>(sheet, { defval: '' });

      const uniqueMap = new Map<string, LotoRow>();

      for (const row of json) {
        const nd = row['ND'] || null;
        if (!nd) continue; // ND is required as ID

        const egi = String(row['EGI']).trim();
        const isIncluded = ALLOWED_EGI.has(egi);

        const issued = XLSX.SSF.format('yyyy-mm-dd', row['Issued Date']);
        const shiftVal = Number(row['Shift']);
        const warehouse = String(row['Warehouse']);
        const cnUnit = row['CN Unit'];

        // DEDUP KEY: session + cn_unit + logsheet?
        // User said "remove duplicate data".
        // Assuming unique constraint logic or just pure distinct rows.
        // Using session + cn_unit as a strong candidate for uniqueness in a verification list.
        const sessionCode = buildSessionCode(
            issued,
            shiftVal,
            warehouse,
          );
        
        // Let's use ND as the primary unique key if available, otherwise fallback
        const uniqueKey = nd ? String(nd) : `${sessionCode}_${cnUnit}_${row['No Logsheet']}`;

        if (uniqueMap.has(uniqueKey)) continue;

        uniqueMap.set(uniqueKey, {
          id: nd,
          session_code: sessionCode,
          no_logsheet: row['No Logsheet'],
          issued_date: issued,
          shift: shiftVal,
          warehouse_code: warehouse,
          cn_unit: cnUnit,
          EGI: egi,
          equip_class: row['Equip Class'],
          hm: Number(row['Hm']),
          qty: Number(row['Qty'] || row['QTY'] || row['Qty ']),
          refueling_start: toTimestamptzGMT8(row['Jam Start']),
          refueling_end: toTimestamptzGMT8(row['Jam End']),
          is_included: isIncluded,
        });
      }

      const filtered = Array.from(uniqueMap.values());

      if (filtered.length) {
        const maxIssuedDate = filtered
          .map((r) => r.issued_date)
          .sort()
          .at(-1)!;

        // Find shift associated with the MAX date
        const rowsOnMaxDate = filtered.filter(
          (r) => r.issued_date === maxIssuedDate,
        );
        const maxShift = Math.max(...rowsOnMaxDate.map((r) => r.shift));

        setIssuedDate(maxIssuedDate);
        setShift(maxShift);
      }

      setRowData(filtered);
      setTimeout(() => setFiltering(false), 200);
    };

    reader.readAsBinaryString(file);
  }, []);

  /* =========================
     DRAG & DROP
  ========================= */
  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  /* =========================
     SUBMIT
  ========================= */
  const handleSubmit = async () => {
    if (!rowData.length) return;

    const confirm = window.confirm(
      `Submit ${rowData.length} data ke sistem (Mode: ${uploadMode.toUpperCase()})?`,
    );
    if (!confirm) return;
    
    setSubmitting(true);
    try {
      // Use RPC for data integrity and atomic transactions
      console.log(`Submitting ${rowData.length} records via RPC...`);
      
      const { data, error } = await supabase.rpc('upsert_loto_verification_v2', {
        p_records: rowData,
        p_mode: uploadMode
      });

      if (error) throw error;

      const result = data || {};
      alert(`Success! 
      - Inserted: ${result.inserted || 0}
      - Skipped: ${result.skipped || 0}
      - Relocated (Mode Upsert): ${result.relocated || 0}`);
      
      setRowData([]);
      fetchLastVerification(); // Refresh info
    } catch (e: any) {
      console.error('Submit Error:', e);
      alert(`Error saat submit: ${e.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {lastVerification && (() => {
        const current = getCurrentShiftInfo();
        const diff = getShiftDifference(
          current.date,
          current.shift,
          lastVerification.issued_date,
          lastVerification.shift,
        );
        const isOutdated = diff > 2;
        const colorClass = isOutdated ? 'bg-red-100 text-red-800 border-red-300' : 'bg-green-100 text-green-800 border-green-300';
        const statusText = isOutdated ? 'Warning: Out of Date' : 'Updated';
        
        return (
          <div className={`p-4 border rounded-md mb-4 ${colorClass} flex justify-between items-center`}>
            <div>
              <div className="font-bold">Last Verification</div>
              <div>
                Date: {lastVerification.issued_date}, Shift: {lastVerification.shift}
              </div>
              <div className="text-xs opacity-75">
                Session Code: {lastVerification.session_code.slice(0, 11)} (Decoded)
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold">{statusText}</div>
              <div className="text-xs">{diff} shift(s) ago</div>
            </div>
          </div>
        );
      })()}

      <div
        onClick={() => fileInputRef.current?.click()}
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
        className="border-2 border-dashed rounded p-6 text-center cursor-pointer"
      >
        Drag & drop file Excel di sini
        <br />
        <span className="text-sm text-gray-500">
          atau klik untuk memilih file
        </span>

        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
      </div>

      <div className="flex gap-4">
        <input
          type="date"
          value={issuedDate}
          onChange={(e) => setIssuedDate(e.target.value)}
          className="border px-2 py-1"
        />

        <select
          value={shift}
          onChange={(e) => setShift(Number(e.target.value))}
          className="border px-2 py-1"
        >
          <option value="">Shift</option>
          <option value={1}>1</option>
          <option value={2}>2</option>
        </select>
      </div>

      {filtering && (
        <div className="text-sm text-gray-500 animate-pulse">
          Memetakan data EGI…
        </div>
      )}

      <div
        className={`transition-opacity duration-200 mt-4 h-[500px] w-full ${
          filtering ? 'opacity-50' : 'opacity-100'
        }`}
      >
        <ThemedGrid
          rowData={rowData}
          columnDefs={columnDefs}
          useGridFilter={true}
          enableCellTextSelection={true}
        />
      </div>

      {rowData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border rounded p-4">
            <h3 className="font-semibold mb-2">
              Summary per Equip Class
            </h3>
            <table className="w-full text-sm border">
              <tbody>
                {summaryByEquipClass.map(([equip, total]) => (
                  <tr key={equip}>
                    <td className="border px-2 py-1">{equip}</td>
                    <td className="border px-2 py-1 text-right">
                      {total}
                    </td>
                  </tr>
                ))}
                <tr className="font-semibold bg-gray-50">
                  <td className="border px-2 py-1">TOTAL (INCLUDED)</td>
                  <td className="border px-2 py-1 text-right">
                    {rowData.filter(r => r.is_included).length}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="border rounded p-4">
            <h3 className="font-semibold mb-2">
              Summary per Warehouse
            </h3>
            <table className="w-full text-sm border">
              <tbody>
                {summaryByWarehouse.map((row) => (
                  <tr key={row.warehouse}>
                    <td className="border px-2 py-1">
                      {row.warehouse}
                    </td>
                    <td className="border px-2 py-1 text-right">
                      {row.totalUnit}
                    </td>
                  </tr>
                ))}
                <tr className="font-semibold bg-gray-50">
                  <td className="border px-2 py-1">
                    TOTAL UNIT (INCLUDED)
                  </td>
                  <td className="border px-2 py-1 text-right">
                    {new Set(rowData.filter(r => r.is_included).map(r => r.cn_unit)).size}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {rowData.length > 0 && (
        <div className="bg-white/50 backdrop-blur-sm border rounded-xl p-4 mb-4 flex items-center justify-between border-blue-200">
          <div className="flex flex-col">
            <span className="text-sm font-bold text-blue-900">Upload Mode</span>
            <p className="text-[10px] text-blue-600 max-w-sm">
              {uploadMode === 'unique' 
                ? 'UNIQUE: Baris dengan ND duplikat akan dilewati (Data lama tetap).' 
                : 'UPSERT: Baris duplikat akan "mengusir" data lama (Data lama di-rename otomatis).'}
            </p>
          </div>
          <div className="flex bg-gray-100 p-1 rounded-lg border">
            <button
              onClick={() => setUploadMode('unique')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-all text-xs font-bold ${
                uploadMode === 'unique' 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'text-gray-500 hover:bg-gray-200'
              }`}
            >
              <Radio className="w-4 h-4" />
              <span>UNIQUE</span>
            </button>
            <button
              onClick={() => setUploadMode('upsert')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-all text-xs font-bold ${
                uploadMode === 'upsert' 
                  ? 'bg-orange-500 text-white shadow-sm' 
                  : 'text-gray-500 hover:bg-gray-200'
              }`}
            >
              <Zap className="w-4 h-4" />
              <span>UPSERT</span>
            </button>
          </div>
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={submitting || !rowData.length}
        style={{
          backgroundColor: uploadMode === 'upsert' ? '#f59e0b' : '#16a34a'
        }}
        className={`text-white px-8 py-3 rounded-lg flex items-center justify-center space-x-3 transition-all duration-200 shadow-lg ${
          submitting ? 'opacity-70 cursor-not-allowed' : 'hover:scale-105 active:scale-95'
        }`}
      >
        {submitting && <Loader2 className="w-5 h-5 animate-spin" />}
        <span className="font-bold text-lg">{submitting ? 'Submitting...' : `Submit (${uploadMode.toUpperCase()})`}</span>
      </button>
    </div>
  );
};

export default InputLotoVerification;