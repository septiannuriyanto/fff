import React, { useState, useEffect } from "react";
import { supabase } from "../../../db/SupabaseClient";
import { useTheme } from "../../../contexts/ThemeContext";
import { motion, AnimatePresence } from "framer-motion";
import ThemedGlassmorphismPanel from "../../../common/ThemedComponents/ThemedGlassmorphismPanel";
import DatePickerOne from "../../../components/Forms/DatePicker/DatePickerOne";
import {
  formatDateForSupabase,
  formatDateToString,
  getOperationalDate,
  getOperationalShift,
} from "../../../Utils/DateUtility";
import ShiftDropdown from "../../../components/Forms/SelectGroup/ShiftDropdown";
import ThemedLabeledInput from "../../../common/ThemedComponents/ThemedLabeledInput";
import { FaTrash, FaEdit } from "react-icons/fa";
import { HiOutlineDocumentText, HiOutlineCollection } from "react-icons/hi";
import { IoChevronBackCircleOutline, IoChevronForwardCircleOutline } from "react-icons/io5";
import LogoIcon from "../../../images/logo/logo-icon.svg";
import LogoIconDark from "../../../images/logo/logo-icon-dark.svg";
import ThemedAutoSuggest from "../../../common/ThemedComponents/ThemedAutoSuggest";
import toast, { Toaster } from "react-hot-toast";
import DropZone from "../../../components/DropZones/DropZone";
import { uploadImageGeneralGetUrl, deleteImageFromUrl } from "../../../services/ImageUploader";
import ThemedNumericInput from "../../../common/ThemedComponents/ThemedNumericInput";
import ThemedCard from "../../../common/ThemedComponents/ThemedCard";

const CACHE_KEY = 'fuelman_report_suggestions_v4';
const CACHE_EXPIRY = 3 * 24 * 60 * 60 * 1000; // 3 days
const BUILD_NUMBER_KEY = 'fff_app_build_number';
const getDraftKey = (reportId: string) => `fuelman_draft_report_${reportId}`;

const CLEANUP_AFTER_SUBMIT = false; // Switch for post-submit cleanup
const DEVELOPMENT_MODE = true; // For image upload implementation logic

// Rest time helper
const isInsideRestTime = (timeStr: string) => {
  if (!timeStr) return true;
  const [hours, minutes] = timeStr.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes;

  // 00:00 - 01:00 (0 - 60 mins)
  const rest1 = totalMinutes >= 0 && totalMinutes <= 60;
  // 12:00 - 13:00 (720 - 780 mins)
  const rest2 = totalMinutes >= 720 && totalMinutes <= 780;

  return rest1 || rest2;
};

// Number formatting helpers
const formatDots = (val: string | number) => {
  if (val === undefined || val === null || val === "") return "";
  const numStr = val.toString().replace(/\D/g, "");
  return numStr.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

const initialState = {
  report_date: "",
  shift: 1,
  fuelman_id: "",
  operator_id: "",
  ritasi: [],
  transfers: [],
  flowmeter: [],
  tmr: [],
  stock: [],
  readiness: [],
  issuing: [],
};

/* HELPER COMPONENTS */
const ThemedPageIndicator = ({ current, total }: { current: number; total: number }) => {
  const { activeTheme } = useTheme();
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1.5 items-center">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={`transition-all duration-300 rounded-full ${i === current ? 'w-6 h-1.5' : 'w-1.5 h-1.5'}`}
            style={{
              backgroundColor: activeTheme.popup.textColor,
              opacity: i === current ? 1 : 0.2
            }}
          />
        ))}
      </div>
      <span className="text-[10px] font-bold uppercase tracking-widest ml-1" style={{ color: activeTheme.popup.textColor, opacity: 0.4 }}>
        {current + 1} / {total}
      </span>
    </div>
  );
};

const PaginationNav = ({ current, total, onPrev, onNext }: { current: number; total: number; onPrev: () => void; onNext: () => void }) => {
  const { activeTheme } = useTheme();
  const iconColor = activeTheme.popup.textColor || 'rgba(255,255,255,0.3)';

  return (
    <div className="flex items-center justify-between pt-4 mt-6 border-t border-white/10">
      <div className="flex-1 flex justify-start">
        {current > 0 ? (
          <button
            onClick={onPrev}
            className="transition-all hover:scale-110 active:scale-95 p-1 rounded-full hover:bg-white/5"
            style={{ color: iconColor }}
          >
            <IoChevronBackCircleOutline size={34} />
          </button>
        ) : <div className="w-10" />}
      </div>

      <ThemedPageIndicator current={current} total={total} />

      <div className="flex-1 flex justify-end">
        {current < total - 1 ? (
          <button
            onClick={onNext}
            className="transition-all hover:scale-110 active:scale-95 p-1 rounded-full hover:bg-white/5"
            style={{ color: iconColor }}
          >
            <IoChevronForwardCircleOutline size={34} />
          </button>
        ) : <div className="w-10" />}
      </div>
    </div>
  );
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => {
  const { activeTheme } = useTheme();
  return (
    <ThemedGlassmorphismPanel className="p-4 space-y-4">
      <h2 className="text-sm font-bold uppercase tracking-wider opacity-60 px-1" style={{ color: activeTheme.popup.textColor }}>
        {title}
      </h2>
      {children}
    </ThemedGlassmorphismPanel>
  );
};

const Card = ({ children }: { children: React.ReactNode }) => {
  return (
    <motion.div layout>
      <ThemedCard className="p-4 space-y-4">
        {children}
      </ThemedCard>
    </motion.div>
  );
};

const AddButton = ({ onClick }: { onClick: () => void }) => {
  const { activeTheme } = useTheme();
  return (
    <motion.button
      layout
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className="w-full py-3 rounded-xl border border-dashed border-white/20 hover:bg-white/5 transition-all text-sm opacity-50 flex items-center justify-center gap-2"
      style={{ color: activeTheme.popup.textColor }}
    >
      <span className="text-lg">+</span> Add Item
    </motion.button>
  );
};

const RemoveButton = ({ onClick }: { onClick: () => void }) => {
  return (
    <button
      onClick={onClick}
      className="p-2 text-red-500/50 hover:text-red-500 transition-colors"
    >
      <FaTrash size={16} />
    </button>
  );
};

const CheckBox = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: (val: boolean) => void }) => {
  const { activeTheme } = useTheme();
  return (
    <label className="flex items-center gap-3 cursor-pointer p-1">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 rounded border-white/20 bg-white/10 text-primary focus:ring-primary"
      />
      <span className="text-sm" style={{ color: activeTheme.popup.textColor }}>{label}</span>
    </label>
  );
};

export default function FuelmanReport() {
  const { activeTheme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<any>(initialState);
  const [date, setDate] = useState<Date | null>(getOperationalDate());
  const [shift, setShift] = useState(getOperationalShift() == 1 ? true : false);

  // Master report gating state
  const [masterReport, setMasterReport] = useState<{ id: string } | null | 'not_found'>(null);
  const [loadingMaster, setLoadingMaster] = useState(false);
  const [ftUnitSearch, setFtUnitSearch] = useState('');
  const [reportCreated, setReportCreated] = useState(false);
  const [reportId, setReportId] = useState<string | null>(null);

  // View Mode & Pagination state
  const [viewMode, setViewMode] = useState<'Single' | 'Paginated'>(() => {
    return (localStorage.getItem('default_view') as any) || 'Paginated';
  });
  const [currentPage, setCurrentPage] = useState(0);

  // Suggestions state
  const [fuelmanList, setFuelmanList] = useState<{ user_id: string; nama: string }[]>([]);
  const [operatorList, setOperatorList] = useState<any[]>([]);
  const [ftList, setFtList] = useState<string[]>([]);
  const [areaList, setAreaList] = useState<{ id: string; major_area: string }[]>([]);
  const [showAreaModal, setShowAreaModal] = useState<{ active: boolean, index: number }>({ active: false, index: -1 });

  // Search values for AutoSuggest
  const [fuelmanSearch, setFuelmanSearch] = useState("");
  const [operatorSearch, setOperatorSearch] = useState("");

  useEffect(() => {
    checkAppVersion();
    initForm();
  }, []);

  const toggleViewMode = (mode: 'Single' | 'Paginated') => {
    setViewMode(mode);
    localStorage.setItem('default_view', mode);
    setCurrentPage(0);
  };

  // Re-check master report when date or shift changes
  useEffect(() => {
    setReportCreated(false);
    setReportId(null);
    setForm(initialState);
    setFuelmanSearch("");
    setOperatorSearch("");
    setFtUnitSearch("");
    setCurrentPage(0); // Reset page on date/shift change
    fetchMasterReport();
  }, [date, shift]);

  /** Single RPC call that fetches master report + all suggestions at once.
   *  Used only on first load (or after cache expiry). */
  const initForm = async () => {
    if (!date) return;
    setLoadingMaster(true);
    setMasterReport(null);
    try {
      // Check local cache for suggestions first
      const cached = localStorage.getItem(CACHE_KEY);
      const cacheValid = cached && (Date.now() - JSON.parse(cached).lastUpdate < CACHE_EXPIRY);

      if (cacheValid) {
        // Suggestions are cached — only fetch master report
        const { data: cacheData } = JSON.parse(cached);
        setFuelmanList(cacheData.fuelman);
        setOperatorList(cacheData.operator);
        setFtList(cacheData.ft);
        setAreaList(cacheData.area || []);
        await fetchMasterReport();
        return;
      }

      // Cold start: single RPC for everything
      const { data, error } = await supabase.rpc('get_fuelman_form_init', {
        p_date: formatDateForSupabase(date),
        p_shift: shift ? 1 : 2
      });

      if (error) throw error;

      const fuelmen = (data.fuelmen || []).filter((m: any) => m?.user_id);
      const operators = (data.operators || []).filter((o: any) => o?.user_id);
      const fts = (data.fts || []).filter(Boolean);
      const areas = (data.areas || []).filter((a: any) => a?.major_area);

      setFuelmanList(fuelmen);
      setOperatorList(operators);
      setFtList(fts);
      setAreaList(areas);
      handleMasterRecordData(data.master);

      // Cache suggestions for next time
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        data: { fuelman: fuelmen, operator: operators, ft: fts, area: areas },
        lastUpdate: Date.now()
      }));
    } catch (err) {
      console.error('initForm error:', err);
      setMasterReport('not_found');
    } finally {
      setLoadingMaster(false);
    }
  };

  const handleMasterRecordData = (master: any) => {
    if (master?.id) {
      setMasterReport(master);
      setReportId(master.id);
      // Check if a saved draft exists for this report
      const draft = localStorage.getItem(getDraftKey(master.id));
      if (draft) {
        try {
          const parsed = JSON.parse(draft);
          setForm(parsed.form ?? initialState);
          setFuelmanSearch(parsed.fuelmanSearch ?? "");
          setOperatorSearch(parsed.operatorSearch ?? "");
          setFtUnitSearch(parsed.ftUnitSearch ?? "");
          setReportCreated(true);
          toast.success("Draft sebelumnya dimuat", { icon: '📋', duration: 2000 });
        } catch {
          // corrupted draft — ignore
        }
      }
    } else {
      setMasterReport('not_found');
      setReportId(null);
    }
  };

  const fetchMasterReport = async () => {
    if (!date) return;
    setLoadingMaster(true);
    setMasterReport(null);
    try {
      const { data } = await supabase
        .from('fuelman_master_report')
        .select('id')
        .eq('report_date', formatDateForSupabase(date))
        .eq('report_shift', shift ? 1 : 2)
        .maybeSingle();
      handleMasterRecordData(data);
    } catch (err) {
      console.error('fetchMasterReport error:', err);
      setMasterReport('not_found');
      setReportId(null);
    } finally {
      setLoadingMaster(false);
    }
  };

  const checkAppVersion = async () => {
    try {
      const { data, error } = await supabase
        .from('app_updates')
        .select('build_number')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (data && !error) {
        const localBuild = localStorage.getItem(BUILD_NUMBER_KEY);
        if (!localBuild) {
          localStorage.setItem(BUILD_NUMBER_KEY, data.build_number.toString());
        }
      }
    } catch (err) {
      console.error("Version check error:", err);
    }
  };

  // Save draft to localStorage on every form/identity change (only when a report is open)
  useEffect(() => {
    if (!reportCreated || !reportId) return;
    const draft = { form, fuelmanSearch, operatorSearch, ftUnitSearch };
    localStorage.setItem(getDraftKey(reportId), JSON.stringify(draft));
  }, [form, fuelmanSearch, operatorSearch, ftUnitSearch, reportCreated, reportId]);


  const loadSuggestions = async () => {
    // Kept for manual refresh if needed
    try {
      const [manpowerRes, storageRes, areaRes] = await Promise.all([
        supabase.from('manpower').select('user_id, nama, position').eq('active', true).eq('registered', true).order('nama', { ascending: true }),
        supabase.from('storage').select('unit_id').neq('status', 'OUT').order('warehouse_id'),
        supabase.from('area').select('id, major_area').order('major_area', { ascending: true })
      ]);

      if (manpowerRes.error) throw manpowerRes.error;
      if (storageRes.error) throw storageRes.error;
      if (areaRes.error) throw areaRes.error;

      const fuelmen = manpowerRes.data.filter((m: any) => m.position === 5).map((m: any) => ({ user_id: m.user_id, nama: m.nama }));
      const operators = manpowerRes.data.filter((m: any) => m.position === 4).map((m: any) => ({ user_id: m.user_id, nama: m.nama }));
      const fts = storageRes.data.map((s: any) => s.unit_id);
      const areas = (areaRes.data || []).map((a: any) => ({ id: a.id, major_area: a.major_area })).filter((a: any) => a.major_area);

      setFuelmanList(fuelmen);
      setOperatorList(operators);
      setFtList(fts);
      setAreaList(areas);

      localStorage.setItem(CACHE_KEY, JSON.stringify({
        data: { fuelman: fuelmen, operator: operators, ft: fts, area: areas },
        lastUpdate: Date.now()
      }));
    } catch (err) {
      console.error("Failed to load suggestions:", err);
    }
  };


  const handleCreateReport = () => {
    const ft = ftUnitSearch.toUpperCase();
    const newForm = {
      ...initialState,
      fuelman_id: form.fuelman_id,
      operator_id: form.operator_id,
      ritasi: [{ ft_number: ft, value: '' }],
      flowmeter: [{ unit_number: ft, fm_awal: '', fm_akhir: '' }],
      stock: [{ unit_number: ft, sonding_awal: '', sonding_akhir: '' }],
      readiness: [{ warehouse_id: ft, status: 'RFU', location: '', remark: '' }],
      transfers: [{ transfer_from: ft, transfer_out: 0, destination: '', synchronized: false }],
      issuing: [{ unit_number: ft, jumlah_unit_support: '', jumlah_unit_hd: '', total_refueling: '' }],
      tmr: [],
    };
    setForm(newForm);
    setReportCreated(true);
    // Immediately save initial draft so next load restores
    if (reportId) {
      const draft = { form: newForm, fuelmanSearch, operatorSearch, ftUnitSearch };
      localStorage.setItem(getDraftKey(reportId), JSON.stringify(draft));
    }
  };

  const removeItem = (section: string, index: number) => {
    setForm((prev: any) => {
      const updatedList = prev[section].filter((_: any, idx: number) => idx !== index);
      return { ...prev, [section]: updatedList };
    });
  };

  const addItem = (section: string, initialItem: any) => {
    setForm((prev: any) => {
      return { ...prev, [section]: [...prev[section], initialItem] };
    });
  };

  // Robust Enforcement Loop: Ensure row 0 always matches ftUnitSearch for locked sections
  useEffect(() => {
    if (!reportCreated || !ftUnitSearch) return;

    const ft = ftUnitSearch.toUpperCase();
    const enforcedSections = {
      ritasi: 'ft_number',
      transfers: 'transfer_from',
      flowmeter: 'unit_number',
      stock: 'unit_number',
      readiness: 'warehouse_id',
      issuing: 'unit_number'
    };

    setForm((prev: any) => {
      let changed = false;
      const next = { ...prev };

      Object.entries(enforcedSections).forEach(([section, field]) => {
        if (next[section] && next[section].length > 0) {
          if (next[section][0][field] !== ft) {
            next[section] = [...next[section]];
            next[section][0] = { ...next[section][0], [field]: ft };
            changed = true;
          }
        }
      });

      return changed ? next : prev;
    });
  }, [ftUnitSearch, reportCreated, form.ritasi, form.transfers, form.flowmeter, form.stock, form.readiness, form.issuing]);

  const buttonTheme = activeTheme.button.primary;
  const secondaryButtonTheme = activeTheme.button.secondary;

  // Button enabled condition
  const canCreateReport = !!form.fuelman_id && !!form.operator_id && !!ftUnitSearch.trim();

  const handleSubmit = async () => {
    try {
      setLoading(true);

      // --- VERSION CHECK ---
      const { data: updateData, error: updateError } = await supabase
        .from('app_updates')
        .select('build_number')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (updateData && !updateError) {
        const remoteBuild = Number(updateData.build_number);
        const localBuild = Number(localStorage.getItem(BUILD_NUMBER_KEY) || 0);

        if (remoteBuild > localBuild) {
          toast.loading("Apps versi baru tersedia, sedang memuat versi terbaru..");
          localStorage.setItem(BUILD_NUMBER_KEY, remoteBuild.toString());
          setTimeout(() => {
            window.location.reload();
          }, 1500);
          return; // Keep loading true, button stays disabled
        }
      }
      // ---------------------

      if (!confirm("Are you sure you want to submit this report?")) {
        setLoading(false);
        return;
      }

      // --- VALIDATION & FALLBACK RESOLUTION ---
      let resolvedFuelmanId = form.fuelman_id;
      let resolvedOperatorId = form.operator_id;

      // Fallback: If ID is missing but name is present, try to find it in the list again
      if (!resolvedFuelmanId && fuelmanSearch.trim()) {
        const found = fuelmanList.find(f => {
          const name = (typeof f === 'string' ? f : f.nama || "").toLowerCase().trim();
          return name === fuelmanSearch.toLowerCase().trim();
        });
        if (found && typeof found !== 'string') resolvedFuelmanId = found.user_id;
      }

      if (!resolvedOperatorId && operatorSearch.trim()) {
        const found = operatorList.find(o => {
          const name = (typeof o === 'string' ? o : o.nama || "").toLowerCase().trim();
          return name === operatorSearch.toLowerCase().trim();
        });
        if (found && typeof found !== 'string') resolvedOperatorId = found.user_id;
      }

      const errors: string[] = [];
      if (!resolvedFuelmanId) errors.push(`Fuelman '${fuelmanSearch}' tidak ditemukan di database`);
      if (!resolvedOperatorId) errors.push(`Operator '${operatorSearch}' tidak ditemukan di database`);

      // Detailed Validations
      form.ritasi.forEach((r: any, idx: number) => {
        if (!r.ft_number) errors.push(`Ritasi #${idx + 1}: FT Number belum diisi`);
        if (!r.value || Number(r.value) <= 0) errors.push(`Ritasi #${idx + 1}: Value harus > 0`);
      });

      form.transfers.forEach((t: any, idx: number) => {
        if (!t.transfer_from) errors.push(`Transfer #${idx + 1}: Dari belum diisi`);
        if (!t.destination) errors.push(`Transfer #${idx + 1}: Tujuan belum diisi`);
        if (!t.transfer_out || Number(t.transfer_out) <= 0) errors.push(`Transfer #${idx + 1}: Qty harus > 0`);
        if (!t.synchronized) errors.push(`Transfer #${idx + 1}: Mohon konfirmasi 'Sudah disinkronisasi'`);
      });

      // Flowmeter Validations
      if (form.flowmeter.length === 0) {
        errors.push("Record Flowmeter wajib diisi (minimal 1)");
      }

      form.flowmeter.forEach((f: any, idx: number) => {
        if (!f.unit_number) errors.push(`Flowmeter #${idx + 1}: Unit Number belum diisi`);

        if (f.fm_awal === "" || f.fm_awal === null || f.fm_awal === undefined) {
          errors.push(`Flowmeter #${idx + 1}: Flowmeter awal wajib diisi`);
        } else if (Number(f.fm_awal) <= 0) {
          errors.push(`Flowmeter #${idx + 1}: Flowmeter awal tidak boleh 0 atau minus`);
        }

        if (f.fm_akhir === "" || f.fm_akhir === null || f.fm_akhir === undefined) {
          errors.push(`Flowmeter #${idx + 1}: Flowmeter akhir wajib diisi`);
        } else if (Number(f.fm_akhir) <= 0) {
          errors.push(`Flowmeter #${idx + 1}: Flowmeter akhir tidak boleh 0 atau minus`);
        }

        const usage = Number(f.fm_akhir || 0) - Number(f.fm_awal || 0);
        if (usage < 0) errors.push(`Flowmeter #${idx + 1}: Usage tidak boleh minus. Cek kembali angka awal/akhir.`);
        if (usage > 100000) errors.push(`Flowmeter #${idx + 1}: Usage melebihi 100.000 liter. Cek kembali angka awal/akhir.`);
      });

      // Stock Validations
      if (form.stock.length === 0) {
        errors.push("Record Stock wajib diisi (minimal 1)");
      }
      form.stock.forEach((s: any, idx: number) => {
        if (!s.unit_number) errors.push(`Stock #${idx + 1}: Unit belum diisi`);
        if (s.sonding_awal === "" || s.sonding_awal === null || s.sonding_awal === undefined) errors.push(`Stock #${idx + 1}: Sonding awal wajib diisi`);
        if (s.sonding_akhir === "" || s.sonding_akhir === null || s.sonding_akhir === undefined) errors.push(`Stock #${idx + 1}: Sonding akhir wajib diisi`);

        if (Number(String(s.sonding_awal).replace(',', '.')) <= 0) errors.push(`Stock #${idx + 1}: Sonding awal tidak boleh 0`);
        if (Number(String(s.sonding_akhir).replace(',', '.')) <= 0) errors.push(`Stock #${idx + 1}: Sonding akhir tidak boleh 0`);
      });

      form.tmr.forEach((item: any, idx: number) => {
        if (!item.loader_id) errors.push(`TMR #${idx + 1}: Loader belum diisi`);
        if (!item.time_refueling) errors.push(`TMR #${idx + 1}: Waktu refueling belum diisi`);
        if (!item.location_id) errors.push(`TMR #${idx + 1}: Lokasi belum valid. Mohon pilih dari saran yang muncul.`);

        const insideRest = isInsideRestTime(item.time_refueling);
        if (!insideRest && item.is_slippery === false) {
          if (!item.reason) errors.push(`TMR #${idx + 1}: Alasan refueling non-slippery harus diisi`);
        }
      });

      form.readiness.forEach((r: any) => {
        if (r.status === 'BD' && !r.remark) {
          errors.push(`Readiness: Remark wajib diisi untuk unit ${r.warehouse_id} (Status BD)`);
        }
      });

      if (errors.length > 0) {
        setLoading(false);
        errors.forEach(err => toast.error(err));
        return;
      }

      // Update local state with resolved IDs just in case
      if (resolvedFuelmanId !== form.fuelman_id || resolvedOperatorId !== form.operator_id) {
        setForm({ ...form, fuelman_id: resolvedFuelmanId, operator_id: resolvedOperatorId });
      }
      // ------------------

      const payload = {
        p_report_date: formatDateForSupabase(new Date(date || new Date())),
        p_report_shift: shift ? 1 : 2,
        p_master_report_id: reportId,
        p_fuelman_id: resolvedFuelmanId,
        p_operator_id: resolvedOperatorId,
        p_ft_number: (form.ritasi[0]?.ft_number || "").toUpperCase(),
        p_ritasi: form.ritasi.map((r: any) => ({
          value: Number(r.value || 0),
          ft_number: (r.ft_number || "").toUpperCase()
        })),
        p_transfers: form.transfers.map((t: any) => ({
          ...t,
          transfer_from: (t.transfer_from || "").toUpperCase(),
          destination: (t.destination || "").toUpperCase(),
          transfer_out: Number(t.transfer_out || 0)
        })),
        p_flowmeter: form.flowmeter.map((f: any) => ({
          ...f,
          fm_awal: Number(f.fm_awal || 0),
          fm_akhir: Number(f.fm_akhir || 0),
          usage: Number(f.fm_akhir || 0) - Number(f.fm_awal || 0)
        })),
        p_tmr: form.tmr.map((item: any) => {
          const insideRest = isInsideRestTime(item.time_refueling);
          return {
            loader_id: (item.loader_id || "").toUpperCase(),
            time_refueling: item.time_refueling || "",
            reason: item.reason || "",
            evidence_url: item.evidence_url || "",
            area_id: item.location_id || "",
            location_detail: item.location_detail || "",
            inside_rest_time: insideRest,
            is_slippery: insideRest ? null : (item.is_slippery ?? true)
          };
        }),
        p_stock: form.stock.map((s: any) => ({
          unit_number: (s.unit_number || "").toUpperCase(),
          sonding_awal: Number(s.sonding_awal.replace(',', '.')),
          sonding_akhir: Number(s.sonding_akhir.replace(',', '.')),
        })),
        p_readiness: form.readiness.map((r: any) => ({
          warehouse_id: r.warehouse_id,
          status: r.status,
          location: r.location ? r.location.toUpperCase() : "",
          remark: r.remark ? r.remark.toUpperCase() : ""
        })),
        p_issuing: form.issuing.map((i: any) => ({
          ...i,
          unit_number: (i.unit_number || "").toUpperCase(),
          jumlah_unit_support: Number(i.jumlah_unit_support || 0),
          jumlah_unit_hd: Number(i.jumlah_unit_hd || 0),
          total_refueling: Number(i.total_refueling || 0)
        }))
      };

      console.log("Submitting Fuelman Report Payload:", payload);

      const { error } = await supabase.rpc(
        "create_fuelman_report",
        payload
      );

      if (error) throw error;

      toast.success("Report created successfully!");

      if (CLEANUP_AFTER_SUBMIT) {
        setForm(initialState);
        setFuelmanSearch("");
        setOperatorSearch("");
        setReportCreated(false);
        if (reportId) localStorage.removeItem(getDraftKey(reportId));
      }
    } catch (err: any) {
      console.error("Submission error:", err);
      toast.error(err.message || "Failed to create report");
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (date: Date | null) => {
    setDate(date);
  };

  return (
    <div className="flex justify-center p-4">
      <Toaster />
      <div className="flex flex-col gap-4 p-4 pb-12 w-full max-w-lg rounded-3xl shadow-2xl backdrop-blur-xl" style={{ backgroundColor: activeTheme.popup.backgroundColor }}>
        <style>{`
        @keyframes pageIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .page-transition {
          animation: pageIn 0.3s ease-out forwards;
        }
      `}</style>
        {/* Outer Layout Header */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-3">
              <img
                src={activeTheme.baseTheme === 'dark' ? LogoIconDark : LogoIcon}
                alt="Logo"
                className="h-10 w-auto"
              />
              <div className="flex flex-col">
                <h1 className="text-xl font-bold leading-tight" style={{ color: activeTheme.popup.textColor }}>
                  Fuelman Report
                </h1>
                <p className="text-[10px] opacity-60" style={{ color: activeTheme.popup.textColor }}>
                  PT. Pamapersada Nusantara BRCG
                </p>
              </div>
            </div>
            <div className="flex bg-white/5 rounded-lg p-1 border border-white/10">
              <button
                onClick={() => toggleViewMode('Single')}
                className={`p-2 rounded-md transition-all border ${viewMode === 'Single' ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-transparent hover:bg-white/5'}`}
                style={{
                  color: viewMode === 'Single' ? undefined : activeTheme.popup.textColor,
                  borderColor: viewMode === 'Single' ? undefined : activeTheme.popup.textColor,
                  opacity: viewMode === 'Single' ? 1 : 0.3
                }}
                title="Single Page View"
              >
                <HiOutlineDocumentText size={20} />
              </button>
              <button
                onClick={() => toggleViewMode('Paginated')}
                className={`p-2 ml-1 rounded-md transition-all border ${viewMode === 'Paginated' ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-transparent hover:bg-white/5'}`}
                style={{
                  color: viewMode === 'Paginated' ? undefined : activeTheme.popup.textColor,
                  borderColor: viewMode === 'Paginated' ? undefined : activeTheme.popup.textColor,
                  opacity: viewMode === 'Paginated' ? 1 : 0.3
                }}
                title="Paginated View"
              >
                <HiOutlineCollection size={20} />
              </button>
            </div>
          </div>
          {/* MAIN CONTENT AREA with Morphing Layout */}
          <motion.div layout transition={{ duration: 0.4, ease: "easeInOut" }} className="flex flex-col gap-6">
            <AnimatePresence mode="wait">
              {/* HEADER SECTION (Page 0) */}
              {(viewMode === 'Single' || currentPage === 0) && (
                <motion.div
                  key={viewMode === 'Paginated' ? "page-0" : "single-header"}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <ThemedGlassmorphismPanel className="p-4 space-y-4 shadow-xl border border-white/10">
                    <h1 className="text-sm font-bold uppercase tracking-wider opacity-60" style={{ color: activeTheme.popup.textColor }}>
                      Header
                    </h1>

                    {/* Date & Shift */}
                    <div className="flex flex-row gap-2 w-full">
                      <div className="flex-1">
                        <DatePickerOne
                          enabled={true}
                          handleChange={handleDateChange}
                          setValue={date ? formatDateToString(new Date(date)) : ''}
                        />
                      </div>
                      <div className="flex-1">
                        <ShiftDropdown value={shift} onChange={setShift} />
                      </div>
                    </div>

                    {/* Master Record Status Chip */}
                    {loadingMaster && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 text-xs" style={{ color: activeTheme.popup.textColor }}>
                        <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        Memeriksa master record...
                      </div>
                    )}
                    {!loadingMaster && masterReport === 'not_found' && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-400">
                        <span className="font-bold text-base">⚠</span>
                        Master Record belum dibuat untuk tanggal &amp; shift ini.
                      </div>
                    )}
                    {!loadingMaster && masterReport && masterReport !== 'not_found' && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/30 text-xs text-green-400">
                        <span className="text-base">✓</span>
                        <div className="flex flex-col">
                          <span className="font-semibold">Master Record ditemukan</span>
                          <span className="opacity-60 font-mono">{masterReport.id}</span>
                        </div>
                      </div>
                    )}

                    {/* Identity fields — only show when master record exists */}
                    {!loadingMaster && masterReport && masterReport !== 'not_found' && (
                      <>
                        <ThemedAutoSuggest
                          label="Fuelman"
                          value={fuelmanSearch}
                          onChange={(val) => {
                            setFuelmanSearch(val);
                            const searchVal = val.toLowerCase().trim();
                            const found = (fuelmanList || []).find(f => (f.nama || "").toLowerCase().trim() === searchVal);
                            const fuelman_id = found ? found.user_id : "";
                            setForm((prev: any) => ({ ...prev, fuelman_id }));
                          }}
                          suggestions={fuelmanList.map(f => f.nama)}
                          placeholder="Search Fuelman..."
                        />

                        <ThemedAutoSuggest
                          label="Operator"
                          value={operatorSearch}
                          onChange={(val) => {
                            setOperatorSearch(val);
                            const searchVal = val.toLowerCase().trim();
                            const found = (operatorList || []).find((o: any) =>
                              (typeof o === 'string' ? o : o.nama || "").toLowerCase().trim() === searchVal
                            );
                            const operator_id = (found && typeof found !== 'string') ? found.user_id : "";
                            setForm((prev: any) => ({ ...prev, operator_id }));
                          }}
                          suggestions={(operatorList || []).map((o: any) => typeof o === 'string' ? o : o.nama)}
                          placeholder="Search Operator..."
                        />

                        <ThemedAutoSuggest
                          label="Unit FT (Utama)"
                          value={ftUnitSearch}
                          onChange={(val) => setFtUnitSearch(val.toUpperCase())}
                          suggestions={ftList}
                          placeholder="Search FT..."
                        />

                        <button
                          onClick={handleCreateReport}
                          disabled={!canCreateReport || reportCreated}
                          style={{
                            backgroundColor: canCreateReport && !reportCreated ? buttonTheme.color : undefined,
                            color: canCreateReport && !reportCreated ? buttonTheme.textColor : undefined,
                            borderRadius: buttonTheme.borderRadius,
                            opacity: (!canCreateReport || reportCreated) ? 0.4 : 1,
                            cursor: (!canCreateReport || reportCreated) ? 'not-allowed' : 'pointer',
                          }}
                          className="w-full py-3 font-semibold transition-all bg-white/10"
                        >
                          {reportCreated ? '✓ Report Dibuat' : 'Create Report'}
                        </button>
                      </>
                    )}
                  </ThemedGlassmorphismPanel>
                </motion.div>
              )}

              {/* ====== SECTIONS — only shown after Create Report ====== */}
              {reportCreated && (
                <>
                  {/* RITASI (Page 1) */}
                  {(viewMode === 'Single' || currentPage === 1) && (
                    <motion.div
                      key={viewMode === 'Paginated' ? "page-1" : "single-ritasi"}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      layout
                    >
                      <Section title="Ritasi">
                        {form.ritasi.length > 0 ? (
                          <div className="space-y-4">
                            {form.ritasi.map((item: any, i: number) => (
                              <Card key={i}>
                                <div className="flex flex-row justify-between align-baseline gap-4">
                                  <div className="w-2/3">
                                    <ThemedAutoSuggest
                                      label="FT Number"
                                      autoFocus={i === form.ritasi.length - 1 && i !== 0 && item.ft_number === ""}
                                      value={item.ft_number}
                                      onChange={(val) => {
                                        if (i === 0) return; // first row locked
                                        const updated = [...form.ritasi];
                                        updated[i].ft_number = val;
                                        setForm({ ...form, ritasi: updated });
                                      }}
                                      suggestions={ftList}
                                      placeholder="Search FT..."
                                      disabled={i === 0}
                                    />
                                  </div>
                                  <div className="w-1/3">
                                    <ThemedNumericInput
                                      label="Value (Liter)"
                                      value={item.value}
                                      onChange={(raw) => {
                                        const updated = [...form.ritasi];
                                        updated[i].value = raw;
                                        setForm({ ...form, ritasi: updated });
                                      }}
                                    />
                                  </div>
                                  <div className="flex center align-middle justify-center">
                                    <RemoveButton onClick={() => removeItem('ritasi', i)} />
                                  </div>
                                </div>
                              </Card>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-4 bg-white/5 rounded-xl border border-dashed border-white/20">
                            <p className="text-sm opacity-50 mb-3" style={{ color: activeTheme.popup.textColor }}>No ritasi data added yet</p>
                          </div>
                        )}
                        <AddButton onClick={() =>
                          addItem('ritasi', { ft_number: "", value: 0 })
                        } />

                        {/* Pagination for Ritasi removed - now shared below */}
                      </Section>
                    </motion.div>
                  )}

                  {/* ISSUING (Page 2) */}
                  {(viewMode === 'Single' || currentPage === 2) && (
                    <motion.div
                      key={viewMode === 'Paginated' ? "page-2" : "single-issuing"}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      layout
                    >
                      <Section title="Issuing">
                        {form.issuing.length > 0 ? (
                          <div className="space-y-4">
                            {form.issuing.map((item: any, i: number) => (
                              <Card key={i}>
                                <div className="flex flex-col gap-4">
                                  <div className="flex flex-col gap-4 items-end">
                                    <div className="flex flex-row gap-4">
                                      <ThemedAutoSuggest
                                        label="Unit"
                                        autoFocus={i === form.issuing.length - 1 && i !== 0 && item.unit_number === ""}
                                        value={item.unit_number}
                                        onChange={(val) => {
                                          if (i === 0) return;
                                          const updated = [...form.issuing];
                                          updated[i].unit_number = val;
                                          setForm({ ...form, issuing: updated });
                                        }}
                                        suggestions={ftList}
                                        placeholder="Search Unit..."
                                        disabled={i === 0}
                                      />
                                      <ThemedNumericInput
                                        label="Total Refueling Qty (Liter)"
                                        value={item.total_refueling}
                                        onChange={(raw) => {
                                          const updated = [...form.issuing];
                                          updated[i].total_refueling = raw;
                                          setForm({ ...form, issuing: updated });
                                        }}
                                        placeholder="0"
                                      />
                                    </div>
                                    <div className="flex flex-row gap-4">
                                      <ThemedNumericInput
                                        label="Unit Support"
                                        value={item.jumlah_unit_support}
                                        onChange={(raw) => {
                                          const updated = [...form.issuing];
                                          updated[i].jumlah_unit_support = raw.replace(/\D/g, '');
                                          setForm({ ...form, issuing: updated });
                                        }}
                                        placeholder="0"
                                      />
                                      <ThemedNumericInput
                                        label="Unit HD"
                                        value={item.jumlah_unit_hd}
                                        onChange={(raw) => {
                                          const updated = [...form.issuing];
                                          updated[i].jumlah_unit_hd = raw.replace(/\D/g, '');
                                          setForm({ ...form, issuing: updated });
                                        }}
                                        placeholder="0"
                                      />
                                    </div>

                                    <div className="flex center align-middle justify-center">
                                      <RemoveButton onClick={() => removeItem('issuing', i)} />
                                    </div>
                                  </div>
                                </div>
                              </Card>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-4 bg-white/5 rounded-xl border border-dashed border-white/20">
                            <p className="text-sm opacity-50 mb-3" style={{ color: activeTheme.popup.textColor }}>No issuing data added yet</p>
                          </div>
                        )}
                        <AddButton onClick={() =>
                          addItem('issuing', { unit_number: "", jumlah_unit_support: "", jumlah_unit_hd: "", total_refueling: "" })
                        } />

                        {/* Pagination for Issuing removed - now shared below */}
                      </Section>
                    </motion.div>
                  )}

                  {/* TRANSFER (Page 3) */}
                  {(viewMode === 'Single' || currentPage === 3) && (
                    <motion.div
                      key={viewMode === 'Paginated' ? "page-3" : "single-transfers"}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      layout
                    >
                      <Section title="Transfers (OB)">
                        {form.transfers.length > 0 ? (
                          <div className="space-y-4">
                            {form.transfers.map((item: any, i: number) => (
                              <Card key={i}>
                                <div className="flex flex-col gap-4">
                                  <div className="flex flex-row gap-4 items-end">
                                    <div className="flex-1">
                                      <ThemedAutoSuggest
                                        label="Dari"
                                        autoFocus={i === form.transfers.length - 1 && i !== 0 && item.transfer_from === ""}
                                        value={item.transfer_from}
                                        onChange={(val) => {
                                          if (i === 0) return;
                                          const updated = [...form.transfers];
                                          updated[i].transfer_from = val;
                                          setForm({ ...form, transfers: updated });
                                        }}
                                        suggestions={ftList}
                                        placeholder="Search Unit..."
                                        disabled={i === 0}
                                      />
                                      <ThemedAutoSuggest
                                        label="Tujuan"
                                        value={item.destination}
                                        onChange={(val) => {
                                          const updated = [...form.transfers];
                                          updated[i].destination = val;
                                          setForm({ ...form, transfers: updated });
                                        }}
                                        suggestions={ftList}
                                        placeholder="Search Unit..."
                                      />
                                    </div>
                                  </div>

                                  <div className="flex flex-row align-baseline gap-4">
                                    <div className="w-full">
                                      <ThemedNumericInput
                                        label="Qty (LTR)"
                                        value={item.transfer_out}
                                        onChange={(raw) => {
                                          const updated = [...form.transfers];
                                          updated[i].transfer_out = raw;
                                          setForm({ ...form, transfers: updated });
                                        }}
                                      />
                                    </div>
                                    <RemoveButton onClick={() => removeItem('transfers', i)} />
                                  </div>
                                </div>

                                <CheckBox
                                  label="Sudah disinkronisasi"
                                  checked={item.synchronized}
                                  onChange={(val: boolean) => {
                                    const updated = [...form.transfers];
                                    updated[i].synchronized = val;
                                    setForm({ ...form, transfers: updated });
                                  }}
                                />
                              </Card>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-4 bg-white/5 rounded-xl border border-dashed border-white/20">
                            <p className="text-sm opacity-50 mb-3" style={{ color: activeTheme.popup.textColor }}>No transfer data added yet</p>
                          </div>
                        )}
                        <AddButton onClick={() =>
                          addItem('transfers', { transfer_from: "", transfer_out: 0, destination: "", synchronized: false })
                        } />

                        {/* Pagination for Transfers removed - now shared below */}
                      </Section>
                    </motion.div>
                  )}

                  {/* FLOWMETER (Page 4) */}
                  {(viewMode === 'Single' || currentPage === 4) && (
                    <motion.div
                      key={viewMode === 'Paginated' ? "page-4" : "single-flowmeter"}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      layout
                    >
                      <Section title="Flowmeter (tanpa angka belakang koma)">
                        {form.flowmeter.length > 0 ? (
                          <div className="space-y-4">
                            {form.flowmeter.map((f: any, i: number) => (
                              <ThemedCard key={i} className="p-4 flex flex-col gap-4 relative group">
                                <div className="flex flex-col gap-4 items-end">
                                  <div className="w-full">
                                    <ThemedAutoSuggest
                                      label="Unit Number"
                                      autoFocus={i === form.flowmeter.length - 1 && i !== 0 && f.unit_number === ""}
                                      value={f.unit_number}
                                      onChange={(val) => {
                                        if (i === 0) return;
                                        const updated = [...form.flowmeter];
                                        updated[i].unit_number = val;
                                        setForm({ ...form, flowmeter: updated });
                                      }}
                                      suggestions={ftList}
                                      placeholder="Search Unit..."
                                      disabled={i === 0}
                                    />
                                  </div>
                                  <div className="w-full">
                                    <ThemedNumericInput
                                      label="Flowmeter Awal"
                                      value={f.fm_awal}
                                      onChange={(raw) => {
                                        const updated = [...form.flowmeter];
                                        updated[i].fm_awal = raw;
                                        setForm({ ...form, flowmeter: updated });
                                      }}
                                    />
                                  </div>
                                  <div className="w-full">
                                    <ThemedNumericInput
                                      label="Flowmeter Akhir"
                                      value={f.fm_akhir}
                                      onChange={(raw) => {
                                        const updated = [...form.flowmeter];
                                        updated[i].fm_akhir = raw;
                                        setForm({ ...form, flowmeter: updated });
                                      }}
                                    />
                                  </div>
                                  <div className="mb-4.5">
                                    <RemoveButton onClick={() => removeItem('flowmeter', i)} />
                                  </div>
                                </div>

                                <div className="flex flex-col gap-2 justify-between items-center mt-2 px-1">
                                  <div className="text-sm font-medium" style={{ color: activeTheme.popup.textColor }}>
                                    Usage: <span className="font-bold" style={{ color: '#f59e0b' }}>{formatDots(Number(f.fm_akhir || 0) - Number(f.fm_awal || 0))} liter</span>
                                  </div>

                                  {(Number(f.fm_akhir || 0) - Number(f.fm_awal || 0) < 0) && (
                                    <div className="text-[10px] font-bold px-2 py-1 bg-red-500/10 text-red-500 border border-red-500/20 rounded animate-pulse">
                                      ERROR: Usage minus! Cek kembali angka awal/akhir.
                                    </div>
                                  )}

                                  {(Number(f.fm_akhir || 0) - Number(f.fm_awal || 0) > 100000) && (
                                    <div className="text-[10px] font-bold px-2 py-1 bg-red-500/10 text-red-500 border border-red-500/20 rounded animate-pulse">
                                      CAUTION: Usage melebihi 100,000! Cek kembali angka awal/akhir.
                                    </div>
                                  )}
                                </div>
                              </ThemedCard>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-4 bg-white/5 rounded-xl border border-dashed border-white/20">
                            <p className="text-sm opacity-50 mb-3" style={{ color: activeTheme.popup.textColor }}>No flowmeter data added yet</p>
                          </div>
                        )}
                        <AddButton onClick={() =>
                          addItem('flowmeter', { unit_number: "", fm_awal: "", fm_akhir: "" })
                        } />

                        {/* Pagination for Flowmeter removed - now shared below */}
                      </Section>
                    </motion.div>
                  )}

                  {/* TMR (Page 5) */}
                  {(viewMode === 'Single' || currentPage === 5) && (
                    <motion.div
                      key={viewMode === 'Paginated' ? "page-5" : "single-tmr"}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      layout
                    >
                      <Section title="TMR Reporting">
                        {form.tmr.length > 0 ? (
                          <div className="space-y-4">
                            {form.tmr.map((item: any, i: number) => (
                              <Card key={i}>
                                <div className="flex flex-row gap-4 items-end mb-4">
                                  <div className="flex-1">
                                    <ThemedLabeledInput
                                      label="Loader"
                                      autoFocus={i === form.tmr.length - 1 && item.loader_name === ""}
                                      value={item.loader_name || ""}
                                      onChange={(e: any) => {
                                        const updated = [...form.tmr];
                                        updated[i].loader_name = e.target.value;
                                        updated[i].loader_id = e.target.value;
                                        setForm({ ...form, tmr: updated });
                                      }}
                                      placeholder="Enter CN Loader..."
                                      className="mb-0"
                                    />
                                  </div>
                                  <div className="w-1/3">
                                    <label className="text-sm block mb-2" style={{ color: activeTheme.popup.textColor }}>
                                      Waktu
                                    </label>
                                    <input
                                      type="time"
                                      value={item.time_refueling || ""}
                                      onChange={(e: any) => {
                                        const updated = [...form.tmr];
                                        updated[i].time_refueling = e.target.value;
                                        setForm({ ...form, tmr: updated });
                                      }}
                                      style={{
                                        backgroundColor: activeTheme.input.color,
                                        color: activeTheme.input.textColor,
                                        borderColor: activeTheme.input.borderColor,
                                        borderWidth: activeTheme.input.borderWidth,
                                        borderRadius: activeTheme.input.borderRadius,
                                      }}
                                      className="w-full outline-none transition px-4 py-2 text-sm"
                                    />
                                  </div>
                                  <div className="pb-1">
                                    <RemoveButton onClick={() => removeItem('tmr', i)} />
                                  </div>
                                </div>

                                <div className="flex flex-col gap-4 items-end mb-4">
                                  <div className="flex-1 relative w-full">
                                    <ThemedAutoSuggest
                                      label="Location"
                                      value={item.location || ""}
                                      onChange={(val) => {
                                        const searchVal = val.trim().toLowerCase();
                                        const found = (areaList || []).find(a =>
                                          (a.major_area || "").toLowerCase() === searchVal
                                        );
                                        const location_id = found ? found.id : "";
                                        setForm((prev: any) => {
                                          const updated = [...prev.tmr];
                                          updated[i].location = val;
                                          updated[i].location_id = location_id;
                                          return { ...prev, tmr: updated };
                                        });
                                      }}
                                      suggestions={areaList.map(a => a.major_area)}
                                      placeholder="Select Location..."
                                      className="mb-0"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => setShowAreaModal({ active: true, index: i })}
                                      className="absolute right-2 top-9 p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                                      style={{ color: activeTheme.ui.primaryColor }}
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                      </svg>
                                    </button>
                                  </div>
                                  <div className="flex-1 w-full">
                                    <ThemedLabeledInput
                                      label="Lokasi Detail (Optional)"
                                      value={item.location_detail || ""}
                                      onChange={(e: any) => {
                                        const updated = [...form.tmr];
                                        updated[i].location_detail = e.target.value;
                                        setForm({ ...form, tmr: updated });
                                      }}
                                      placeholder="e.g. Di samping PIT A"
                                      className="mb-0"
                                    />
                                  </div>
                                </div>

                                {!isInsideRestTime(item.time_refueling) && (
                                  <div className="space-y-4 pt-2 border-t border-white/5">
                                    <div className="flex flex-row gap-6 mb-2">
                                      <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                          type="radio"
                                          name={`slippery-${i}`}
                                          checked={item.is_slippery !== false}
                                          onChange={() => {
                                            const updated = [...form.tmr];
                                            updated[i].is_slippery = true;
                                            setForm({ ...form, tmr: updated });
                                          }}
                                          className="w-4 h-4"
                                        />
                                        <span className="text-sm" style={{ color: activeTheme.popup.textColor }}>Slippery</span>
                                      </label>
                                      <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                          type="radio"
                                          name={`slippery-${i}`}
                                          checked={item.is_slippery === false}
                                          onChange={() => {
                                            const updated = [...form.tmr];
                                            updated[i].is_slippery = false;
                                            setForm({ ...form, tmr: updated });
                                            // Auto focus reason field
                                            setTimeout(() => {
                                              const reasonInput = document.getElementById(`tmr-reason-${i}`);
                                              if (reasonInput) reasonInput.focus();
                                            }, 50);
                                          }}
                                          className="w-4 h-4"
                                        />
                                        <span className="text-sm" style={{ color: activeTheme.popup.textColor }}>Non Slippery</span>
                                      </label>
                                    </div>

                                    {item.is_slippery === false && (
                                      <>
                                        <div className="text-xs font-semibold p-2 bg-red-100/10 text-red-500 rounded border border-red-500/50">
                                          Mohon berikan keterangan untuk refueling non slippery di luar rest
                                        </div>

                                        <ThemedLabeledInput
                                          id={`tmr-reason-${i}`}
                                          label="Reason"
                                          value={item.reason}
                                          onChange={(e: any) => {
                                            const updated = [...form.tmr];
                                            updated[i].reason = e.target.value;
                                            setForm({ ...form, tmr: updated });
                                          }}
                                        />

                                        <div className="mt-4 mb-4">
                                          <label className="text-gray-700 block mb-1" style={{ color: activeTheme.popup.textColor }}>
                                            Evidence (Image)
                                          </label>
                                          {DEVELOPMENT_MODE ? (
                                            !item.evidence_url ? (
                                              <DropZone
                                                title="Upload Evidence"
                                                id={`tmr-evidence-${i}`}
                                                onFileUpload={async (file: File) => {
                                                  const randomSeries = Math.random().toString(36).substring(2, 8);
                                                  const fileName = `${Date.now()}_${randomSeries}_${item.loader_name || 'loader'}`.replace(/\s+/g, '_');
                                                  const fullPath = `refueling_loader/${fileName}`;
                                                  const url = await uploadImageGeneralGetUrl(file, 'problems_evidence', fullPath);
                                                  if (url) {
                                                    const updated = [...form.tmr];
                                                    updated[i].evidence_url = url;
                                                    setForm({ ...form, tmr: updated });
                                                    toast.success("Image uploaded successfully!");
                                                  }
                                                }}
                                              />
                                            ) : (
                                              <div className="flex flex-col gap-2 p-4 border border-white/10 rounded-xl bg-white/5">
                                                <div className="flex flex-row items-center gap-4">
                                                  <div className="flex-1 flex justify-center">
                                                    <img
                                                      src={item.evidence_url}
                                                      alt="Evidence"
                                                      className="max-h-60 rounded-lg shadow-md object-contain"
                                                    />
                                                  </div>
                                                  <div className="flex flex-col gap-2 self-start pt-2">
                                                    <button
                                                      type="button"
                                                      onClick={async () => {
                                                        if (confirm("Replace this image?")) {
                                                          const success = await deleteImageFromUrl(item.evidence_url);
                                                          if (success) {
                                                            const updated = [...form.tmr];
                                                            updated[i].evidence_url = "";
                                                            setForm({ ...form, tmr: updated });
                                                          }
                                                        }
                                                      }}
                                                      className="p-2.5 bg-blue-500/10 text-blue-500 border border-blue-500/20 rounded-lg hover:bg-blue-500 hover:text-white transition-all shadow-sm"
                                                      title="Replace Image"
                                                    >
                                                      <FaEdit size={16} />
                                                    </button>
                                                    <button
                                                      type="button"
                                                      onClick={async () => {
                                                        if (confirm("Delete this image?")) {
                                                          const success = await deleteImageFromUrl(item.evidence_url);
                                                          if (success) {
                                                            const updated = [...form.tmr];
                                                            updated[i].evidence_url = "";
                                                            setForm({ ...form, tmr: updated });
                                                            toast.success("Image deleted");
                                                          }
                                                        }
                                                      }}
                                                      className="p-2.5 bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg hover:bg-red-500 hover:text-white transition-all shadow-sm"
                                                      title="Delete Image"
                                                    >
                                                      <FaTrash size={16} />
                                                    </button>
                                                  </div>
                                                </div>
                                              </div>
                                            )
                                          ) : (
                                            <p className="text-xs opacity-50">Upload disabled in production mock</p>
                                          )}
                                        </div>
                                      </>
                                    )}
                                  </div>
                                )}
                              </Card>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-4 bg-white/5 rounded-xl border border-dashed border-white/20">
                            <p className="text-sm opacity-50 mb-3" style={{ color: activeTheme.popup.textColor }}>No TMR data added yet</p>
                          </div>
                        )}
                        <AddButton onClick={() =>
                          addItem('tmr', { loader_id: "", time_refueling: "", reason: "", evidence_url: "", location: "", location_id: "", location_detail: "", is_slippery: true })
                        } />

                        {/* Pagination for TMR removed - now shared below */}
                      </Section>
                    </motion.div>
                  )}

                  {/* STOCK (Page 6) */}
                  {(viewMode === 'Single' || currentPage === 6) && (
                    <motion.div
                      key={viewMode === 'Paginated' ? "page-6" : "single-stock"}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      layout
                    >
                      <Section title="Stock / Sonding">
                        {form.stock.length > 0 ? (
                          <div className="space-y-4">
                            {form.stock.map((item: any, i: number) => (
                              <Card key={i}>
                                <div className="flex flex-col gap-4">
                                  <div className="flex flex-row items-end gap-2">
                                    <div className="flex-1">
                                      <ThemedAutoSuggest
                                        label="Unit Storage / FT"
                                        value={item.unit_number}
                                        onChange={(val) => {
                                          if (i === 0) return;
                                          const updated = [...form.stock];
                                          updated[i].unit_number = val;
                                          setForm({ ...form, stock: updated });
                                        }}
                                        suggestions={ftList}
                                        placeholder="Search Unit..."
                                        disabled={i === 0}
                                      />
                                    </div>
                                    <div className="pb-4">
                                      <RemoveButton onClick={() => removeItem('stock', i)} />
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 gap-4">
                                    <ThemedLabeledInput
                                      label="Sonding Awal (CM)"
                                      value={item.sonding_awal}
                                      onChange={(e: any) => {
                                        const val = e.target.value.replace(/[^0-9,]/g, '');
                                        const updated = [...form.stock];
                                        updated[i].sonding_awal = val;
                                        setForm({ ...form, stock: updated });
                                      }}
                                      placeholder="0,0"
                                    />
                                    <ThemedLabeledInput
                                      label="Sonding Akhir (CM)"
                                      value={item.sonding_akhir}
                                      onChange={(e: any) => {
                                        const val = e.target.value.replace(/[^0-9,]/g, '');
                                        const updated = [...form.stock];
                                        updated[i].sonding_akhir = val;
                                        setForm({ ...form, stock: updated });
                                      }}
                                      placeholder="0,0"
                                    />
                                  </div>
                                </div>
                              </Card>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-4 bg-white/5 rounded-xl border border-dashed border-white/20">
                            <p className="text-sm opacity-50 mb-3" style={{ color: activeTheme.popup.textColor }}>No stock data added yet</p>
                          </div>
                        )}
                        <AddButton onClick={() =>
                          addItem('stock', { unit_number: "", sonding_awal: "", sonding_akhir: "" })
                        } />

                        {/* Pagination for Stock removed - now shared below */}
                      </Section>
                    </motion.div>
                  )}

                  {/* FUEL READINESS (AKHIR SHIFT) (Page 7) */}
                  {(viewMode === 'Single' || currentPage === 7) && (
                    <motion.div
                      key={viewMode === 'Paginated' ? "page-7" : "single-readiness"}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      layout
                    >
                      <Section title="Fuel Readiness (akhir shift)">
                        {form.readiness.length > 0 ? (
                          <div className="space-y-4">
                            {form.readiness.map((ft: any, i: number) => (
                              <Card key={i}>
                                <div className="flex flex-col gap-3">
                                  <div className="flex flex-row items-end gap-2">
                                    <div className="flex-1">
                                      <ThemedAutoSuggest
                                        label="Unit Number"
                                        value={ft.warehouse_id}
                                        onChange={(val) => {
                                          if (i === 0) return;
                                          const updated = [...form.readiness];
                                          updated[i].warehouse_id = val.toUpperCase();
                                          setForm({ ...form, readiness: updated });
                                        }}
                                        suggestions={ftList}
                                        placeholder="Search FT..."
                                        disabled={i === 0}
                                      />
                                    </div>
                                    <div className="pb-4">
                                      <RemoveButton onClick={() => removeItem('readiness', i)} />
                                    </div>
                                  </div>

                                  <div className="flex gap-2">
                                    <div className="w-1/3">
                                      <select
                                        value={ft.status}
                                        onChange={(e) => {
                                          const updated = [...form.readiness];
                                          updated[i].status = e.target.value;
                                          setForm({ ...form, readiness: updated });
                                        }}
                                        className="w-full bg-white/10 border rounded-lg px-2 py-2 text-xs outline-none focus:border-primary transition-colors cursor-pointer"
                                        style={{
                                          color: activeTheme.popup.textColor,
                                          borderColor: activeTheme.input.borderColor,
                                          borderWidth: activeTheme.input.borderWidth
                                        }}
                                      >
                                        <option value="RFU" className="bg-[#1a1c23]">RFU</option>
                                        <option value="STB" className="bg-[#1a1c23]">Standby</option>
                                        <option value="BD" className="bg-[#1a1c23]">Breakdown</option>
                                        <option value="SVC" className="bg-[#1a1c23]">Service</option>
                                      </select>
                                    </div>
                                    <div className="flex-1">
                                      <input
                                        type="text"
                                        placeholder="Location..."
                                        value={ft.location}
                                        onChange={(e) => {
                                          const updated = [...form.readiness];
                                          updated[i].location = e.target.value.toUpperCase();
                                          setForm({ ...form, readiness: updated });
                                        }}
                                        className="w-full bg-white/10 border rounded-lg px-3 py-2 text-xs outline-none focus:border-primary transition-colors placeholder:opacity-30"
                                        style={{
                                          color: activeTheme.popup.textColor,
                                          borderColor: activeTheme.input.borderColor,
                                          borderWidth: activeTheme.input.borderWidth
                                        }}
                                      />
                                    </div>
                                  </div>

                                  {ft.status === 'BD' && (
                                    <div className="mt-1">
                                      <input
                                        type="text"
                                        placeholder="BD Remark (REQUIRED)..."
                                        value={ft.remark}
                                        onChange={(e) => {
                                          const updated = [...form.readiness];
                                          updated[i].remark = e.target.value.toUpperCase();
                                          setForm({ ...form, readiness: updated });
                                        }}
                                        className="w-full bg-orange-500/10 border rounded-lg px-3 py-2 text-[10px] outline-none border-orange-500/30 focus:border-orange-500 transition-colors placeholder:opacity-40"
                                        style={{ color: activeTheme.popup.textColor }}
                                      />
                                    </div>
                                  )}
                                </div>
                              </Card>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-4 bg-white/5 rounded-xl border border-dashed border-white/20">
                            <p className="text-sm opacity-50 mb-3" style={{ color: activeTheme.popup.textColor }}>No readiness data added yet</p>
                          </div>
                        )}
                        <AddButton onClick={() =>
                          addItem('readiness', { warehouse_id: "", status: "RFU", location: "", remark: "" })
                        } />

                        {/* Pagination for Readiness removed - now shared below */}
                      </Section>
                    </motion.div>
                  )}
                </>
              )}
            </AnimatePresence>

            {/* SHARED MUTATING PAGINATION (Morphs with layout) */}
            {viewMode === 'Paginated' && reportCreated && (
              <motion.div layout>
                <PaginationNav
                  current={currentPage}
                  total={8}
                  onPrev={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                  onNext={() => setCurrentPage(next => Math.min(7, next + 1))}
                />
              </motion.div>
            )}
          </motion.div>

          {
            reportCreated && (
              <button
                onClick={handleSubmit}
                disabled={loading}
                style={{
                  backgroundColor: buttonTheme.color,
                  color: buttonTheme.textColor,
                  borderRadius: buttonTheme.borderRadius,
                  borderWidth: buttonTheme.borderWidth,
                  borderColor: buttonTheme.borderColor,
                  opacity: loading ? 0.6 : 1,
                  cursor: loading ? "not-allowed" : "pointer",
                }}
                className="w-full py-3 font-medium transition-all hover:opacity-90"
              >
                {loading ? "Saving..." : "Submit Report"}
              </button>
            )
          }

          {
            reportCreated && (
              <button
                onClick={() => {
                  if (confirm("Reset semua data angka ke 0? Report ID tetap tersimpan dan bisa dilanjutkan.")) {
                    const ft = ftUnitSearch.toUpperCase();
                    const resetForm = {
                      ...initialState,
                      fuelman_id: form.fuelman_id,
                      operator_id: form.operator_id,
                      ritasi: [{ ft_number: ft, value: '' }],
                      flowmeter: [{ unit_number: ft, fm_awal: '', fm_akhir: '' }],
                      stock: [{ unit_number: ft, sonding_awal: '', sonding_akhir: '' }],
                      readiness: [{ warehouse_id: ft, status: 'RFU', location: '', remark: '' }],
                      transfers: [{ transfer_from: ft, transfer_out: 0, destination: '', synchronized: false }],
                      tmr: [],
                    };
                    setForm(resetForm);
                    if (reportId) {
                      const draft = { form: resetForm, fuelmanSearch, operatorSearch, ftUnitSearch };
                      localStorage.setItem(getDraftKey(reportId), JSON.stringify(draft));
                    }
                    toast.success("Form direset — report ID masih aktif");
                  }
                }}
                style={{
                  backgroundColor: secondaryButtonTheme.color,
                  color: secondaryButtonTheme.textColor,
                  borderRadius: secondaryButtonTheme.borderRadius,
                  borderWidth: secondaryButtonTheme.borderWidth,
                  borderColor: secondaryButtonTheme.borderColor,
                  opacity: secondaryButtonTheme.opacity,
                }}
                className="w-full py-3 font-medium transition-all hover:opacity-90"
              >
                Reset (angka saja)
              </button>
            )
          }

          {
            reportCreated && (
              <button
                onClick={() => {
                  if (confirm("⚠️ DELETE REPORT?\n\nIni akan menghapus draft lokal dan mengulang dari awal (Create Report lagi).\nTidak dapat dikembalikan.")) {
                    if (reportId) localStorage.removeItem(getDraftKey(reportId));
                    setForm(initialState);
                    setFuelmanSearch("");
                    setOperatorSearch("");
                    setFtUnitSearch("");
                    setReportCreated(false);
                    setReportId(null);
                    toast.success("Draft dihapus. Silakan Create Report lagi.");
                  }
                }}
                style={{
                  backgroundColor: 'rgba(239,68,68,0.15)',
                  color: '#f87171',
                  borderRadius: secondaryButtonTheme.borderRadius,
                  borderWidth: '1px',
                  borderColor: 'rgba(239,68,68,0.4)',
                }}
                className="w-full py-3 font-medium transition-all hover:bg-red-500/30"
              >
                🗑 Delete Report
              </button>
            )
          }

          {/* Area Selection Modal */}
          {
            showAreaModal.active && (
              <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <ThemedGlassmorphismPanel className="w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden">
                  <div className="p-4 flex justify-between items-center" style={{ borderBottom: `1px solid ${activeTheme.popup.separatorColor || 'rgba(255,255,255,0.1)'}` }}>
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold" style={{ color: activeTheme.popup.textColor }}>Select Location</h3>
                      <button
                        type="button"
                        onClick={async () => {
                          localStorage.removeItem(CACHE_KEY);
                          await loadSuggestions();
                          toast.success("Suggestions refreshed!");
                        }}
                        className="p-1 px-2 text-xs rounded-md transition-colors flex items-center gap-1"
                        style={{
                          color: activeTheme.popup.textColor,
                          backgroundColor: 'rgba(255, 255, 255, 0.1)'
                        }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Refresh
                      </button>
                    </div>
                    <button
                      onClick={() => setShowAreaModal({ active: false, index: -1 })}
                      className="p-1 hover:bg-white/10 rounded-full transition-colors"
                      style={{ color: activeTheme.popup.textColor }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="overflow-y-auto p-2">
                    <div className="grid grid-cols-1 gap-1">
                      {areaList.map((area, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            const location_id = area.id;
                            setForm((prev: any) => {
                              const updated = [...prev.tmr];
                              updated[showAreaModal.index].location = area.major_area;
                              updated[showAreaModal.index].location_id = location_id;
                              return { ...prev, tmr: updated };
                            });
                            setShowAreaModal({ active: false, index: -1 });
                          }}
                          className="text-left px-4 py-3 rounded-lg transition-colors flex justify-between items-center group hover:bg-white/10"
                          style={{ color: activeTheme.popup.textColor }}
                        >
                          <span className="font-medium group-hover:text-primary transition-colors">{area.major_area}</span>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      ))}
                    </div>
                  </div>
                </ThemedGlassmorphismPanel>
              </div>
            )}
        </div>
      </div>
    </div>
  );
};
