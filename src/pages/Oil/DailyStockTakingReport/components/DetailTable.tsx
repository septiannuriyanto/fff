// /dst-oil/components/DetailTable.tsx
import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../../../../db/SupabaseClient';
import { DstOliWithLocation } from './DstOliWithLocation';
import StockTakingOilChart from './StockTakingOilChart';
import StockLevelMonitoring from './StockLevelMonitoring';
import { fetchStorageOilSetup } from './fetchSelectedSpecialMonitoring';
import * as XLSX from 'xlsx';
import { getValidMaterials } from './getValidMaterial';
import { UploadConfig } from './uploadConfig';
import { detectAndUpload } from './sourceFileProcessing';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { FileSpreadsheet, Upload } from 'lucide-react';
import UploadModal from './UploadModal';

interface DetailTableProps {
  records: DstOliWithLocation[];
  warehouseFilter: string;
  setWarehouseFilter: (val: string) => void;
  unitFilter: string;
  setUnitFilter: (val: string) => void;
  materialFilter: string;
  setMaterialFilter: (val: string) => void;
  selectedDate: string;
  fetchRecords: (date: string) => void; // refetch after submit
}

const DetailTable: React.FC<DetailTableProps> = ({
  records,
  warehouseFilter,
  setWarehouseFilter,
  unitFilter,
  setUnitFilter,
  materialFilter,
  setMaterialFilter,
  fetchRecords,
  selectedDate,
}) => {
  const [viewMode, setViewMode] = useState<'SOH' | 'Pending'>('SOH');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalField, setModalField] = useState<string>('');
  const [modalRecordId, setModalRecordId] = useState<number | null>(null);
  const [modalValue, setModalValue] = useState<string>('');
  const [descriptionFilter, setDescriptionFilter] = useState<string>('');
  const [tankFilter, setTankFilter] = useState<string>('');
  const [uoiFilter, setUoiFilter] = useState<string>('');
  const [locationFilter, setLocationFilter] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [liquidMeters, setLiquidMeters] = useState<any[]>([]); // data special_monitoring

  useEffect(() => {
    // fetch storage_oil_setup untuk LiquidMeter
    const fetchLiquidMeterData = async () => {
      const { data, error } = await supabase
        .from('storage_oil_setup')
        .select('*')
        .not('special_monitor', 'is', null); // hanya yang punya angka

      if (!error && data) {
        // urutkan sesuai angka special_monitor
        const sorted = data.sort(
          (a, b) => (a.special_monitor ?? 0) - (b.special_monitor ?? 0),
        );
        setLiquidMeters(sorted);
      } else {
        console.error(error);
      }
    };

    fetchLiquidMeterData();
  }, []);

  // Autofocus modal
  useEffect(() => {
    if (modalOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [modalOpen]);

  // Round helper
  const round2 = (num: number | null | undefined) =>
    Math.round(((num ?? 0) + Number.EPSILON) * 100) / 100;

  const sohFisik = round2(records.reduce((acc, r) => acc + (r.qty ?? 0), 0));
  const pendingFailed = round2(
    records.reduce((acc, r) => acc + (r.failed_posting ?? 0), 0),
  );
  const pendingInput = round2(
    records.reduce((acc, r) => acc + (r.pending_input ?? 0), 0),
  );

  const pendingPosting = round2(pendingFailed + pendingInput);

  const sohSystem =
    round2(records.reduce((acc, r) => acc + (r.qty_system_1 ?? 0), 0)) +
    round2(records.reduce((acc, r) => acc + (r.qty_system_2 ?? 0), 0));
  const pendingReceive = round2(
    records.reduce((acc, r) => acc + (r.pending_receive ?? 0), 0),
  );
  const diff = round2(sohFisik + pendingPosting - (sohSystem + pendingReceive));

  // Open modal
  const openModal = (recordId: number, field: string, currentVal?: number) => {
    setModalRecordId(recordId);
    setModalField(field);
    setModalValue(currentVal?.toString() ?? '');
    setModalOpen(true);
  };

  // Save modal
  // ubah signature jadi menerima typeDst
  // saat save:
  const saveModal = async () => {
    const record = records.find((r) => r.id === modalRecordId);
    if (!record) return;

    const value = modalValue === '' ? null : Number(modalValue);

    // mapping field → type dst_system
    const systemFieldMap: Record<
      string,
      'SOH_SAP' | 'SOH_TACTYS' | 'PENDING_RECEIVE' | 'FAILED_POSTING'
    > = {
      qty_system_1: 'SOH_SAP',
      qty_system_2: 'SOH_TACTYS',
      pending_receive: 'PENDING_RECEIVE',
      failed_posting: 'FAILED_POSTING',
    };

    if (systemFieldMap[modalField]) {
      // berarti field ini harus update di dst_system
      const typeDst = systemFieldMap[modalField];

      const filter = {
        dst_date: record.date_dst,
        warehouse_id: record.warehouse_id,
        material_code: record.material_code,
        type: typeDst,
      };

      const { data: existing, error: errCheck } = await supabase
        .from('dst_system')
        .select('id')
        .match(filter)
        .maybeSingle();
      if (errCheck) {
        alert(errCheck.message);
        return;
      }

      if (!value || value === 0) {
        if (existing) {
          const { error: delErr } = await supabase
            .from('dst_system')
            .delete()
            .eq('id', existing.id);
          if (delErr) alert(delErr.message);
        }
      } else {
        if (existing) {
          const { error: updErr } = await supabase
            .from('dst_system')
            .update({ qty: value })
            .eq('id', existing.id);
          if (updErr) alert(updErr.message);
        } else {
          const { error: insErr } = await supabase.from('dst_system').insert({
            dst_date: record.date_dst,
            warehouse_id: record.warehouse_id,
            material_code: record.material_code,
            type: typeDst,
            qty: value,
          });
          if (insErr) alert(insErr.message);
        }
      }
    } else {
      // field ini langsung update di dst_oli
      const { error } = await supabase
        .from('dst_oli')
        .update({ [modalField]: value })
        .eq('id', modalRecordId);
      if (error) alert(error.message);
    }

    setModalOpen(false);
    fetchRecords(selectedDate);
  };

  // Filtered records
  const filteredRecords = records.filter((r) => {
    const warehouseOk =
      !warehouseFilter ||
      (r.warehouse_id?.toLowerCase() ?? '').includes(
        warehouseFilter.toLowerCase(),
      );
    const unitOk =
      !unitFilter ||
      (r.unit_id?.toLowerCase() ?? '').includes(unitFilter.toLowerCase());
    const materialOk =
      !materialFilter ||
      (r.material_code?.toLowerCase() ?? '').includes(
        materialFilter.toLowerCase(),
      );
    const descriptionOk =
      !descriptionFilter ||
      (r.item_description?.toLowerCase() ?? '').includes(
        descriptionFilter.toLowerCase(),
      );
    const tankOk =
      !tankFilter ||
      (r.tank_number?.toString() ?? '').includes(tankFilter.toString());
    const uoiOk =
      !uoiFilter ||
      (r.uoi?.toLowerCase() ?? '').includes(uoiFilter.toLowerCase());
    const locationOk =
      !locationFilter ||
      (r.location?.toLowerCase() ?? '').includes(locationFilter.toLowerCase());

    return (
      warehouseOk &&
      unitOk &&
      materialOk &&
      descriptionOk &&
      tankOk &&
      uoiOk &&
      locationOk
    );
  });

  // Table row coloring
  let lastWarehouse = '';
  let isOddGroup = false;

  // Tambah state di atas (sebelum return)
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadTarget, setUploadTarget] = useState<
    'system1' | 'system2' | 'failed_posting' | null
  >(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  // fungsi buka modal
  const openUploadModal = (
    target: 'system1' | 'system2' | 'failed_posting',
  ) => {
    setUploadTarget(target);
    setUploadModalOpen(true);
    setSelectedFile(null);
  };

  // handle file selection
  const handleFileSelect = (fileList: FileList | null) => {
    if (!fileList) return;
    // ubah FileList → array File
    const filesArray = Array.from(fileList);
    setSelectedFiles(filesArray);
  };

  const handleUpload = async () => {
    if (!selectedFile || !uploadTarget) return;

    try {
      // proses upload
      await detectAndUpload(selectedFile);
      // refresh data setelah upload
      await fetchRecords(selectedDate);
      // tutup modal
      setUploadModalOpen(false);
    } catch (err) {
      // tangkap error dari detectAndUpload atau fetchRecords
      console.error('Upload error:', err);
      // tampilkan ke user sesuai UI kamu
      alert(
        err instanceof Error
          ? `Gagal upload: ${err.message}`
          : 'Gagal upload: Terjadi kesalahan tak terduga.',
      );
    }
  };

  const handleUploadMultiple = async () => {
    // pastikan ada file & target
    if (!selectedFiles?.length || !uploadTarget) return;

    try {
      // jalankan detectAndUpload untuk semua file secara berurutan
      for (const file of selectedFiles) {
        await detectAndUpload(file);
      }

      // setelah semua upload selesai refresh data
      await fetchRecords(selectedDate);

      // tutup modal
      setUploadModalOpen(false);
    } catch (err) {
      console.error('Upload error:', err);
      alert(
        err instanceof Error
          ? `Gagal upload: ${err.message}`
          : 'Gagal upload: Terjadi kesalahan tak terduga.',
      );
    }
  };

  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('StockTaking');

    // header row 1
    const headerRow1 = [
      'No',
      'Key', // kolom baru
      'Warehouse',
      'Unit',
      'Material',
      'Description',
      'Tank',
      'UOI',
      'Location',
      'SOH',
      '',
      '',
      'Pending',
      '',
      '',
    ];
    const headerRow2 = [
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      'Fisik',
      'System1',
      'System2',
      'Receive',
      'Failed',
      'Input',
    ];

    sheet.addRow(headerRow1);
    sheet.addRow(headerRow2);

    // merge cells untuk kolom induk
    sheet.mergeCells('J1:L1'); // SOH  (karena kita nambah 1 kolom di depan)
    sheet.mergeCells('M1:O1'); // Pending
    // merge kolom lain jadi single cell
    ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'].forEach((col) => {
      sheet.mergeCells(`${col}1:${col}2`);
    });

    // isi data
    filteredRecords.forEach((r, idx) => {
      const key = `${r.warehouse_id}-${r.material_code}`;
      sheet.addRow([
        idx + 1,
        key, // kolom baru
        r.warehouse_id,
        r.unit_id,
        r.material_code,
        r.item_description,
        r.tank_number,
        r.uoi,
        r.location,
        r.qty ?? 0,
        r.qty_system_1 ?? 0,
        r.qty_system_2 ?? 0,
        r.pending_receive ?? 0,
        r.failed_posting ?? 0,
        r.pending_input ?? 0,
      ]);
    });

    // styling border + shading
    sheet.eachRow((row, rowNumber) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        // shading header
        if (rowNumber <= 2) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFBFBFBF' },
          };
          cell.font = { bold: true };
        }
      });
    });

    // autosize kolom
    sheet.columns.forEach((col) => {
      let maxLength = 10;
      if (typeof col.eachCell === 'function') {
        col.eachCell({ includeEmpty: true }, (cell) => {
          const columnLength = cell.value ? cell.value.toString().length : 0;
          if (columnLength > maxLength) {
            maxLength = columnLength;
          }
        });
      }
      col.width = maxLength + 2;
    });

    // export
    const buf = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buf]), `StockTaking-${selectedDate}.xlsx`);
  };

  return (
    <div>
      <StockLevelMonitoring
        onUpdated={fetchStorageOilSetup}
        selectedDate={selectedDate}
      />

      <div className="chart__and-summary p-4 border rounded mb-4">
        {/* Chart summary */}

        <div className="mb-4">
          <StockTakingOilChart
            sohFisik={sohFisik}
            pendingPosting={pendingPosting}
            sohSystem={sohSystem}
            pendingReceive={pendingReceive}
            diff={diff}
          />
        </div>

        {/* Summary numbers */}
        <div className="w-full flex justify-between mb-4 px-2">
          <div>
            <h1 className="font-bold">Stock Fisik</h1>
            <h1>{sohFisik.toLocaleString('id-ID')}</h1>
          </div>
          <div>
            <h1 className="font-bold">Pending Posting</h1>
            <h1>{pendingPosting.toLocaleString('id-ID')}</h1>
          </div>
          <div>
            <h1 className="font-bold">Stock System</h1>
            <h1>{sohSystem.toLocaleString('id-ID')}</h1>
          </div>
          <div>
            <h1 className="font-bold">Pending Receive</h1>
            <h1>{pendingReceive.toLocaleString('id-ID')}</h1>
          </div>
          <div>
            <h1 className="font-bold">Difference</h1>
            <h1
              className={`${
                diff > 0 ? 'text-green-500' : diff < 0 ? 'text-red-500' : ''
              }`}
            >
              {diff.toLocaleString('id-ID')}
            </h1>
          </div>
        </div>
      </div>

      <h3 className="text-center font-semibold mb-2">
        Detail Stock Taking – {filteredRecords[0]?.date_dst ?? ''}
      </h3>

      {/* Switcher */}
      <div className="switcher flex flex-wrap justify-center gap-4 mb-2">
        <div className="buttons__border border border-slate-200 rounded-md p-2 bg-slate-200 dark:bg-boxdark-2">
          <button
            onClick={() => setViewMode('SOH')}
            className={`px-4 py-1 rounded ${
              viewMode === 'SOH' ? 'bg-slate-400 text-white' : 'bg-gray-200'
            }`}
          >
            SOH
          </button>
          <button
            onClick={() => setViewMode('Pending')}
            className={`px-4 py-1 rounded ${
              viewMode === 'Pending' ? 'bg-slate-400 text-white' : 'bg-gray-200'
            }`}
          >
            Pending
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <div className="flex gap-2 mb-2">
          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
          >
            <FileSpreadsheet className="w-5 h-5" />
            Export Excel
          </button>

          <button
            onClick={() => setUploadModalOpen(true)}
            className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            <Upload className="w-5 h-5" />
            Upload Semua
          </button>

          <UploadModal
            open={uploadModalOpen}
            onClose={() => setUploadModalOpen(false)}
            onUpload={handleUploadMultiple}
          />
        </div>

        <table className="min-w-full border-collapse border border-slate-400 dark:border-slate-300">
          <thead className="bg-slate-200 dark:bg-slate-800">
            {/* Baris 1: Headers */}
            <tr>
              <th className="px-3 py-2 border text-center">No</th>
              <th className="px-3 py-2 border text-center">Warehouse</th>
              <th className="px-3 py-2 border text-center">Unit</th>
              <th className="px-3 py-2 border text-center">Material</th>
              <th className="px-3 py-2 border text-center">Description</th>
              <th className="px-3 py-2 border text-center">Tank</th>
              <th className="px-3 py-2 border text-center">UOI</th>
              <th className="px-3 py-2 border text-center">Location</th>
              <th colSpan={3} className="px-3 py-2 border text-center">
                {viewMode === 'SOH' ? 'Qty' : 'Pending'}
              </th>
            </tr>
            {/* Baris 2: Filters */}
            <tr>
              <th className="px-3 py-1 border"></th> {/* No */}
              <th className="px-3 py-1 border">
                <select
                  className="w-full border rounded px-1 text-sm"
                  value={warehouseFilter}
                  onChange={(e) => setWarehouseFilter(e.target.value)}
                >
                  <option value="">All</option>
                  {[...new Set(records.map((r) => r.warehouse_id))].map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </select>
              </th>
              <th className="px-3 py-1 border">
                <select
                  className="w-full border rounded px-1 text-sm"
                  value={unitFilter}
                  onChange={(e) => setUnitFilter(e.target.value)}
                >
                  <option value="">All</option>
                  {[...new Set(records.map((r) => r.unit_id))].map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </th>
              <th className="px-3 py-1 border">
                <select
                  className="w-full border rounded px-1 text-sm"
                  value={materialFilter}
                  onChange={(e) => setMaterialFilter(e.target.value)}
                >
                  <option value="">All</option>
                  {[...new Set(records.map((r) => r.material_code))]
                    .sort()
                    .map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                </select>
              </th>
              <th className="px-3 py-1 border">
                <select
                  className="w-full border rounded px-1 text-sm"
                  value={descriptionFilter}
                  onChange={(e) => setDescriptionFilter(e.target.value)}
                >
                  <option value="">All</option>
                  {[...new Set(records.map((r) => r.item_description))]
                    .sort((a, b) => (a ?? '').localeCompare(b ?? ''))
                    .map((d) => (
                      <option key={d ?? ''} value={d ?? ''}>
                        {d ?? ''}
                      </option>
                    ))}
                </select>
              </th>
              <th className="px-3 py-1 border">
                <select
                  className="w-full border rounded px-1 text-sm"
                  value={tankFilter}
                  onChange={(e) => setTankFilter(e.target.value)}
                >
                  <option value="">All</option>
                  {[...new Set(records.map((r) => r.tank_number))].map((t) => (
                    <option key={t ?? ''} value={t ?? ''}>
                      {t ?? ''}
                    </option>
                  ))}
                </select>
              </th>
              <th className="px-3 py-1 border">
                <select
                  className="w-full border rounded px-1 text-sm"
                  value={uoiFilter}
                  onChange={(e) => setUoiFilter(e.target.value)}
                >
                  <option value="">All</option>
                  {[...new Set(records.map((r) => r.uoi))].map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </th>
              <th className="px-3 py-1 border">
                <select
                  className="w-full border rounded px-1 text-sm"
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                >
                  <option value="">All</option>
                  {[...new Set(records.map((r) => r.location))].map((l) => (
                    <option key={l ?? ''} value={l ?? ''}>
                      {l ?? ''}
                    </option>
                  ))}
                </select>
              </th>
              {viewMode === 'SOH' ? (
                <>
                  <th className="px-3 py-1 border">
                    <div className="flex flex-col items-center">
                      <span>Fisik</span>
                    </div>
                  </th>
                  <th className="px-3 py-1 border">
                    <div className="flex flex-col items-center">
                      <span>System1</span>
                      <button
                        onClick={() => openUploadModal('system1')}
                        className="mt-1 px-2 py-0.5 text-xs bg-slate-400 text-white rounded"
                      >
                        Upload
                      </button>
                    </div>
                  </th>
                  <th className="px-3 py-1 border">
                    <div className="flex flex-col items-center">
                      <span>System2</span>
                      <button
                        onClick={() => openUploadModal('system2')}
                        className="mt-1 px-2 py-0.5 text-xs bg-slate-400 text-white rounded"
                      >
                        Upload
                      </button>
                    </div>
                  </th>
                </>
              ) : (
                <>
                  <th className="px-3 py-1 border">Receive</th>
                  <th className="px-3 py-1 border">
                    <div className="flex flex-col items-center">
                      <span>Failed</span>
                      <button
                        onClick={() => openUploadModal('failed_posting')}
                        className="mt-1 px-2 py-0.5 text-xs bg-slate-400 text-white rounded"
                      >
                        Upload
                      </button>
                    </div>
                  </th>
                  <th className="px-3 py-1 border">Input</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {filteredRecords.map((r, idx) => {
              if (r.warehouse_id !== lastWarehouse) {
                isOddGroup = !isOddGroup;
                lastWarehouse = r.warehouse_id;
              }

              const bgClass = isOddGroup
                ? 'bg-green-50 dark:bg-green-800'
                : 'bg-white dark:bg-slate-700';

              return (
                <tr
                  key={r.id}
                  className={`${bgClass} border-b border-slate-400 dark:border-slate-300 hover:bg-green-200 dark:hover:bg-green-900`}
                >
                  <td className="px-3 py-1 border text-center">{idx + 1}</td>
                  <td className="px-3 py-1 border">{r.warehouse_id}</td>
                  <td className="px-3 py-1 border">{r.unit_id}</td>
                  <td className="px-3 py-1 border">{r.material_code}</td>
                  <td className="px-3 py-1 border">{r.item_description}</td>
                  <td className="px-3 py-1 border text-center">
                    {r.tank_number}
                  </td>
                  <td className="px-3 py-1 border">{r.uoi}</td>
                  <td className="px-3 py-1 border">{r.location}</td>

                  {viewMode === 'SOH' ? (
                    <>
                      <td
                        onClick={() =>
                          openModal(r.id, 'qty', r.qty ?? undefined)
                        }
                        className="cursor-pointer px-3 py-1 border text-center hover:bg-green-300 dark:hover:bg-green-950"
                      >
                        {r.qty ?? 0}
                      </td>
                      <td
                        onClick={() =>
                          openModal(
                            r.id,
                            'qty_system_1',
                            r.qty_system_1 ?? undefined,
                          )
                        }
                        className="cursor-pointer px-3 py-1 border text-center hover:bg-green-300 dark:hover:bg-green-950"
                      >
                        {r.qty_system_1 ?? 0}
                      </td>
                      <td
                        onClick={() =>
                          openModal(
                            r.id,
                            'qty_system_2',
                            r.qty_system_2 ?? undefined,
                          )
                        }
                        className="cursor-pointer px-3 py-1 border text-center hover:bg-green-300 dark:hover:bg-green-950"
                      >
                        {r.qty_system_2 ?? 0}
                      </td>
                    </>
                  ) : (
                    <>
                      <td
                        onClick={() =>
                          openModal(
                            r.id,
                            'pending_receive',
                            r.pending_receive ?? undefined,
                          )
                        }
                        className="cursor-pointer px-3 py-1 border text-center hover:bg-green-300 dark:hover:bg-green-950"
                      >
                        {r.pending_receive ?? 0}
                      </td>
                      <td
                        onClick={() =>
                          openModal(
                            r.id,
                            'failed_posting',
                            r.failed_posting ?? undefined,
                          )
                        }
                        className="cursor-pointer px-3 py-1 border text-center hover:bg-green-300 dark:hover:bg-green-950"
                      >
                        {r.failed_posting ?? 0}
                      </td>
                      <td
                        onClick={() =>
                          openModal(
                            r.id,
                            'pending_input',
                            r.pending_input ?? undefined,
                          )
                        }
                        className="cursor-pointer px-3 py-1 border text-center hover:bg-green-300 dark:hover:bg-green-950"
                      >
                        {r.pending_input ?? 0}
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {uploadModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white dark:bg-slate-800 p-4 rounded shadow-md w-96">
            <h4 className="mb-2 font-semibold">
              Upload file untuk{' '}
              {uploadTarget === 'system1'
                ? 'System 1'
                : uploadTarget === 'system2'
                ? 'System 2'
                : uploadTarget === 'failed_posting'
                ? 'Failed Posting'
                : ''}
            </h4>

            <div
              onDrop={(e) => {
                e.preventDefault();
                handleFileSelect(e.dataTransfer.files);
              }}
              onDragOver={(e) => e.preventDefault()}
              className="border-2 border-dashed border-gray-400 rounded p-6 text-center cursor-pointer"
              onClick={() => document.getElementById('fileInput')?.click()}
            >
              {selectedFile ? (
                <p>{selectedFile.name}</p>
              ) : (
                <p>Drag & drop file di sini atau klik untuk memilih file</p>
              )}
            </div>
            <input
              id="fileInput"
              type="file"
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files)}
            />

            <div className="mt-3 flex justify-end gap-2">
              <button
                onClick={() => setUploadModalOpen(false)}
                className="px-3 py-1 bg-gray-300 rounded"
              >
                Batal
              </button>
              <button
                onClick={handleUpload}
                disabled={!selectedFile}
                className="px-3 py-1 bg-blue-500 text-white rounded disabled:opacity-50"
              >
                Upload
              </button>
            </div>
          </div>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-slate-800 p-4 rounded shadow-md w-80">
            <h4 className="mb-2 font-semibold">
              Input nilai untuk {modalField}
            </h4>
            <input
              ref={inputRef}
              type="number"
              className="border p-1 w-full text-center"
              value={modalValue}
              onChange={(e) => setModalValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  saveModal();
                }
              }}
            />
            <div className="mt-3 flex justify-end gap-2">
              <button
                onClick={() => setModalOpen(false)}
                className="px-3 py-1 bg-gray-300 rounded"
              >
                Batal
              </button>
              <button
                onClick={saveModal}
                className="px-3 py-1 bg-blue-500 text-white rounded"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DetailTable;
