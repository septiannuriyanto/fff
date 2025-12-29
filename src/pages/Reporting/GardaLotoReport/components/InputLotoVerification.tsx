import React, { useCallback, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { AgGridReact } from 'ag-grid-react';
import { ColDef } from 'ag-grid-community';

import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { supabase } from '../../../../db/SupabaseClient';

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
  const columnDefs = useMemo<ColDef[]>(
    () => [
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
    ],
    [],
  );

  /* =========================
     SUMMARY
  ========================= */
  const summaryByEquipClass = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of rowData) {
      map.set(row.equip_class, (map.get(row.equip_class) || 0) + 1);
    }
    return Array.from(map.entries());
  }, [rowData]);

  const summaryByWarehouse = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const row of rowData) {
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
        const egi = String(row['EGI']).trim();
        if (!ALLOWED_EGI.has(egi)) continue;

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
        
        // Let's use a composite key to ensure full uniqueness
        const uniqueKey = `${sessionCode}_${cnUnit}_${row['No Logsheet']}`;

        if (uniqueMap.has(uniqueKey)) continue;

        uniqueMap.set(uniqueKey, {
          session_code: sessionCode,
          no_logsheet: row['No Logsheet'],
          issued_date: issued,
          shift: shiftVal,
          warehouse_code: warehouse,
          cn_unit: cnUnit,
          EGI: egi,
          equip_class: row['Equip Class'],
          hm: Number(row['Hm']),
          qty: Number(row['Qty']),
          refueling_start: toTimestamptzGMT8(row['Jam Start']),
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
      `Submit ${rowData.length} data ke sistem?`,
    );
    if (!confirm) return;

    const { error } = await supabase
      .from('loto_verification')
      .insert(rowData);

    if (error) {
      alert(`Gagal submit: ${error.message}`);
    } else {
      alert('Data berhasil disubmit');
      setRowData([]);
      fetchLastVerification(); // Refresh info
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
          Memfilter data EGI…
        </div>
      )}

      <div
        className={`ag-theme-alpine transition-opacity duration-200 ${
          filtering ? 'opacity-50' : 'opacity-100'
        }`}
        style={{ height: 400 }}
      >
        <AgGridReact
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={{
            sortable: true,
            filter: true,
            resizable: true,
          }}
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
                  <td className="border px-2 py-1">TOTAL</td>
                  <td className="border px-2 py-1 text-right">
                    {rowData.length}
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
                    TOTAL RECORD
                  </td>
                  <td className="border px-2 py-1 text-right">
                    {rowData.length}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      <button
        onClick={handleSubmit}
        className="bg-green-600 text-white px-6 py-2 rounded"
      >
        Submit
      </button>
    </div>
  );
};

export default InputLotoVerification;