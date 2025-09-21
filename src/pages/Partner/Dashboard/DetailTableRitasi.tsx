// DetailTableRitasi.tsx
import React, { useState, useMemo, useEffect } from 'react';
import { saveAs } from 'file-saver';
import ExcelJS from 'exceljs';
import { Download, Share2 } from 'lucide-react';
import { RitasiFuel } from '../component/ritasiFuel';
import formatIDNumber from '../Ritation/functions/formatIdNumber';
import { supabase } from '../../../db/SupabaseClient';

interface Props {
  records: RitasiFuel[];
  tanggal: string; // kirim tanggal ke komponen
}

const DetailTableRitasi: React.FC<Props> = ({ records, tanggal }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [summaryData, setSummaryData] = useState<any>(null); // State untuk data ringkasan dari RPC
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // 1️⃣ Data yang sudah diurutkan berdasarkan no_surat_jalan
  const sortedRecords = useMemo(() => {
    return [...records].sort((a, b) =>
      (a.no_surat_jalan || '').localeCompare(b.no_surat_jalan || '', 'id', {
        numeric: true,
        sensitivity: 'base',
      }),
    );
  }, [records]);

  const totalPages = Math.ceil(sortedRecords.length / pageSize);

  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedRecords.slice(start, start + pageSize);
  }, [sortedRecords, currentPage, pageSize]);

  const goToPage = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  // --- Memanggil RPC untuk mengambil data ringkasan ---
  useEffect(() => {
    const fetchSummary = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase.rpc('get_ritasi_summary', {
          p_date: tanggal,
        });
        if (error) {
          console.error('Error fetching summary:', error);
          setSummaryData(null);
        } else {
          setSummaryData(data[0]); // Ambil baris pertama dari hasil
        }
      } catch (e) {
        console.error('RPC call failed:', e);
        setSummaryData(null);
      } finally {
        setIsLoading(false);
      }
    };
    if (tanggal) {
      fetchSummary();
    }
  }, [tanggal]); // Jalankan setiap kali tanggal berubah

  // Export ke Excel (semua shift)
  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Ritasi Fuel');

    // header
    const headers = [
      'No',
      'Tanggal',
      'No Surat Jalan',
      'Unit',
      'Qty Flowmeter Before',
      'Qty Flowmeter After',
      'Qty SJ',
      'Qty Sonding Before',
      'Qty Sonding After',
      'Fuelman',
      'Operator',
      'Warehouse',
      'Shift',
    ];

    // Variabel untuk menentukan jumlah kolom yang akan diberi style header
    // Kolom 'M' adalah kolom ke-13
    const maxColumnsToStyle = 13;

    // Tambahkan baris header ke sheet
    const headerRow = sheet.addRow(headers);

    // style header: font, fill, dan border
    for (let i = 1; i <= maxColumnsToStyle; i++) {
      const cell = headerRow.getCell(i);
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'D3D3D3' },
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    }

    // data
    sortedRecords.forEach((row, index) => {
      sheet.addRow([
        index + 1,
        row.ritation_date,
        row.no_surat_jalan,
        row.unit_id,
        row.qty_flowmeter_before,
        row.qty_flowmeter_after,
        row.qty_sj,
        row.qty_sonding_before,
        row.qty_sonding_after,
        row.fuelman_name,
        row.operator_name,
        row.warehouse_id,
        row.shift,
      ]);
    });

    // border untuk seluruh data
    sheet.eachRow((row) => {
      row.eachCell({ includeEmpty: false }, (cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    });

    // auto-fit
    sheet.columns.forEach((column, i) => {
      let maxLength = headers[i] ? headers[i].length : 10;
      if (column && typeof column.eachCell === 'function') {
        column.eachCell({ includeEmpty: true }, (cell) => {
          const cellLength = cell.value ? cell.value.toString().length : 10;
          maxLength = Math.max(maxLength, cellLength);
        });
      }
      column.width = maxLength + 2;
    });

    // save file
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Ritasi_Fuel_${tanggal}.xlsx`);
  };

  // Share laporan by shift
  const shareShift = (shift: 1 | 2) => {
    // Data total diambil dari state summaryData
    const totalQty =
      shift === 1 ? summaryData?.shift1_qty : summaryData?.shift2_qty;
    const recs = sortedRecords.filter((r) => r.shift === shift);
    let message = `LAPORAN RITASI FUEL GMO\nTANGGAL : ${tanggal}\nSHIFT : ${shift}\n\n`;
    recs.forEach((r, idx) => {
      message += `${idx + 1}. ${r.unit_id} - ${formatIDNumber(r.qty_sj!)} Lt\n`;
    });
    message += `\nTotal Ritasi : ${formatIDNumber(totalQty || 0)} Lt`;
    message += `\n\nPetugas Pencatatan: ${
      records[0]?.petugas_pencatatan_name || '-'
    }`;
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  // Share laporan semua shift
  const shareAll = () => {
    // Data total diambil dari state summaryData
    const totalQty = summaryData?.daily_qty;
    let message = `LAPORAN RITASI FUEL GMO\nTANGGAL : ${tanggal}\nShift 1 & 2\n\n`;
    records.forEach((r, idx) => {
      message += `${idx + 1}. ${r.unit_id} - ${formatIDNumber(r.qty_sj!)} Lt\n`;
    });
    message += `\nTotal Ritasi : ${formatIDNumber(totalQty || 0)} Lt`;
    message += `\n\nPetugas Pencatatan: ${
      records[0]?.petugas_pencatatan_name || '-'
    }`;
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const shareSummary = (description: string, qty: number) => {
    const message = `LAPORAN RITASI FUEL GMO\nTANGGAL : ${tanggal}\n${description}\nTotal : ${formatIDNumber(
      qty,
    )} Lt\n\nPetugas Pencatatan: ${records[0]?.petugas_pencatatan_name || '-'}`;
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm border border-slate-200">
        <thead className="bg-slate-100 dark:bg-graydark">
          <tr>
            <th className="px-2 py-1 border">No</th>
            <th className="px-2 py-1 border">No SJ</th>
            <th className="px-2 py-1 border">Queue</th>
            <th className="px-2 py-1 border">Unit</th>
            <th className="px-2 py-1 border">Qty SJ</th>
            <th className="px-2 py-1 border">Qty Sonding</th>
            <th className="px-2 py-1 border">Operator ID</th>
            <th className="px-2 py-1 border">Fuelman ID</th>
            <th className="px-2 py-1 border">Shift</th>
            <th className="px-2 py-1 border">Photo</th>
          </tr>
        </thead>
        <tbody>
          {paginatedRecords.map((r, idx) => (
            <tr key={r.id}>
              <td className="px-2 py-1 border">
                {(currentPage - 1) * pageSize + idx + 1}
              </td>
              <td className="px-2 py-1 border">{r.no_surat_jalan}</td>
              <td className="px-2 py-1 border">{r.queue_num}</td>
              <td className="px-2 py-1 border">{r.unit_id}</td>
              <td className="px-2 py-1 border">
                {formatIDNumber(r.qty_sj || 0)}
              </td>
              <td className="px-2 py-1 border">
                {formatIDNumber(r.qty_sonding || 0)}
              </td>
              <td className="px-2 py-1 border">{r.operator_name}</td>
              <td className="px-2 py-1 border">{r.fuelman_name}</td>
              <td className="px-2 py-1 border">{r.shift}</td>
              <td className="px-2 py-1 border">
                {r.flowmeter_before_url ||
                r.flowmeter_after_url ||
                r.photo_url ? (
                  <div className="flex space-x-1">
                    {r.photo_url && (
                      <img
                        src={r.photo_url}
                        alt="SJ"
                        className="w-8 h-8 object-cover rounded cursor-pointer"
                        onClick={() => setSelectedImage(r.photo_url ?? null)}
                      />
                    )}
                  </div>
                ) : (
                  '-'
                )}
              </td>
            </tr>
          ))}

          {paginatedRecords.length === 0 && (
            <tr>
              <td colSpan={10} className="text-center py-4">
                Tidak ada data.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {/* Modal Preview Gambar */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-9999"
          onClick={() => setSelectedImage(null)} // klik luar area menutup modal
        >
          <div
            className="max-w-4xl max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()} // supaya klik gambar tidak menutup modal
          >
            <img
              src={selectedImage}
              alt="preview"
              className="w-auto h-auto max-w-full max-h-[90vh] rounded shadow-lg"
            />
          </div>
        </div>
      )}

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-3 gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm">Tampilkan</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="border rounded px-2 py-1 text-sm"
          >
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
          <span className="text-sm">record per halaman</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-2 py-1 border rounded disabled:opacity-50"
          >
            Prev
          </button>
          <span className="text-sm">
            Halaman {currentPage} dari {totalPages || 1}
          </span>
          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-2 py-1 border rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>

      {/* Summary box */}
      <div className="border rounded mt-4 p-3 space-y-2">
        <h3 className="font-semibold">Summary</h3>
        {isLoading ? (
          <p>Loading summary data...</p>
        ) : (
          <div className="border rounded mt-4 overflow-x-auto">
            <table className="min-w-full text-sm border-collapse">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-2 py-1 border text-left">Description</th>
                  <th className="px-2 py-1 border text-center">Qty (Lt)</th>
                  <th className="px-2 py-1 border text-center">Frequency</th>
                  <th className="px-2 py-1 border text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-2 py-1 border">Total Ritasi Shift 1</td>
                  <td className="px-2 py-1 border text-right">
                    {formatIDNumber(summaryData?.shift1_qty || 0)}
                  </td>
                  <td className="px-2 py-1 border text-center">
                    {summaryData?.shift1_freq || 0}
                  </td>
                  <td className="px-2 py-1 border text-center">
                    <button
                      onClick={() => shareShift(1)}
                      className="p-1 rounded hover:bg-slate-100"
                    >
                      <Share2 size={16} />
                    </button>
                  </td>
                </tr>
                <tr>
                  <td className="px-2 py-1 border">Total Ritasi Shift 2</td>
                  <td className="px-2 py-1 border text-right">
                    {formatIDNumber(summaryData?.shift2_qty || 0)}
                  </td>
                  <td className="px-2 py-1 border text-center">
                    {summaryData?.shift2_freq || 0}
                  </td>
                  <td className="px-2 py-1 border text-center">
                    <button
                      onClick={() => shareShift(2)}
                      className="p-1 rounded hover:bg-slate-100"
                    >
                      <Share2 size={16} />
                    </button>
                  </td>
                </tr>
                <tr>
                  <td className="px-2 py-1 border font-semibold">
                    Total Ritasi Daily
                  </td>
                  <td className="px-2 py-1 border text-right font-semibold">
                    {formatIDNumber(summaryData?.daily_qty || 0)}
                  </td>
                  <td className="px-2 py-1 border text-center">
                    {summaryData?.daily_freq || 0}
                  </td>
                  <td className="px-2 py-1 border text-center">
                    <button
                      onClick={() =>
                        shareSummary(
                          'Total Ritasi Daily',
                          summaryData?.daily_qty || 0,
                        )
                      }
                      className="p-1 rounded hover:bg-slate-100"
                    >
                      <Share2 size={16} />
                    </button>
                  </td>
                </tr>
                <tr>
                  <td className="px-2 py-1 border font-semibold">
                    Total Ritasi MTD
                  </td>
                  <td className="px-2 py-1 border text-right font-semibold">
                    {formatIDNumber(summaryData?.mtd_qty || 0)}
                  </td>
                  <td className="px-2 py-1 border text-center">
                    {summaryData?.mtd_freq || 0}
                  </td>
                  <td className="px-2 py-1 border text-center">
                    <button
                      onClick={() =>
                        shareSummary(
                          'Total Ritasi MTD',
                          summaryData?.mtd_qty || 0,
                        )
                      }
                      className="p-1 rounded hover:bg-slate-100"
                    >
                      <Share2 size={16} />
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* tombol bawah */}
        <div className="flex flex-col sm:flex-row items-center gap-2 mt-3">
          <button
            onClick={shareAll}
            className="flex items-center justify-center sm:justify-start gap-1 px-3 py-1 border rounded hover:bg-slate-100 bg-blue-600 text-white w-full sm:w-auto"
          >
            <Share2 size={16} /> Share All
          </button>
          <button
            onClick={exportToExcel}
            className="flex items-center justify-center sm:justify-start gap-1 px-3 py-1 border rounded hover:bg-slate-100 border-blue-600 text-blue-600 w-full sm:w-auto"
          >
            <Download size={16} /> Export All
          </button>
        </div>
      </div>
    </div>
  );
};

export default DetailTableRitasi;
