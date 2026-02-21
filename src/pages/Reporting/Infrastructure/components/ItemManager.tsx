import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../../db/SupabaseClient';
import { useTheme } from '../../../../contexts/ThemeContext';
import { FaTimes, FaSave, FaClipboardList, FaTrash, FaPlus, FaSpinner, FaEdit, FaMapMarkerAlt, FaTags } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { useAuth } from '../../../Authentication/AuthContext';

interface ItemManagerProps {
  onClose: () => void;
}

interface Location {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
}

interface MasterItem {
  id: string;
  infra_locations_id: string;
  infra_category_id: string | null;
  name: string;
  description: string | null;
  risk_score: number | null;
  example_photo?: string | null;
}

const ItemManager: React.FC<ItemManagerProps> = ({ onClose }) => {
  const { activeTheme } = useTheme();
  const { currentUser } = useAuth();
  
  const modalRef = useRef<HTMLDivElement>(null);
  
  const [locations, setLocations] = useState<Location[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [items, setItems] = useState<MasterItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [riskScore, setRiskScore] = useState<number>(3);
  const [saving, setSaving] = useState(false);

  // Refs
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Permission Check
  // @ts-ignore
  const canModify = currentUser && (currentUser.position === 0 || currentUser.position === 1);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedLocation) {
      fetchItems();
    } else {
      setItems([]);
    }
  }, [selectedLocation]);

  // Autofocus when form opens
  useEffect(() => {
    if (showForm) {
      setTimeout(() => nameInputRef.current?.focus(), 150);
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

  const fetchInitialData = async () => {
    setInitialLoading(true);
    try {
      const [locRes, catRes] = await Promise.all([
        supabase.from('infra_locations').select('id, name').order('name'),
        supabase.from('infra_locations_items_category').select('id, name').order('name')
      ]);

      if (locRes.error) throw locRes.error;
      if (catRes.error) throw catRes.error;

      setLocations(locRes.data || []);
      setCategories(catRes.data || []);

      if (locRes.data && locRes.data.length > 0) {
        setSelectedLocation(locRes.data[0].id);
      }
    } catch (error: any) {
      toast.error('Failed to load initial data');
    } finally {
      setInitialLoading(false);
    }
  };

  const fetchItems = async () => {
    if (!selectedLocation) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('infra_locations_items')
      .select('*')
      .eq('infra_locations_id', selectedLocation)
      .order('name');
    
    if (error) {
      toast.error(error.message);
    } else {
      setItems(data || []);
    }
    setLoading(false);
  };

  const handleEdit = (item: MasterItem) => {
    setEditingId(item.id);
    setName(item.name);
    setDescription(item.description || '');
    setCategoryId(item.infra_category_id || '');
    setRiskScore(item.risk_score || 3);
    setShowForm(true);
  };

  const handleCreate = () => {
    setEditingId(null);
    setName('');
    setDescription('');
    setRiskScore(3);
    // Reuse category from list if possible
    setShowForm(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setDescription('');
    setShowForm(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this master item?')) return;
    if (!canModify) return;

    const toastId = toast.loading('Deleting...');
    const { error } = await supabase
      .from('infra_locations_items')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error(error.message, { id: toastId });
    } else {
      toast.success('Item deleted', { id: toastId });
      fetchItems();
      if (editingId === id) resetForm();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLocation) {
      toast.error('Please select a location first');
      return;
    }
    if (!name.trim()) return;

    if (!canModify) {
      toast.error('You do not have permission to modify items.');
      return;
    }

    setSaving(true);
    const toastId = toast.loading('Saving item...');

    try {
      const payload = {
        infra_locations_id: selectedLocation,
        infra_category_id: categoryId || null,
        name: name.trim(),
        description: description.trim() || null,
        risk_score: riskScore,
      };

      if (editingId) {
        const { error } = await supabase
          .from('infra_locations_items')
          .update(payload)
          .eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('infra_locations_items')
          .insert(payload);
        if (error) throw error;
      }

      toast.success('Item saved successfully!', { id: toastId });
      fetchItems();
      resetForm();

    } catch (error: any) {
      toast.error(error.message || 'Failed to save', { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  const getCategoryName = (id: string | null) => {
    if (!id) return 'Uncategorized';
    return categories.find(c => c.id === id)?.name || 'Unknown Category';
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div ref={modalRef}
           className="w-full max-w-5xl h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col bg-white/60 dark:bg-boxdark/60 backdrop-blur-2xl border border-white/50 dark:border-white/10"
           style={{ backgroundColor: activeTheme.container.color }}>
        
        {/* Header */}
        <div className="flex justify-between items-center py-4 px-6 border-b border-white/50 dark:border-white/10">
          <div className="flex items-center gap-6">
            <h2 className="text-xl font-bold flex items-center gap-3 text-black dark:text-white shrink-0">
               <div className="p-2 bg-blue-600 rounded-lg text-white shadow-lg shadow-blue-500/20">
                 <FaClipboardList size={16} />
               </div>
               Manage Items
            </h2>

            {/* Location Selector in Header */}
            <div className="flex items-center gap-3 bg-white/40 dark:bg-black/20 px-4 py-1.5 rounded-xl border border-white/40">
               <FaMapMarkerAlt size={14} className="text-blue-500" />
               <select 
                 value={selectedLocation}
                 onChange={e => setSelectedLocation(e.target.value)}
                 className="bg-transparent border-none text-sm font-bold outline-none text-black dark:text-white min-w-[180px]"
                 disabled={initialLoading}
               >
                 {initialLoading ? <option>Loading...</option> : locations.map(loc => (
                   <option key={loc.id} value={loc.id} className="bg-white dark:bg-boxdark">{loc.name}</option>
                 ))}
               </select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {canModify && selectedLocation && (
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
                {showForm ? <><FaTimes /> Close</> : <><FaPlus /> Add Item</>}
              </button>
            )}
            <button onClick={onClose} className="opacity-50 hover:opacity-100 transition-opacity p-2 hover:bg-white/10 rounded-full text-black dark:text-white">
              <FaTimes size={20} />
            </button>
          </div>
        </div>

        {/* Expandable Form Panel */}
        <div className={`transition-all duration-500 ease-in-out bg-white/40 dark:bg-black/20 border-b border-white/50 dark:border-white/10 overflow-hidden ${
            showForm ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
        }`}>
           <div className="p-6">
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-3">
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 ml-1">Name *</label>
                  <input
                    ref={nameInputRef}
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Tank Structure"
                    required
                    disabled={!canModify || saving}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-black/40 py-2.5 px-4 text-sm font-bold text-black dark:text-white shadow-sm outline-none transition-all focus:border-blue-500 disabled:opacity-50"
                  />
                </div>

                <div className="md:col-span-4">
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 ml-1">Description</label>
                  <input
                    type="text"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Enter item description..."
                    disabled={!canModify || saving}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-black/40 py-2.5 px-4 text-sm font-bold text-black dark:text-white shadow-sm outline-none transition-all focus:border-blue-500 disabled:opacity-50"
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 ml-1">Category</label>
                  <select 
                    value={categoryId}
                    onChange={e => setCategoryId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-black/40 py-2.5 px-4 text-sm font-bold text-black dark:text-white shadow-sm outline-none transition-all focus:border-blue-500"
                  >
                    <option value="">Uncategorized</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-1">
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 ml-1">Risk</label>
                  <select 
                    value={riskScore}
                    onChange={e => setRiskScore(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-black/40 py-2.5 px-4 text-sm font-bold text-black dark:text-white shadow-sm outline-none transition-all focus:border-blue-500"
                  >
                    {[1,2,3,4,5].map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>

                <div className="md:col-span-1 flex items-end">
                  <button 
                    type="submit"
                    disabled={saving || !name.trim() || !canModify}
                    className="w-full font-black py-2.5 px-4 rounded-xl shadow-lg active:scale-[0.98] transition-all bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2 uppercase tracking-widest text-xs disabled:opacity-50">
                    {saving ? <FaSpinner className="animate-spin" /> : <FaSave />}
                  </button>
                </div>
              </form>
           </div>
        </div>

        {/* List Content Area */}
        <div className="flex-1 min-h-0 w-full p-6 flex flex-col">
          <div className="flex-1 w-full rounded-2xl border border-white/50 dark:border-white/10 overflow-y-auto custom-scrollbar bg-white/30 dark:bg-black/20 shadow-inner p-4">
            {loading ? (
              <div className="h-full flex flex-col items-center justify-center opacity-40">
                <FaSpinner className="animate-spin text-3xl text-blue-600 mb-4" />
                <span className="text-xs font-black uppercase tracking-widest text-black dark:text-white">Loading Items...</span>
              </div>
            ) : items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center opacity-30 text-black dark:text-white text-center">
                <FaClipboardList size={48} className="mb-4 mx-auto" />
                <p className="text-sm font-black uppercase tracking-widest">No checklist items for this location</p>
                <p className="text-[10px] mt-2 max-w-xs mx-auto opacity-60">Add some master checklist items above. These will be automatically pulled for every new inspection at this location.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {items.map(item => (
                  <div key={item.id} className="bg-white/40 dark:bg-slate-900/40 rounded-xl p-4 flex gap-4 items-start border border-white/10 group hover:border-blue-500/30 transition-all">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <p className="font-bold text-base text-black dark:text-white uppercase tracking-tight">{item.name}</p>
                        {item.infra_category_id && (
                          <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 border border-blue-500/20">
                            <FaTags size={8} /> {getCategoryName(item.infra_category_id)}
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                          item.risk_score && item.risk_score >= 4 ? 'bg-red-500/10 text-red-500 border-red-500/20' : 
                          item.risk_score && item.risk_score >= 3 ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                          'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                        }`}>
                          Risk {item.risk_score || 3}
                        </span>
                      </div>
                      <p className="text-sm opacity-60 line-clamp-2">{item.description || 'No description provided.'}</p>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                       <button onClick={() => handleEdit(item)}
                          className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500 hover:text-white transition-all">
                          <FaEdit size={14} />
                       </button>
                       {canModify && (
                         <button onClick={() => handleDelete(item.id)}
                           className="p-2.5 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500 hover:text-white transition-all">
                           <FaTrash size={14} />
                         </button>
                       )}
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

export default ItemManager;
