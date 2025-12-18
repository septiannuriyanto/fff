import React, { useCallback, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { AgGridReact } from 'ag-grid-react';
import { ColDef } from 'ag-grid-community';

import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { supabase } from '../../../db/SupabaseClient';
import PanelTemplate from '../../PanelTemplate';

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
  session_code: string; // ✅ NEW
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

// ✅ NEW (isolated helper, no side effect)
const buildSessionCode = (
  issuedDate: string,
  shift: number,
  warehouse: string,
) => {
  const yyMMdd = issuedDate.replace(/-/g, '').slice(2);
  const shiftPad = String(shift).padStart(4, '0');
  const warehousePad = warehouse
    .toUpperCase()
    .slice(-4)
    .padStart(4, '0');

  return `${yyMMdd}${shiftPad}${warehousePad}`;
};

/* =========================
   COMPONENT
========================= */
const GardaLotoReport: React.FC = () => {
  const [rowData, setRowData] = useState<LotoRow[]>([]);
  const [issuedDate, setIssuedDate] = useState<string>('');
  const [shift, setShift] = useState<number | ''>('');
  const [filtering, setFiltering] = useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  /* =========================
     AG GRID COLUMNS
  ========================= */
  const columnDefs = useMemo<ColDef[]>(
    () => [
      { field: 'session_code', headerName: 'Session Code' }, // ✅ NEW
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
     SUMMARY (UNCHANGED)
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

      const filtered: LotoRow[] = [];

      for (const row of json) {
        const egi = String(row['EGI']).trim();
        if (!ALLOWED_EGI.has(egi)) continue;

        const issued = XLSX.SSF.format('yyyy-mm-dd', row['Issued Date']);
        const shiftVal = Number(row['Shift']);
        const warehouse = String(row['Warehouse']);

        filtered.push({
          session_code: buildSessionCode(
            issued,
            shiftVal,
            warehouse,
          ),
          no_logsheet: row['No Logsheet'],
          issued_date: issued,
          shift: shiftVal,
          warehouse_code: warehouse,
          cn_unit: row['CN Unit'],
          EGI: egi,
          equip_class: row['Equip Class'],
          hm: Number(row['Hm']),
          qty: Number(row['Qty']),
          refueling_start: toTimestamptzGMT8(row['Jam Start']),
        });
      }

      if (filtered.length) {
        const maxIssuedDate = filtered
          .map((r) => r.issued_date)
          .sort()
          .at(-1)!;

        const maxShift = Math.max(...filtered.map((r) => r.shift));

        setIssuedDate(maxIssuedDate);
        setShift(maxShift);
      }

      setRowData(filtered);
      setTimeout(() => setFiltering(false), 200);
    };

    reader.readAsBinaryString(file);
  }, []);

  /* =========================
     DRAG & DROP (UNCHANGED)
  ========================= */
  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  /* =========================
     SUBMIT (UNCHANGED)
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
    }
  };

  /* =========================
     UI (UNCHANGED)
  ========================= */
  return (
    <PanelTemplate title="Garda Loto Report">
      <div className="space-y-4">
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

        {/* SUMMARY (UNCHANGED, FULL) */}
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
    </PanelTemplate>
  );
};

export default GardaLotoReport;
