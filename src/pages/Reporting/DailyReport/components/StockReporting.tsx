import React, { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../../../../db/SupabaseClient";
import { getVolumeFromTera } from "./getVolumeFromTera";
import Loader from "../../../../common/Loader/Loader";

// Import AG Grid Components
import { AgGridReact } from 'ag-grid-react';
import { ColDef, ValueFormatterParams } from 'ag-grid-community';

// Import CSS AG Grid
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

// --- Interfaces ---
interface StorageUnit {
  id: number;
  warehouse_id: string;
  unit_id: string;
}

interface UnitData {
  unit_id: string;
  warehouse_id?: string;
  sonding_awal?: string;
  sonding_akhir?: string;
  stock_awal?: number; 
  stock_akhir?: number; 
  ritasi?: string;
  status?: string;
  lokasi?: string;
  flow_awal?: string;
  flow_akhir?: string;
  issuing_report?: number; 
  issuing_flowmeter?: number; 
  issuing_sonding?: number; 
  transfer_out?: number; 
  transfer_in?: number; 
  isStaticTank?: boolean; 
}

interface PartnerFill {
    unit: string;
    amount: number;
    sourceUnit: string;
}

// --- Komponen Utama ---
const StockReporting: React.FC = () => {
  const [units, setUnits] = useState<StorageUnit[]>([]);
  const [rawText, setRawText] = useState("");
  const [parsedRawData, setParsedRawData] = useState<Record<string, UnitData>>({});
  const [finalData, setFinalData] = useState<UnitData[]>([]); 
  const [partnerFillSummary, setPartnerFillSummary] = useState<PartnerFill[]>([]); // State baru untuk summary
  const [isLoading, setIsLoading] = useState(false);

  // --- Utilitas Parsing ---

  const extractSection = (text: string, keyword: string): string[] => {
    const regex = new RegExp(`\\*${keyword}[\\s\\S]*?(?=\\*\\w|\\*Note|$)`, "i");
    const match = text.match(regex);
    if (!match) return [];
    
    return match[0]
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("*"));
  };

  const parseRange = (value: string): [string, string] => {
    const normalizedValue = value.replace(/,/g, ".").replace(/[^\d.\-]/g, " ");
    const parts = normalizedValue
      .split(/[\s\-]+/) 
      .map((v) => v.trim())
      .filter((v) => v); 

    const awal = parts[0] || "";
    const akhir = parts[1] || awal || "";

    return [awal, akhir];
  };

  // --- 1. Ambil Daftar Unit dari Supabase (Unchanged) ---
  useEffect(() => {
    const fetchUnits = async () => {
      const { data, error } = await supabase
        .from("storage")
        .select("id, warehouse_id, unit_id")
        .neq("status", "OUT")
        .order("warehouse_id", { ascending: true });

      if (error) console.error("Error fetching storage:", error);
      else setUnits(data || []);
    };
    fetchUnits();
  }, []);

  // --- 2. Parsing Data Mentah (Update Transfer Logic) ---
  useEffect(() => {
    if (!rawText.trim()) {
      setParsedRawData({});
      setPartnerFillSummary([]); // Clear summary
      return;
    }

    const sections = {
      issuing: extractSection(rawText, "ISSUING OUT"),
      sonding: extractSection(rawText, "SONDING AWAL"),
      flow: extractSection(rawText, "FLOWMETER AWAL"),
      ritasi: extractSection(rawText, "RITASI"),
      transfer: extractSection(rawText, "WAREHOUSE TRANSFER"),
      readiness: extractSection(rawText, "READINESS"),
    };

    const allUnits: Record<string, UnitData> = {};
    const partnerFills: PartnerFill[] = []; // Temporary array for partner fills

    const parseKeyValue = (lines: string[], section: keyof typeof sections) => {
      lines.forEach((line) => {
        const match = line.match(/([A-Za-z0-9_-]+)\s*=\s*(.*)/); 
        
        if (section === "transfer") {
            // Logic khusus untuk WAREHOUSE TRANSFER: Source - Destination = Amount (Notes)
            const transferMatch = line.match(/([A-Za-z0-9_-]+)\s*-\s*([A-Za-z0-9_-]+)\s*=\s*([0-9.,]+)\s*(\((.*)\))?/i);
            
            if (transferMatch) {
                const source = transferMatch[1].toUpperCase();
                const destination = transferMatch[2].toUpperCase();
                const amountStr = transferMatch[3].replace(/,/g, ".");
                const amount = parseFloat(amountStr) || 0;
                const partnerUnit = (transferMatch[5] || "").toUpperCase(); // Unit mitra di dalam kurung

                // 1. Catat Transfer Out ke unit sumber (selalu dilakukan)
                if (!allUnits[source]) allUnits[source] = { unit_id: source };
                allUnits[source].transfer_out = (allUnits[source].transfer_out || 0) + amount;

                // 2. Logika Transfer In
                if (destination === 'WHBC') {
                    // Jika tujuan WHBC, catat sebagai Partner Fill
                    if (partnerUnit) {
                        partnerFills.push({
                            unit: partnerUnit,
                            amount: amount,
                            sourceUnit: source,
                        });
                    }
                } else {
                    // Jika tujuan unit internal, catat sebagai Transfer In
                    if (!allUnits[destination]) allUnits[destination] = { unit_id: destination };
                    allUnits[destination].transfer_in = (allUnits[destination].transfer_in || 0) + amount;
                }
            }
            return;
        }

        if (match) {
          const unit = match[1].toUpperCase();
          const value = match[2].trim();

          if (!allUnits[unit]) allUnits[unit] = { unit_id: unit };

          switch (section) {
            case "sonding":
              const [awal, akhir] = parseRange(value);
              allUnits[unit].sonding_awal = awal;
              allUnits[unit].sonding_akhir = akhir;
              break;
            case "flow":
              const [fAwal, fAkhir] = parseRange(value);
              allUnits[unit].flow_awal = fAwal;
              allUnits[unit].flow_akhir = fAkhir;
              break;
            case "ritasi":
              allUnits[unit].ritasi = value.replace(/[^\d.,-]/g, "");
              break;
            case "issuing":
              const cleanIssuingValue = value.replace(/,/g, ".").replace(/[^\d.]/g, '');
              allUnits[unit].issuing_report = parseFloat(cleanIssuingValue) || 0;
              break;
            case "readiness":
              const parts = value.split("-").map((v) => v.trim());
              allUnits[unit].status = parts[0] || "";
              allUnits[unit].lokasi = parts[1] || "";
              break;
          }
        }
      });
    };

    Object.entries(sections).forEach(([key, lines]) => {
      parseKeyValue(lines, key as keyof typeof sections);
    });

    setParsedRawData(allUnits);
    setPartnerFillSummary(partnerFills); // Set summary data
  }, [rawText]);

  // --- 3. Hitung Volume Tera & Issuing (Unchanged Logic) ---

  const calculateTera = useCallback(
    async (dataToProcess: Record<string, UnitData>) => {
      if (Object.keys(dataToProcess).length === 0) {
          setFinalData([]);
          return;
      }
      
      setIsLoading(true);

      const updatedData: Record<string, UnitData> = JSON.parse(
        JSON.stringify(dataToProcess)
      );

      const unitKeys = Object.keys(dataToProcess);
      
      const unitMap = new Map(units.map(u => [u.unit_id, u.warehouse_id]));

      for (const unit of unitKeys) {
        const d = updatedData[unit];
        d.warehouse_id = d.warehouse_id || unitMap.get(unit) || "-";
        d.isStaticTank = !unitMap.has(unit) && unit.startsWith('MTG');

        // 1. Calculate Stock from Tera
        const cleanAwal = (d.sonding_awal || "").replace(/,/g, ".");
        const cleanAkhir = (d.sonding_akhir || d.sonding_awal || "").replace(/,/g, ".");
        
        const awalNum = parseFloat(cleanAwal) || 0;
        const akhirNum = parseFloat(cleanAkhir) || 0;

        d.stock_awal = (awalNum > 0) ? await getVolumeFromTera(unit, awalNum) : 0;
        d.stock_akhir = (akhirNum > 0) ? await getVolumeFromTera(unit, akhirNum) : 0;

        // 2. Calculate Issuing by Flowmeter
        const flowAwal = parseFloat((d.flow_awal || "0").replace(/,/g, '.'));
        const flowAkhir = parseFloat((d.flow_akhir || d.flow_awal || "0").replace(/,/g, '.'));
        d.issuing_flowmeter = Math.max(0, flowAkhir - flowAwal);

        // 3. Calculate Issuing by Sonding (Discrepancy/Usage)
        const ritasi = parseFloat((d.ritasi || "0").replace(/,/g, '.'));
        const transferOut = d.transfer_out || 0;
        const transferIn = d.transfer_in || 0;
        const stockAwal = d.stock_awal || 0;
        const stockAkhir = d.stock_akhir || 0;

        // Issuing_Sonding = Stock Awal + Ritasi + Transfer In - Transfer Out - Stock Akhir
        d.issuing_sonding = stockAwal + ritasi + transferIn - transferOut - stockAkhir;
      }

      const dataArray = Object.values(updatedData).sort((a, b) => a.unit_id.localeCompare(b.unit_id));
      setFinalData(dataArray); 
      setIsLoading(false);
    },
    [units] 
  );

  // --- 4. Trigger Perhitungan Tera (Unchanged) ---
  useEffect(() => {
    if (Object.keys(parsedRawData).length > 0) {
        calculateTera(parsedRawData);
    } else {
        setFinalData([]);
    }
  }, [parsedRawData, calculateTera]); 


  // --- Fungsi Clear dan AG Grid Config ---

  const handleClear = () => {
    setRawText("");
    setParsedRawData({});
    setFinalData([]);
    setPartnerFillSummary([]); // Clear summary
    setIsLoading(false);
  };
  
  const formatValue = (params: ValueFormatterParams) => {
    if (params.value === undefined || params.value === null || isNaN(params.value)) {
        return '-';
    }
    return Number(params.value).toFixed(1).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const getIssuingSondingStyle = (params: any) => {
    if (params.data.issuing_sonding < -10 || params.data.issuing_sonding > 10) { 
        return { backgroundColor: 'rgba(255, 100, 100, 0.5)', fontWeight: 'bold' }; 
    }
    return null;
  };
  
  const getRowStyle = (params: any) => {
    if (params.data.isStaticTank) {
      return { backgroundColor: 'rgba(255, 237, 180, 0.4)' };
    }
    return null;
  };
  
  const columnDefs: ColDef<UnitData>[] = useMemo(() => [
    { headerName: "Unit ID", field: "unit_id", pinned: 'left', sortable: true, filter: true, width: 100, cellClass: 'font-medium' },
    { headerName: "Warehouse", field: "warehouse_id", sortable: true, filter: true, width: 120 },
    { headerName: "Status", field: "status", sortable: true, filter: true, width: 100 },
    { headerName: "Lokasi", field: "lokasi", sortable: true, filter: true, width: 120 },
    
    // --- Stock ---
    { headerName: "Sonding Awal", field: "sonding_awal", width: 100 },
    { headerName: "Sonding Akhir", field: "sonding_akhir", width: 100 },
    { headerName: "Stock Awal (L)", field: "stock_awal", type: 'numericColumn', valueFormatter: p => p.value !== undefined ? Number(p.value).toFixed(0) : '-', width: 120 },
    { headerName: "Stock Akhir (L)", field: "stock_akhir", type: 'numericColumn', valueFormatter: p => p.value !== undefined ? Number(p.value).toFixed(0) : '-', width: 120 },
    
    // --- Transfers & Ritasi ---
    { headerName: "Ritasi (L)", field: "ritasi", type: 'numericColumn', valueFormatter: formatValue, width: 100 },
    { headerName: "Transfer In (L)", field: "transfer_in", type: 'numericColumn', valueFormatter: formatValue, cellClass: 'bg-yellow-100', width: 120 },
    { headerName: "Transfer Out (L)", field: "transfer_out", type: 'numericColumn', valueFormatter: formatValue, cellClass: 'bg-orange-100', width: 120 },

    // --- Flowmeter ---
    { headerName: "Flow Awal", field: "flow_awal", width: 120 },
    { headerName: "Flow Akhir", field: "flow_akhir", width: 120 },
    
    // --- Issuing Calculations ---
    { headerName: "Issuing Report (L)", field: "issuing_report", type: 'numericColumn', valueFormatter: formatValue, cellClass: 'bg-blue-100 font-semibold', width: 150 },
    { headerName: "Issuing Flowmeter (L)", field: "issuing_flowmeter", type: 'numericColumn', valueFormatter: formatValue, cellClass: 'bg-green-100 font-semibold', width: 160 },
    { 
      headerName: "Issuing Sonding (L)", 
      field: "issuing_sonding", 
      type: 'numericColumn', 
      valueFormatter: formatValue, 
      cellClass: 'bg-purple-100 font-semibold', 
      cellStyle: getIssuingSondingStyle,
      width: 170 
    },
  ], []);

  const defaultColDef = useMemo(() => ({
    resizable: true,
    sortable: true,
    filter: true,
  }), []);

  // Total Transfer Partner
  const totalPartnerFill = partnerFillSummary.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark mb-6">
      <div className="w-full p-5">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-black dark:text-white text-lg">
            Laporan Stock (Fuelman)
          </h2>
          <button
            onClick={handleClear}
            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-md text-sm font-medium transition-all"
          >
            Clear
          </button>
        </div>

        <textarea
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder="Paste laporan WhatsApp di sini..."
          rows={6}
          className="w-full border border-stroke dark:border-strokedark rounded-md p-3 mb-6 bg-transparent text-black dark:text-white"
        />

        {isLoading ? (
          <Loader title="Menghitung volume dan kalkulasi..." />
        ) : (
          <>
            <div className="ag-theme-quartz-auto-dark" style={{ height: 500, width: '100%' }}>
              <AgGridReact
                rowData={finalData}
                columnDefs={columnDefs}
                defaultColDef={defaultColDef}
                getRowStyle={getRowStyle}
              />
            </div>
            
            {/* --- Summary Pengisian Unit Mitra (Partner Fill) --- */}
            {partnerFillSummary.length > 0 && (
                <div className="mt-8">
                    <h3 className="font-semibold text-black dark:text-white text-base mb-3 border-b border-stroke pb-2">
                        Summary Pengisian Unit Mitra (WHBC Transfer)
                    </h3>
                    <div className="rounded-md border border-stroke dark:border-strokedark overflow-hidden">
                        <table className="min-w-full text-sm text-left">
                            <thead className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
                                <tr>
                                    <th className="px-4 py-2">Unit Mitra</th>
                                    <th className="px-4 py-2">Volume (L)</th>
                                    <th className="px-4 py-2">Unit Sumber (Transfer Out)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {partnerFillSummary.map((item, index) => (
                                    <tr 
                                        key={index}
                                        className="border-t border-stroke dark:border-strokedark hover:bg-gray-50 dark:hover:bg-gray-800"
                                    >
                                        <td className="px-4 py-2 font-medium">{item.unit}</td>
                                        <td className="px-4 py-2">{item.amount.toFixed(1).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}</td>
                                        <td className="px-4 py-2">{item.sourceUnit}</td>
                                    </tr>
                                ))}
                                <tr className="bg-gray-200 dark:bg-gray-600 font-bold text-black dark:text-white">
                                    <td className="px-4 py-2">TOTAL</td>
                                    <td className="px-4 py-2">{totalPartnerFill.toFixed(1).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}</td>
                                    <td className="px-4 py-2"></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default StockReporting;