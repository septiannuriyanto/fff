import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../../db/SupabaseClient';
import { useTheme } from '../../../../contexts/ThemeContext';
import { FaTimes, FaSave, FaTrash, FaPlus, FaSpinner, FaEdit, FaUsers, FaMapMarkerAlt, FaCheck, FaExclamationCircle } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { useAuth } from '../../../Authentication/AuthContext';

interface PopulationManagerProps {
  onClose: () => void;
}

interface Population {
  id: string;
  infra_locations_id: string | null;
  population_name: string | null;
  active: boolean | null;
  queue_num: number | null;
  infra_locations?: { name: string } | null;
}

interface Location {
  id: string;
  name: string;
}

interface BatchItem {
  name: string;
  active: boolean;
}

const PopulationManager: React.FC<PopulationManagerProps> = ({ onClose }) => {
  const { activeTheme } = useTheme();
  const { currentUser } = useAuth();
  
  const modalRef = useRef<HTMLDivElement>(null);
  
  const [populations, setPopulations] = useState<Population[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Flow / Form State
  const [locationId, setLocationId] = useState('');
  const [batchItems, setBatchItems] = useState<BatchItem[]>([{ name: '', active: true }]);
  const [saving, setSaving] = useState(false);
  const [showBatchForm, setShowBatchForm] = useState(false);

  // Permission Check
  // @ts-ignore
  const canModify = currentUser && (currentUser.position === 0 || currentUser.position === 1);

  useEffect(() => {
    fetchData();
  }, []);

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

  const fetchData = async () => {
    setLoading(true);
    const [popRes, locRes] = await Promise.all([
      supabase.from('infra_population').select('*, infra_locations(name)').order('population_name'),
      supabase.from('infra_locations').select('id, name').order('name')
    ]);
    
    if (popRes.error) toast.error(`Failed to load populations, ${popRes.error.message}`);
    else setPopulations(popRes.data || []);

    if (locRes.error) toast.error(`Failed to load locations, ${locRes.error.message}`);
    else setLocations(locRes.data || []);

    setLoading(false);
  };

  const addBatchRow = () => {
    setBatchItems([...batchItems, { name: '', active: true }]);
  };

  // Autofocus new row
  useEffect(() => {
    if (showBatchForm && batchItems.length > 0) {
      const lastIdx = batchItems.length - 1;
      inputRefs.current[lastIdx]?.focus();
    }
  }, [batchItems.length, showBatchForm]);

  const removeBatchRow = (index: number) => {
    if (batchItems.length === 1) {
      setBatchItems([{ name: '', active: true }]);
      return;
    }
    setBatchItems(batchItems.filter((_, i) => i !== index));
  };

  const updateBatchRow = (index: number, field: keyof BatchItem, value: any) => {
    const newItems = [...batchItems];
    // @ts-ignore
    newItems[index][field] = value;
    setBatchItems(newItems);
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      addBatchRow();
    } else if ((e.metaKey || e.ctrlKey) && (e.key === 'Backspace' || e.key === 'Delete')) {
      if (batchItems.length > 1) {
        e.preventDefault();
        removeBatchRow(index);
        // Focus previous item if available
        const prevIdx = Math.max(0, index - 1);
        setTimeout(() => inputRefs.current[prevIdx]?.focus(), 0);
      }
    }
  };

  const validateItems = () => {
    for (let i = 0; i < batchItems.length; i++) {
      const item = batchItems[i];
      const name = item.name.trim();
      
      if (!name) {
        toast.error(`Item #${i + 1} name is empty`);
        return false;
      }
      
      if (/^\d+$/.test(name)) {
        toast.error(`Item #${i + 1} name cannot be numbers only`);
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locationId) {
      toast.error('Please select a location first');
      return;
    }

    if (!validateItems()) return;

    if (!canModify) {
      toast.error('Permission denied');
      return;
    }

    setSaving(true);
    const toastId = toast.loading('Creating populations...');

    try {
      // Get the highest queue_num for this location to continue the sequence
      const { data: existingPops } = await supabase
        .from('infra_population')
        .select('queue_num')
        .eq('infra_locations_id', locationId)
        .order('queue_num', { ascending: false })
        .limit(1);
      
      let nextQueue = (existingPops?.[0]?.queue_num || 0) + 1;

      const payload = batchItems.map(item => ({
        population_name: item.name.trim().toUpperCase(),
        infra_locations_id: locationId,
        active: item.active,
        queue_num: nextQueue++,
      }));

      const { error } = await supabase.from('infra_population').insert(payload);
      if (error) throw error;

      toast.success(`${payload.length} population(s) created!`, { id: toastId });
      setBatchItems([{ name: '', active: true }]);
      setShowBatchForm(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save', { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure? This action cannot be undone.')) return;
    const { error } = await supabase.from('infra_population').delete().eq('id', id);
    if (error) toast.error(error.message);
    else {
      toast.success('Deleted');
      fetchData();
    }
  };

  const toggleStatus = async (id: string, current: boolean) => {
    const { error } = await supabase.from('infra_population').update({ active: !current }).eq('id', id);
    if (error) toast.error(error.message);
    else fetchData();
  };

  // Filter populations based on selected location for a cleaner view
  const filteredPopulations = locationId 
    ? populations.filter(p => p.infra_locations_id === locationId)
    : populations;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div ref={modalRef} 
           className="w-full max-w-5xl h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col bg-white dark:bg-boxdark backdrop-blur-2xl border border-white/10"
           style={{ backgroundColor: activeTheme.container.color }}>
        
        {/* Header */}
        <div className="flex justify-between items-center py-5 px-8 border-b border-white/10">
          <div className="flex items-center gap-4">
             <div className="p-3 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-500/20">
               <FaUsers size={20} />
             </div>
             <div>
               <h2 className="text-xl font-bold text-black dark:text-white leading-tight">Infrastructure Populations</h2>
               <p className="text-xs opacity-50 font-medium">Manage groups of assets or equipment per location</p>
             </div>
          </div>
          <div className="flex items-center gap-3">
            {canModify && (
              <button
                onClick={() => setShowBatchForm(!showBatchForm)}
                className={`px-5 py-2.5 rounded-xl text-white text-sm font-black transition-all shadow-lg flex items-center gap-2 uppercase tracking-wider ${
                   showBatchForm ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20'
                }`}
              >
                {showBatchForm ? <><FaTimes /> Cancel</> : <><FaPlus /> Add Batch</>}
              </button>
            )}
            <button onClick={onClose} className="opacity-40 hover:opacity-100 transition-opacity p-2 text-black dark:text-white hover:bg-white/10 rounded-full">
              <FaTimes size={20} />
            </button>
          </div>
        </div>

        {/* Dynamic Batch Form */}
        <div className={`transition-all duration-500 ease-in-out bg-black/5 dark:bg-black/20 overflow-hidden ${showBatchForm ? 'max-h-[600px] opacity-100 border-b border-white/10' : 'max-h-0 opacity-0'}`}>
          <div className="p-8 max-h-[600px] overflow-y-auto custom-scrollbar">
            <div className="max-w-4xl mx-auto">
              {/* Step 1: Location Selection */}
              <div className="mb-8">
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-3 ml-1">Step 1: Select Target Location</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-indigo-500 opacity-60">
                    <FaMapMarkerAlt size={14} />
                  </div>
                  <select 
                    value={locationId} 
                    onChange={e => setLocationId(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-black/40 py-4 pl-12 pr-4 text-sm font-bold text-black dark:text-white shadow-sm outline-none transition-all focus:border-indigo-500 focus:bg-white dark:focus:bg-black/60 focus:ring-4 focus:ring-indigo-500/10"
                  >
                    <option value="" className="text-black">Choose a location...</option>
                    {locations.map(loc => <option key={loc.id} value={loc.id} className="text-black">{loc.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Step 2: Population Items */}
              {locationId && (
                <div className="animate-fade-in-up">
                  <div className="flex justify-between items-center mb-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1">Step 2: Define Populations</label>
                    <button 
                      type="button" 
                      onClick={addBatchRow}
                      className="text-[10px] font-black uppercase tracking-widest text-indigo-500 hover:text-indigo-600 flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-indigo-500/10 transition-all"
                    >
                      <FaPlus size={10} /> Add Item
                    </button>
                  </div>

                  {/* Keyboard Shortcut Hint */}
                  <div className="mb-4 flex items-center gap-2 px-4 py-2 bg-indigo-500/5 border border-indigo-500/10 rounded-xl">
                    <FaExclamationCircle className="text-indigo-500 shrink-0" size={12} />
                    <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 italic">
                      <span className="font-bold text-indigo-500">Pro Tip:</span> Use <kbd className="px-1.5 py-0.5 rounded border border-slate-300 dark:border-white/20 bg-white/50 dark:bg-black/20 font-sans not-italic">⌘ + Enter</kbd> to quickly add a new row, and <kbd className="px-1.5 py-0.5 rounded border border-slate-300 dark:border-white/20 bg-white/50 dark:bg-black/20 font-sans not-italic">⌘ + Del</kbd> to remove one.
                    </p>
                  </div>

                  <div className="space-y-3 pr-2 custom-scrollbar mb-2">
                    {batchItems.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3 animate-fade-in group">
                        <div className="flex-1 relative">
                          <input 
                            ref={el => inputRefs.current[idx] = el}
                            type="text" 
                            value={item.name} 
                            onChange={e => updateBatchRow(idx, 'name', e.target.value)}
                            onKeyDown={e => handleKeyDown(e, idx)}
                            placeholder={`Population name #${idx + 1}`}
                            className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-black/40 py-3.5 px-4 text-sm font-bold text-black dark:text-white outline-none focus:border-indigo-500 transition-all uppercase"
                          />
                        </div>
                        
                        <div className="shrink-0 flex items-center gap-2 bg-white/30 dark:bg-black/20 rounded-xl p-2 px-3 border border-white/10">
                          <span className="text-[10px] font-black uppercase opacity-40">Active</span>
                          <button 
                            type="button"
                            onClick={() => updateBatchRow(idx, 'active', !item.active)}
                            className={`w-10 h-6 rounded-full transition-all relative ${item.active ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'}`}
                          >
                             <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm ${item.active ? 'left-5' : 'left-1'}`} />
                          </button>
                        </div>

                        <button 
                          type="button"
                          onClick={() => removeBatchRow(idx)}
                          className="p-3 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all transform active:scale-90"
                        >
                          <FaTrash size={14} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="mt-8 flex justify-center">
                    <button 
                      onClick={handleSubmit}
                      disabled={saving || !locationId}
                      className={`px-10 py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl active:scale-95 transition-all flex items-center gap-3 ${
                        (locationId && !saving) 
                          ? 'bg-gradient-to-r from-indigo-700 to-indigo-500 text-white hover:shadow-indigo-500/40' 
                          : 'bg-slate-100 dark:bg-white/5 text-slate-400 cursor-not-allowed shadow-none'
                      }`}
                    >
                      {saving ? <FaSpinner className="animate-spin" /> : <FaSave size={16} />}
                      Create {batchItems.length} Population{batchItems.length > 1 ? 's' : ''}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Existing List Area */}
        <div className="flex-1 min-h-0 w-full p-8 flex flex-col bg-slate-50/50 dark:bg-transparent">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-black text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 flex items-center gap-2">
               <FaUsers className="text-indigo-500" /> 
               {locationId ? `Existing for ${locations.find(l => l.id === locationId)?.name}` : 'All Registered Populations'}
            </h3>
            <div className="px-3 py-1 bg-indigo-500/10 rounded-full">
              <span className="text-[10px] font-black text-indigo-500 uppercase">{filteredPopulations.length} Records</span>
            </div>
          </div>

          <div className="flex-1 w-full rounded-3xl border border-white/50 dark:border-white/10 overflow-y-auto custom-scrollbar bg-white/40 dark:bg-black/20 shadow-inner p-6">
            {loading ? (
              <div className="h-full flex flex-col items-center justify-center opacity-40">
                <FaSpinner className="animate-spin text-3xl text-indigo-600 mb-4" />
                <span className="text-[10px] font-black uppercase tracking-widest text-black dark:text-white">Connecting Core...</span>
              </div>
            ) : filteredPopulations.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center opacity-30 text-black dark:text-white text-center p-10">
                <FaUsers size={48} className="mb-4 opacity-20 mx-auto" />
                <p className="text-sm font-black uppercase tracking-widest">No matching populations found</p>
                <p className="text-[10px] mt-2 opacity-60">Try selecting a different location or add new batch records above.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredPopulations.map(pop => (
                  <div key={pop.id} className="relative p-1 rounded-2xl border border-white/20 bg-white dark:bg-slate-900/40 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group overflow-hidden">
                    <div className="p-4 bg-slate-50/50 dark:bg-black/20 rounded-xl h-full flex flex-col">
                      <div className="flex justify-between items-start mb-3 gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-black text-sm text-black dark:text-white truncate uppercase leading-tight">{pop.population_name}</h4>
                          <p className="text-[9px] font-bold opacity-40 uppercase tracking-tighter mt-1 truncate">
                             Location: {pop.infra_locations?.name || '---'}
                          </p>
                        </div>
                        <button 
                          onClick={() => toggleStatus(pop.id, !!pop.active)}
                          className={`shrink-0 px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-wider transition-all ${
                            pop.active ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' : 'bg-red-500/10 text-red-500'
                          }`}
                        >
                          {pop.active ? 'Active' : 'Offline'}
                        </button>
                      </div>

                      <div className="flex justify-between items-end mt-auto pt-4 border-t border-white/10">
                        <div className="flex flex-col">
                           <span className="text-[8px] font-black uppercase opacity-30">Queue Position</span>
                           <span className="text-xs font-black text-indigo-500">#{pop.queue_num || 0}</span>
                        </div>
                        {canModify && (
                          <button 
                            onClick={() => handleDelete(pop.id)}
                            className="p-2.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all transform active:scale-90"
                          >
                            <FaTrash size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PopulationManager;
