import React, { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../../../../db/SupabaseClient";
import { getVolumeFromTera } from "./getVolumeFromTera";
import Loader from "../../../../common/Loader/Loader";

import toast from "react-hot-toast";

// Import AG Grid Components
import { AgGridReact } from 'ag-grid-react';
import { ColDef, ValueFormatterParams } from 'ag-grid-community';

// Import CSS AG Grid
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { parseIDNumber } from "../../../../Utils/NumberUtility";

// --- Interfaces ---
interface StockReportingProps {
  onSuccess?: () => void;
}

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

interface TransferRecord {
  source: string;
  destination: string;
  amount: number;
  partner?: string;
}

interface FilterReplacement {
  unit: string;
  status: string;
  date?: string;
}

// --- Komponen Utama ---
const StockReporting: React.FC<StockReportingProps> = ({ onSuccess }) => {
  const gridRef = React.useRef<any>(null); // Ref untuk akses Grid API
  const [units, setUnits] = useState<StorageUnit[]>([]);
  const [rawText, setRawText] = useState("");
  const [parsedRawData, setParsedRawData] = useState<Record<string, UnitData>>({});
  const [finalData, setFinalData] = useState<UnitData[]>([]); 
  const [partnerFillSummary, setPartnerFillSummary] = useState<PartnerFill[]>([]); // State baru untuk summary
  const [transferRecords, setTransferRecords] = useState<TransferRecord[]>([]);
  const [filterReplacements, setFilterReplacements] = useState<FilterReplacement[]>([]);
  const [reportDate, setReportDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [reportShift, setReportShift] = useState<string>("1");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [useFlowmeter, setUseFlowmeter] = useState(false); // Default to Issuing Report
  const [lastReport, setLastReport] = useState<{ date: string; shift: string } | null>(null);
   

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

  const parseRange = (value: string, type: 'flow' | 'sonding' = 'flow'): [string, string] => {
    let normalizedValue = "";

    if (type === 'sonding') {
        // Sterilisasi Sonding: Titik (.) dianggap Koma (,)
        // Contoh: 150.5 -> 150,5
        normalizedValue = value.replace(/\./g, ",").replace(/[^\d,\- ]/g, " ");
    } else {
        // Handling hierarchy for Flow (ID Standard): 
        // 1. Remove dots (thousands separator in ID)
        // 2. Replace commas with dots (decimal separator in ID)
        // 3. Keep digits, dots, and dashes
        normalizedValue = value.replace(/\./g, "").replace(/,/g, ".").replace(/[^\d.\- ]/g, " ");
    }

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

    const fetchLastReport = async () => {
      try {
        const { data, error } = await supabase
          .from("stock_taking")
          .select("created_at, working_shift")
          .order("created_at", { ascending: false })
          .order("working_shift", { ascending: false })
          .limit(1)
          .single();

        if (error) {
           if (error.code !== 'PGRST116') { // Ignore "no rows found" error
             console.error("Error fetching last report:", error);
           }
           return;
        }

        if (data) {
          setLastReport({
            date: data.created_at,
            shift: data.working_shift.toString()
          });
        }
      } catch (err) {
        console.error("Catch error fetching last report:", err);
      }
    };

    fetchUnits();
    fetchLastReport();
  }, []);

  // --- 2. Parsing Data Mentah (Update Transfer Logic) ---
  const handleProcess = () => {
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
      filter: extractSection(rawText, "PERGANTIAN FILTER"),
      header: extractSection(rawText, "TANGGAL"), // Capture header section for Date/Shift
    };

    const allUnits: Record<string, UnitData> = {};
    const partnerFills: PartnerFill[] = []; // Temporary array for partner fills
    const transfers: TransferRecord[] = [];
    const filters: FilterReplacement[] = [];

    // Parse Date and Shift from Header/Raw Text directly if possible
    // Pattern: *TANGGAL :\n*13 / 02 / 2026* \n*SHIFT : 2
    const dateMatch = rawText.match(/\*TANGGAL\s*:\s*\n\s*\*(.*?)\*/i);
    const shiftMatch = rawText.match(/\*SHIFT\s*:\s*(\d+)/i);

    if (dateMatch && dateMatch[1]) {
        // Expected format: 13 / 02 / 2026
        const dateParts = dateMatch[1].split('/').map(s => s.trim());
        if (dateParts.length === 3) {
            // Reformat to YYYY-MM-DD
            const formattedDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
            // Validate date
            if (!isNaN(new Date(formattedDate).getTime())) {
                 setReportDate(formattedDate);
            }
        }
    }

    if (shiftMatch && shiftMatch[1]) {
        setReportShift(shiftMatch[1]);
    }

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

                transfers.push({
                  source,
                  destination,
                  amount,
                  partner: partnerUnit
                });

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

        if (section === 'filter') {
          // Parse PERGANTIAN FILTER
          // Format: UNIT = STATUS *DATE
          const filterMatch = line.match(/([A-Za-z0-9_-]+)\s*=\s*(.*?)(?:\*(.*))?$/);
          if (filterMatch) {
             const unit = filterMatch[1].toUpperCase();
             const status = filterMatch[2].trim();
             const date = filterMatch[3]?.trim();
             filters.push({ unit, status, date });
          }
          return;
        }

        if (match) {
          const unit = match[1].toUpperCase();
          const value = match[2].trim();

          if (!allUnits[unit]) allUnits[unit] = { unit_id: unit };

          switch (section) {
            case "sonding":
              const [awal, akhir] = parseRange(value, 'sonding');
              allUnits[unit].sonding_awal = awal;
              allUnits[unit].sonding_akhir = akhir;
              break;
            case "flow":
              const [fAwal, fAkhir] = parseRange(value, 'flow');
              allUnits[unit].flow_awal = fAwal;
              allUnits[unit].flow_akhir = fAkhir;
              break;
            case "ritasi":
              allUnits[unit].ritasi = value.replace(/[^\d.,-]/g, "");
              break;
            case "issuing":
              // Handling "14.029.7" or "12.000,1" -> Remove decimal part first
              // Strategy: Find the LAST separator (. or ,) followed by digits at the end of string
              // If found, remove it. Then parse as integer.
              let cleanIssuing = value.trim();
              
              // New Strategy:
              // 1. Identify the LAST separator (. or ,)
              // 2. Remove it and everything after it to strip fractions
              // 3. Remove all remaining separators (dot/comma) from the main number
              // 4. Parse as integer
              
              const lastSeparatorIndex = Math.max(cleanIssuing.lastIndexOf('.'), cleanIssuing.lastIndexOf(','));
              if (lastSeparatorIndex !== -1 && lastSeparatorIndex > cleanIssuing.length - 4) {
                  // Only strip if the separator is near the end (likely a decimal)
                  // e.g., 14.029.7 -> 14.029
                  cleanIssuing = cleanIssuing.substring(0, lastSeparatorIndex);
              }
              
              // Strip all remaining dots and commas
              cleanIssuing = cleanIssuing.replace(/[.,]/g, '');
              
              allUnits[unit].issuing_report = parseFloat(cleanIssuing) || 0;
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
    setTransferRecords(transfers);
    setFilterReplacements(filters);
  };

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
        
        const transferOut = parseIDNumber(d.transfer_out);
        d.issuing_flowmeter = Math.max(0, flowAkhir - flowAwal - transferOut);

        // 3. Calculate Issuing by Sonding (Discrepancy/Usage)
        const ritasi = parseIDNumber(d.ritasi);
        const transferIn = parseIDNumber(d.transfer_in);


        const stockAwal = d.stock_awal || 0;
        const stockAkhir = d.stock_akhir || 0;

        // Issuing_Sonding = Stock Awal + Ritasi + Transfer In - Transfer Out - Stock Akhir
        d.issuing_sonding = stockAwal + ritasi + transferIn - transferOut - stockAkhir;

        console.log(ritasi);
        // console.log(transferIn);
        // console.log(transferOut);
        
        
        
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
    setParsedRawData({});
    setFinalData([]);
    setPartnerFillSummary([]); // Clear summary
    setTransferRecords([]);
    setFilterReplacements([]);
    setReportDate(new Date().toISOString().split('T')[0]); // Reset to today
    setReportShift("1"); // Reset to shift 1
    setIsLoading(false);
  };
  
const formatValue = (params: ValueFormatterParams) => {
  if (params.value === undefined || params.value === null || params.value === "") return "-";
  
  const value = parseIDNumber(params.value); // Gunakan parser Indonesia
  
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
};



  const getIssuingSondingStyle = (params: any) => {
    if (params.data.issuing_sonding < -10 || params.data.issuing_sonding > 10) { 
        return { backgroundColor: 'rgba(255, 100, 100, 0.5)', fontWeight: 'bold' }; 
    }
    return null;
  };
  
  // --- Summary Calculations ---
  const summary = useMemo(() => {
    const totalStock = finalData.reduce((sum, item) => sum + (item.stock_akhir || 0), 0);
    const totalUsageFlow = finalData.reduce((sum, item) => sum + (item.issuing_flowmeter || 0), 0);
    const totalUsageReport = finalData.reduce((sum, item) => sum + (item.issuing_report || 0), 0);
    const totalFuelIn = finalData.reduce((sum, item) => sum + parseFloat((item.ritasi || "0").replace(/\./g, '').replace(/,/g, '.')), 0);
    
    const ftRfuCount = finalData.filter(item => (item.status || "").toUpperCase().includes("RFU")).length;
    
    // Operating FT: usage > 0 and warehouse_id starts with FT
    const operatingFtCount = finalData.filter(item => (item.issuing_flowmeter || 0) > 0 && (item.warehouse_id || "").startsWith("FT")).length;
    
    // Operating Skidtank: usage > 0 and warehouse_id starts with FS (as per user request "FS")
    const operatingSkidtankCount = finalData.filter(item => (item.issuing_flowmeter || 0) > 0 && (item.warehouse_id || "").startsWith("FS")).length;

    return {
      totalStock,
      totalUsageFlow,
      totalUsageReport,
      totalFuelIn,
      ftRfuCount,
      operatingFtCount,
      operatingSkidtankCount
    };
  }, [finalData]);

  // --- Report Generation ---
  const generateWhatsAppReport = () => {
    const fmt = (num: number) => num.toLocaleString('id-ID', { maximumFractionDigits: 1 });
    const fmtDate = (d: string) => {
        if(!d) return "";
        const [y, m, da] = d.split('-');
        return `${da} / ${m} / ${y}`;
    }

    let report = `*REPORT DAILY FAO*\n`;
    report += `*TANGGAL :*\n*${fmtDate(reportDate)}*\n`
    report += `*SHIFT : ${reportShift}*\n\n`;

    report += `*ISSUING OUT (LITER)*\n`;
    finalData.filter(d => (d.issuing_flowmeter || 0) > 0).forEach(d => {
        report += `${d.unit_id} = ${fmt(d.issuing_flowmeter || 0)}\n`;
    });
    report += `*TOTAL FUEL OUT = ${fmt(summary.totalUsageFlow)} LITER*\n\n`;

    report += `*RITASI (LITER)*\n`;
    finalData.filter(d => parseFloat((d.ritasi || "0").replace(/[^0-9,-]/g, '')) > 0).forEach(d => {
        report += `${d.unit_id} = ${d.ritasi}\n`;
    });
    report += `*TOTAL FUEL IN = ${fmt(summary.totalFuelIn)}  LITER*\n\n`;

    report += `*WAREHOUSE TRANSFER*\n`;
    transferRecords.forEach(t => {
        report += `  ${t.source} > ${t.destination} = ${fmt(t.amount)}  LTR${t.partner ? ` (${t.partner})` : ''}\n`;
    });
    report += `\n`;

    report += `*READINESS FT*\n`;
    finalData.filter(d => d.status || d.lokasi).forEach(d => {
        report += `${d.unit_id} = ${d.status || ''} ${d.lokasi ? `- ${d.lokasi}` : ''}\n`;
    });
    report += `*TOTAL FT RFU : ${summary.ftRfuCount} UNIT*\n\n`;

    report += `*SONDING AWAL - AKHIR (CM)*\n`;
    finalData.forEach(d => {
        if(d.sonding_awal || d.sonding_akhir) {
             report += `${d.unit_id} = ${d.sonding_awal || '0'} - ${d.sonding_akhir || '0'}\n`;
        }
    });
    report += `\n`;

    report += `*FLOWMETER AWAL - AKHIR*\n`;
    finalData.forEach(d => {
        if(d.flow_awal || d.flow_akhir) {
             report += `${d.unit_id} = ${d.flow_awal || '0'} - ${d.flow_akhir || '0'}\n`;
        }
    });
    report += `\n`;

    report += `*PERGANTIAN FILTER*\n`;
    filterReplacements.forEach(f => {
        report += `${f.unit} = ${f.status} ${f.date ? `*${f.date}` : ''}\n`;
    });
    report += `\n\n*NOTE :*\n`;

    return report;
  };

  const copyToClipboard = () => {
    const text = generateWhatsAppReport();
    navigator.clipboard.writeText(text);
    toast.success("Laporan berhasil disalin!");
  };

  const handleSubmitReport = async () => {
      if (finalData.length === 0) {
          toast.error("Tidak ada data untuk disubmit!");
          return;
      }

      const confirm = window.confirm(`Apakah anda yakin ingin mensubmit laporan:\nTanggal: ${reportDate}\nShift: ${reportShift}\nTotal Unit: ${finalData.length}\nMetode: ${useFlowmeter ? 'Flowmeter' : 'Issuing Report'}`);
      if (!confirm) return;

      setIsSubmitting(true);
      
      const payload = finalData.map(item => {
          // Format: TANGGAL-SHIFT-UNITID (e.g., 20260214-1-FT190)
          const dateStr = reportDate.replace(/-/g, '');
          const stCode = `${dateStr}-${reportShift}-${item.unit_id}`;

          // Calculate height from sonding_akhir only (taking the single value if range or the second value)
          // Defaulting to 0 if not parsable.
          // Note: Logic for ranges (120-110) might need clarification. Assuming the 'akhir' value is what matters for stock taking.
          const sondingVal = parseFloat((item.sonding_akhir || item.sonding_awal || "0").replace(/,/g, '.'));
         
          return {
              created_at: reportDate,
              warehouse_id: item.warehouse_id,
              height_cm: sondingVal,
              qty_liter: item.stock_akhir || 0,
              soh_system: 0, // Placeholder, can be updated if system calc exists
              pending_posting: 0,
              pending_receive: 0,
              working_shift: parseInt(reportShift),
              st_code: stCode,
              fuel_usage: useFlowmeter ? (item.issuing_flowmeter || 0) : (item.issuing_report || 0)
          };
      });

      const { error } = await supabase
          .from('stock_taking')
          .upsert(payload, { onConflict: 'st_code' });

      if (error) {
          console.error("Submission error:", error);
          toast.error(`Gagal submit: ${error.message}`);
      } else {
          toast.success("Data berhasil disubmit ke database!");
          
          // Re-fetch last report info
          const { data: lastData } = await supabase
            .from('stock_taking')
            .select('created_at, working_shift')
            .order('created_at', { ascending: false })
            .order('working_shift', { ascending: false })
            .limit(1)
            .single();
          
          if (lastData) {
            setLastReport({
              date: lastData.created_at,
              shift: lastData.working_shift.toString()
            });
          }

          handleClear();
          window.scrollTo({ top: 0, behavior: 'smooth' });
          if (onSuccess) onSuccess();
      }
      setIsSubmitting(false);
  };
  
  const handleExport = useCallback(() => {
    if (gridRef.current && gridRef.current.api) {
        gridRef.current.api.exportDataAsCsv({
            fileName: `Stock_Fuelman_${reportDate}_Shift${reportShift}.csv`
        });
    }
  }, [reportDate, reportShift]);
  
  
  const getRowStyle = (params: any) => {
    if (params.data.isStaticTank) {
      return { backgroundColor: 'rgba(255, 237, 180, 0.4)' };
    }
    return undefined;
  };
  

  const onCellValueChanged = useCallback((params: any) => {
    if (params.colDef.field === 'flow_awal' || params.colDef.field === 'flow_akhir') {
        // Use params.data which has the updated value from the edit
        const newData = params.data;
        
        const flowAwal = parseFloat((newData.flow_awal || "0").toString().replace(/,/g, '.'));
        const flowAkhir = parseFloat((newData.flow_akhir || "0").toString().replace(/,/g, '.'));
        
        // Note: transfer_out might be undefined or 0
        const transferOut = newData.transfer_out || 0;
        
        const newIssuing = Math.max(0, flowAkhir - flowAwal - transferOut);

        const updatedItem = {
             ...newData,
             issuing_flowmeter: newIssuing
        };
        
        // Update State (triggers Summary Recalculation)
        setFinalData(prevData => {
            const newList = [...prevData];
            const index = newList.findIndex(u => u.unit_id === newData.unit_id);
            if (index > -1) {
                newList[index] = updatedItem;
            }
            return newList;
        });
            
        // Force refresh for the specific row to show updated calculation in Grid
        params.api.applyTransaction({ update: [updatedItem] });
    }
  }, []);

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
    { 
        headerName: "Flow Awal", 
        field: "flow_awal", 
        width: 120, 
        editable: true, 
        cellEditor: 'agTextCellEditor',
        cellClass: 'bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700'
    },
    { 
        headerName: "Flow Akhir", 
        field: "flow_akhir", 
        width: 120, 
        editable: true, 
        cellEditor: 'agTextCellEditor',
        cellClass: 'bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700'
    },
    
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
  ], [onCellValueChanged]);

  const defaultColDef = useMemo(() => ({
    resizable: true,
    sortable: true,
    filter: true,
  }), []);

  // Total Transfer Partner
  const totalPartnerFill = partnerFillSummary.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="rounded-[2.5rem] border border-white/40 dark:border-white/10 bg-white/30 dark:bg-white/5 backdrop-blur-xl shadow-2xl overflow-hidden mb-6 transition-all duration-500">
      <div className="w-full p-8">
        <div className="flex justify-between items-start mb-10">
          <div className="flex flex-col relative">
            {/* Mesh gradient glow for header */}
            <div className="absolute -top-10 -left-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl -z-1"></div>
            
            <h2 className="font-black text-slate-800 dark:text-white text-2xl tracking-tight uppercase">
              Site Inventory Data
            </h2>
            {lastReport && (
              <div className="flex items-center gap-2 mt-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest">
                  Last: <span className="text-primary dark:text-blue-400">{(() => {
                    const d = new Date(lastReport.date);
                    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                    const day = String(d.getDate()).padStart(2, '0');
                    const month = months[d.getMonth()];
                    const year = d.getFullYear();
                    return `${day}/${month}/${year}`;
                  })()} shift {lastReport.shift}</span>
                </p>
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <button
                onClick={handleProcess}
                disabled={!rawText.trim()}
                className={`px-8 py-3 rounded-2xl text-sm font-black uppercase tracking-widest transition-all shadow-lg flex items-center gap-2 transform active:scale-95 ${
                    !rawText.trim()
                        ? "bg-slate-100 dark:bg-white/5 text-slate-400 cursor-not-allowed shadow-none"
                        : "bg-gradient-to-br from-green-500 to-emerald-700 text-white shadow-green-500/20 hover:shadow-green-500/40 hover:-translate-y-1"
                }`}
             >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
                Process
             </button>
            <button
                onClick={handleClear}
                className="bg-gradient-to-br from-red-50 to-rose-100 dark:from-red-900/20 dark:to-rose-900/40 text-red-600 dark:text-red-400 px-6 py-3 rounded-2xl text-sm font-black uppercase tracking-widest transition-all hover:bg-red-100 dark:hover:bg-red-800/20 active:scale-95"
            >
                Clear
            </button>
             <button
                onClick={handleSubmitReport}
                disabled={isSubmitting || finalData.length === 0}
                className={`px-8 py-3 rounded-2xl text-sm font-black uppercase tracking-widest transition-all shadow-lg flex items-center gap-2 transform active:scale-95 ${
                    isSubmitting || finalData.length === 0
                        ? "bg-slate-100 dark:bg-white/5 text-slate-400 cursor-not-allowed shadow-none"
                        : "bg-gradient-to-br from-primary to-indigo-700 text-white shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-1"
                }`}
            >
                {isSubmitting ? "Submitting..." : (
                    <>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                        </svg>
                        Submit
                    </>
                )}
            </button>
          </div>
        </div>

        <div className="relative group/textarea mb-8">
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Paste WhatsApp Report here (ISSUING, SONDING, RITASI, etc...)"
              rows={8}
              className="w-full bg-white/50 dark:bg-white/5 border-2 border-slate-100 dark:border-white/10 rounded-[2rem] p-6 text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 font-mono text-sm leading-relaxed transition-all focus:border-primary/50 focus:ring-4 focus:ring-primary/10 outline-none scrollbar-hide"
            />
            {/* Visual indicator for textarea focus */}
            <div className="absolute inset-0 rounded-[2rem] border-2 border-primary/0 pointer-events-none group-focus-within/textarea:border-primary/30 transition-all duration-300"></div>
        </div>

        {/* Input Date & Shift - Modern Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-4">Report Date</label>
                <input 
                    type="date" 
                    value={reportDate} 
                    onChange={e => setReportDate(e.target.value)}
                    className="w-full rounded-2xl border-2 border-slate-100 dark:border-white/10 bg-white/50 dark:bg-white/5 py-4 px-6 font-bold text-slate-700 dark:text-white outline-none transition-all focus:border-primary/50 focus:bg-white dark:focus:bg-white/10 shadow-sm"
                />
            </div>
            <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-4">Working Shift</label>
                <div className="relative">
                    <select 
                        value={reportShift} 
                        onChange={e => setReportShift(e.target.value)}
                        className="w-full rounded-2xl border-2 border-slate-100 dark:border-white/10 bg-white/50 dark:bg-white/5 py-4 px-6 font-bold text-slate-700 dark:text-white outline-none transition-all focus:border-primary/50 appearance-none shadow-sm"
                    >
                        <option value="1">Shift 1 (Day)</option>
                        <option value="2">Shift 2 (Night)</option>
                    </select>
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none border-l-2 border-slate-100 dark:border-white/10 pl-4 text-slate-400">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                        </svg>
                    </div>
                </div>
            </div>
        </div>

        {/* Input Switch Calculation Method - Re-engineered toggle */}
        <div className="mb-10 flex items-center justify-center gap-6 p-2 bg-slate-50/50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-full w-fit mx-auto transition-all">
             <button 
                onClick={() => setUseFlowmeter(false)}
                className={`px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all ${!useFlowmeter ? 'bg-white dark:bg-white/20 text-primary shadow-sm' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600'}`}
             >
                Issuing Report
             </button>
             <div className="w-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-white/10"></div>
             <button 
                onClick={() => setUseFlowmeter(true)}
                className={`px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all ${useFlowmeter ? 'bg-white dark:bg-white/20 text-primary shadow-sm' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600'}`}
             >
                Flowmeter
             </button>
        </div>

        {isLoading ? (
          <Loader />
        ) : (
          <>
             {/* --- Stats Summary Panel - Re-styled as glass cards --- */}
             {finalData.length > 0 && (
                 <div className="mt-8 mb-10 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                      <div className="p-5 bg-blue-50/50 dark:bg-blue-600/10 border border-blue-100 dark:border-blue-500/20 rounded-[2rem] shadow-sm hover:translate-y-[-2px] transition-all">
                         <span className="text-[10px] font-black text-blue-400 dark:text-blue-500 uppercase tracking-widest">Total Stock</span>
                         <div className="text-xl font-black text-blue-600 dark:text-blue-400 mt-1">
                              {summary.totalStock.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                         </div>
                      </div>
                      
                      <div className="p-5 bg-green-50/50 dark:bg-green-600/10 border border-green-100 dark:border-green-500/20 rounded-[2rem] shadow-sm hover:translate-y-[-2px] transition-all">
                         <span className="text-[10px] font-black text-green-400 dark:text-green-500 uppercase tracking-widest">Usage (Flow)</span>
                          <div className="text-xl font-black text-green-600 dark:text-green-400 mt-1">
                              {summary.totalUsageFlow.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                         </div>
                      </div>

                      <div className="p-5 bg-indigo-50/50 dark:bg-indigo-600/10 border border-indigo-100 dark:border-indigo-500/20 rounded-[2rem] shadow-sm hover:translate-y-[-2px] transition-all">
                         <span className="text-[10px] font-black text-indigo-400 dark:text-indigo-500 uppercase tracking-widest">Usage (Rep)</span>
                          <div className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                              {summary.totalUsageReport.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                         </div>
                      </div>
                   
                      <div className="p-5 bg-slate-50/50 dark:bg-slate-600/10 border border-slate-100 dark:border-slate-500/20 rounded-[2rem] shadow-sm hover:translate-y-[-2px] transition-all text-center">
                         <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">FT RFU</span>
                          <div className="text-xl font-black text-slate-700 dark:text-white mt-1">
                              {summary.ftRfuCount} <span className="text-xs font-bold text-slate-400 tracking-tight ml-0.5">Units</span>
                         </div>
                      </div>

                      <div className="p-5 bg-slate-50/50 dark:bg-slate-600/10 border border-slate-100 dark:border-slate-500/20 rounded-[2rem] shadow-sm hover:translate-y-[-2px] transition-all text-center">
                         <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Op. FT</span>
                          <div className="text-xl font-black text-slate-700 dark:text-white mt-1">
                              {summary.operatingFtCount} <span className="text-xs font-bold text-slate-400 tracking-tight ml-0.5">Units</span>
                         </div>
                      </div>

                      <div className="p-5 bg-slate-50/50 dark:bg-slate-600/10 border border-slate-100 dark:border-slate-500/20 rounded-[2rem] shadow-sm hover:translate-y-[-2px] transition-all text-center">
                         <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Op. Skid</span>
                          <div className="text-xl font-black text-slate-700 dark:text-white mt-1">
                              {summary.operatingSkidtankCount} <span className="text-xs font-bold text-slate-400 tracking-tight ml-0.5">Units</span>
                         </div>
                      </div>
                 </div>
             )}

            <div className="ag-theme-quartz-auto-dark overflow-hidden rounded-[2.5rem] border-2 border-slate-100 dark:border-white/10 shadow-inner" style={{ height: 600, width: '100%' }}>
              <AgGridReact
                ref={gridRef}
                rowData={finalData}
                columnDefs={columnDefs}
                defaultColDef={defaultColDef}
                getRowStyle={getRowStyle}
                onCellValueChanged={onCellValueChanged}
                stopEditingWhenCellsLoseFocus={true}
              />
            </div>
            
            <div className="mt-4 flex justify-end">
                <button
                    onClick={handleExport}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-all"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                    Export CSV
                </button>
            </div>
            


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