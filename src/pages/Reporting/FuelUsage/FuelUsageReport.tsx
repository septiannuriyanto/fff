import React, { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { Search, RotateCcw, FileSpreadsheet, Loader2 } from 'lucide-react';
import PanelTemplate from '../../../components/Panels/PanelTemplate';
import ThemedGrid from '../../../common/ThemedComponents/ThemedGrid';
import { supabase } from '../../../db/SupabaseClient';
import { toast } from 'sonner';
import { useTheme } from '../../../contexts/ThemeContext';
import ThemedGlassmorphismPanel from '../../../common/ThemedComponents/ThemedGlassmorphismPanel';
import ThemedLabeledInput from '../../../common/ThemedComponents/ThemedLabeledInput';

const FuelUsageReport: React.FC = () => {
  const { activeTheme } = useTheme();

  // --- Filter States ---
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [shift, setShift] = useState<string>('');
  const [warehouseCode, setWarehouseCode] = useState<string>('');
  const [cnUnit, setCnUnit] = useState<string>('');
  const [isIncluded, setIsIncluded] = useState<string>('all');
  const [egi, setEgi] = useState<string>('');

  // --- Data States ---
  const [rowData, setRowData] = useState<any[]>([]);
  const [totalInDatabase, setTotalInDatabase] = useState<number>(0);
  const [latestInfo, setLatestInfo] = useState<{ date: string; shift: number } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [warehouseOptions, setWarehouseOptions] = useState<string[]>([]);
  const [egiOptions, setEgiOptions] = useState<string[]>([]);

  // --- Fetch Initial Options ---
  useEffect(() => {
    const fetchOptions = async () => {
      // Latest Info via RPC (Security Definer)
      const { data: latestRecords } = await supabase.rpc('get_latest_loto_verification');
      if (latestRecords && latestRecords.length > 0) {
        setLatestInfo({ date: latestRecords[0].issued_date, shift: latestRecords[0].shift });
      }

      // Fetch Warehouse Codes
      const { data: warehouseData } = await supabase
        .from('loto_verification')
        .select('warehouse_code')
        .not('warehouse_code', 'is', null);

      if (warehouseData) {
        const uniqueWarehouses = Array.from(new Set(warehouseData.map(w => w.warehouse_code))).sort();
        setWarehouseOptions(uniqueWarehouses);
      }

      // Fetch EGI Codes
      const { data: egiData } = await supabase
        .from('loto_verification')
        .select('EGI')
        .not('EGI', 'is', null);

      if (egiData) {
        const uniqueEgis = Array.from(new Set(egiData.map(e => e.EGI))).sort();
        setEgiOptions(uniqueEgis);
      }
    };
    fetchOptions();
  }, []);

  // --- Column Definitions ---
  const columnDefs = useMemo<any[]>(() => [
    {
      headerName: 'No',
      width: 70,
      pinned: 'left',
      valueGetter: (params: any) => params.node.rowIndex + 1
    },
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
    { field: 'issued_date', headerName: 'Date', minWidth: 160, flex: 2 },
    { field: 'shift', headerName: 'Shift', width: 80 },
    { field: 'warehouse_code', headerName: 'Warehouse', width: 120 },
    { field: 'cn_unit', headerName: 'CN Unit', minWidth: 150, flex: 1.5 },
    { field: 'EGI', width: 110 },
    { field: 'equip_class', headerName: 'Equip Class' },
    { field: 'hm', headerName: 'HM', width: 90 },
    { field: 'qty', headerName: 'Qty', width: 90 },
    { field: 'refueling_start', headerName: 'Jam Start', width: 180 },
    { field: 'refueling_end', headerName: 'Jam End', width: 180 },
    { field: 'session_code', headerName: 'Session Code', width: 180 },
    { field: 'no_logsheet', headerName: 'No Logsheet', width: 150 },
  ], []);

  // --- Actions ---
  const fetchTotals = async () => {
    const { data, error } = await supabase.rpc('get_fuel_usage_report_totals', {
      p_start_date: startDate || null,
      p_end_date: endDate || null,
      p_shift: shift ? Number(shift) : null,
      p_warehouse_code: warehouseCode || null,
      p_cn_unit: cnUnit || null,
      p_egi: egi || null,
      p_is_included: isIncluded === 'all' ? null : isIncluded === 'true'
    });
    if (error) throw error;
    if (data && data.length > 0) {
      setTotalInDatabase(Number(data[0].total_count));
      return { total: Number(data[0].total_count), grand_total: Number(data[0].grand_total_qty) };
    }
    return { total: 0, grand_total: 0 };
  };

  const handlePreview = async () => {
    setLoading(true);
    try {
      console.log('Fetching totals...');
      const { total } = await fetchTotals();

      if (total === 0) {
        setRowData([]);
        toast.info('No data found.');
        return;
      }

      console.log(`Fetching preview data in batches (Total: ${total})...`);
      let previewRows: any[] = [];
      const PREVIEW_LIMIT = 50000;
      const BATCH_SIZE = 1000;

      const fetchCap = Math.min(total, PREVIEW_LIMIT);
      const totalBatchesNeeded = Math.ceil(fetchCap / BATCH_SIZE);

      for (let i = 0; i < totalBatchesNeeded; i++) {
        const { data: nextBatch, error: nextError } = await supabase.rpc('get_fuel_usage_report_data', {
          p_start_date: startDate || null,
          p_end_date: endDate || null,
          p_shift: shift ? Number(shift) : null,
          p_warehouse_code: warehouseCode || null,
          p_cn_unit: cnUnit || null,
          p_egi: egi || null,
          p_is_included: isIncluded === 'all' ? null : isIncluded === 'true',
          p_limit: BATCH_SIZE,
          p_offset: i * BATCH_SIZE
        });
        if (nextError) throw nextError;
        if (nextBatch) {
          previewRows = [...previewRows, ...nextBatch];
        }

        // Quick feedback every 5 batches
        if (i > 0 && i % 5 === 0) {
          setRowData([...previewRows]); // Partial update for better DX
        }
      }

      setRowData(previewRows);
      toast.success(`Preview ready: ${previewRows.length} rows`);
    } catch (e: any) {
      console.error('Fetch Error:', e);
      toast.error(`Fetch failed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStartDate('');
    setEndDate('');
    setShift('');
    setWarehouseCode('');
    setCnUnit('');
    setIsIncluded('all');
    setEgi('');
    setRowData([]);
    toast.message('Filters reset');
  };

  const handleExport = async () => {
    setLoading(true);
    try {
      const { total } = await fetchTotals();
      if (total === 0) {
        toast.error('No data found to export.');
        return;
      }

      toast.info(`Preparing export of ${total} records...`);
      let exportData: any[] = [];
      const BATCH_SIZE = 1000;
      const totalPages = Math.ceil(total / BATCH_SIZE);

      for (let i = 0; i < totalPages; i++) {
        const { data, error } = await supabase.rpc('get_fuel_usage_report_data', {
          p_start_date: startDate || null,
          p_end_date: endDate || null,
          p_shift: shift ? Number(shift) : null,
          p_warehouse_code: warehouseCode || null,
          p_cn_unit: cnUnit || null,
          p_egi: egi || null,
          p_is_included: isIncluded === 'all' ? null : isIncluded === 'true',
          p_limit: BATCH_SIZE,
          p_offset: i * BATCH_SIZE
        });

        if (error) throw error;
        if (data) {
          exportData = [...exportData, ...data];
        }

        if (i > 0 && i % 10 === 0) {
          toast.info(`Collected ${exportData.length} records...`);
        }
      }

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Fuel Usage Report');

      const fileName = `FuelUsageReport_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      toast.success('Download complete!');
    } catch (e: any) {
      console.error('Export Error:', e);
      toast.error(`Export failed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const totalVisibleQty = useMemo(() => {
    return rowData.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
  }, [rowData]);

  return (
    <PanelTemplate title="Fuel Usage Report">
      <div className="px-4 -mt-4 mb-4">
        {latestInfo ? (
          <span className="text-[11px] font-bold uppercase tracking-wider opacity-60">
            Latest data: {new Date(latestInfo.date).toLocaleDateString('id-ID')} | Shift {latestInfo.shift}
          </span>
        ) : (
          <span className="text-[11px] font-medium opacity-40 italic">Loading latest update...</span>
        )}
      </div>
      <div className="space-y-6">
        {/* Segment 1: Data Slicers (Filters) */}
        <ThemedGlassmorphismPanel className="p-6 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          <ThemedLabeledInput
            label="Start Date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="mb-0"
          />
          <ThemedLabeledInput
            label="End Date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="mb-0"
          />
          <div className="flex flex-col space-y-2">
            <label className="text-sm font-medium" style={{ color: activeTheme.input.textColor }}>Shift</label>
            <select
              value={shift}
              onChange={(e) => setShift(e.target.value)}
              style={{
                backgroundColor: activeTheme.input.color,
                color: activeTheme.input.textColor,
                borderColor: activeTheme.input.borderColor,
                borderRadius: activeTheme.input.borderRadius,
              }}
              className="border px-3 py-3 outline-none focus:ring-2 focus:ring-primary transition-all appearance-none"
            >
              <option value="">All Shifts</option>
              <option value="1">Shift 1</option>
              <option value="2">Shift 2</option>
            </select>
          </div>
          <div className="flex flex-col space-y-2">
            <label className="text-sm font-medium" style={{ color: activeTheme.input.textColor }}>Warehouse</label>
            <select
              value={warehouseCode}
              onChange={(e) => setWarehouseCode(e.target.value)}
              style={{
                backgroundColor: activeTheme.input.color,
                color: activeTheme.input.textColor,
                borderColor: activeTheme.input.borderColor,
                borderRadius: activeTheme.input.borderRadius,
              }}
              className="border px-3 py-3 outline-none focus:ring-2 focus:ring-primary transition-all appearance-none"
            >
              <option value="">All Warehouses</option>
              {warehouseOptions.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
          <ThemedLabeledInput
            label="CN Unit"
            placeholder="Search Unit..."
            value={cnUnit}
            onChange={(e) => setCnUnit(e.target.value)}
            className="mb-0"
          />
          <div className="flex flex-col space-y-2">
            <label className="text-sm font-medium" style={{ color: activeTheme.input.textColor }}>EGI</label>
            <select
              value={egi}
              onChange={(e) => setEgi(e.target.value)}
              style={{
                backgroundColor: activeTheme.input.color,
                color: activeTheme.input.textColor,
                borderColor: activeTheme.input.borderColor,
                borderRadius: activeTheme.input.borderRadius,
              }}
              className="border px-3 py-3 outline-none focus:ring-2 focus:ring-primary transition-all appearance-none"
            >
              <option value="">All EGIs</option>
              {egiOptions.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col space-y-2">
            <label className="text-sm font-medium" style={{ color: activeTheme.input.textColor }}>Report Status</label>
            <select
              value={isIncluded}
              onChange={(e) => setIsIncluded(e.target.value)}
              style={{
                backgroundColor: activeTheme.input.color,
                color: activeTheme.input.textColor,
                borderColor: activeTheme.input.borderColor,
                borderRadius: activeTheme.input.borderRadius,
              }}
              className="border px-3 py-3 outline-none focus:ring-2 focus:ring-primary transition-all appearance-none"
            >
              <option value="all">All Data</option>
              <option value="true">Included Only (Report)</option>
              <option value="false">Excluded Only</option>
            </select>
          </div>
        </ThemedGlassmorphismPanel>

        {/* Segment 2: Action Buttons */}
        <div className="flex flex-wrap gap-4">
          <button
            onClick={handlePreview}
            disabled={loading}
            style={{
              backgroundColor: activeTheme.button.primary.color,
              color: activeTheme.button.primary.textColor,
              borderRadius: activeTheme.button.primary.borderRadius,
            }}
            className="flex items-center space-x-2 px-8 py-3 font-bold shadow-lg transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
            <span>Preview</span>
          </button>

          <button
            onClick={handleExport}
            disabled={loading || !rowData.length}
            style={{
              backgroundColor: '#10B981',
              color: activeTheme.button.primary.textColor,
              borderRadius: activeTheme.button.primary.borderRadius,
            }}
            className="flex items-center space-x-2 px-8 py-3 font-bold shadow-lg transition-all active:scale-95 disabled:opacity-50"
          >
            <FileSpreadsheet className="w-5 h-5" />
            <span>Export to Excel</span>
          </button>

          <button
            onClick={handleReset}
            disabled={loading}
            style={{
              backgroundColor: activeTheme.button.secondary.color,
              color: activeTheme.button.secondary.textColor,
              borderColor: activeTheme.button.secondary.borderColor,
              borderRadius: activeTheme.button.secondary.borderRadius,
            }}
            className="flex items-center space-x-2 px-8 py-3 font-bold border transition-all active:scale-95"
          >
            <RotateCcw className="w-5 h-5" />
            <span>Reset Filters</span>
          </button>
        </div>

        {/* Segment 3: ThemedGrid */}
        <div
          className="h-[600px] w-full overflow-hidden border shadow-inner transition-all duration-300"
          style={{
            borderRadius: (activeTheme as any).card?.borderRadius || '24px',
            borderColor: activeTheme.container.borderColor,
            backgroundColor: activeTheme.container.color,
          }}
        >
          <ThemedGrid
            rowData={rowData}
            columnDefs={columnDefs}
            useGridFilter={true}
            pagination={true}
            paginationPageSize={100}
            paginationPageSizeSelector={[100, 500, 1000]}
          />
        </div>

        {/* Segment 4: Summary Section */}
        {rowData.length > 0 && (
          <ThemedGlassmorphismPanel className="p-6 flex justify-between items-center bg-gradient-to-r from-blue-600/10 to-transparent">
            <div className="flex items-center space-x-8">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold tracking-[0.2em] opacity-60 mb-1">Grand Total Qty</span>
                <div className="flex items-baseline space-x-1">
                  <span className="text-4xl font-extrabold tracking-tight">
                    {totalVisibleQty.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                  </span>
                  <span className="text-xs font-bold opacity-50">L</span>
                </div>
                {totalInDatabase > rowData.length && (
                  <span className="text-[9px] text-amber-600 font-bold opacity-75 mt-1">
                    Showing first {rowData.length.toLocaleString()} of {totalInDatabase.toLocaleString()} (Export for all)
                  </span>
                )}
              </div>

              <div className="h-10 w-[1px] bg-white/10 hidden md:block" />

              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold tracking-[0.2em] opacity-60 mb-1">Total Records in Filter</span>
                <span className="text-2xl font-bold opacity-90">
                  {totalInDatabase.toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            <div className="hidden lg:flex flex-col items-end opacity-40">
              <span className="text-[10px] uppercase font-black italic tracking-tighter">Fuel Feasibility Report</span>
              <span className="text-[8px] font-mono">AUTOGENERATED SUMMARY</span>
            </div>
          </ThemedGlassmorphismPanel>
        )}
      </div>
    </PanelTemplate>
  );
};

export default FuelUsageReport;