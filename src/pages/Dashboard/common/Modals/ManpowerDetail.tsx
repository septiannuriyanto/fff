import { useEffect, useState, useRef } from 'react';
import { supabase } from '../../../../db/SupabaseClient';
import Autosuggest from 'react-autosuggest';
import { AgGridReact } from 'ag-grid-react';
import { ColDef } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css'; // Revert to standard Alpine
import { FaPlus, FaTimes, FaCheck, FaInfoCircle, FaCalendarAlt, FaClock } from 'react-icons/fa';
import Swal from 'sweetalert2';
import { formatDateToISO } from '../../../../Utils/DateUtility';
import { getMakassarShiftlyDateObject, getShift } from '../../../../Utils/TimeUtility';
import Loader from '../../../../common/Loader/Loader';

interface ManpowerDetailProps {
  date: Date | null;
  shift: boolean;
  initialPrefill?: { manpower: any; date: Date } | null;
  onClearPrefill?: () => void;
}

interface Manpower {
  nrp: string;
  nama: string;
  position: number;
  incumbent?: {
    incumbent: string;
  };
}

interface AttendanceRecord {
  id: string;
  nrp: string;
  nama?: string; // from join
  status: string; // derived
  time?: string; // derived
  date: string; // work_date
  shift: string; // shift string
  note: string;
  created_at: string;
}

const ManpowerDetail = ({ date, shift, initialPrefill, onClearPrefill }: ManpowerDetailProps) => {
  const [showInput, setShowInput] = useState(!!initialPrefill);
  const [manpowerList, setManpowerList] = useState<Manpower[]>([]);
  const [suggestions, setSuggestions] = useState<Manpower[]>([]);
  const [searchValue, setSearchValue] = useState(initialPrefill?.manpower?.nama || '');
  const [selectedManpower, setSelectedManpower] = useState<Manpower | null>(initialPrefill?.manpower || null);
  
  // Form State
  const [formDate, setFormDate] = useState<Date>(initialPrefill?.date || new Date());
  const [formShift, setFormShift] = useState<number>(1);
  const [status, setStatus] = useState<'S' | 'I' | 'A' | 'T' | 'P' | ''>('');
  const [note, setNote] = useState('');
  const [timeValue, setTimeValue] = useState(''); // HH:mm
  
  // Grid State
  const [rowData, setRowData] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const searchRef = useRef<any>(null);
 
  // Autofocus search field when form opens
  useEffect(() => {
    if (showInput) {
      setTimeout(() => {
        searchRef.current?.input?.focus();
      }, 100);
    }
  }, [showInput]);

  // 1. Handle Initial Prefill (Prop based - handle updates if already mounted)
  useEffect(() => {
    if (initialPrefill) {
      setShowInput(true);
      setSelectedManpower(initialPrefill.manpower);
      setSearchValue(initialPrefill.manpower.nama);
      setFormDate(initialPrefill.date);
      // Clear parent state with a tiny delay to ensure child state has stabilized
      setTimeout(() => onClearPrefill?.(), 50);
    }
  }, [initialPrefill]);

  // 2. Handle Reset on Close
  useEffect(() => {
    if (!showInput) {
      setSelectedManpower(null);
      setSearchValue('');
      setStatus('');
      setNote('');
      setTimeValue('');
    }
  }, [showInput]);

  // Fetch Manpower (Position 2,3,4,5)
  useEffect(() => {
    const fetchManpower = async () => {
      const { data, error } = await supabase
        .from('manpower')
        .select('nrp, nama, position, incumbent!manpower_position_fkey ( incumbent )')
        .in('position', [2, 3, 4, 5]);

      if (error) {
        console.error('Error fetching manpower:', error);
      } else {
        const mappedData = (data || []).map((item: any) => ({
          ...item,
          incumbent: Array.isArray(item.incumbent) ? item.incumbent[0] : item.incumbent
        }));
        setManpowerList(mappedData);
      }
    };
    fetchManpower();
  }, []);

  // Fetch Attendance Data (Based on Dashboard Props)
  const fetchAttendance = async () => {
    if (!date) return;
    
    setIsLoading(true);

    try {
        const formattedDate = formatDateToISO(date); // YYYY-MM-DD

        const { data, error } = await supabase
          .from('attendance')
          .select(`
            *,
            manpower (
              nama
            )
          `)
          .eq('work_date', formattedDate)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching attendance:', error);
        } else {
          const mapped = data.map((item: any) => {
            let status = 'Present';
            let time = '-';
            
            if (item.is_sick) status = 'Sakit';
            else if (item.is_leave) status = 'Izin';
            else if (item.is_alpha) status = 'Alpa';
            else if (item.is_late) {
              status = 'Terlambat';
              time = item.check_in ? new Date(item.check_in).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-';
            } else if (item.is_early_leave) {
              status = 'Pulang Cepat';
              time = item.check_out ? new Date(item.check_out).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-';
            }

            return {
               id: item.id,
               nrp: item.nrp,
               nama: item.manpower?.nama,
               status,
               time,
               date: item.work_date,
               shift: `Shift ${item.shift}`,
               note: item.note,
               created_at: item.created_at
            };
          });
          setRowData(mapped);
        }
    } catch (err) {
        console.error("Unexpected error fetching data:", err);
    } finally {
        setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [date, shift]);

  // Autosuggest Logic
  const getSuggestions = (value: string) => {
    const inputValue = value.trim().toLowerCase();
    const inputLength = inputValue.length;
    return inputLength === 0 ? [] : manpowerList.filter(mp =>
      mp.nama.toLowerCase().includes(inputValue) || mp.nrp.toLowerCase().includes(inputValue)
    );
  };

  const onSuggestionsFetchRequested = ({ value }: any) => {
    setSuggestions(getSuggestions(value));
  };

  const onSuggestionsClearRequested = () => {
    setSuggestions([]);
  };

  const getSuggestionValue = (suggestion: Manpower) => suggestion.nama;

  const renderSuggestion = (suggestion: Manpower) => (
    <div className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-0">
      <div className="font-semibold text-black dark:text-white">{suggestion.nama}</div>
      <div className="text-xs text-gray-500">
        {suggestion.nrp} - {suggestion.incumbent?.incumbent || (suggestion.position ? `Pos: ${suggestion.position}` : '-')}
      </div>
    </div>
  );

  const onSuggestionSelected = (_event: any, { suggestion }: any) => {
    setSelectedManpower(suggestion);
    setSearchValue(suggestion.nama);
  };

  // Submit Logic
  const handleSubmit = async () => {
    if (!selectedManpower || !formDate || !status) {
      Swal.fire({
        title: 'Error',
        text: 'Please fill all required fields',
        icon: 'error',
        confirmButtonColor: '#3085d6',
      });
      return;
    }

    if ((status === 'T' || status === 'P') && !timeValue) {
       Swal.fire({
         title: 'Error',
         text: 'Time is required for Late/Early Leave',
         icon: 'error',
         confirmButtonColor: '#3085d6',
       });
       return;
    }

    const confirm = await Swal.fire({
      title: 'Confirm Submission',
      text: `Add attendance for ${selectedManpower.nama}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, Submit',
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
    });

    if (!confirm.isConfirmed) return;

    const formattedDate = formatDateToISO(formDate); // Use ISO format for DB
    
    // Construct Timestamps
    let checkIn = null;
    let checkOut = null;
    
    if (timeValue) {
        const dateTimeStr = `${formattedDate}T${timeValue}:00`;
        // Assuming input is essentially local time or roughly correct for the record
        checkIn = status === 'T' ? new Date(dateTimeStr).toISOString() : null;
        checkOut = status === 'P' ? new Date(dateTimeStr).toISOString() : null;
    }

    const payload: any = {
      nrp: selectedManpower.nrp,
      work_date: formattedDate,
      shift: formShift, // Use form detected shift
      note: note,
      is_present: (status === 'T' || status === 'P'), 
      is_sick: status === 'S',
      is_leave: status === 'I',
      is_alpha: status === 'A',
      is_late: status === 'T',
      is_early_leave: status === 'P',
      check_in: checkIn,
      check_out: checkOut
    };

    const { error } = await supabase.from('attendance').insert(payload);

    if (error) {
      console.error(error);
      Swal.fire({
        title: 'Error',
        text: error.message,
        icon: 'error',
        confirmButtonColor: '#3085d6',
      });
    } else {
      Swal.fire({
        title: 'Success',
        text: 'Record added successfully',
        icon: 'success',
        confirmButtonColor: '#3085d6',
      });
      resetForm();
      fetchAttendance(); // Refresh grid (might not show new record if date diff, but standard behavior)
    }
  };

  const resetForm = () => {
    setSelectedManpower(null);
    setSearchValue('');
    setStatus('');
    setNote('');
    setTimeValue('');
    setShowInput(false);
  };

  // Grid Config
  const columnDefs: ColDef[] = [
    { field: 'date', headerName: 'Date', minWidth: 100, width: 120, sort: 'desc' },
    { field: 'shift', headerName: 'Shift', minWidth: 80, width: 100 },
    { field: 'nrp', headerName: 'NRP', minWidth: 100, width: 120 },
    { field: 'nama', headerName: 'Name', flex: 1, minWidth: 150 },
    { 
      field: 'status', 
      headerName: 'Status', 
      minWidth: 130,
      width: 150,
      cellRenderer: (params: any) => {
         let colorClass = 'bg-gray-100 text-gray-800';
         if (params.value === 'Sakit') colorClass = 'bg-yellow-100 text-yellow-800';
         if (params.value === 'Izin') colorClass = 'bg-blue-100 text-blue-800';
         if (params.value === 'Alpa') colorClass = 'bg-red-100 text-red-800';
         if (params.value === 'Terlambat') colorClass = 'bg-orange-100 text-orange-800';
         if (params.value === 'Pulang Cepat') colorClass = 'bg-teal-100 text-teal-800';
         
         return (
            <span className={`px-2 py-1 rounded-full text-xs font-bold ${colorClass}`}>
               {params.value}
            </span>
         );
      }
    },
    { field: 'time', headerName: 'Time', minWidth: 80, width: 100 },
    { field: 'note', headerName: 'Note', flex: 2, minWidth: 200 },
  ];

  return (
    <div className="flex flex-col h-full bg-white/60 dark:bg-boxdark/60 backdrop-blur-2xl rounded-2xl border border-white/50 dark:border-white/10 shadow-xl overflow-hidden relative">
      {/* Header */}
      <div className="flex justify-between items-center py-4 px-6 border-b border-white/50 dark:border-white/10">
        <h2 className="text-xl font-bold text-black dark:text-white flex items-center gap-3">
           <div className="p-2 bg-blue-600 rounded-lg text-white shadow-lg shadow-blue-300 dark:shadow-none">
             <FaCheck size={16} />
           </div>
           Attendance Record
        </h2>
        <button
          onClick={() => {
            const nextShow = !showInput;
            setShowInput(nextShow);
            // If manually opening (not via prefill effect), auto-detect current time
            if (nextShow) {
              setFormDate(getMakassarShiftlyDateObject());
              setFormShift(getShift());
            }
          }}
          className={`px-4 py-2 rounded-xl text-white text-sm font-bold transition-all shadow-lg flex items-center gap-2 ${
             showInput 
              ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20' 
              : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/30'
          }`}
        >
          {showInput ? <><FaTimes /> Close</> : <><FaPlus /> Add Record</>}
        </button>
      </div>

      {/* Input Panel */}
      <div className={`transition-all duration-500 ease-in-out bg-white/40 dark:bg-black/20 border-b border-white/50 dark:border-white/10 overflow-y-auto ${
          showInput ? 'max-h-[600px] opacity-100 p-6' : 'max-h-0 opacity-0 p-0'
      }`}>
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column: Manpower & Note */}
            <div className="space-y-4">
               {/* Auto-detected Date & Shift */}
               <div className="flex flex-col sm:flex-row gap-4">
                  <div className="w-full sm:w-1/2">
                    <label className="block text-sm font-bold text-black dark:text-white mb-2">Date</label>
                    <div className="relative">
                       <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500 z-10">
                          <FaCalendarAlt />
                       </div>
                       <input
                          type="date"
                          value={formatDateToISO(formDate)}
                          onChange={(e) => setFormDate(new Date(e.target.value))}
                          onClick={(e) => (e.currentTarget as HTMLInputElement).showPicker()}
                          className="w-full rounded-xl border border-slate-200 bg-white/50 py-3 pl-10 pr-4 text-black shadow-sm outline-none transition focus:border-blue-500 focus:bg-white focus:shadow-md dark:border-slate-700 dark:bg-black/20 dark:text-white dark:focus:border-blue-500 relative z-0 cursor-pointer"
                          style={{ colorScheme: document.body.classList.contains('dark') ? 'dark' : 'light' }}
                       />
                    </div>
                  </div>
                  <div className="w-full sm:w-1/2">
                    <label className="block text-sm font-bold text-black dark:text-white mb-2">Shift</label>
                    <div className="relative">
                       <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                          <FaClock />
                       </div>
                       <select
                          value={formShift}
                          onChange={(e) => setFormShift(Number(e.target.value))}
                          className="w-full rounded-xl border border-slate-200 bg-white/50 py-3 pl-10 pr-4 text-black shadow-sm outline-none transition focus:border-blue-500 focus:bg-white focus:shadow-md dark:border-slate-700 dark:bg-black/20 dark:text-white dark:focus:border-blue-500 appearance-none cursor-pointer"
                       >
                          <option value={1}>Shift 1</option>
                          <option value={2}>Shift 2</option>
                       </select>
                    </div>
                  </div>
               </div>

               <div>
                  <label className="block text-sm font-bold text-black dark:text-white mb-2">Manpower</label>
                  <div className="relative z-20">
                    <Autosuggest
                      ref={searchRef}
                      suggestions={suggestions}
                      onSuggestionsFetchRequested={onSuggestionsFetchRequested}
                      onSuggestionsClearRequested={onSuggestionsClearRequested}
                      getSuggestionValue={getSuggestionValue}
                      renderSuggestion={renderSuggestion}
                      onSuggestionSelected={onSuggestionSelected}
                      inputProps={{
                        placeholder: 'Search by Name or NRP...',
                        value: searchValue,
                        onChange: (_e, { newValue }) => setSearchValue(newValue),
                        className: 'w-full rounded-xl border border-slate-200 bg-white/50 py-3 px-4 text-black shadow-sm outline-none transition focus:border-blue-500 focus:bg-white focus:shadow-md dark:border-slate-700 dark:bg-black/20 dark:text-white dark:focus:border-blue-500'
                      }}
                      theme={{
                        container: 'relative w-full',
                        suggestionsContainer: 'absolute top-full left-0 z-50 w-full bg-white/90 dark:bg-boxdark/90 backdrop-blur-xl shadow-xl rounded-xl border border-white/20 dark:border-white/10 max-h-60 overflow-y-auto mt-2',
                        suggestionsList: 'list-none p-2 m-0 space-y-1',
                        suggestion: 'cursor-pointer hover:bg-blue-50 dark:hover:bg-white/10 rounded-lg p-2 transition-colors',
                        suggestionHighlighted: 'bg-blue-50 dark:bg-white/10'
                      }}
                    />
                  </div>
                  {selectedManpower && (
                     <div className="mt-2 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/20 py-2 px-3 rounded-lg inline-flex items-center gap-2 border border-blue-100 dark:border-blue-800">
                        <FaInfoCircle /> Selected: <span className="font-bold">{selectedManpower.nama}</span>
                     </div>
                  )}
               </div>

               <div>
                  <label className="block text-sm font-bold text-black dark:text-white mb-2">Note</label>
                  <textarea
                     rows={2}
                     placeholder="Optional note..."
                     value={note}
                     onChange={(e) => setNote(e.target.value)}
                     className="w-full rounded-xl border border-slate-200 bg-white/50 py-3 px-4 text-black shadow-sm outline-none transition focus:border-blue-500 focus:bg-white focus:shadow-md dark:border-slate-700 dark:bg-black/20 dark:text-white dark:focus:border-blue-500"
                  ></textarea>
               </div>
            </div>

            {/* Right Column: Status & Time */}
            <div className="space-y-5">
               <div>
                  <label className="block text-sm font-bold text-black dark:text-white mb-3">Status</label>
                  <div className="grid grid-cols-5 gap-3">
                     {[
                        { id: 'S', label: 'Sakit', color: 'border-yellow-200 text-yellow-600', active: 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-white border-transparent shadow-yellow-200' },
                        { id: 'I', label: 'Izin', color: 'border-blue-200 text-blue-600', active: 'bg-gradient-to-br from-blue-400 to-blue-600 text-white border-transparent shadow-blue-200' },
                        { id: 'A', label: 'Alpa', color: 'border-red-200 text-red-600', active: 'bg-gradient-to-br from-red-400 to-red-600 text-white border-transparent shadow-red-200' },
                        { id: 'T', label: 'Late', color: 'border-orange-200 text-orange-600', active: 'bg-gradient-to-br from-orange-400 to-orange-600 text-white border-transparent shadow-orange-200' },
                        { id: 'P', label: 'Early', color: 'border-teal-200 text-teal-600', active: 'bg-gradient-to-br from-teal-400 to-teal-600 text-white border-transparent shadow-teal-200' },
                     ].map((item) => (
                        <button
                           key={item.id}
                           onClick={() => setStatus(item.id as any)}
                           className={`h-16 rounded-xl border flex flex-col items-center justify-center transition-all duration-300 ${
                              status === item.id 
                                ? `${item.active} shadow-lg scale-105` 
                                : `bg-white/40 dark:bg-white/5 ${item.color} backdrop-blur-sm hover:bg-white/80 dark:hover:bg-white/10`
                           }`}
                        >
                           <span className="text-xl font-black">{item.id}</span>
                           <span className="text-[10px] font-bold">{item.label}</span>
                        </button>
                     ))}
                  </div>
               </div>

               {(status === 'T' || status === 'P') && (
                  <div className="animate-fadeIn">
                     <label className="block text-sm font-bold text-black dark:text-white mb-2">
                        {status === 'T' ? 'Clock In Time' : 'Clock Out Time'}
                     </label>
                     <input
                        type="time"
                        value={timeValue}
                        onChange={(e) => setTimeValue(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white/50 py-3 px-4 text-black shadow-sm outline-none transition focus:border-blue-500 focus:bg-white focus:shadow-md dark:border-slate-700 dark:bg-black/20 dark:text-white dark:focus:border-blue-500"
                     />
                  </div>
               )}
               
                <div className="pt-2">
                   {/* Form Validation Logic */}
                   {(() => {
                      const isFormValid = !!selectedManpower && !!status && 
                        (status === 'S' || status === 'I' ? note.trim() !== '' : true) &&
                        (status === 'T' || status === 'P' ? timeValue !== '' : true);
                      
                      return (
                        <button
                           disabled={!isFormValid}
                           onClick={handleSubmit}
                           className={`w-full font-bold py-3 px-6 rounded-xl shadow-lg active:scale-95 transition-all duration-300 border-2 ${
                              isFormValid 
                                ? 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white shadow-blue-200 dark:shadow-none border-transparent' 
                                : 'bg-slate-100 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700 cursor-not-allowed shadow-none'
                           }`}
                        >
                           Submit Attendance
                        </button>
                      );
                   })()}
                </div>
            </div>
         </div>
      </div>

      {/* Grid Area */}
      <div className="flex-1 min-h-[400px] w-full relative p-4">
         <div className="h-full w-full rounded-xl border border-white/40 dark:border-white/10 overflow-hidden shadow-inner bg-white/30 dark:bg-black/20 backdrop-blur-sm relative">
             {isLoading ? (
                <div className="absolute inset-0 z-50">
                    <Loader className="flex h-full w-full items-center justify-center bg-white/50 dark:bg-black/50 backdrop-blur-sm" />
                </div>
             ) : (
                <AgGridReact
                    rowData={rowData}
                    columnDefs={columnDefs}
                    defaultColDef={{ resizable: true, sortable: true, filter: true }}
                    animateRows={true}
                    pagination={true}
                    paginationPageSize={10}
                    domLayout='autoHeight'
                    getRowId={(params) => params.data.id}
                    className={document.body.classList.contains('dark') ? 'ag-theme-alpine-dark w-full' : 'ag-theme-alpine w-full'}
                />
             )}
         </div>
      </div>
    </div>
  );
};

export default ManpowerDetail;
