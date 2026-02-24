import { useState, useEffect } from "react";
import { supabase } from "../../../db/SupabaseClient";
import { useTheme } from "../../../contexts/ThemeContext";
import ThemedGlassmorphismPanel from "../../../common/ThemedComponents/ThemedGlassmorphismPanel";
import DatePickerOne from "../../../components/Forms/DatePicker/DatePickerOne";
import {
  formatDateForSupabase,
  formatDateToString
} from "../../../Utils/DateUtility";
import { getShift } from "../../../Utils/TimeUtility";
import ShiftDropdown from "../../../components/Forms/SelectGroup/ShiftDropdown";
import ThemedLabeledInput from "../../../common/ThemedComponents/ThemedLabeledInput";
import { FaTrash, FaEdit } from "react-icons/fa";
import ThemedAutoSuggest from "../../../common/ThemedComponents/ThemedAutoSuggest";
import toast, { Toaster } from "react-hot-toast";
import DropZone from "../../../components/DropZones/DropZone";
import { uploadImageGeneralGetUrl, deleteImageFromUrl } from "../../../services/ImageUploader";
import ThemedNumericInput from "../../../common/ThemedComponents/ThemedNumericInput";
import ThemedCard from "../../../common/ThemedComponents/ThemedCard";

const CACHE_KEY = 'fuelman_report_suggestions_v4';
const CACHE_EXPIRY = 3 * 24 * 60 * 60 * 1000; // 3 days
const DRAFT_CACHE_KEY = 'fuelman_report_draft_v2';
const BUILD_NUMBER_KEY = 'fff_app_build_number';

const CLEANUP_AFTER_SUBMIT = true; // Switch for post-submit cleanup
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
  organization_id: "",
  report_date: "",
  shift: 1,
  fuelman_id: "",
  operator_id: "",
  ritasi: [],
  transfers: [],
  flowmeter: [],
  tmr: [],
};

export default function FuelmanReport() {
  const { activeTheme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<any>(initialState);
  const [date, setDate] = useState<Date | null>(new Date());
  const [shift, setShift] = useState(getShift() === 1);

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
    loadSuggestions();
    loadDraft();
  }, []);

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

  // Save draft whenever important state changes
  useEffect(() => {
    const draft = {
      form,
      fuelmanSearch,
      operatorSearch,
      date,
      shift
    };
    localStorage.setItem(DRAFT_CACHE_KEY, JSON.stringify(draft));
  }, [form, fuelmanSearch, operatorSearch, date, shift]);

  const loadDraft = () => {
    const savedDraft = localStorage.getItem(DRAFT_CACHE_KEY);
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft);
        const mergedForm = { ...initialState, ...(parsed.form || {}) };
        setForm(mergedForm);
        setFuelmanSearch(parsed.fuelmanSearch || "");
        setOperatorSearch(parsed.operatorSearch || "");
        if (parsed.date) setDate(new Date(parsed.date));
        if (parsed.shift !== undefined) setShift(parsed.shift);
      } catch (e) {
        console.error("Failed to parse draft:", e);
      }
    }
  };

  const loadSuggestions = async () => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data, lastUpdate } = JSON.parse(cached);
        if (Date.now() - lastUpdate < CACHE_EXPIRY) {
          setFuelmanList(data.fuelman);
          setOperatorList(data.operator);
          setFtList(data.ft);
          setAreaList(data.area || []);
          return;
        }
      }

      // Fetch fresh data
      const [manpowerRes, storageRes, areaRes] = await Promise.all([
        supabase.from('manpower').select('user_id, nama, position').eq('active', true).eq('registered', true),
        supabase.from('storage').select('unit_id').neq('status', 'OUT').order('warehouse_id'),
        supabase.from('area').select('id, major_area').order('major_area', { ascending: true })
      ]);

      if (manpowerRes.error) throw manpowerRes.error;
      if (storageRes.error) throw storageRes.error;
      if (areaRes.error) throw areaRes.error;

      const fuelmen = manpowerRes.data
        .filter((m: any) => m.position === 5)
        .map((m: any) => ({ user_id: m.user_id, nama: m.nama }));

      const operators = manpowerRes.data
        .filter((m: any) => m.position === 4)
        .map((m: any) => ({ user_id: m.user_id, nama: m.nama }));

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

  const buttonTheme = activeTheme.button.primary;
  const secondaryButtonTheme = activeTheme.button.secondary;

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

      // --- VALIDATION ---
      const errors: string[] = [];
      if (!form.fuelman_id) errors.push("Fuelman belum dipilih");
      if (!form.operator_id) errors.push("Operator belum dipilih");

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

      form.flowmeter.forEach((f: any, idx: number) => {
        if (!f.unit_number) errors.push(`Flowmeter #${idx + 1}: Unit Number belum diisi`);
        if (f.fm_awal === "" || Number(f.fm_awal) < 0) errors.push(`Flowmeter #${idx + 1}: Flowmeter awal harus >= 0`);
        if (f.fm_akhir === "" || Number(f.fm_akhir) < 0) errors.push(`Flowmeter #${idx + 1}: Flowmeter akhir harus >= 0`);

        const usage = Number(f.fm_akhir || 0) - Number(f.fm_awal || 0);
        if (usage < 0) errors.push(`Flowmeter #${idx + 1}: Usage tidak boleh minus. Cek kembali angka awal/akhir.`);
        if (usage > 100000) errors.push(`Flowmeter #${idx + 1}: Usage melebihi 100.000 liter. Cek kembali angka awal/akhir.`);
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

      if (errors.length > 0) {
        setLoading(false);
        errors.forEach(err => toast.error(err));
        return;
      }
      // ------------------

      const payload = {
        p_report_date: formatDateForSupabase(new Date(date || new Date())),
        p_report_shift: shift ? 1 : 2,
        p_fuelman_id: form.fuelman_id,
        p_operator_id: form.operator_id,
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
        localStorage.removeItem(DRAFT_CACHE_KEY);
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
    <div className="min-h-screen flex justify-center p-4">
      <Toaster />
      <div className="w-full max-w-md space-y-6">

        {/* HEADER */}
        <ThemedGlassmorphismPanel className="p-4 space-y-4">
          <h1 className="text-lg font-semibold" style={{ color: activeTheme.popup.textColor }}>
            Fuelman Report
          </h1>

          <div className="flex flex-row gap-2 w-full sm:w-auto">
            <div className="flex-1 sm:w-auto">
              <DatePickerOne
                enabled={true}
                handleChange={handleDateChange}
                setValue={date ? formatDateToString(new Date(date)) : ''}
              />
            </div>
            <div className="flex-1 sm:w-auto">
              <ShiftDropdown
                value={shift}
                onChange={setShift}
              />
            </div>
          </div>
          <ThemedAutoSuggest
            label="Fuelman"
            value={fuelmanSearch}
            onChange={(val) => {
              setFuelmanSearch(val);
              const found = (fuelmanList || []).find(f => f.nama === val.trim());
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
              const found = (operatorList || []).find((o: any) => (typeof o === 'string' ? o : o.nama) === val.trim());
              const operator_id = (found && typeof found !== 'string') ? found.user_id : "";
              setForm((prev: any) => ({ ...prev, operator_id }));
            }}
            suggestions={(operatorList || []).map((o: any) => typeof o === 'string' ? o : o.nama)}
            placeholder="Search Operator..."
          />
        </ThemedGlassmorphismPanel>

        {/* RITASI */}
        <Section title="Ritasi">
          {form.ritasi.length > 0 ? (
            <div className="space-y-4">
              {form.ritasi.map((item: any, i: number) => (
                <Card key={i}>
                  <div className="flex flex-row justify-between align-baseline gap-4">
                    <div className="w-2/3">
                      <ThemedAutoSuggest
                        label="FT Number"
                        autoFocus={i === form.ritasi.length - 1 && item.ft_number === ""}
                        value={item.ft_number}
                        onChange={(val) => {
                          const updated = [...form.ritasi];
                          updated[i].ft_number = val;
                          setForm({ ...form, ritasi: updated });
                        }}
                        suggestions={ftList}
                        placeholder="Search FT..."
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
                      <RemoveButton onClick={() =>
                        setForm({ ...form, ritasi: form.ritasi.filter((_: any, idx: number) => idx !== i) })
                      } />
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
            setForm({ ...form, ritasi: [...form.ritasi, { ft_number: "", value: 0 }] })
          } />
        </Section>

        {/* TRANSFER */}
        <Section title="Transfers">
          {form.transfers.length > 0 ? (
            <div className="space-y-4">
              {form.transfers.map((item: any, i: number) => (
                <Card key={i}>
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-row gap-4 items-end">
                      <div className="flex-1">
                        <ThemedAutoSuggest
                          label="Dari"
                          autoFocus={i === form.transfers.length - 1 && item.transfer_from === ""}
                          value={item.transfer_from}
                          onChange={(val) => {
                            const updated = [...form.transfers];
                            updated[i].transfer_from = val;
                            setForm({ ...form, transfers: updated });
                          }}
                          suggestions={ftList}
                          placeholder="Search Unit..."
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
                      <RemoveButton onClick={() =>
                        setForm({ ...form, transfers: form.transfers.filter((_: any, idx: number) => idx !== i) })
                      } />
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
            setForm({ ...form, transfers: [...form.transfers, { transfer_from: "", transfer_out: 0, destination: "", synchronized: false }] })
          } />
        </Section>

        {/* FLOWMETER SECTION */}
        <Section title="Flowmeter (tanpa angka belakang koma)">
          {form.flowmeter.length > 0 ? (
            <div className="space-y-4">
              {form.flowmeter.map((f: any, i: number) => (
                <ThemedCard key={i} className="p-4 flex flex-col gap-4 relative group">
                  <div className="flex flex-col gap-4 items-end">
                    <div className="w-full">
                      <ThemedAutoSuggest
                        label="Unit Number"
                        autoFocus={i === form.flowmeter.length - 1 && f.unit_number === ""}
                        value={f.unit_number}
                        onChange={(val) => {
                          const updated = [...form.flowmeter];
                          updated[i].unit_number = val;
                          setForm({ ...form, flowmeter: updated });
                        }}
                        suggestions={ftList}
                        placeholder="Search Unit..."
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
                      <RemoveButton onClick={() =>
                        setForm({ ...form, flowmeter: form.flowmeter.filter((_: any, idx: number) => idx !== i) })
                      } />
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
            setForm({ ...form, flowmeter: [...form.flowmeter, { unit_number: "", fm_awal: 0, fm_akhir: 0 }] })
          } />
        </Section>

        {/* TMR */}
        <Section title="TMR Reporting">
          {form.tmr.length > 0 ? (
            <div className="space-y-4">
              {form.tmr.map((item: any, i: number) => {
                const insideRest = isInsideRestTime(item.time_refueling);
                return (
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
                        <RemoveButton onClick={() =>
                          setForm({ ...form, tmr: form.tmr.filter((_: any, idx: number) => idx !== i) })
                        } />
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

                    {!insideRest && (
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
                                            const confirmEdit = window.confirm("Replace this image?");
                                            if (confirmEdit) {
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
                                            const confirmDelete = window.confirm("Delete this image?");
                                            if (confirmDelete) {
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
                                    <p className="text-[10px] opacity-40 text-center mt-1" style={{ color: activeTheme.popup.textColor }}>
                                      Uploaded: {item.evidence_url.split('/').pop()?.split('_').pop()?.split('?')[0]}
                                    </p>
                                  </div>
                                )
                              ) : (
                                <ThemedLabeledInput
                                  label=""
                                  value={item.evidence_url}
                                  onChange={(e: any) => {
                                    const updated = [...form.tmr];
                                    updated[i].evidence_url = e.target.value;
                                    setForm({ ...form, tmr: updated });
                                  }}
                                />
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-4 bg-white/5 rounded-xl border border-dashed border-white/20">
              <p className="text-sm opacity-50 mb-3" style={{ color: activeTheme.popup.textColor }}>No TMR data added yet</p>
            </div>
          )}
          <AddButton onClick={() =>
            setForm({ ...form, tmr: [...form.tmr, { loader_name: "", loader_id: "", time_refueling: "", reason: "", evidence_url: "", is_slippery: true, location: "", location_id: "", location_detail: "" }] })
          } />
        </Section>

        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            backgroundColor: buttonTheme.color,
            color: buttonTheme.textColor,
            borderRadius: buttonTheme.borderRadius,
            borderWidth: buttonTheme.borderWidth,
            borderColor: buttonTheme.borderColor,
            boxShadow: buttonTheme.shadow,
            opacity: buttonTheme.opacity,
          }}
          className="w-full py-3 font-medium transition-all hover:opacity-90"
        >
          {loading ? "Saving..." : "Submit Report"}
        </button>

        <button
          onClick={() => {
            if (confirm("Clear all data and reset form?")) {
              setForm(initialState);
              setFuelmanSearch("");
              setOperatorSearch("");
              setDate(new Date());
              setShift(getShift() === 1);
              localStorage.removeItem(DRAFT_CACHE_KEY);
              toast.success("Form reset successfully");
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
          Reset
        </button>

      </div>

      {/* Area Selection Modal */}
      {showAreaModal.active && (
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
  );
}

/* COMPONENTS */

function Section({ title, children }: any) {
  const { activeTheme } = useTheme();

  return (
    <ThemedGlassmorphismPanel className="p-4 space-y-4">
      <h2 className="font-semibold text-sm" style={{ color: activeTheme.popup.textColor }}>{title}</h2>
      {children}
    </ThemedGlassmorphismPanel>
  );
}

function Card({ children }: any) {
  return (
    <ThemedCard className="p-3 space-y-3">
      {children}
    </ThemedCard>
  );
}

function AddButton({ onClick }: any) {
  const { activeTheme } = useTheme();

  return (
    <button
      onClick={onClick}
      className="text-sm font-medium hover:underline"
      style={{ color: activeTheme.ui.primaryColor }}
    >
      + Add
    </button>
  );
}

function RemoveButton({ onClick }: any) {
  return (
    <button
      onClick={onClick}
      className="text-xs hover:underline px-2 py-0 flex align-middle center items-center"
      style={{ color: '#ef4444' }}
    >
      <FaTrash size={16} />
    </button>
  );
}

function CheckBox({ label, checked, onChange }: any) {
  const { activeTheme } = useTheme();

  return (
    <label className="flex items-center gap-3 text-base font-semibold cursor-pointer py-2" style={{ color: activeTheme.popup.textColor }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e: any) => onChange(e.target.checked)}
        className="cursor-pointer shadow-sm"
        style={{
          accentColor: activeTheme.ui.primaryColor,
          width: '20px',
          height: '20px'
        }}
      />
      {label}
    </label>
  );
}
