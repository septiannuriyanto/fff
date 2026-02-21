import { useState, useEffect } from 'react';
import PanelContainer from '../../../components/Panels/PanelContainer';
import LabeledInput from '../../../components/LabeledInput';
import SelectGroupOne from '../../../components/Forms/SelectGroup/SelectGroupOne';
import DatePickerOne from '../../../components/Forms/DatePicker/DatePickerOne';
import { ComboBoxItem } from '../../../types/ComboboxItem';
import { getShiftString, getMakassarShiftlyDateObject, convertMakassarDateObject } from '../../../Utils/TimeUtility';
import { supabase } from '../../../db/SupabaseClient';
import Autosuggest from 'react-autosuggest';
import toast, { Toaster } from 'react-hot-toast';
import { formatDateForSupabase, formatDateToYyMmDd } from '../../../Utils/DateUtility';

const FilterChange = () => {
  interface FilterChangeForm {
    tanggal: Date;
    unit_id: string;
    shift: string;
    hm_at_replacement: string;
    qty: string;
    totaliser: string;
    fuelman: string;
    operator: string;
    mechanics: string[];
    activities: string[];
    reservation_no: string;
  }

  const [formData, setFormData] = useState<FilterChangeForm>({
    tanggal: getMakassarShiftlyDateObject(),
    unit_id: '',
    shift: getShiftString(),
    hm_at_replacement: '',
    qty: '',
    totaliser: '',
    fuelman: '',
    operator: '',
    mechanics: [],
    activities: [],
    reservation_no: '',
  });

  const [evidence, setEvidence] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [lastTotaliser, setLastTotaliser] = useState<number | null>(null);
  const [lastHm, setLastHm] = useState<number | null>(null);

  // Manpower Data States
  const [operatorList, setOperatorList] = useState<string[]>([]);
  const [fuelmanList, setFuelmanList] = useState<string[]>([]);
  const [mechanicList, setMechanicList] = useState<string[]>([]);
  const [unitList, setUnitList] = useState<string[]>([]);

  // Suggestion States
  const [opSuggestions, setOpSuggestions] = useState<string[]>([]);
  const [fmSuggestions, setFmSuggestions] = useState<string[]>([]);
  const [mechSuggestions, setMechSuggestions] = useState<string[]>([]);
  const [unitSuggestions, setUnitSuggestions] = useState<string[]>([]);

  // Load shift automatically on mount
  useEffect(() => {
    // Initial data fetch
    fetchInitialData();
  }, []);

  // Fetch historical data when unit_id changes
  useEffect(() => {
    if (formData.unit_id) {
      fetchHistoricalData(formData.unit_id);
    } else {
      setLastTotaliser(null);
      setLastHm(null);
    }
  }, [formData.unit_id]);

  const fetchHistoricalData = async (unitId: string) => {
    const { data, error } = await supabase
      .from('filter_change')
      .select('totaliser_at_replacement, flowmeter, hm_at_replacement')
      .eq('unit_id', unitId)
      .order('replacement_date', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error fetching historical data:', error.message);
      setLastTotaliser(null);
      setLastHm(null);
    } else if (data && data.length > 0) {
      // Fallback to old 'flowmeter' column if the new one is null
      const lastT = data[0].totaliser_at_replacement ?? data[0].flowmeter;
      setLastTotaliser(lastT);
      setLastHm(data[0].hm_at_replacement);
    } else {
      setLastTotaliser(null);
      setLastHm(null);
    }
  };

  const fetchInitialData = async () => {
    // Fetch Manpower
    const { data: manpowerData, error: manpowerError } = await supabase
      .from('manpower')
      .select('nama, position')
      .eq('active', true)
      .order('nama', { ascending: true });

    if (manpowerError) {
      console.error('Error fetching manpower:', manpowerError.message);
    } else if (manpowerData) {
      const operators = manpowerData.filter((m) => m.position === 4).map((m) => m.nama);
      const fuelmen = manpowerData.filter((m) => m.position === 5).map((m) => m.nama);
      const mechanics = manpowerData.filter((m) => m.position === 6).map((m) => m.nama);

      setOperatorList(operators as string[]);
      setFuelmanList(fuelmen as string[]);
      setMechanicList(mechanics as string[]);
    }

    // Fetch Storage Units
    const { data: storageData, error: storageError } = await supabase
      .from('storage')
      .select('unit_id')
      .neq('status', 'OUT')
      .order('unit_id', { ascending: true });

    if (storageError) {
      console.error('Error fetching storage units:', storageError.message);
    } else if (storageData) {
      const units = storageData.map((s) => s.unit_id);
      setUnitList(units.filter(Boolean) as string[]);
    }
  };

  // -- Autosuggest Helpers --
  const getSuggestions = (value: string, list: string[]): string[] => {
    const inputValue = value.trim().toLowerCase();
    const inputLength = inputValue.length;

    return inputLength === 0
      ? []
      : list.filter((item) => item.toLowerCase().includes(inputValue));
  };

  const getSuggestionValue = (suggestion: string) => suggestion;
  const renderSuggestion = (suggestion: string) => (
    <div className="p-2 hover:bg-whiter dark:hover:bg-meta-4 cursor-pointer text-sm">
      {suggestion}
    </div>
  );

  const autosuggestTheme = {
    container: 'relative w-full',
    suggestionsContainerOpen: 'absolute z-50 mt-1 w-full bg-white dark:bg-boxdark border border-stroke dark:border-strokedark rounded shadow-lg max-h-60 overflow-y-auto',
    suggestionsList: 'list-none p-0 m-0',
    suggestion: 'cursor-pointer',
    suggestionHighlighted: 'bg-gray-100 dark:bg-meta-4',
    input: 'w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary',
  };

  const shiftOptions: ComboBoxItem[] = [
    { value: '1', label: 'Shift 1' },
    { value: '2', label: 'Shift 2' },
  ];

  const handleDateChange = (date: Date | null) => {
    if (date) {
      // Ensure date is converted to Makassar timezone
      const makassarDate = convertMakassarDateObject(date);
      setFormData({ ...formData, tanggal: makassarDate });
    }
  };

  // State for temporary inputs and editing
  const [tempMechanic, setTempMechanic] = useState('');
  const [tempActivity, setTempActivity] = useState('');
  const [editIndex, setEditIndex] = useState<{
    field: 'mechanics' | 'activities';
    index: number;
  } | null>(null);

  // -- Dynamic List Handlers --

  const handleAddItem = (field: 'mechanics' | 'activities', value: string) => {
    if (!value.trim()) return;

    if (editIndex && editIndex.field === field) {
      // Handle Save Edit
      const newItems = [...formData[field]];
      newItems[editIndex.index] = value;
      setFormData((prev) => ({ ...prev, [field]: newItems }));
      setEditIndex(null);
    } else {
      // Handle Add New
      setFormData((prev) => ({
        ...prev,
        [field]: [...prev[field], value],
      }));
    }

    // Reset temp inputs
    if (field === 'mechanics') setTempMechanic('');
    if (field === 'activities') setTempActivity('');
  };

  const handleRemoveItem = (
    field: 'mechanics' | 'activities',
    index: number,
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }));
    if (editIndex && editIndex.field === field && editIndex.index === index) {
      setEditIndex(null);
      if (field === 'mechanics') setTempMechanic('');
      if (field === 'activities') setTempActivity('');
    }
  };

  const startEditing = (field: 'mechanics' | 'activities', index: number) => {
    const value = formData[field][index];
    setEditIndex({ field, index });
    if (field === 'mechanics') setTempMechanic(value);
    if (field === 'activities') setTempActivity(value);
  };

  // -- Validation Logic --
  const getValidationErrors = () => {
    const errors: string[] = [];
    if (!formData.tanggal) errors.push('Date');
    if (!formData.shift) errors.push('Shift');
    if (!formData.unit_id) errors.push('Unit ID');
    if (!formData.reservation_no) errors.push('Reservation No');
    if (!formData.hm_at_replacement) errors.push('HM');
    if (!formData.qty) errors.push('Filter Qty');
    if (!formData.totaliser) errors.push('Totaliser');
    if (formData.activities.length === 0) errors.push('At least one Activity');
    if (!formData.fuelman) errors.push('Fuelman');
    if (!formData.operator) errors.push('Operator');
    if (formData.mechanics.length === 0) errors.push('At least one Mechanic');
    if (!evidence) errors.push('Photo Evidence');
    
    // Totaliser/Fuel Pass validation
    const currentTotaliser = parseInt(formData.totaliser);
    if (!isNaN(currentTotaliser) && lastTotaliser !== null && currentTotaliser < lastTotaliser) {
      errors.push('Totaliser cannot be less than Last Totaliser');
    }

    // HM validation
    const currentHm = parseFloat(formData.hm_at_replacement);
    if (!isNaN(currentHm) && lastHm !== null && currentHm < lastHm) {
      errors.push('HM cannot be less than Last HM');
    }
    
    return errors;
  };

  const validationErrors = getValidationErrors();
  const isFormValid = validationErrors.length === 0;

  // Calculations
  const fuelPass = (formData.totaliser && lastTotaliser !== null) 
    ? parseInt(formData.totaliser) - lastTotaliser 
    : 0;

  const deltaHm = (formData.hm_at_replacement && lastHm !== null)
    ? parseFloat(formData.hm_at_replacement) - lastHm
    : 0;

  const resetForm = () => {
    setFormData({
      tanggal: getMakassarShiftlyDateObject(),
      unit_id: '',
      shift: getShiftString(),
      hm_at_replacement: '',
      qty: '',
      totaliser: '',
      fuelman: '',
      operator: '',
      mechanics: [],
      activities: [],
      reservation_no: '',
    });
    setEvidence(null);
    setLastTotaliser(null);
    setLastHm(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || submitting) return;

    setSubmitting(true);
    const loadingToast = toast.loading('Submitting form...');

    try {
      // 1. Get Session for JWT
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error('Authentication failed. Please log in again.');
      }

      // 2. Generate Request ID
      const timestamp = Date.now();
      const requestId = `${formatDateToYyMmDd(new Date())}-${formData.unit_id}-${timestamp}`;

      // 3. Upload Evidence to Worker
      const uploadUrl = `${import.meta.env.VITE_WORKER_URL}/upload/filter-replacement`;
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'X-Unit-Id': formData.unit_id,
          'X-Request-Id': requestId,
        },
        body: evidence,
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        throw new Error(`Upload failed: ${errorText}`);
      }

      const uploadResult = await uploadResponse.json();
      // Use the returned URL, or construct the full serving URL from the key if needed
      const photoUrl = (uploadResult.url && uploadResult.url.startsWith('http'))
        ? uploadResult.url
        : `${import.meta.env.VITE_WORKER_URL}/images/filter-replacement/${uploadResult.key}`;

      // 4. Save to Supabase
        const { error: insertError } = await supabase.from('filter_change').insert({
        id: requestId,
        tanggal: formatDateForSupabase(formData.tanggal),
        request_date: formatDateForSupabase(formData.tanggal),
        unit_id: formData.unit_id,
        shift: parseInt(formData.shift),
        hm_at_replacement: parseFloat(formData.hm_at_replacement),
        delta_hm: deltaHm,
        qty: parseInt(formData.qty),
        totaliser_at_replacement: parseInt(formData.totaliser),
        fuel_pass: fuelPass,
        fuelman: formData.fuelman,
        operator: formData.operator,
        mechanics: formData.mechanics,
        assigned_pic: formData.mechanics[0] || '',
        activities: formData.activities,
        reservation_no: formData.reservation_no,
        photo_evidence_url: photoUrl,
        status: 'COMPLETED',
        replacement_date: new Date().toISOString(),
        estimated_replace_date: new Date().toISOString(),
        estimated_replace_shift: parseInt(formData.shift),
      });

      if (insertError) throw insertError;

      toast.success('Filter Change recorded successfully!', { id: loadingToast });
      resetForm();
    } catch (err: any) {
      console.error('Submission error:', err);
      toast.error(err.message || 'An error occurred during submission', { id: loadingToast });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PanelContainer title="Filter Change Form">
      <Toaster />
      <div className="p-4">
        <form
          action="#"
          onSubmit={handleSubmit}
        >
          {/* Row 1: Date & Shift */}
          <div className="mb-4 flex flex-col gap-4 sm:flex-row">
            <div className="w-full sm:w-1/2">
              <label className="mb-3 block text-black dark:text-white">
                Date
              </label>
              <DatePickerOne
                handleChange={handleDateChange}
                setValue={formData.tanggal.toISOString()}
                enabled={true}
              />
            </div>
            <div className="w-full sm:w-1/2">
              <SelectGroupOne
                caption="Shift"
                placeholder="Select Shift"
                items={shiftOptions}
                onChange={(val) => setFormData({ ...formData, shift: val })}
                className="mb-0"
              />
              {/* Show auto-detected shift hint if current matches */}
              <span className="text-xs text-gray-400 mt-1 block">
                Auto-detected: Shift {getShiftString()}
              </span>
            </div>
          </div>

          {/* Row 2: Unit ID & Reservation */}
          <div className="mb-4 flex flex-col gap-4 sm:flex-row">
            <div className="w-full sm:w-1/2">
              <label className="mb-2.5 block text-sm font-medium text-black dark:text-white">
                Unit ID
              </label>
              <div className="relative">
                <Autosuggest
                  suggestions={unitSuggestions}
                  onSuggestionsFetchRequested={({ value }) =>
                    setUnitSuggestions(getSuggestions(value, unitList))
                  }
                  onSuggestionsClearRequested={() => setUnitSuggestions([])}
                  getSuggestionValue={getSuggestionValue}
                  renderSuggestion={renderSuggestion}
                  inputProps={{
                    placeholder: 'Select Unit ID',
                    value: formData.unit_id,
                    onChange: (_, { newValue }) =>
                      setFormData({ ...formData, unit_id: newValue }),
                    className: autosuggestTheme.input + ' pr-10',
                  }}
                  theme={autosuggestTheme}
                />
                {formData.unit_id && (
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, unit_id: '' })}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-bodydark2 hover:text-primary z-10"
                  >
                    <svg
                      className="fill-current"
                      width="18"
                      height="18"
                      viewBox="0 0 18 18"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M11.2929 9L15.1464 5.14645C15.3417 4.95118 15.3417 4.6346 15.1464 4.43934C14.9512 4.24408 14.6346 4.24408 14.4393 4.43934L10.5858 8.29289L6.73223 4.43934C6.53697 4.24408 6.22039 4.24408 6.02513 4.43934C5.82987 4.6346 5.82987 4.95118 6.02513 5.14645L9.87868 9L6.02513 12.8536C5.82987 13.0488 5.82987 13.3654 6.02513 13.5607C6.22039 13.7559 6.53697 13.7559 6.73223 13.5607L10.5858 9.70711L14.4393 13.5607C14.6346 13.7559 14.9512 13.7559 15.1464 13.5607C15.3417 13.3654 15.3417 13.0488 15.1464 12.8536L11.2929 9Z"
                      />
                    </svg>
                  </button>
                )}
              </div>
            </div>
            <div className="w-full sm:w-1/2">
              <LabeledInput
                label="Reservation No"
                value={formData.reservation_no}
                onChange={(e) =>
                  setFormData({ ...formData, reservation_no: e.target.value })
                }
                onClear={() => setFormData({ ...formData, reservation_no: '' })}
                placeholder="Enter Reservation No"
                className="mb-0"
              />
            </div>
          </div>

          {/* Row 3: HM & Qty */}
          <div className="mb-4 flex flex-col gap-4 sm:flex-row">
            <div className="w-full sm:w-1/2">
              <LabeledInput
                label="HM at Replacement"
                value={formData.hm_at_replacement}
                onChange={(e) =>
                  setFormData({ ...formData, hm_at_replacement: e.target.value })
                }
                onClear={() => setFormData({ ...formData, hm_at_replacement: '' })}
                type="number"
                placeholder="0"
                className="mb-1"
              />
              {/* HM Feedback */}
              <div className="flex flex-col gap-1 ml-1 text-xs">
                {lastHm !== null && (
                  <span className="text-slate-500 font-medium">
                    Last HM: <span className="text-primary">{lastHm.toLocaleString()}</span>
                  </span>
                )}
                {formData.hm_at_replacement && lastHm !== null && (
                  <span className={`font-bold uppercase tracking-tight ${deltaHm < 0 ? 'text-danger' : 'text-success'}`}>
                    Delta HM: {deltaHm.toLocaleString()} {deltaHm < 0 && '(Negative Value)'}
                  </span>
                )}
              </div>
            </div>
            <div className="w-full sm:w-1/2">
              <LabeledInput
                label="Filter Qty"
                value={formData.qty}
                onChange={(e) => setFormData({ ...formData, qty: e.target.value })}
                onClear={() => setFormData({ ...formData, qty: '' })}
                type="number"
                placeholder="0"
                className="mb-0"
              />
            </div>
          </div>

          {/* Row 4: Totaliser */}
          <div className="mb-4 flex flex-col gap-4 sm:flex-row">
            <div className="w-full sm:w-1/2">
              <LabeledInput
                label="Totaliser"
                value={formData.totaliser}
                onChange={(e) =>
                  setFormData({ ...formData, totaliser: e.target.value })
                }
                onClear={() => setFormData({ ...formData, totaliser: '' })}
                type="number"
                placeholder="0"
                className="mb-1"
              />
              {/* Totaliser Feedback */}
              <div className="mt-1 flex flex-col gap-1 ml-1 text-xs">
                {lastTotaliser !== null && (
                  <span className="text-slate-500 font-medium">
                    Last Totaliser: <span className="text-primary">{lastTotaliser.toLocaleString()}</span>
                  </span>
                )}
                {formData.totaliser && lastTotaliser !== null && (
                  <span className={`font-bold uppercase tracking-tight ${fuelPass < 0 ? 'text-danger' : 'text-success'}`}>
                    Fuel Pass: {fuelPass.toLocaleString()} {fuelPass < 0 && '(Negative Value)'}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Activities Section */}
          <div className="mb-6">
            <label className="mb-2.5 block text-sm font-medium text-black dark:text-white">
              Activities
            </label>
            <div className="flex gap-2 mb-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={tempActivity}
                  onChange={(e) => setTempActivity(e.target.value)}
                  placeholder={
                    editIndex?.field === 'activities'
                      ? 'Edit activity...'
                      : 'Add activity...'
                  }
                  className="w-full rounded-lg border border-stroke bg-white py-2 px-4 pr-10 text-black outline-none transition focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddItem('activities', tempActivity);
                    }
                  }}
                />
                {tempActivity && (
                  <button
                    type="button"
                    onClick={() => setTempActivity('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-bodydark2 hover:text-primary"
                  >
                    <svg
                      className="fill-current"
                      width="16"
                      height="16"
                      viewBox="0 0 18 18"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M11.2929 9L15.1464 5.14645C15.3417 4.95118 15.3417 4.6346 15.1464 4.43934C14.9512 4.24408 14.6346 4.24408 14.4393 4.43934L10.5858 8.29289L6.73223 4.43934C6.53697 4.24408 6.22039 4.24408 6.02513 4.43934C5.82987 4.6346 5.82987 4.95118 6.02513 5.14645L9.87868 9L6.02513 12.8536C5.82987 13.0488 5.82987 13.3654 6.02513 13.5607C6.22039 13.7559 6.53697 13.7559 6.73223 13.5607L10.5858 9.70711L14.4393 13.5607C14.6346 13.7559 14.9512 13.7559 15.1464 13.5607C15.3417 13.3654 15.3417 13.0488 15.1464 12.8536L11.2929 9Z"
                      />
                    </svg>
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleAddItem('activities', tempActivity)}
                className={`inline-flex items-center justify-center rounded-lg py-2 px-6 text-center font-medium text-white transition-all duration-200 ${
                  editIndex?.field === 'activities'
                    ? 'bg-success hover:bg-opacity-90'
                    : 'bg-primary hover:bg-opacity-90'
                }`}
              >
                {editIndex?.field === 'activities' ? 'Save' : 'Add'}
              </button>
              {editIndex?.field === 'activities' && (
                <button
                  type="button"
                  onClick={() => {
                    setEditIndex(null);
                    setTempActivity('');
                  }}
                  className="bg-gray-200 text-gray-600 dark:bg-meta-4 dark:text-gray-300 rounded-lg px-4 py-2"
                >
                  Cancel
                </button>
              )}
            </div>
            {/* List Items Display */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {formData.activities.map((item, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-200 ${
                    editIndex?.field === 'activities' && editIndex.index === index
                      ? 'bg-primary/5 border-primary shadow-sm'
                      : 'bg-slate-50 dark:bg-meta-4 border-slate-100 dark:border-strokedark'
                  }`}
                >
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate pr-2">
                    {index + 1}. {item}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => startEditing('activities', index)}
                      className="p-1.5 text-slate-400 hover:text-primary transition-colors"
                      title="Edit"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                        className="w-4 h-4"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125"
                        />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem('activities', index)}
                      className="p-1.5 text-slate-400 hover:text-danger transition-colors"
                      title="Remove"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                        className="w-4 h-4"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="m14.74 9-.34 6m-4.77 0L9.31 9m9.93 0-1.22 10.61A2.25 2.25 0 0 1 15.75 22H8.25a2.25 2.25 0 0 1-2.24-2.11L4.81 9h14.38ZM9.26 9h5.48V7.28c0-.898-.702-1.616-1.586-1.616h-2.316C10.034 5.664 9.332 6.382 9.332 7.28V9Z"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
              {formData.activities.length === 0 && (
                <div className="col-span-full py-4 text-center border border-dashed border-slate-200 dark:border-strokedark rounded-xl text-slate-400 text-sm">
                  No activities added.
                </div>
              )}
            </div>
          </div>

          <div className="mb-4 border-b border-stroke pb-2 dark:border-strokedark">
            <h3 className="font-medium text-black dark:text-white">Personnel</h3>
          </div>

          <div className="mb-4 flex flex-col gap-4 sm:flex-row">
            <div className="w-full sm:w-1/2">
              <label className="mb-2.5 block text-sm font-medium text-black dark:text-white">
                Fuelman
              </label>
              <div className="relative">
                <Autosuggest
                  suggestions={fmSuggestions}
                  onSuggestionsFetchRequested={({ value }) =>
                    setFmSuggestions(getSuggestions(value, fuelmanList))
                  }
                  onSuggestionsClearRequested={() => setFmSuggestions([])}
                  getSuggestionValue={getSuggestionValue}
                  renderSuggestion={renderSuggestion}
                  inputProps={{
                    placeholder: 'Select Fuelman',
                    value: formData.fuelman,
                    onChange: (_, { newValue }) =>
                      setFormData({ ...formData, fuelman: newValue }),
                    className: autosuggestTheme.input + ' pr-10',
                  }}
                  theme={autosuggestTheme}
                />
                {formData.fuelman && (
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, fuelman: '' })}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-bodydark2 hover:text-primary z-10"
                  >
                    <svg
                      className="fill-current"
                      width="18"
                      height="18"
                      viewBox="0 0 18 18"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M11.2929 9L15.1464 5.14645C15.3417 4.95118 15.3417 4.6346 15.1464 4.43934C14.9512 4.24408 14.6346 4.24408 14.4393 4.43934L10.5858 8.29289L6.73223 4.43934C6.53697 4.24408 6.22039 4.24408 6.02513 4.43934C5.82987 4.6346 5.82987 4.95118 6.02513 5.14645L9.87868 9L6.02513 12.8536C5.82987 13.0488 5.82987 13.3654 6.02513 13.5607C6.22039 13.7559 6.53697 13.7559 6.73223 13.5607L10.5858 9.70711L14.4393 13.5607C14.6346 13.7559 14.9512 13.7559 15.1464 13.5607C15.3417 13.3654 15.3417 13.0488 15.1464 12.8536L11.2929 9Z"
                      />
                    </svg>
                  </button>
                )}
              </div>
            </div>
            <div className="w-full sm:w-1/2">
              <label className="mb-2.5 block text-sm font-medium text-black dark:text-white">
                Operator
              </label>
              <div className="relative">
                <Autosuggest
                  suggestions={opSuggestions}
                  onSuggestionsFetchRequested={({ value }) =>
                    setOpSuggestions(getSuggestions(value, operatorList))
                  }
                  onSuggestionsClearRequested={() => setOpSuggestions([])}
                  getSuggestionValue={getSuggestionValue}
                  renderSuggestion={renderSuggestion}
                  inputProps={{
                    placeholder: 'Select Operator',
                    value: formData.operator,
                    onChange: (_, { newValue }) =>
                      setFormData({ ...formData, operator: newValue }),
                    className: autosuggestTheme.input + ' pr-10',
                  }}
                  theme={autosuggestTheme}
                />
                {formData.operator && (
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, operator: '' })}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-bodydark2 hover:text-primary z-10"
                  >
                    <svg
                      className="fill-current"
                      width="18"
                      height="18"
                      viewBox="0 0 18 18"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M11.2929 9L15.1464 5.14645C15.3417 4.95118 15.3417 4.6346 15.1464 4.43934C14.9512 4.24408 14.6346 4.24408 14.4393 4.43934L10.5858 8.29289L6.73223 4.43934C6.53697 4.24408 6.22039 4.24408 6.02513 4.43934C5.82987 4.6346 5.82987 4.95118 6.02513 5.14645L9.87868 9L6.02513 12.8536C5.82987 13.0488 5.82987 13.3654 6.02513 13.5607C6.22039 13.7559 6.53697 13.7559 6.73223 13.5607L10.5858 9.70711L14.4393 13.5607C14.6346 13.7559 14.9512 13.7559 15.1464 13.5607C15.3417 13.3654 15.3417 13.0488 15.1464 12.8536L11.2929 9Z"
                      />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Mechanics Section */}
          <div className="mb-6">
            <label className="mb-2.5 block text-sm font-medium text-black dark:text-white">
              Mechanics
            </label>
            <div className="flex gap-2 mb-3">
              <div className="relative flex-1">
                <Autosuggest
                  suggestions={mechSuggestions}
                  onSuggestionsFetchRequested={({ value }) =>
                    setMechSuggestions(getSuggestions(value, mechanicList))
                  }
                  onSuggestionsClearRequested={() => setMechSuggestions([])}
                  getSuggestionValue={getSuggestionValue}
                  renderSuggestion={renderSuggestion}
                  inputProps={{
                    placeholder:
                      editIndex?.field === 'mechanics'
                        ? 'Edit mechanic name...'
                        : 'Add mechanic name...',
                    value: tempMechanic,
                    onChange: (_, { newValue }) => setTempMechanic(newValue),
                    onKeyDown: (e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddItem('mechanics', tempMechanic);
                      }
                    },
                    className: autosuggestTheme.input + ' pr-10',
                  }}
                  theme={autosuggestTheme}
                />
                {tempMechanic && (
                  <button
                    type="button"
                    onClick={() => setTempMechanic('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-bodydark2 hover:text-primary z-10"
                  >
                    <svg
                      className="fill-current"
                      width="18"
                      height="18"
                      viewBox="0 0 18 18"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M11.2929 9L15.1464 5.14645C15.3417 4.95118 15.3417 4.6346 15.1464 4.43934C14.9512 4.24408 14.6346 4.24408 14.4393 4.43934L10.5858 8.29289L6.73223 4.43934C6.53697 4.24408 6.22039 4.24408 6.02513 4.43934C5.82987 4.6346 5.82987 4.95118 6.02513 5.14645L9.87868 9L6.02513 12.8536C5.82987 13.0488 5.82987 13.3654 6.02513 13.5607C6.22039 13.7559 6.53697 13.7559 6.73223 13.5607L10.5858 9.70711L14.4393 13.5607C14.6346 13.7559 14.9512 13.7559 15.1464 13.5607C15.3417 13.3654 15.3417 13.0488 15.1464 12.8536L11.2929 9Z"
                      />
                    </svg>
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleAddItem('mechanics', tempMechanic)}
                className={`inline-flex items-center justify-center rounded-lg py-2 px-6 text-center font-medium text-white transition-all duration-200 ${
                  editIndex?.field === 'mechanics'
                    ? 'bg-success hover:bg-opacity-90'
                    : 'bg-primary hover:bg-opacity-90'
                }`}
              >
                {editIndex?.field === 'mechanics' ? 'Save' : 'Add'}
              </button>
              {editIndex?.field === 'mechanics' && (
                <button
                  type="button"
                  onClick={() => {
                    setEditIndex(null);
                    setTempMechanic('');
                  }}
                  className="bg-gray-200 text-gray-600 dark:bg-meta-4 dark:text-gray-300 rounded-lg px-4 py-2"
                >
                  Cancel
                </button>
              )}
            </div>
            {/* List Items Display */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {formData.mechanics.map((item, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-200 ${
                    editIndex?.field === 'mechanics' && editIndex.index === index
                      ? 'bg-primary/5 border-primary shadow-sm'
                      : 'bg-slate-50 dark:bg-meta-4 border-slate-100 dark:border-strokedark'
                  }`}
                >
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate pr-2">
                    {index + 1}. {item}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => startEditing('mechanics', index)}
                      className="p-1.5 text-slate-400 hover:text-primary transition-colors"
                      title="Edit"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                        className="w-4 h-4"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125"
                        />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem('mechanics', index)}
                      className="p-1.5 text-slate-400 hover:text-danger transition-colors"
                      title="Remove"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                        className="w-4 h-4"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="m14.74 9-.34 6m-4.77 0L9.31 9m9.93 0-1.22 10.61A2.25 2.25 0 0 1 15.75 22H8.25a2.25 2.25 0 0 1-2.24-2.11L4.81 9h14.38ZM9.26 9h5.48V7.28c0-.898-.702-1.616-1.586-1.616h-2.316C10.034 5.664 9.332 6.382 9.332 7.28V9Z"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
              {formData.mechanics.length === 0 && (
                <div className="col-span-full py-4 text-center border border-dashed border-slate-200 dark:border-strokedark rounded-xl text-slate-400 text-sm">
                  No mechanics added.
                </div>
              )}
            </div>
          </div>

          <div className="mb-4 border-b border-stroke pb-2 dark:border-strokedark">
            <h3 className="font-medium text-black dark:text-white">Evidence</h3>
          </div>

          <div className="mb-4">
            <label className="mb-3 block text-black dark:text-white">
              Photo Evidence
            </label>
            <div className="relative rounded-md border border-dashed border-primary bg-gray p-4 text-center dark:bg-meta-4 sm:p-10">
              <div className="flex flex-col items-center justify-center">
                {evidence ? (
                  <div className="flex flex-col items-center">
                    <div 
                      className="relative group cursor-zoom-in z-10"
                      onClick={() => setZoomImage(URL.createObjectURL(evidence))}
                    >
                      <img 
                        src={URL.createObjectURL(evidence)} 
                        alt="Preview" 
                        className="mb-2 max-h-48 rounded-lg shadow-md transition-transform group-hover:scale-[1.02]"
                        onLoad={() => {
                          // Image loaded
                        }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 rounded-lg">
                        <span className="text-white text-sm font-medium bg-black/50 px-3 py-1 rounded-full">Click to Zoom</span>
                      </div>
                    </div>
                    <span className="font-medium text-black dark:text-white text-sm">
                      {evidence.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => setEvidence(null)}
                      className="mt-3 text-sm text-danger hover:underline relative z-10"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="mb-2 block text-xl transform hover:scale-110 transition-transform duration-200">
                      📷
                    </span>
                    <span className="font-medium">Drop files to Attach, or</span>
                    <span className="text-primary underline cursor-pointer hover:text-opacity-90">
                      browse
                    </span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setEvidence(e.target.files[0]);
                    }
                  }}
                  className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Validation Feedback */}
          {!isFormValid && (
            <div className="mb-6 rounded-lg bg-orange-50 dark:bg-orange-900/20 p-4 border border-orange-200 dark:border-orange-800">
              <div className="flex items-center gap-2 text-orange-700 dark:text-orange-400 mb-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-5 h-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
                  />
                </svg>
                <span className="font-bold text-sm uppercase tracking-wider">
                  Incomplete Form
                </span>
              </div>
              <p className="text-sm text-orange-600 dark:text-orange-300">
                Please provide: <span className="font-medium">{validationErrors.join(', ')}</span>
              </p>
            </div>
          )}

          <div className="flex justify-end gap-4.5">
            <button
              className="flex justify-center rounded border border-stroke py-2 px-6 font-medium text-black hover:shadow-1 dark:border-strokedark dark:text-white"
              type="button"
              onClick={() => {}}
            >
              Cancel
            </button>
            <button
              className={`flex justify-center rounded py-2 px-6 font-medium text-white transition-all duration-200 ${
                isFormValid && !submitting
                  ? 'bg-primary hover:bg-opacity-90'
                  : 'bg-primary bg-opacity-40 cursor-not-allowed'
              }`}
              type="submit"
              disabled={!isFormValid || submitting}
            >
              {submitting ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  <span>Saving...</span>
                </div>
              ) : (
                'Save'
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Image Zoom Modal */}
      {zoomImage && (
        <ImageZoomModal 
          imageUrl={zoomImage} 
          onClose={() => {
            URL.revokeObjectURL(zoomImage);
            setZoomImage(null);
          }} 
        />
      )}
    </PanelContainer>
  );
};

// -- Zoom Modal Component --
const ImageZoomModal = ({ imageUrl, onClose }: { imageUrl: string; onClose: () => void }) => {
  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 p-4 transition-all animate-fadeIn"
      onClick={onClose}
    >
      <button 
        className="absolute top-6 right-6 text-white text-4xl hover:text-slate-300 transition-colors"
        onClick={onClose}
      >
        &times;
      </button>
      <img 
        src={imageUrl} 
        alt="Zoomed" 
        className="max-w-full max-h-full rounded shadow-2xl animate-zoomIn cursor-zoom-out"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
};

export default FilterChange;