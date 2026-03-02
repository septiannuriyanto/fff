import { useState, useEffect, useMemo } from 'react';
import ThemedPanelContainer from "../../../common/ThemedComponents/ThemedPanelContainer";
import ThemedMetricCard from "../../../common/ThemedComponents/ThemedMetricCard";
import ThemedGlassmorphismPanel from "../../../common/ThemedComponents/ThemedGlassmorphismPanel";
import ThemedGrid from '../../../common/ThemedComponents/ThemedGrid';
import { supabase } from '../../../db/SupabaseClient';
import ApexCharts from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import ThemedMonthPicker from '../../../common/ThemedComponents/ThemedMonthPicker';

// ─── Palette (matching Dashboard Operational vibes) ─────────────────────────
const P = {
  blue: '#6366f1', // indigo
  cyan: '#06b6d4',
  purple: '#a855f7',
  emerald: '#10b981',
  rose: '#f43f5e',
  amber: '#f59e0b',
  sky: '#38bdf8',
};

type FilterKey =
  | 'all'
  | 'inside_rest'
  | 'outside_rest'
  | 'slippery'
  | 'outside_non_slippery'
  | 'non_slippery_with_reason'
  | 'non_slippery_no_reason';

const RefuelingOutsideRest = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [selectedMonth, setSelectedMonth] = useState<Date>(startOfMonth(new Date()));

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const start = format(startOfMonth(selectedMonth), 'yyyy-MM-dd');
      const end = format(endOfMonth(selectedMonth), 'yyyy-MM-dd');

      const { data: dbData, error } = await supabase
        .from('fuelman_report_tmr')
        .select(`
          *,
          area(major_area),
          fuelman_reports!inner(
            report_date,
            shift,
            fuelman:manpower!fuelman_reports_fuelman_id_fkey(nama, nickname),
            operator:manpower!fuelman_reports_operator_id_fkey(nama, nickname)
          )
        `)
        .gte('fuelman_reports.report_date', start)
        .lte('fuelman_reports.report_date', end)
        .order('fuelman_reports(report_date)', { ascending: false });
      if (error) console.error('Error fetching fuelman_report_tmr:', error);
      else setData(dbData || []);
      setLoading(false);
    };
    fetchData();
  }, [selectedMonth]);

  // ─── Derived counts ──────────────────────────────────────────────────────
  const totalRecords = data.length;
  const outsideRestCount = data.filter((d) => !d.inside_rest_time).length;
  const insideRestCount = data.filter((d) => d.inside_rest_time).length;
  const slipperyCount = data.filter((d) => d.is_slippery).length;
  const nonSlipperyCount = data.filter((d) => !d.is_slippery).length;

  const outsideRestNonSlippery = data.filter((d) => !d.inside_rest_time && !d.is_slippery);
  const outsideRestNonSlipperyCount = outsideRestNonSlippery.length;
  const outsideRestNonSlipperyWithReason = outsideRestNonSlippery.filter((d) => d.reason?.trim()).length;
  const outsideRestNonSlipperyNoReason = outsideRestNonSlippery.filter((d) => !d.reason?.trim()).length;

  // ─── Filter logic ────────────────────────────────────────────────────────
  const filterFnMap: Record<FilterKey, (d: any) => boolean> = {
    all: () => true,
    inside_rest: (d) => !!d.inside_rest_time,
    outside_rest: (d) => !d.inside_rest_time,
    slippery: (d) => !!d.is_slippery,
    outside_non_slippery: (d) => !d.inside_rest_time && !d.is_slippery,
    non_slippery_with_reason: (d) => !d.inside_rest_time && !d.is_slippery && !!d.reason?.trim(),
    non_slippery_no_reason: (d) => !d.inside_rest_time && !d.is_slippery && !d.reason?.trim(),
  };

  const displayedData = useMemo(
    () => data.filter(filterFnMap[activeFilter]),
    [data, activeFilter]
  );

  const handleCardClick = (key: FilterKey) =>
    setActiveFilter((prev) => (prev === key ? 'all' : key));

  // ─── Export ──────────────────────────────────────────────────────────────
  const handleExportXlsx = () => {
    const rows = displayedData.map((d) => ({
      Date: d.created_at ? format(new Date(d.created_at), 'dd MMM yyyy HH:mm') : '-',
      'Report Date': d.fuelman_reports?.report_date || '-',
      'Report Shift': d.fuelman_reports?.shift || '-',
      'Time Refueling': d.time_refueling || '-',
      'Loader CN': d.loader_id || '-',
      Area: d.area?.major_area || '-',
      'Location Detail': d.location_detail || '-',
      Reason: d.reason || '-',
      'Inside Rest?': d.inside_rest_time ? 'Yes' : 'No',
      'Slippery?': d.is_slippery ? 'Yes' : 'No',
      Evidence: d.evidence_url || '-',
      'Validation Remark': d.validation_remark || '-',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Refueling Outside Rest');
    XLSX.writeFile(wb, `refueling_outside_rest_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`);
  };

  // ─── Chart helpers ───────────────────────────────────────────────────────
  const loaderData = useMemo(() => {
    const raw = displayedData.reduce((acc, d) => {
      const k = d.loader_id || 'Unknown';
      if (!acc[k]) acc[k] = { inside: 0, outsideNonSlippery: 0, outsideSlippery: 0 };

      if (d.inside_rest_time) {
        acc[k].inside++;
      } else {
        if (d.is_slippery) acc[k].outsideSlippery++;
        else acc[k].outsideNonSlippery++;
      }
      return acc;
    }, {} as Record<string, { inside: number, outsideNonSlippery: number, outsideSlippery: number }>);

    const labels = Object.keys(raw);
    const insideSeries = labels.map(l => raw[l].inside);
    const outsideNonSlipperySeries = labels.map(l => raw[l].outsideNonSlippery);
    const outsideSlipperySeries = labels.map(l => raw[l].outsideSlippery);

    return { labels, insideSeries, outsideNonSlipperySeries, outsideSlipperySeries };
  }, [displayedData]);

  const reasonData = useMemo(() => {
    // Only outside rest time & non-slippery records
    const counts = displayedData
      .filter((d) => !d.inside_rest_time && !d.is_slippery)
      .reduce((acc, d) => {
        const k = d.reason?.trim() || 'No Reason';
        acc[k] = (acc[k] || 0) + 1; return acc;
      }, {} as Record<string, number>);
    return { labels: Object.keys(counts), series: Object.values(counts) as number[] };
  }, [displayedData]);

  const restTimeData = useMemo(() => ({
    labels: ['Inside Rest', 'Outside Rest'],
    series: [
      displayedData.filter((d) => d.inside_rest_time).length,
      displayedData.filter((d) => !d.inside_rest_time).length,
    ],
  }), [displayedData]);

  const slipperyData = {
    labels: ['Slippery', 'Non-Slippery'],
    series: [slipperyCount, nonSlipperyCount],
  };

  // shared dark-glass chart base
  const glassBase = (type: string): ApexOptions => ({
    chart: { type: type as any, background: 'transparent', toolbar: { show: false } },
    theme: { mode: 'dark' },
    grid: { borderColor: 'rgba(255,255,255,0.07)' },
    tooltip: { theme: 'dark' },
  });

  const loaderChartOptions: ApexOptions = {
    ...glassBase('bar'),
    chart: { ...glassBase('bar').chart, stacked: true },
    plotOptions: { bar: { columnWidth: '48%', borderRadius: 5 } },
    xaxis: {
      categories: loaderData.labels,
      labels: { style: { colors: '#94a3b8', fontSize: '11px' } },
    },
    yaxis: { labels: { style: { colors: '#94a3b8' } } },
    dataLabels: { enabled: false },
    colors: [P.blue, P.amber, P.emerald], // Indigo, Amber, Emerald
    fill: {
      type: 'gradient',
      gradient: {
        shade: 'dark',
        type: 'vertical',
        shadeIntensity: 0.5,
        gradientToColors: [P.sky, P.rose, P.cyan], // Targets: Sky, Rose, Cyan
        inverseColors: false,
        opacityFrom: 1,
        opacityTo: 0.85,
        stops: [0, 100],
      },
    },
    legend: { position: 'top', horizontalAlign: 'right', labels: { colors: '#94a3b8' } },
    title: {
      text: '🔧 Refueling by Loader ID',
      align: 'left',
      style: { color: '#f59e0b', fontSize: '12px', fontWeight: '700' },
    },
  };

  // Gradient stop palette for pie slices — vivid & catchy
  const PIE_GRADIENT_SETS: string[][] = [
    ['#6366f1', '#a855f7'],  // indigo → purple
    ['#06b6d4', '#10b981'],  // cyan → emerald
    ['#f43f5e', '#f97316'],  // rose → orange
    ['#f59e0b', '#facc15'],  // amber → yellow
    ['#38bdf8', '#818cf8'],  // sky → indigo
    ['#a855f7', '#ec4899'],  // purple → pink
    ['#10b981', '#06b6d4'],  // emerald → cyan
  ];

  const pieOpts = (title: string, labels: string[], _colors?: string[]): ApexOptions => {
    const sliceColors = labels.map((_, i) => PIE_GRADIENT_SETS[i % PIE_GRADIENT_SETS.length][0]);
    const gradientTo = labels.map((_, i) => PIE_GRADIENT_SETS[i % PIE_GRADIENT_SETS.length][1]);
    return {
      ...glassBase('donut'),
      labels,
      colors: sliceColors,
      fill: {
        type: 'gradient',
        gradient: {
          shade: 'dark',
          type: 'horizontal',
          shadeIntensity: 0.5,
          gradientToColors: gradientTo,
          inverseColors: false,
          opacityFrom: 1,
          opacityTo: 0.9,
          stops: [0, 100],
        },
      },
      title: {
        text: title,
        align: 'center',
        style: { color: '#f59e0b', fontSize: '12px', fontWeight: '700' },
      },
      plotOptions: { pie: { donut: { size: '68%', labels: { show: true, total: { show: true, color: '#94a3b8' } } } } },
      dataLabels: {
        enabled: true,
        formatter: (val) => `${Number(val).toFixed(1)}%`,
        style: { fontSize: '11px', colors: ['#fff'] },
        dropShadow: { enabled: false },
      },
      legend: { position: 'bottom', labels: { colors: '#94a3b8' }, fontSize: '11px' },
      stroke: { show: false },
    };
  };

  // ─── Inline edit: update reason in Supabase ─────────────────────────────
  const onCellValueChanged = async (params: any) => {
    const field = params.colDef.field;
    const value = params.newValue;
    const { id } = params.data;

    const { error } = await supabase
      .from('fuelman_report_tmr')
      .update({ [field]: value })
      .eq('id', id);

    if (error) {
      toast.error(`Gagal menyimpan ${field}. Perubahan dibatalkan.`);
      params.node.setDataValue(field, params.oldValue);
    } else {
      toast.success(`${field === 'reason' ? 'Reason' : 'Validation Remark'} berhasil disimpan!`);
      setData((prev) =>
        prev.map((row) => (row.id === id ? { ...row, [field]: value } : row))
      );
    }
  };

  // ─── Grid columns ────────────────────────────────────────────────────────
  const columns = [
    {
      headerName: 'Date', field: 'created_at', minWidth: 150,
      valueFormatter: (p: any) => p.value ? format(new Date(p.value), 'dd MMM yyyy HH:mm') : '-',
    },
    { headerName: 'Report Date', field: 'fuelman_reports.report_date', minWidth: 120 },
    { headerName: 'Report Shift', field: 'fuelman_reports.shift', minWidth: 100 },
    {
      headerName: 'Time Refueling',
      field: 'time_refueling',
      minWidth: 130,
      cellStyle: (p: any) => {
        if (p.data?.inside_rest_time) {
          return {
            backgroundColor: 'rgba(99, 102, 241, 0.12)', // P.blue light
            borderLeft: `4px solid ${P.blue}`,
            fontWeight: '800',
            color: P.blue, // Adaptive & high contrast
          };
        }
        if (p.data?.is_slippery) {
          return {
            backgroundColor: 'rgba(16, 185, 129, 0.12)', // P.emerald light
            borderLeft: `4px solid ${P.emerald}`,
            fontWeight: '800',
            color: P.emerald,
          };
        }
        return {
          backgroundColor: 'rgba(245, 158, 11, 0.12)', // P.amber light
          borderLeft: `4px solid ${P.amber}`,
          fontWeight: '800',
          color: P.amber,
        };
      }
    },
    { headerName: 'Loader CN', field: 'loader_id', minWidth: 120 },
    {
      headerName: 'Fuelman',
      field: 'fuelman_reports',
      valueGetter: (p: any) =>
        p.data?.fuelman_reports?.fuelman?.nama ||
        p.data?.fuelman_reports?.fuelman?.nickname ||
        '-',
      minWidth: 150,
    },
    {
      headerName: 'Operator',
      field: 'fuelman_reports',
      valueGetter: (p: any) =>
        p.data?.fuelman_reports?.operator?.nama ||
        p.data?.fuelman_reports?.operator?.nickname ||
        '-',
      minWidth: 150,
    },
    {
      headerName: 'Area', field: 'area.major_area', minWidth: 150,
      valueGetter: (p: any) => p.data?.area?.major_area || '-',
    },
    { headerName: 'Location Detail', field: 'location_detail', minWidth: 180 },
    {
      headerName: 'Reason ✏️',
      field: 'reason',
      minWidth: 200,
      editable: true,
      valueGetter: (p: any) => p.data?.reason || '',
      cellStyle: {
        cursor: 'text',
        borderLeft: `2px solid ${P.amber}44`,
        background: 'rgba(245, 158, 11, 0.04)',
      },
    },
    {
      headerName: 'Inside Rest?', field: 'inside_rest_time', minWidth: 120,
      valueFormatter: (p: any) => p.value ? 'Yes' : 'No',
    },
    {
      headerName: 'Slippery?', field: 'is_slippery', minWidth: 100,
      valueFormatter: (p: any) => p.value ? 'Yes' : 'No',
    },
    {
      headerName: 'Evidence', field: 'evidence_url', minWidth: 100,
      cellRenderer: (p: any) =>
        p.value ? (
          <a href={p.value} target="_blank" rel="noopener noreferrer"
            style={{ color: P.sky, textDecoration: 'underline' }}>View</a>
        ) : '-',
    },
    {
      headerName: 'Validation Remark ✏️',
      field: 'validation_remark',
      minWidth: 200,
      editable: true,
      cellStyle: {
        cursor: 'text',
        borderLeft: `2px solid ${P.emerald}44`,
        background: 'rgba(16, 185, 129, 0.04)',
      },
    },
  ];

  // ─── Metric card definitions ─────────────────────────────────────────────
  type CardDef = {
    key: FilterKey; title: string; value: number;
    bg: string; border: string; glow: string; activeBorder: string;
  };

  const cards: CardDef[] = [
    {
      key: 'all', title: 'Total Reports', value: totalRecords,
      bg: 'bg-indigo-500/10', border: 'border-indigo-500/25', glow: 'shadow-indigo-500/20', activeBorder: 'border-indigo-400',
    },
    {
      key: 'inside_rest', title: 'Inside Rest Time', value: insideRestCount,
      bg: 'bg-sky-500/10', border: 'border-sky-500/25', glow: 'shadow-sky-500/20', activeBorder: 'border-sky-400',
    },
    {
      key: 'outside_rest', title: 'Outside Rest Time', value: outsideRestCount,
      bg: 'bg-purple-500/10', border: 'border-purple-500/25', glow: 'shadow-purple-500/20', activeBorder: 'border-purple-400',
    },
    {
      key: 'slippery', title: 'Slippery Condition', value: slipperyCount,
      bg: 'bg-amber-500/10', border: 'border-amber-500/25', glow: 'shadow-amber-500/20', activeBorder: 'border-amber-400',
    },
    {
      key: 'outside_non_slippery', title: 'Outside & Non-Slippery', value: outsideRestNonSlipperyCount,
      bg: 'bg-orange-500/10', border: 'border-orange-500/25', glow: 'shadow-orange-500/20', activeBorder: 'border-orange-400',
    },
    {
      key: 'non_slippery_with_reason', title: 'Non-Slipp. w/ Reason', value: outsideRestNonSlipperyWithReason,
      bg: 'bg-emerald-500/10', border: 'border-emerald-500/25', glow: 'shadow-emerald-500/20', activeBorder: 'border-emerald-400',
    },
    {
      key: 'non_slippery_no_reason', title: 'Non-Slipp. No Reason', value: outsideRestNonSlipperyNoReason,
      bg: 'bg-rose-500/10', border: 'border-rose-500/25', glow: 'shadow-rose-500/20', activeBorder: 'border-rose-400',
    },
  ];

  const filterLabel = cards.find((c) => c.key === activeFilter)?.title ?? 'All';

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <ThemedPanelContainer title="Refueling Outside Rest Dashboard">
      <div className="flex justify-end mb-4 px-2">
        <ThemedMonthPicker
          value={selectedMonth}
          onChange={setSelectedMonth}
          className="w-full md:w-64"
        />
      </div>
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500" />
        </div>
      ) : (
        <div className="flex flex-col gap-6 p-2">

          {/* ── Metric Cards ─────────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {cards.map(({ key, title, value, bg, border, glow, activeBorder }) => {
              const isActive = activeFilter === key;
              return (
                <div
                  key={key}
                  onClick={() => handleCardClick(key)}
                  className={`
                    cursor-pointer rounded-2xl border-2 transition-all duration-200
                    backdrop-blur-md shadow-lg select-none p-1
                    ${bg} ${border} ${glow}
                    ${isActive
                      ? `${activeBorder} scale-[1.05] shadow-xl ring-2 ring-white/10`
                      : 'hover:scale-[1.03] hover:shadow-xl hover:brightness-110'
                    }
                  `}
                >
                  <ThemedMetricCard title={title} value={value} />
                  {isActive && (
                    <div className="text-center text-[9px] font-bold pb-2 tracking-widest uppercase opacity-60">
                      ✓ Active
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── Charts Row ───────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Bar chart — 2 columns wide */}
            <ThemedGlassmorphismPanel className="p-4 lg:col-span-2 shadow-xl">
              <ApexCharts
                options={loaderChartOptions}
                series={[
                  { name: 'Inside Rest', data: loaderData.insideSeries },
                  { name: 'Outside (Non-Slippery)', data: loaderData.outsideNonSlipperySeries },
                  { name: 'Outside (Slippery ❄️)', data: loaderData.outsideSlipperySeries },
                ]}
                type="bar"
                height={300}
              />
            </ThemedGlassmorphismPanel>

            {/* Donuts — 1 column each */}
            <ThemedGlassmorphismPanel className="p-4 flex items-center justify-center shadow-xl">
              <ApexCharts
                options={pieOpts('🕐 Rest Time', restTimeData.labels, [P.emerald, P.rose])}
                series={restTimeData.series}
                type="donut"
                height={260}
                width="100%"
              />
            </ThemedGlassmorphismPanel>

            <ThemedGlassmorphismPanel className="p-4 flex items-center justify-center shadow-xl">
              <ApexCharts
                options={pieOpts('🌧 Slippery vs Non', slipperyData.labels, [P.amber, P.cyan])}
                series={slipperyData.series}
                type="donut"
                height={260}
                width="100%"
              />
            </ThemedGlassmorphismPanel>
          </div>

          {/* Reason breakdown — full width */}
          <ThemedGlassmorphismPanel className="p-4 shadow-xl">
            <ApexCharts
              options={pieOpts('📋 Reason Breakdown', reasonData.labels,
                [P.blue, P.purple, P.cyan, P.emerald, P.rose, P.amber, P.sky])}
              series={reasonData.series}
              type="donut"
              height={220}
              width="100%"
            />
          </ThemedGlassmorphismPanel>

          {/* ── Data Table ───────────────────────────────────── */}
          <ThemedGlassmorphismPanel className="p-4 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-sm tracking-wide uppercase opacity-80">
                  Recent Records
                </h3>
                {activeFilter !== 'all' && (
                  <p className="text-xs opacity-50 mt-0.5">
                    Filter:{' '}
                    <span className="font-semibold text-indigo-300">{filterLabel}</span>
                    {' '}— {displayedData.length} row{displayedData.length !== 1 ? 's' : ''}
                    {' '}(
                    <span
                      className="underline cursor-pointer text-sky-400"
                      onClick={() => setActiveFilter('all')}
                    >
                      clear
                    </span>
                    )
                  </p>
                )}
              </div>
              <button
                onClick={handleExportXlsx}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold
                  bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500
                  hover:to-teal-400 text-white transition-all shadow-lg
                  border border-emerald-400/30 tracking-wide"
              >
                ↓ Export XLSX
              </button>
            </div>
            <div style={{ height: 420 }}>
              <ThemedGrid
                rowData={displayedData}
                columnDefs={columns}
                defaultColDef={{ sortable: true, resizable: true }}
                useGridFilter={true}
                pagination={true}
                paginationPageSize={10}
                onCellValueChanged={onCellValueChanged}
                stopEditingWhenCellsLoseFocus={true}
              />
            </div>
          </ThemedGlassmorphismPanel>

        </div>
      )}
    </ThemedPanelContainer>
  );
};

export default RefuelingOutsideRest;
