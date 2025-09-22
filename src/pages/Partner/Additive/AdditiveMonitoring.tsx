import React, { useEffect, useState } from 'react';
import { supabase } from '../../../db/SupabaseClient';
import { ADDITIVE_PORTION } from '../../../common/Constants/constants';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import formatIDNumber from '../Ritation/functions/formatIdNumber';

interface AdditiveRow {
  date: string;
  qtyRitasi: number;
  freqRitasi: number;
  qtyAdditive: number;
  mrNumber: string;
  qtyReserve?: number | null;
  reservNumber?: string | null;
}

const AdditiveMonitoring: React.FC = () => {
  const now = new Date();
  const [year, setYear] = useState<number>(now.getFullYear());
  const [month, setMonth] = useState<number>(now.getMonth() + 1);
  const [rows, setRows] = useState<AdditiveRow[]>([]);
  const [editing, setEditing] = useState<
    Record<string, { qtyReserve: string; reservNumber: string }>
  >({});

  // summary
  const [summary, setSummary] = useState({
    qtyRitasiMTD: 0,
    qtyAdditiveCreated: 0,
    qtyAdditivePending: 0,
    achievement: 0,
  });

  useEffect(() => {
    fetchData();
  }, [year, month]);

  const fetchData = async () => {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);

    const { data: ritasiData, error } = await supabase
      .from('ritasi_fuel')
      .select('ritation_date, qty_sj')
      .gte('ritation_date', start.toISOString())
      .lte('ritation_date', end.toISOString());

    if (error) {
      console.error(error);
      return;
    }

    const grouped: Record<string, { totalQty: number; freq: number }> = {};

    ritasiData?.forEach((row) => {
      const date = row.ritation_date;
      if (!grouped[date]) grouped[date] = { totalQty: 0, freq: 0 };
      grouped[date].totalQty += row.qty_sj ?? 0;
      grouped[date].freq += 1;
    });

    const { data: additiveData } = await supabase
      .from('additive_record')
      .select('*')
      .gte('ritation_date', start.toISOString())
      .lte('ritation_date', end.toISOString());

    const additiveMap: Record<string, any> = {};
    additiveData?.forEach((row) => {
      additiveMap[row.ritation_date] = row;
    });

    const newRows: AdditiveRow[] = Object.entries(grouped).map(
      ([date, val]) => {
        const qtyAdditive = val.totalQty / ADDITIVE_PORTION;
        const mrNumber = generateMRNumber(date);
        const additiveRow = additiveMap[date];
        return {
          date,
          qtyRitasi: val.totalQty,
          freqRitasi: val.freq,
          qtyAdditive,
          mrNumber,
          qtyReserve: additiveRow?.qty_ritasi ?? null,
          reservNumber: additiveRow?.reserv_number ?? null,
        };
      },
    );

    // summary calc
    const qtyRitasiMTD = newRows.reduce((acc, r) => acc + r.qtyRitasi, 0);
    const qtyAdditiveCreated = newRows
      .filter((r) => r.qtyReserve != null)
      .reduce((acc, r) => acc + (r.qtyAdditive ?? 0), 0);
    const qtyAdditivePending = newRows
      .filter((r) => r.qtyReserve == null)
      .reduce((acc, r) => acc + (r.qtyAdditive ?? 0), 0);
    const achievement =
      (qtyAdditiveCreated / (qtyAdditiveCreated + qtyAdditivePending)) * 100 ||
      0;

    setSummary({
      qtyRitasiMTD,
      qtyAdditiveCreated,
      qtyAdditivePending,
      achievement,
    });

    setRows(newRows);
  };

  const generateMRNumber = (date: string) => {
    const d = new Date(date);
    const yy = d.getFullYear().toString().slice(-2);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `G${yy}${mm}${dd}`;
  };

  const handleInputChange = (
    date: string,
    field: 'qtyReserve' | 'reservNumber',
    value: string,
  ) => {
    setEditing((prev) => ({
      ...prev,
      [date]: {
        ...prev[date],
        [field]: value,
      },
    }));
  };

  const handleKeyDown = async (
    date: string,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === 'Enter') {
      const row = rows.find((r) => r.date === date);
      const editData = editing[date];
      if (!row || !editData) return;

      const { qtyReserve, reservNumber } = editData;

      if (!qtyReserve) {
        alert('Input Qty Create Additive');
        return;
      }

      const { error } = await supabase.from('additive_record').insert({
        ritation_date: date,
        qty_ritasi: row.qtyRitasi,
        qty_additive: Number(row.qtyAdditive.toFixed(2)),
        mr_number: row.mrNumber,
        reserv_number: reservNumber,
        record_by: null,
      });

      if (error) {
        console.error(error);
      } else {
        fetchData();
        setEditing((prev) => {
          const newEdit = { ...prev };
          delete newEdit[date];
          return newEdit;
        });
      }
    }
  };

  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Additive Monitoring');

    // Header
    const header = [
      'No',
      'Tanggal Ritasi',
      'Freq Ritasi',
      'Qty Ritasi',
      'Qty Additive',
      'MR Number',
      'Qty Reserve',
      'Nomor Reserve',
    ];

    worksheet.addRow(header);

    // Batas styling header
    const max_column = 8; // default 8 kolom

    // Style header hanya sampai max_column
    const headerRow = worksheet.getRow(1);
    for (let i = 1; i <= max_column; i++) {
      const cell = headerRow.getCell(i);
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'D3D3D3' }, // light gray
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    }

    // Isi data
    rows.forEach((row, idx) => {
      worksheet.addRow([
        idx + 1,
        row.date,
        row.freqRitasi,
        row.qtyRitasi,
        Number(row.qtyAdditive.toFixed(2)),
        row.mrNumber,
        row.qtyReserve ?? '',
        row.reservNumber ?? '',
      ]);
    });

    // Border semua sel
    worksheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    });

    // AutoFit kolom
    worksheet.columns.forEach((col) => {
      let maxLength = 10;
      if (col && typeof col.eachCell === 'function') {
        col.eachCell({ includeEmpty: true }, (cell) => {
          const cellLength = cell.value ? cell.value.toString().length : 10;
          if (cellLength > maxLength) {
            maxLength = cellLength;
          }
        });
      }
      col.width = maxLength + 2;
    });

    // Simpan file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    saveAs(blob, `AdditiveMonitoring_${year}_${month}.xlsx`);
  };

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
          <div className=" rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark mb-6">
        <div className="flex flex-wrap items-center">
          <div className="w-full border-stroke dark:border-strokedark xl:border-l-2">
            <div className="w-full p-4 sm:p-12.5 xl:p-5">
            <h2 className="mb-2 font-bold text-black dark:text-white sm:text-title-sm w-full">
                Additive Monitoring
              </h2>
  
              <div className="main-content  w-full">
                <div className="space-y-4">
      <div className="flex space-x-4">
        <select
          className="border rounded px-2 py-1"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>

        <select
          className="border rounded px-2 py-1"
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
        >
          {months.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <button
          onClick={exportToExcel}
          className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded"
        >
          Export to Excel
        </button>
      </div>

      <table className="table-auto w-full border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="border px-2 py-1">No</th>
            <th className="border px-2 py-1">Tanggal Ritasi</th>
            <th className="border px-2 py-1">Freq Ritasi</th>
            <th className="border px-2 py-1">Qty Ritasi</th>
            <th className="border px-2 py-1">Qty Additive</th>
            <th className="border px-2 py-1">MR Number</th>
            <th className="border px-2 py-1">Qty Reserve</th>
            <th className="border px-2 py-1">Nomor Reserve</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            const isEditing = !row.qtyReserve && !row.reservNumber;
            return (
              <tr key={row.date}>
                <td className="border px-2 py-1 text-center">{idx + 1}</td>
                <td className="border px-2 py-1">{row.date}</td>
                <td className="border px-2 py-1 text-right">
                  {row.freqRitasi}
                </td>
                <td className="border px-2 py-1 text-right">{formatIDNumber(row.qtyRitasi)}</td>
                <td className="border px-2 py-1 text-right">
                  {row.qtyAdditive.toFixed(2)}
                </td>
                <td className="border px-2 py-1">{row.mrNumber}</td>
                <td className="border px-2 py-1">
                  {isEditing ? (
                    <input
                      type="number"
                      className="border rounded px-1 w-20"
                      placeholder="Click..."
                      value={editing[row.date]?.qtyReserve || ''}
                      onFocus={() => {
                        // jika kosong, isi otomatis dengan pembulatan ke atas qtyAdditive
                        if (!editing[row.date]?.qtyReserve) {
                          setEditing((prev) => ({
                            ...prev,
                            [row.date]: {
                              ...prev[row.date],
                              qtyReserve: Math.ceil(row.qtyAdditive).toString(),
                              reservNumber: prev[row.date]?.reservNumber || '',
                            },
                          }));
                        }
                      }}
                      onChange={(e) =>
                        handleInputChange(
                          row.date,
                          'qtyReserve',
                          e.target.value,
                        )
                      }
                      onKeyDown={(e) => handleKeyDown(row.date, e)}
                    />
                  ) : (
                    row.qtyReserve
                  )}
                </td>

                <td className="border px-2 py-1">
                  {isEditing ? (
                    <input
                      type="text"
                      className="border rounded px-1 w-28"
                      placeholder="Input and Enter"
                      value={editing[row.date]?.reservNumber || ''}
                      onChange={(e) =>
                        handleInputChange(
                          row.date,
                          'reservNumber',
                          e.target.value,
                        )
                      }
                      onKeyDown={(e) => handleKeyDown(row.date, e)}
                    />
                  ) : (
                    row.reservNumber
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Summary */}
      <div className="mt-4 border p-4 rounded">
        <h3 className="font-bold mb-2">Summary MTD</h3>
        <div className="grid grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-gray-500">Qty Ritasi MTD</div>
            <div className="font-bold">{formatIDNumber(Number(summary.qtyRitasiMTD.toFixed(2)))}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Qty Additive Created</div>
            <div className="font-bold">
              {summary.qtyAdditiveCreated.toFixed(2)}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Qty Additive Pending</div>
            <div className="font-bold">
              {summary.qtyAdditivePending.toFixed(2)}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500">
              Additive Percent Achievement
            </div>
            <div
              className={`font-bold ${
                summary.achievement >= 100 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {summary.achievement.toFixed(2)}%
            </div>
          </div>
        </div>
      </div>
    </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    
  );
};

export default AdditiveMonitoring;
