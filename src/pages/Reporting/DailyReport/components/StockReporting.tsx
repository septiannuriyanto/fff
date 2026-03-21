import React, { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../../../../db/SupabaseClient";
import { getVolumeFromTera } from "./getVolumeFromTera";
import Loader from "../../../../common/Loader/Loader";
import toast from "react-hot-toast";
import { ColDef, ValueFormatterParams } from 'ag-grid-community';
import { parseIDNumber } from "../../../../Utils/NumberUtility";
import ThemedGrid from "../../../../common/ThemedComponents/ThemedGrid";
import ThemedGlassmorphismPanel from "../../../../common/ThemedComponents/ThemedGlassmorphismPanel";
import { useTheme } from "../../../../contexts/ThemeContext";

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
  const gridRef = React.useRef<any>(null);
  const { activeTheme } = useTheme();

  const [units, setUnits] = useState<StorageUnit[]>([]);
  const [rawText, setRawText] = useState("");
  const [parsedRawData, setParsedRawData] = useState<Record<string, UnitData>>({});
  const [finalData, setFinalData] = useState<UnitData[]>([]);
  const [partnerFillSummary, setPartnerFillSummary] = useState<PartnerFill[]>([]);
  const [transferRecords, setTransferRecords] = useState<TransferRecord[]>([]);
  const [filterReplacements, setFilterReplacements] = useState<FilterReplacement[]>([]);
  const [reportDate, setReportDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [reportShift, setReportShift] = useState<string>("1");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [useFlowmeter, setUseFlowmeter] = useState(false);
  const [lastReport, setLastReport] = useState<{ date: string; shift: string } | null>(null);

  // --- Utilitas Parsing ---

  const parseRange = (value: string, type: 'flow' | 'sonding' = 'flow'): [string, string] => {
    let normalizedValue = "";
    if (type === 'sonding') {
      normalizedValue = value.replace(/\./g, ",").replace(/[^\d,\- ]/g, " ");
    } else {
      normalizedValue = value.replace(/\./g, "").replace(/,/g, ".").replace(/[^\d.\- ]/g, " ");
    }
    const parts = normalizedValue.split(/[\s\-]+/).map((v) => v.trim()).filter((v) => v);
    const awal = parts[0] || "";
    const akhir = parts[1] || awal || "";
    return [awal, akhir];
  };

  // --- 1. Ambil Daftar Unit dari Supabase ---
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
          if (error.code !== 'PGRST116') console.error("Error fetching last report:", error);
          return;
        }
        if (data) {
          setLastReport({ date: data.created_at, shift: data.working_shift.toString() });
        }
      } catch (err) {
        console.error("Catch error fetching last report:", err);
      }
    };

    fetchUnits();
    fetchLastReport();
  }, []);

  // --- 2. Parsing Data Mentah ---
  // Supports both the old hand-typed format AND the CoordinatorReport auto-generated format.
  const handleProcess = () => {
    if (!rawText.trim()) {
      setParsedRawData({});
      setPartnerFillSummary([]);
      return;
    }

    // Helper: extract content lines under a section heading
    // Handles *HEADING* and *HEADING (extra info)* patterns
    const extractSection = (text: string, keyword: string): string[] => {
      const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\*${escaped}[^\\n]*\\n([\\s\\S]*?)(?=\\n\\*[A-Z]|$)`, "i");
      const match = text.match(regex);
      if (!match) return [];
      return match[1]
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith("*") && !l.startsWith("-"));
    };

    const sections = {
      issuing: extractSection(rawText, "ISSUING OUT"),
      sonding: [
        // CoordinatorReport: *SONDING / ACTUAL STOCK AWAL - AKHIR*
        ...extractSection(rawText, "SONDING / ACTUAL STOCK"),
        // Legacy: *SONDING AWAL*
        ...extractSection(rawText, "SONDING AWAL"),
      ],
      flow: extractSection(rawText, "FLOWMETER AWAL"),
      ritasi: extractSection(rawText, "RITASI"),
      transfer: extractSection(rawText, "WAREHOUSE TRANSFER"),
      readiness: extractSection(rawText, "READINESS FT"),
      filter: extractSection(rawText, "PERGANTIAN FILTER"),
    };

    const allUnits: Record<string, UnitData> = {};
    const partnerFills: PartnerFill[] = [];
    const transfers: TransferRecord[] = [];
    const filters: FilterReplacement[] = [];

    // ─── Parse Date & Shift ────────────────────────────────────────────────
    // Format A (CoordinatorReport inline): *TANGGAL : 22 / 03 / 2026*
    const dateMatchInline = rawText.match(/\*TANGGAL\s*:\s*([\d\s/]+)\*/i);
    // Format B (legacy multi-line): *TANGGAL :\n*22 / 03 / 2026*
    const dateMatchMultiline = rawText.match(/\*TANGGAL\s*:\s*\n\s*\*(.*?)\*/i);

    const dateMatch = dateMatchInline || dateMatchMultiline;
    if (dateMatch && dateMatch[1]) {
      const dateParts = dateMatch[1].split('/').map(s => s.trim());
      if (dateParts.length === 3) {
        const formattedDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
        if (!isNaN(new Date(formattedDate).getTime())) {
          setReportDate(formattedDate);
        }
      }
    }

    const shiftMatch = rawText.match(/\*SHIFT\s*:\s*(\d+)/i);
    if (shiftMatch && shiftMatch[1]) {
      setReportShift(shiftMatch[1]);
    }

    // ─── Parse each section ────────────────────────────────────────────────
    const parseKeyValue = (lines: string[], section: keyof typeof sections) => {
      lines.forEach((line) => {

        // ── WAREHOUSE TRANSFER ─────────────────────────────────────────────
        if (section === "transfer") {
          // Format A (CoordinatorReport): FT123 > FT456 = 5.000 (LTR)
          const arrowMatch = line.match(
            /([A-Za-z0-9_-]+)\s*>\s*([A-Za-z0-9_-]+)\s*=\s*([0-9.,]+)\s*(?:\([^)]*\))?/i
          );
          // Format B (legacy): FT123 - FT456 = 5.000 (PARTNER_UNIT)
          const dashMatch = line.match(
            /([A-Za-z0-9_-]+)\s*-\s*([A-Za-z0-9_-]+)\s*=\s*([0-9.,]+)\s*(\(([^)]*)\))?/i
          );

          const transferMatch = arrowMatch || dashMatch;
          if (transferMatch) {
            const source = transferMatch[1].toUpperCase();
            const destination = transferMatch[2].toUpperCase();
            // Dot = thousands separator in CoordinatorReport → strip dots
            const amountStr = transferMatch[3].replace(/\./g, "").replace(/,/g, ".");
            const amount = parseFloat(amountStr) || 0;
            const partnerUnit = dashMatch ? (transferMatch[5] || "").toUpperCase() : "";

            transfers.push({ source, destination, amount, partner: partnerUnit });

            if (!allUnits[source]) allUnits[source] = { unit_id: source };
            allUnits[source].transfer_out = (allUnits[source].transfer_out || 0) + amount;

            if (destination === 'WHBC') {
              if (partnerUnit) {
                partnerFills.push({ unit: partnerUnit, amount, sourceUnit: source });
              }
            } else {
              if (!allUnits[destination]) allUnits[destination] = { unit_id: destination };
              allUnits[destination].transfer_in = (allUnits[destination].transfer_in || 0) + amount;
            }
          }
          return;
        }

        // ── PERGANTIAN FILTER ──────────────────────────────────────────────
        if (section === 'filter') {
          const filterMatch = line.match(/([A-Za-z0-9_-]+)\s*=\s*(.*?)(?:\*(.*))?$/);
          if (filterMatch) {
            const unit = filterMatch[1].toUpperCase();
            const status = filterMatch[2].trim();
            const date = filterMatch[3]?.trim();
            filters.push({ unit, status, date });
          }
          return;
        }

        // ── SONDING ────────────────────────────────────────────────────────
        if (section === 'sonding') {
          // Format A (CoordinatorReport): FT123 = 120cm (12.000 L) - 110cm (11.500 L)
          const sondingFull = line.match(
            /([A-Za-z0-9_-]+)\s*=\s*([\d,]+)cm\s*\([^)]*\)\s*-\s*([\d,]+)cm/i
          );
          if (sondingFull) {
            const unit = sondingFull[1].toUpperCase();
            if (!allUnits[unit]) allUnits[unit] = { unit_id: unit };
            allUnits[unit].sonding_awal = sondingFull[2];
            allUnits[unit].sonding_akhir = sondingFull[3];
            return;
          }
          // Format B (legacy): FT123 = 120 - 110
          const match = line.match(/([A-Za-z0-9_-]+)\s*=\s*(.*)/);
          if (match) {
            const unit = match[1].toUpperCase();
            const value = match[2].trim();
            if (!allUnits[unit]) allUnits[unit] = { unit_id: unit };
            const [awal, akhir] = parseRange(value, 'sonding');
            allUnits[unit].sonding_awal = awal;
            allUnits[unit].sonding_akhir = akhir;
          }
          return;
        }

        // ── FLOWMETER ──────────────────────────────────────────────────────
        if (section === 'flow') {
          // Format A (CoordinatorReport): FT123 = 1.234.500-1.245.000 (dots=thousands, dash=separator)
          // Format B (legacy):            FT123 = 1.234.500 - 1.245.000
          // parseRange('flow') already strips dots and splits on dash
          const match = line.match(/([A-Za-z0-9_-]+)\s*=\s*(.*)/);
          if (match) {
            const unit = match[1].toUpperCase();
            const raw = match[2].trim();
            if (!allUnits[unit]) allUnits[unit] = { unit_id: unit };
            const [fAwal, fAkhir] = parseRange(raw, 'flow');
            allUnits[unit].flow_awal = fAwal;
            allUnits[unit].flow_akhir = fAkhir;
          }
          return;
        }

        // ── GENERAL KEY = VALUE ────────────────────────────────────────────
        const match = line.match(/([A-Za-z0-9_-]+)\s*=\s*(.*)/);
        if (match) {
          const unit = match[1].toUpperCase();
          const value = match[2].trim();
          if (!allUnits[unit]) allUnits[unit] = { unit_id: unit };

          switch (section) {
            case "ritasi": {
              // Strip "(Nx)" count suffix from CoordinatorReport: "12.000 (2x)"
              const cleanRitasi = value.replace(/\s*\(\d+x\)/i, "").trim();
              allUnits[unit].ritasi = cleanRitasi.replace(/[^\d.,-]/g, "");
              break;
            }
            case "issuing": {
              // Dots are thousands separators (e.g. "14.029") — strip trailing decimal then all separators
              let cleanIssuing = value.trim();
              const lastSepIdx = Math.max(cleanIssuing.lastIndexOf('.'), cleanIssuing.lastIndexOf(','));
              if (lastSepIdx !== -1 && lastSepIdx > cleanIssuing.length - 4) {
                cleanIssuing = cleanIssuing.substring(0, lastSepIdx);
              }
              cleanIssuing = cleanIssuing.replace(/[.,]/g, '');
              allUnits[unit].issuing_report = parseFloat(cleanIssuing) || 0;
              break;
            }
            case "readiness": {
              const parts = value.split("-").map((v) => v.trim());
              allUnits[unit].status = parts[0] || "";
              allUnits[unit].lokasi = parts[1] || "";
              break;
            }
          }
        }
      });
    };

    Object.entries(sections).forEach(([key, lines]) => {
      parseKeyValue(lines, key as keyof typeof sections);
    });

    setParsedRawData(allUnits);
    setPartnerFillSummary(partnerFills);
    setTransferRecords(transfers);
    setFilterReplacements(filters);
  };

  // --- 3. Hitung Volume Tera & Issuing ---
  const calculateTera = useCallback(
    async (dataToProcess: Record<string, UnitData>) => {
      if (Object.keys(dataToProcess).length === 0) {
        setFinalData([]);
        return;
      }
      setIsLoading(true);
      const updatedData: Record<string, UnitData> = JSON.parse(JSON.stringify(dataToProcess));
      const unitKeys = Object.keys(dataToProcess);
      const unitMap = new Map(units.map(u => [u.unit_id, u.warehouse_id]));

      for (const unit of unitKeys) {
        const d = updatedData[unit];
        d.warehouse_id = d.warehouse_id || unitMap.get(unit) || "-";
        d.isStaticTank = !unitMap.has(unit) && unit.startsWith('MTG');

        const cleanAwal = (d.sonding_awal || "").replace(/,/g, ".");
        const cleanAkhir = (d.sonding_akhir || d.sonding_awal || "").replace(/,/g, ".");
        const awalNum = parseFloat(cleanAwal) || 0;
        const akhirNum = parseFloat(cleanAkhir) || 0;

        d.stock_awal = (awalNum > 0) ? await getVolumeFromTera(unit, awalNum) : 0;
        d.stock_akhir = (akhirNum > 0) ? await getVolumeFromTera(unit, akhirNum) : 0;

        const flowAwal = parseFloat((d.flow_awal || "0").replace(/,/g, '.'));
        const flowAkhir = parseFloat((d.flow_akhir || d.flow_awal || "0").replace(/,/g, '.'));
        const transferOut = parseIDNumber(d.transfer_out);
        d.issuing_flowmeter = Math.max(0, flowAkhir - flowAwal - transferOut);

        const ritasi = parseIDNumber(d.ritasi);
        const transferIn = parseIDNumber(d.transfer_in);
        const stockAwal = d.stock_awal || 0;
        const stockAkhir = d.stock_akhir || 0;
        d.issuing_sonding = stockAwal + ritasi + transferIn - transferOut - stockAkhir;

        console.log(ritasi);
      }

      const dataArray = Object.values(updatedData).sort((a, b) => a.unit_id.localeCompare(b.unit_id));
      setFinalData(dataArray);
      setIsLoading(false);
    },
    [units]
  );

  // --- 4. Trigger Perhitungan Tera ---
  useEffect(() => {
    if (Object.keys(parsedRawData).length > 0) {
      calculateTera(parsedRawData);
    } else {
      setFinalData([]);
    }
  }, [parsedRawData, calculateTera]);

  // --- Fungsi Clear ---
  const handleClear = () => {
    setRawText("");
    setParsedRawData({});
    setFinalData([]);
    setPartnerFillSummary([]);
    setTransferRecords([]);
    setFilterReplacements([]);
    setReportDate(new Date().toISOString().split('T')[0]);
    setReportShift("1");
    setIsLoading(false);
  };

  const formatValue = (params: ValueFormatterParams) => {
    if (params.value === undefined || params.value === null || params.value === "") return "-";
    const value = parseIDNumber(params.value);
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
    const operatingFtCount = finalData.filter(item => (item.issuing_flowmeter || 0) > 0 && (item.warehouse_id || "").startsWith("FT")).length;
    const operatingSkidtankCount = finalData.filter(item => (item.issuing_flowmeter || 0) > 0 && (item.warehouse_id || "").startsWith("FS")).length;
    return { totalStock, totalUsageFlow, totalUsageReport, totalFuelIn, ftRfuCount, operatingFtCount, operatingSkidtankCount };
  }, [finalData]);

  // --- Report Generation ---
  const generateWhatsAppReport = () => {
    const fmt = (num: number) => num.toLocaleString('id-ID', { maximumFractionDigits: 1 });
    const fmtDate = (d: string) => {
      if (!d) return "";
      const [y, m, da] = d.split('-');
      return `${da} / ${m} / ${y}`;
    };

    let report = `*REPORT DAILY FAO*\n`;
    report += `*TANGGAL :*\n*${fmtDate(reportDate)}*\n`;
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
      if (d.sonding_awal || d.sonding_akhir) {
        report += `${d.unit_id} = ${d.sonding_awal || '0'} - ${d.sonding_akhir || '0'}\n`;
      }
    });
    report += `\n`;
    report += `*FLOWMETER AWAL - AKHIR*\n`;
    finalData.forEach(d => {
      if (d.flow_awal || d.flow_akhir) {
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
      const dateStr = reportDate.replace(/-/g, '');
      const stCode = `${dateStr}-${reportShift}-${item.unit_id}`;
      const sondingVal = parseFloat((item.sonding_akhir || item.sonding_awal || "0").replace(/,/g, '.'));
      return {
        created_at: reportDate,
        warehouse_id: item.warehouse_id,
        height_cm: sondingVal,
        qty_liter: item.stock_akhir || 0,
        soh_system: 0,
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
      const { data: lastData } = await supabase
        .from('stock_taking')
        .select('created_at, working_shift')
        .order('created_at', { ascending: false })
        .order('working_shift', { ascending: false })
        .limit(1)
        .single();
      if (lastData) {
        setLastReport({ date: lastData.created_at, shift: lastData.working_shift.toString() });
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

  const onCellValueChanged = useCallback((params: any) => {
    if (params.colDef.field === 'flow_awal' || params.colDef.field === 'flow_akhir') {
      const newData = params.data;
      const flowAwal = parseFloat((newData.flow_awal || "0").toString().replace(/,/g, '.'));
      const flowAkhir = parseFloat((newData.flow_akhir || "0").toString().replace(/,/g, '.'));
      const transferOut = newData.transfer_out || 0;
      const newIssuing = Math.max(0, flowAkhir - flowAwal - transferOut);
      const updatedItem = { ...newData, issuing_flowmeter: newIssuing };
      setFinalData(prevData => {
        const newList = [...prevData];
        const index = newList.findIndex(u => u.unit_id === newData.unit_id);
        if (index > -1) newList[index] = updatedItem;
        return newList;
      });
      params.api.applyTransaction({ update: [updatedItem] });
    }
  }, []);

  const columnDefs: ColDef<UnitData>[] = useMemo(() => [
    { headerName: "Unit ID", field: "unit_id", pinned: 'left', sortable: true, filter: true, width: 100, cellClass: 'font-medium' },
    { headerName: "Warehouse", field: "warehouse_id", sortable: true, filter: true, width: 120 },
    { headerName: "Status", field: "status", sortable: true, filter: true, width: 100 },
    { headerName: "Lokasi", field: "lokasi", sortable: true, filter: true, width: 120 },
    { headerName: "Sonding Awal", field: "sonding_awal", width: 100 },
    { headerName: "Sonding Akhir", field: "sonding_akhir", width: 100 },
    { headerName: "Stock Awal (L)", field: "stock_awal", type: 'numericColumn', valueFormatter: p => p.value !== undefined ? Number(p.value).toFixed(0) : '-', width: 120 },
    { headerName: "Stock Akhir (L)", field: "stock_akhir", type: 'numericColumn', valueFormatter: p => p.value !== undefined ? Number(p.value).toFixed(0) : '-', width: 120 },
    { headerName: "Ritasi (L)", field: "ritasi", type: 'numericColumn', valueFormatter: formatValue, width: 100 },
    { headerName: "Transfer In (L)", field: "transfer_in", type: 'numericColumn', valueFormatter: formatValue, width: 120 },
    { headerName: "Transfer Out (L)", field: "transfer_out", type: 'numericColumn', valueFormatter: formatValue, width: 120 },
    { headerName: "Flow Awal", field: "flow_awal", width: 120, editable: true, cellEditor: 'agTextCellEditor' },
    { headerName: "Flow Akhir", field: "flow_akhir", width: 120, editable: true, cellEditor: 'agTextCellEditor' },
    { headerName: "Issuing Report (L)", field: "issuing_report", type: 'numericColumn', valueFormatter: formatValue, width: 150 },
    { headerName: "Issuing Flowmeter (L)", field: "issuing_flowmeter", type: 'numericColumn', valueFormatter: formatValue, width: 160 },
    { headerName: "Issuing Sonding (L)", field: "issuing_sonding", type: 'numericColumn', valueFormatter: formatValue, cellStyle: getIssuingSondingStyle, width: 170 },
  ], [onCellValueChanged]);

  const totalPartnerFill = partnerFillSummary.reduce((sum, item) => sum + item.amount, 0);

  // ─── Stat card helper ───────────────────────────────────────────────────────
  const StatCard = ({ label, value, color }: { label: string; value: string | number; color: string }) => (
    <div className={`p-5 rounded-2xl border shadow-sm hover:-translate-y-0.5 transition-all ${color}`}>
      <span className="text-[10px] font-black uppercase tracking-widest opacity-70 block">{label}</span>
      <div className="text-xl font-black mt-1">{value}</div>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 animate-fade-in-up pb-10">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <ThemedGlassmorphismPanel activeTheme={activeTheme} className="p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div>
            <h2 className="text-lg font-bold text-text-primary-light dark:text-text-primary-dark">
              Site Inventory Data
            </h2>
            {lastReport && (
              <div className="flex items-center gap-2 mt-1">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                <p className="text-[11px] text-text-secondary-light dark:text-text-secondary-dark font-bold uppercase tracking-widest">
                  Last:{" "}
                  <span className="text-blue-500">
                    {(() => {
                      const d = new Date(lastReport.date);
                      const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
                      return `${String(d.getDate()).padStart(2,'0')}/${months[d.getMonth()]}/${d.getFullYear()}`;
                    })()} shift {lastReport.shift}
                  </span>
                </p>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleProcess}
              disabled={!rawText.trim()}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wide transition-all flex items-center gap-2 ${
                !rawText.trim()
                  ? "bg-white/5 text-text-secondary-light dark:text-text-secondary-dark cursor-not-allowed"
                  : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
              }`}
            >
              ↻ Process
            </button>
            <button
              onClick={handleClear}
              className="px-5 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wide bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-all"
            >
              Clear
            </button>
            <button
              onClick={copyToClipboard}
              disabled={finalData.length === 0}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wide transition-all flex items-center gap-2 ${
                finalData.length === 0
                  ? "bg-white/5 text-text-secondary-light dark:text-text-secondary-dark cursor-not-allowed"
                  : "bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30"
              }`}
            >
              📋 Copy Report
            </button>
            <button
              onClick={handleSubmitReport}
              disabled={isSubmitting || finalData.length === 0}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wide transition-all flex items-center gap-2 ${
                isSubmitting || finalData.length === 0
                  ? "bg-white/5 text-text-secondary-light dark:text-text-secondary-dark cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20"
              }`}
            >
              {isSubmitting ? "Submitting..." : "✓ Submit"}
            </button>
          </div>
        </div>

        {/* Textarea */}
        <textarea
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder={`Paste report dari CoordinatorReport / WhatsApp di sini...\n\nFormat yang didukung:\n*TANGGAL : 22 / 03 / 2026*\n*SHIFT : 1*\n*ISSUING OUT (LITER)*\nFT190 = 14.029\n*SONDING / ACTUAL STOCK AWAL - AKHIR*\nFT190 = 120cm (12.000 L) - 110cm (11.500 L)\n*WAREHOUSE TRANSFER*\nFT190 > FT200 = 5.000 (LTR)`}
          rows={9}
          style={{
            backgroundColor: activeTheme?.input?.color || 'transparent',
            color: activeTheme?.input?.textColor || 'inherit',
            borderColor: activeTheme?.input?.borderColor || 'transparent',
            borderRadius: activeTheme?.input?.borderRadius || '12px',
          }}
          className="w-full border p-4 font-mono text-sm outline-none focus:ring-2 focus:ring-blue-500/40 transition-all resize-none"
        />
      </ThemedGlassmorphismPanel>

      {/* ── Date, Shift & Calculation Method ────────────────────────────────── */}
      <ThemedGlassmorphismPanel activeTheme={activeTheme} className="p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary-light dark:text-text-secondary-dark">
              Report Date
            </label>
            <input
              type="date"
              value={reportDate}
              onChange={e => setReportDate(e.target.value)}
              style={{
                backgroundColor: activeTheme?.input?.color || 'transparent',
                color: activeTheme?.input?.textColor || 'inherit',
                borderColor: activeTheme?.input?.borderColor || 'transparent',
                borderRadius: activeTheme?.input?.borderRadius || '10px',
              }}
              className="w-full border py-3 px-4 font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary-light dark:text-text-secondary-dark">
              Working Shift
            </label>
            <select
              value={reportShift}
              onChange={e => setReportShift(e.target.value)}
              style={{
                backgroundColor: activeTheme?.input?.color || 'transparent',
                color: activeTheme?.input?.textColor || 'inherit',
                borderColor: activeTheme?.input?.borderColor || 'transparent',
                borderRadius: activeTheme?.input?.borderRadius || '10px',
              }}
              className="w-full border py-3 px-4 font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500/40 transition-all appearance-none cursor-pointer"
            >
              <option value="1">Shift 1 (Day)</option>
              <option value="2">Shift 2 (Night)</option>
            </select>
          </div>

          {/* Toggle Method */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary-light dark:text-text-secondary-dark block">
              Calculation Method
            </label>
            <div
              className="flex items-center gap-1 p-1 rounded-xl w-fit"
              style={{ backgroundColor: activeTheme?.input?.color || 'rgba(0,0,0,0.05)' }}
            >
              <button
                onClick={() => setUseFlowmeter(false)}
                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${
                  !useFlowmeter
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-text-secondary-light dark:text-text-secondary-dark hover:text-text-primary-light dark:hover:text-text-primary-dark'
                }`}
              >
                Issuing Report
              </button>
              <button
                onClick={() => setUseFlowmeter(true)}
                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${
                  useFlowmeter
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-text-secondary-light dark:text-text-secondary-dark hover:text-text-primary-light dark:hover:text-text-primary-dark'
                }`}
              >
                Flowmeter
              </button>
            </div>
          </div>
        </div>
      </ThemedGlassmorphismPanel>

      {/* ── Summary Stats ────────────────────────────────────────────────────── */}
      {finalData.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <StatCard label="Total Stock" value={summary.totalStock.toLocaleString('id-ID', { maximumFractionDigits: 0 })} color="bg-blue-500/10 border-blue-500/25 text-blue-500 dark:text-blue-400" />
          <StatCard label="Usage (Flow)" value={summary.totalUsageFlow.toLocaleString('id-ID', { maximumFractionDigits: 0 })} color="bg-emerald-500/10 border-emerald-500/25 text-emerald-500 dark:text-emerald-400" />
          <StatCard label="Usage (Rep)" value={summary.totalUsageReport.toLocaleString('id-ID', { maximumFractionDigits: 0 })} color="bg-indigo-500/10 border-indigo-500/25 text-indigo-500 dark:text-indigo-400" />
          <StatCard label="Fuel In" value={summary.totalFuelIn.toLocaleString('id-ID', { maximumFractionDigits: 0 })} color="bg-amber-500/10 border-amber-500/25 text-amber-500 dark:text-amber-400" />
          <StatCard label="FT RFU" value={`${summary.ftRfuCount} units`} color="bg-slate-500/10 border-slate-500/25 text-text-primary-light dark:text-text-primary-dark" />
          <StatCard label="Op. FT" value={`${summary.operatingFtCount} units`} color="bg-slate-500/10 border-slate-500/25 text-text-primary-light dark:text-text-primary-dark" />
          <StatCard label="Op. Skid" value={`${summary.operatingSkidtankCount} units`} color="bg-slate-500/10 border-slate-500/25 text-text-primary-light dark:text-text-primary-dark" />
        </div>
      )}

      {/* ── Data Grid ────────────────────────────────────────────────────────── */}
      <ThemedGlassmorphismPanel activeTheme={activeTheme} className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold uppercase tracking-wide text-text-primary-light dark:text-text-primary-dark opacity-80">
            Unit Data
          </h3>
          <button
            onClick={handleExport}
            disabled={finalData.length === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              finalData.length === 0
                ? 'opacity-40 cursor-not-allowed bg-white/5'
                : 'bg-emerald-600/20 hover:bg-emerald-600 text-emerald-500 hover:text-white border border-emerald-500/30 shadow-lg'
            }`}
          >
            ↓ Export CSV
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader />
          </div>
        ) : (
          <div style={{ height: 520 }}>
            <ThemedGrid
              ref={gridRef}
              rowData={finalData}
              columnDefs={columnDefs}
              defaultColDef={{ resizable: true, sortable: true, filter: true }}
              onCellValueChanged={onCellValueChanged}
              stopEditingWhenCellsLoseFocus={true}
              useGridFilter={true}
              getRowStyle={(params: any) =>
                params.data.isStaticTank ? { backgroundColor: 'rgba(255, 237, 180, 0.15)' } : undefined
              }
            />
          </div>
        )}
      </ThemedGlassmorphismPanel>

      {/* ── Partner Fill Summary ─────────────────────────────────────────────── */}
      {partnerFillSummary.length > 0 && (
        <ThemedGlassmorphismPanel activeTheme={activeTheme} className="p-5">
          <h3 className="text-sm font-bold uppercase tracking-wide text-text-primary-light dark:text-text-primary-dark opacity-80 mb-4">
            Partner Fill Summary (WHBC Transfer)
          </h3>
          <div style={{ height: Math.min(200 + partnerFillSummary.length * 42, 400) }}>
            <ThemedGrid
              rowData={[
                ...partnerFillSummary,
                { unit: 'TOTAL', amount: totalPartnerFill, sourceUnit: '' }
              ]}
              columnDefs={[
                { headerName: "Unit Mitra", field: "unit", flex: 1 },
                {
                  headerName: "Volume (L)", field: "amount", flex: 1,
                  valueFormatter: (p: any) => p.value != null
                    ? p.value.toLocaleString('id-ID', { maximumFractionDigits: 1 })
                    : '-'
                },
                { headerName: "Unit Sumber", field: "sourceUnit", flex: 1 },
              ]}
              defaultColDef={{ resizable: true }}
            />
          </div>
        </ThemedGlassmorphismPanel>
      )}

    </div>
  );
};

export default StockReporting;