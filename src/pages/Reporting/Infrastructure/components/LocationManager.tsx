import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../../db/SupabaseClient';
import { useTheme } from '../../../../contexts/ThemeContext';
import { FaTimes, FaSave, FaMapMarkerAlt, FaTrash, FaPlus, FaImage, FaSpinner, FaEdit } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { useAuth } from '../../../Authentication/AuthContext';

interface LocationManagerProps {
  onClose: () => void;
}

interface Location {
  id: string;
  name: string;
  area: string | null;
  banner_url: string | null;
}

const LocationManager: React.FC<LocationManagerProps> = ({ onClose }) => {
  const { activeTheme } = useTheme();
  const { currentUser } = useAuth();
  
  const modalRef = useRef<HTMLDivElement>(null);
  
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [area, setArea] = useState('');
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Refs
  const nameInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Permission Check
  // @ts-ignore
  const canModify = currentUser && (currentUser.position === 0 || currentUser.position === 1);

  useEffect(() => {
    fetchLocations();
  }, []);

  // Autofocus when form opens
  useEffect(() => {
    if (showForm) {
      setTimeout(() => nameInputRef.current?.focus(), 150);
    }
  }, [showForm]);

  // Modal Close Logic (Escape & Click Outside)
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

  const fetchLocations = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('infra_locations')
      .select('*')
      .order('name');
    
    if (error) {
      toast.error('Failed to load locations');
    } else {
      setLocations(data || []);
    }
    setLoading(false);
  };

  const handleEdit = (loc: Location) => {
    setEditingId(loc.id);
    setName(loc.name);
    setArea(loc.area || '');
    setBannerPreview(loc.banner_url);
    setBannerFile(null);
    setShowForm(true);
  };

  const handleCreate = () => {
    setEditingId(null);
    setName('');
    setArea('');
    setBannerPreview(null);
    setBannerFile(null);
    setShowForm(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setArea('');
    setBannerPreview(null);
    setBannerFile(null);
    setShowForm(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this location? This action cannot be undone.')) return;
    if (!canModify) return;

    const toastId = toast.loading('Deleting...');
    const { error } = await supabase
      .from('infra_locations')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error(error.message, { id: toastId });
    } else {
      toast.success('Location deleted', { id: toastId });
      fetchLocations();
      if (editingId === id) resetForm();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setBannerFile(file);
      setBannerPreview(URL.createObjectURL(file));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setBannerFile(file);
      setBannerPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (!canModify) {
      toast.error('You do not have permission to modify locations.');
      return;
    }

    setSaving(true);
    const toastId = toast.loading('Saving location...');

    try {
      const payload = {
        name: name.trim(),
        area: area.trim() || null,
      };

      let recordId = editingId;

      if (editingId) {
        const { error } = await supabase
          .from('infra_locations')
          .update(payload)
          .eq('id', editingId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('infra_locations')
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        recordId = data.id;
      }

      // Upload Banner if we have a file and a valid recordId
      if (bannerFile && recordId) {
        toast.loading('Uploading banner...', { id: toastId });
        
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('No session');

        const uploadUrl = `${import.meta.env.VITE_WORKER_URL}/upload/infra-inspection`;
        const res = await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'X-Inspection-Id': 'banners',
            'X-Item-Id': recordId,
            'Content-Type': bannerFile.type
          },
          body: bannerFile
        });

        if (!res.ok) throw new Error('Upload failed');
        
        const result = await res.json();
        const finalUrl = (result.url && result.url.startsWith('http'))
          ? result.url
          : `${import.meta.env.VITE_WORKER_URL}/images/infra-inspection/${result.key}`;

        // Update record with banner_url
        await supabase
          .from('infra_locations')
          .update({ banner_url: finalUrl })
          .eq('id', recordId);
      }

      toast.success('Location saved successfully!', { id: toastId });
      fetchLocations();
      resetForm();

    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to save', { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div ref={modalRef} 
           className="w-full max-w-5xl h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col bg-white/60 dark:bg-boxdark/60 backdrop-blur-2xl border border-white/50 dark:border-white/10"
           style={{ backgroundColor: activeTheme.container.color }}>
        
        {/* Header */}
        <div className="flex justify-between items-center py-4 px-6 border-b border-white/50 dark:border-white/10">
          <h2 className="text-xl font-bold flex items-center gap-3 text-black dark:text-white">
             <div className="p-2 bg-blue-600 rounded-lg text-white shadow-lg shadow-blue-500/20">
               <FaMapMarkerAlt size={16} />
             </div>
             Manage Locations
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
                {showForm ? <><FaTimes /> Close</> : <><FaPlus /> Add Location</>}
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
                {/* Left Side: Inputs */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 ml-1">Location Name *</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors z-10">
                        <FaMapMarkerAlt size={14} />
                      </div>
                      <input
                        ref={nameInputRef}
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="e.g. Fuel Station #1"
                        required
                        disabled={!canModify}
                        className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-black/40 py-3.5 pl-11 pr-4 text-sm font-bold text-black dark:text-white shadow-sm outline-none transition-all focus:border-blue-500 focus:bg-white dark:focus:bg-black/60 focus:ring-4 focus:ring-blue-500/10 disabled:opacity-50"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 ml-1">Area (optional)</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors z-10">
                         <FaMapMarkerAlt size={14} />
                      </div>
                      <input
                        type="text"
                        value={area}
                        onChange={e => setArea(e.target.value)}
                        placeholder="e.g. Mining Pit A"
                        disabled={!canModify}
                        className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-black/40 py-3.5 pl-11 pr-4 text-sm font-bold text-black dark:text-white shadow-sm outline-none transition-all focus:border-blue-500 focus:bg-white dark:focus:bg-black/60 focus:ring-4 focus:ring-blue-500/10 disabled:opacity-50"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <button 
                      onClick={handleSubmit}
                      disabled={saving || !name.trim() || !canModify}
                      className={`w-full font-black py-4 px-8 rounded-2xl shadow-xl active:scale-[0.98] transition-all duration-300 border-2 flex items-center justify-center gap-3 uppercase tracking-widest text-xs ${
                          (name.trim() && !saving)
                            ? 'bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 hover:shadow-blue-500/40 text-white border-transparent' 
                            : 'bg-slate-100 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700 cursor-not-allowed shadow-none'
                      }`}>
                      {saving ? <FaSpinner className="animate-spin" /> : (editingId ? <FaSave size={16} /> : <FaPlus size={16} />)}
                      {editingId ? 'Update Location Details' : 'Register New Location'}
                    </button>
                  </div>
                </div>

                {/* Right Side: Banner Upload */}
                <div>
                   <label className="block text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 ml-1">Banner Image</label>
                   <div 
                    className={`border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all min-h-[180px] group ${
                      bannerPreview ? 'border-blue-500/50 bg-blue-500/5' : 'border-slate-200 dark:border-slate-700 hover:border-blue-500/30 hover:bg-blue-500/5'
                    }`}
                    onDragOver={e => e.preventDefault()}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                    
                    {bannerPreview ? (
                      <div className="relative w-full h-[150px] rounded-xl overflow-hidden shadow-inner border border-white/20">
                        <img src={bannerPreview} alt="Preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[2px]">
                          <span className="text-white text-xs font-black uppercase tracking-widest bg-blue-600/80 px-4 py-2 rounded-full">Change Banner</span>
                        </div>
                      </div>
                    ) : (
                      <div className="opacity-40 text-black dark:text-white group-hover:opacity-100 transition-opacity">
                        <FaImage size={40} className="mb-3 mx-auto" />
                        <p className="text-xs font-black uppercase tracking-widest">Click or Drag & Drop Banner</p>
                        <p className="text-[10px] opacity-60 mt-1 uppercase">Images up to 5MB supported</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {!canModify && (
                <p className="text-[10px] font-bold text-red-500 mt-6 text-center uppercase tracking-tighter opacity-70">
                  Insufficient permissions to register or modify locations.
                </p>
              )}
           </div>
        </div>

        {/* List Content Area */}
        <div className="flex-1 min-h-0 w-full p-8 flex flex-col">
          <div className="flex-1 w-full rounded-2xl border border-white/50 dark:border-white/10 overflow-y-auto custom-scrollbar bg-white/30 dark:bg-black/20 shadow-inner p-6">
            {loading ? (
              <div className="h-full flex flex-col items-center justify-center opacity-40">
                <FaSpinner className="animate-spin text-3xl text-blue-600 mb-4" />
                <span className="text-xs font-black uppercase tracking-widest text-black dark:text-white">Synchronizing Database...</span>
              </div>
            ) : locations.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center opacity-30 text-black dark:text-white mt-[-20px]">
                <FaMapMarkerAlt size={48} className="mb-4" />
                <p className="text-sm font-black uppercase tracking-widest">No active locations found</p>
                <button onClick={handleCreate} className="mt-4 text-[10px] font-black uppercase tracking-widest text-blue-500 hover:text-blue-600 underline">Add one now</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {locations.map(loc => (
                  <div 
                    key={loc.id} 
                    onClick={() => handleEdit(loc)}
                    className={`relative p-1 rounded-2xl border transition-all duration-300 group cursor-pointer overflow-hidden ${
                      editingId === loc.id 
                        ? 'border-blue-500/50 bg-blue-500/5 ring-4 ring-blue-500/10' 
                        : 'border-white/20 bg-white/40 dark:bg-black/30 hover:border-blue-500/30 hover:bg-white/60 dark:hover:bg-black/40 hover:shadow-xl hover:-translate-y-1'
                    }`}
                  >
                    {/* Card Content Interior */}
                    <div className="bg-white/40 dark:bg-slate-900/40 rounded-xl p-4 flex gap-4 items-center">
                       {/* Banner Thumb */}
                      <div className="w-16 h-16 rounded-xl bg-black/5 dark:bg-black/30 flex items-center justify-center overflow-hidden shrink-0 border border-white/10 shadow-inner">
                        {loc.banner_url ? (
                          <img src={loc.banner_url} alt={loc.name} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                        ) : (
                          <FaMapMarkerAlt className="opacity-20 text-black dark:text-white" size={24} />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h4 className="font-black text-sm text-black dark:text-white truncate uppercase tracking-tight">{loc.name}</h4>
                        <div className="flex items-center gap-1.5 mt-1">
                           <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                           <p className="text-[10px] font-bold opacity-60 truncate text-black dark:text-white uppercase tracking-wider">{loc.area || 'General Area'}</p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                         <button 
                            className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-all transform hover:scale-110"
                            title="Edit">
                            <FaEdit size={14} />
                         </button>
                         {canModify && (
                           <button 
                             onClick={(e) => { e.stopPropagation(); handleDelete(loc.id); }}
                             className="p-2 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500 hover:text-white transition-all transform hover:scale-110"
                             title="Delete">
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

export default LocationManager;
