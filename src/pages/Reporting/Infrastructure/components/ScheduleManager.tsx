import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../../../../db/SupabaseClient';
import { useTheme } from '../../../../contexts/ThemeContext';
import { FaTimes, FaSave, FaCalendarAlt, FaPlus, FaSpinner, FaTrash, FaEdit } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { useAuth } from '../../../Authentication/AuthContext';

// AG Grid Imports
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { ColDef, ICellRendererParams } from 'ag-grid-community';

interface Location {
  id: string;
  name: string;
  area: string | null;
}

interface Schedule {
  id: string;
  location_id: string;
  period: number;
  start_date: string;
  end_date: string;
  status: string;
  location_name: string; // Flattened for Grid
}

interface ScheduleManagerProps {
  onClose: () => void;
}

const ScheduleManager: React.FC<ScheduleManagerProps> = ({ onClose }) => {
  const { activeTheme } = useTheme();
  const { currentUser } = useAuth();
  
  const modalRef = useRef<HTMLDivElement>(null);
  
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);

  // Form & UI State
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [locationId, setLocationId] = useState('');
  const [period, setPeriod] = useState(1);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [saving, setSaving] = useState(false);

  const locationRef = useRef<HTMLSelectElement>(null);

  // Permission Check
  // @ts-ignore
  const canModify = currentUser && (currentUser.position === 0 || currentUser.position === 1);

  useEffect(() => {
    fetchSchedules();
    fetchLocations();
  }, []);

  // Autofocus when form opens
  useEffect(() => {
    if (showForm) {
      setTimeout(() => locationRef.current?.focus(), 150);
    }
  }, [showForm]);

  // Modal Close Logic
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    window.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      window.removeEventListener('keydown', handleEscape);
      window.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const fetchSchedules = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('infra_schedules')
      .select('*, infra_locations(name, area)')
      .order('start_date', { ascending: false });

    if (error) {
      toast.error('Failed to load schedules');
    } else {
      const flattened = (data || []).map((item: any) => ({
        ...item,
        location_name: item.infra_locations?.name || 'Unknown',
      }));
      setSchedules(flattened);
    }
    setLoading(false);
  };

  const fetchLocations = async () => {
    const { data } = await supabase.from('infra_locations').select('id, name, area').order('name');
    if (data) setLocations(data as Location[]);
  };

  const handleCreate = () => {
    setEditingId(null);
    setLocationId('');
    setPeriod(1);
    setStartDate('');
    setEndDate('');
    setShowForm(true);
  };

  const handleEdit = (sch: Schedule) => {
    setEditingId(sch.id);
    setLocationId(sch.location_id);
    setPeriod(sch.period);
    setStartDate(sch.start_date);
    setEndDate(sch.end_date);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this schedule? This action cannot be undone.')) return;
    if (!canModify) return;

    const toastId = toast.loading('Deleting...');
    const { error } = await supabase
      .from('infra_schedules')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error(error.message, { id: toastId });
    } else {
      toast.success('Schedule deleted', { id: toastId });
      fetchSchedules();
      if (editingId === id) {
        setEditingId(null);
        setShowForm(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locationId || !startDate || !endDate) return;
    if (endDate < startDate) { toast.error('End date must be after start date'); return; }

    if (!canModify) {
      toast.error('You do not have permission to modify schedules.');
      return;
    }

    setSaving(true);
    const toastId = toast.loading('Saving schedule...');

    const payload = {
      location_id: locationId,
      period,
      start_date: startDate,
      end_date: endDate,
      status: 'open',
    };

    let error;
    if (editingId) {
      const { error: updateError } = await supabase
        .from('infra_schedules')
        .update(payload)
        .eq('id', editingId);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from('infra_schedules')
        .insert(payload);
      error = insertError;
    }

    if (error) {
      toast.error(error.message, { id: toastId });
    } else {
      toast.success(editingId ? 'Schedule updated!' : 'Schedule created!', { id: toastId });
      fetchSchedules();
      resetForm();
    }
    setSaving(false);
  };

  const resetForm = () => {
    setEditingId(null);
    setLocationId('');
    setPeriod(1);
    setStartDate('');
    setEndDate('');
    setShowForm(false);
  };

  // AG Grid Column Definitions
  const columnDefs = useMemo<ColDef[]>(() => [
    { field: 'location_name', headerName: 'Location', sortable: true, filter: true, flex: 2 },
    { 
      field: 'period', 
      headerName: 'Period', 
      sortable: true, 
      width: 100, 
      cellRenderer: (params: ICellRendererParams) => (
        <span className="font-bold text-blue-400">P{params.value}</span>
      )
    },
    { field: 'start_date', headerName: 'Start', sortable: true, width: 120 },
    { field: 'end_date', headerName: 'End', sortable: true, width: 120 },
    { 
      field: 'status', 
      headerName: 'Status', 
      sortable: true, 
      width: 120,
      cellRenderer: (params: ICellRendererParams) => {
        const status = params.value;
        const colorClass = status === 'open' ? 'text-emerald-400 bg-emerald-400/10' : 'text-gray-400 bg-gray-400/10';
        return (
          <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${colorClass}`}>
            {status}
          </span>
        );
      }
    },
    {
      headerName: 'Action',
      width: 100,
      sortable: false,
      filter: false,
      hide: !canModify,
      cellRenderer: (params: ICellRendererParams) => (
        <div className="flex gap-2 items-center h-full">
          <button 
            onClick={() => handleEdit(params.data)}
            className="text-blue-400 hover:text-white transition-colors"
            title="Edit">
            <FaEdit />
          </button>
          <button 
            onClick={() => handleDelete(params.data.id)}
            className="text-red-400 hover:text-white transition-colors"
            title="Delete">
            <FaTrash />
          </button>
        </div>
      )
    }
  ], [canModify]); // Re-create if permission changes (though unlikely during session)

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div ref={modalRef}
           className="w-full max-w-5xl h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col bg-white/60 dark:bg-boxdark/60 backdrop-blur-2xl border border-white/50 dark:border-white/10"
           style={{ backgroundColor: activeTheme.container.color }}>
        
        {/* Header */}
        <div className="flex justify-between items-center py-4 px-6 border-b border-white/50 dark:border-white/10">
          <h2 className="text-xl font-bold flex items-center gap-3 text-black dark:text-white">
             <div className="p-2 bg-blue-600 rounded-lg text-white shadow-lg shadow-blue-500/20">
               <FaCalendarAlt size={16} />
             </div>
             Manage Schedules
          </h2>
          <div className="flex items-center gap-3">
            {canModify && (
              <button
                onClick={() => {
                  if (showForm && editingId) {
                    resetForm();
                  } else {
                    const next = !showForm;
                    setShowForm(next);
                    if (next) handleCreate();
                  }
                }}
                className={`px-4 py-2 rounded-xl text-white text-sm font-bold transition-all shadow-lg flex items-center gap-2 ${
                   showForm 
                    ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20' 
                    : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/30'
                }`}
              >
                {showForm ? <><FaTimes /> Close</> : <><FaPlus /> Add Schedule</>}
              </button>
            )}
            <button onClick={onClose} className="opacity-50 hover:opacity-100 transition-opacity p-2 hover:bg-white/10 rounded-full text-black dark:text-white">
              <FaTimes size={20} />
            </button>
          </div>
        </div>

        {/* Expandable Form Panel */}
        <div className={`transition-all duration-500 ease-in-out bg-white/40 dark:bg-black/20 border-b border-white/50 dark:border-white/10 overflow-hidden ${
            showForm ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'
        }`}>
           <div className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
                {/* Location & Period */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 ml-1">Location *</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors z-10">
                        <FaCalendarAlt size={14} />
                      </div>
                      <select 
                        ref={locationRef}
                        value={locationId} 
                        onChange={e => setLocationId(e.target.value)} 
                        required
                        disabled={!canModify}
                        className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-black/40 py-3.5 pl-11 pr-4 text-sm font-bold text-black dark:text-white shadow-sm outline-none transition-all focus:border-blue-500 focus:bg-white dark:focus:bg-black/60 focus:ring-4 focus:ring-blue-500/10 disabled:opacity-50 appearance-none cursor-pointer">
                        <option value="">Select Location…</option>
                        {locations.map(l => (
                          <option key={l.id} value={l.id} className="bg-white dark:bg-boxdark">{l.name}{l.area ? ` · ${l.area}` : ''}</option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 ml-1">Periode *</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors z-10">
                         <FaPlus size={12} />
                      </div>
                      <select value={period} onChange={e => setPeriod(Number(e.target.value))}
                        disabled={!canModify}
                        className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-black/40 py-3.5 pl-11 pr-4 text-sm font-bold text-black dark:text-white shadow-sm outline-none transition-all focus:border-blue-500 focus:bg-white dark:focus:bg-black/60 focus:ring-4 focus:ring-blue-500/10 disabled:opacity-50 appearance-none cursor-pointer">
                        <option value={1} className="bg-white dark:bg-boxdark">Periode 1</option>
                        <option value={2} className="bg-white dark:bg-boxdark">Periode 2</option>
                      </select>
                      <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dates & Submit */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 ml-1">Start Date *</label>
                      <div className="relative group">
                         <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors z-10">
                            <FaCalendarAlt size={14} />
                         </div>
                         <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required
                           disabled={!canModify}
                           className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-black/40 py-3.5 pl-11 pr-4 text-sm font-bold text-black dark:text-white shadow-sm outline-none transition-all focus:border-blue-500 focus:bg-white dark:focus:bg-black/60 focus:ring-4 focus:ring-blue-500/10" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 ml-1">End Date *</label>
                      <div className="relative group">
                         <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors z-10">
                            <FaCalendarAlt size={14} />
                         </div>
                         <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required min={startDate}
                           disabled={!canModify}
                           className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-black/40 py-3.5 pl-11 pr-4 text-sm font-bold text-black dark:text-white shadow-sm outline-none transition-all focus:border-blue-500 focus:bg-white dark:focus:bg-black/60 focus:ring-4 focus:ring-blue-500/10" />
                      </div>
                    </div>
                  </div>

                  <div className="pt-6">
                    <button 
                      onClick={handleSubmit}
                      disabled={saving || !canModify || !locationId || !startDate || !endDate}
                      className={`w-full font-black py-4 px-8 rounded-2xl shadow-xl active:scale-[0.98] transition-all duration-300 border-2 flex items-center justify-center gap-3 uppercase tracking-widest text-xs ${
                          (locationId && startDate && endDate && !saving)
                            ? 'bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 hover:shadow-blue-500/40 text-white border-transparent' 
                            : 'bg-slate-100 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700 cursor-not-allowed shadow-none'
                      }`}>
                      {saving ? <FaSpinner className="animate-spin" /> : (editingId ? <FaSave size={16} /> : <FaPlus size={16} />)}
                      {editingId ? 'Update Schedule Record' : 'Create New Schedule'}
                    </button>
                  </div>
                </div>
              </div>
              {!canModify && (
                <p className="text-[10px] font-bold text-red-500 mt-4 text-center uppercase tracking-tighter opacity-70">
                  Insufficient permissions to modify schedule data.
                </p>
              )}
           </div>
        </div>

        {/* Grid Area */}
        <div className="flex-1 min-h-0 w-full p-6 flex flex-col">
          <div className="flex-1 w-full rounded-2xl border border-white/50 dark:border-white/10 overflow-hidden bg-white/30 dark:bg-black/20 shadow-inner backdrop-blur-sm relative">
            {loading ? (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/30 dark:bg-black/30 backdrop-blur-sm">
                <FaSpinner className="animate-spin text-3xl text-blue-600" />
              </div>
            ) : (
              <div className={document.body.classList.contains('dark') ? 'ag-theme-alpine-dark w-full h-full' : 'ag-theme-alpine w-full h-full'}>
                <AgGridReact
                  rowData={schedules}
                  columnDefs={columnDefs}
                  pagination={true}
                  paginationPageSize={10}
                  animateRows={true}
                  rowHeight={55}
                  headerHeight={55}
                  domLayout='normal'
                  defaultColDef={{ resizable: true, sortable: true, filter: true }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScheduleManager;
