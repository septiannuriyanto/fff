import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../../../db/SupabaseClient';
import { useTheme } from '../../../../contexts/ThemeContext';
import { FaCamera, FaCheck, FaTimes, FaExclamationTriangle, FaPlus, FaLock, FaClipboardCheck, FaSpinner, FaImage } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { uploadInfraPhoto, uploadBacklogPhoto } from '../../../../services/infraInspectionService';

interface InspectionFormProps {
  inspectionId: string;       // UUID of infra_inspections row
  locationName: string;
  period: number;
  onComplete: () => void;
}

interface BacklogData {
  id: string;
  description: string;
  risk: number;
  photo?: string;
}

interface InspectionItem {
  id: string;           // infra_inspection_items.id (uuid)
  description: string;
  isOk: boolean | null;
  photo?: string;
  examplePhoto?: string | null;
  backlogs?: BacklogData[];
}

const RISK_COLORS = ['', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-orange-500', 'bg-red-500'];

const InspectionForm: React.FC<InspectionFormProps> = ({ inspectionId, locationName, period, onComplete }) => {
  const { activeTheme } = useTheme();
  const [items, setItems] = useState<InspectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeBacklogItem, setActiveBacklogItem] = useState<string | null>(null);
  const [activeBacklogId, setActiveBacklogId] = useState<string | null>(null);
  const [backlogDesc, setBacklogDesc] = useState('');
  const [backlogRisk, setBacklogRisk] = useState<number | null>(null);
  const [backlogPhoto, setBacklogPhoto] = useState<string | null>(null);
  const [pendingBacklogFile, setPendingBacklogFile] = useState<File | null>(null);
  const [uploadingBacklog, setUploadingBacklog] = useState(false);
  
  // Photo Upload State
  const [uploadingItem, setUploadingItem] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activePhotoItemId = useRef<string | null>(null);

  // Fetch existing items for this inspection (in case of resume)
  useEffect(() => {
    const loadItems = async () => {
      const { data, error } = await supabase
        .from('infra_inspection_items')
        .select(`
          id, 
          description, 
          is_ok, 
          infra_location_item_id,
          infra_locations_items(example_photo),
          infra_item_photos(photo_url), 
          infra_backlogs(
            id, 
            description, 
            risk_score,
            infra_backlog_photos(photo_url)
          )
        `)
        .eq('inspection_id', inspectionId)
        .order('id');

      if (error) { 
        console.error('Fetch Items Error:', error);
        toast.error(`Failed to load items: ${error.message}`); 
        setLoading(false); 
        return; 
      }

      if (data && data.length > 0) {
        setItems(data.map((row: any) => ({
          id: row.id,
          description: row.description,
          isOk: row.is_ok,
          photo: row.infra_item_photos?.[0]?.photo_url,
          examplePhoto: row.infra_locations_items?.example_photo,
          backlogs: (row.infra_backlogs || []).map((b: any) => ({
            id: b.id,
            description: b.description,
            risk: b.risk_score,
            photo: b.infra_backlog_photos?.[0]?.photo_url
          })),
        })));
      } else {
        // First time — get location of this inspection
        const { data: inspection } = await supabase
          .from('infra_inspections')
          .select('location_id')
          .eq('id', inspectionId)
          .single();

        if (!inspection?.location_id) {
          toast.error('Could not find inspection location');
          setLoading(false);
          return;
        }

        // Pull templates for this location from infra_locations_items
        const { data: masterItems, error: masterErr } = await supabase
          .from('infra_locations_items')
          .select('id, name, description, risk_score, example_photo')
          .eq('infra_locations_id', inspection.location_id)
          .order('name');

        if (masterErr) {
          console.error('Master Items Error:', masterErr);
          toast.error(`Failed to load checklist templates: ${masterErr.message}`);
          setLoading(false);
          return;
        }

        const rows = (masterItems || []).map(m => ({ 
          inspection_id: inspectionId, 
          infra_location_item_id: m.id,
          description: m.description || m.name, 
          risk_score: m.risk_score || 3,
          is_ok: null 
        }));

        if (rows.length === 0) {
          toast.error('No checklist items found for this location. Please setup in Admin Actions.');
          setLoading(false);
          return;
        }

        const { data: inserted, error: insertErr } = await supabase
          .from('infra_inspection_items')
          .insert(rows)
          .select();

        if (insertErr) { 
          console.error('Insert Seed Error:', insertErr);
          toast.error(`Failed to seed items: ${insertErr.message}`); 
          setLoading(false); 
          return; 
        }
        setItems((inserted ?? []).map((row: any) => ({
          id: row.id,
          description: row.description,
          examplePhoto: masterItems?.find(m => m.id === row.infra_location_item_id)?.example_photo,
          isOk: null,
          backlogs: []
        })));
      }
      setLoading(false);
    };
    loadItems();
  }, [inspectionId]);

  const handleStatusChange = async (itemId: string, isOk: boolean) => {
    // Optimistic update
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, isOk } : i));

    const { error } = await supabase
      .from('infra_inspection_items')
      .update({ is_ok: isOk })
      .eq('id', itemId);

    if (error) {
      toast.error('Failed to save status');
      // Revert
      setItems(prev => prev.map(i => i.id === itemId ? { ...i, isOk: null } : i));
    }
  };

  const openNewBacklogDialog = (itemId: string) => {
    setActiveBacklogItem(itemId);
    setActiveBacklogId(null);
    setBacklogDesc('');
    setBacklogRisk(null);
    setBacklogPhoto(null);
    setPendingBacklogFile(null);
  };

  const openEditBacklogDialog = (itemId: string, backlog: BacklogData) => {
    setActiveBacklogItem(itemId);
    setActiveBacklogId(backlog.id);
    setBacklogDesc(backlog.description);
    setBacklogRisk(backlog.risk);
    setBacklogPhoto(backlog.photo || null);
    setPendingBacklogFile(null);
  };

  const handleDeleteBacklog = async (itemId: string, backlogId: string) => {
    if (!window.confirm('Are you sure you want to delete this backlog?')) return;
    
    // Optimistic delete
    setItems(prev => prev.map(i => i.id === itemId ? {
      ...i,
      backlogs: (i.backlogs || []).filter(b => b.id !== backlogId)
    } : i));

    const { error } = await supabase.from('infra_backlogs').delete().eq('id', backlogId);
    if (error) {
      toast.error('Failed to delete backlog: ' + error.message);
    } else {
      toast.success('Backlog deleted');
    }
  };

  const submitBacklog = async () => {
    if (!backlogDesc.trim() || backlogRisk === null || !activeBacklogItem) return;

    const item = items.find(i => i.id === activeBacklogItem);
    if (!item) return;

    if (activeBacklogId) {
      // Update existing backlog
      const { error } = await supabase
        .from('infra_backlogs')
        .update({ description: backlogDesc.trim(), risk_score: backlogRisk })
        .eq('id', activeBacklogId);

      if (error) { toast.error(error.message); return; }

      let photoUrl = backlogPhoto;
      if (pendingBacklogFile) {
        setUploadingBacklog(true);
        const uploadResult = await uploadBacklogPhoto(pendingBacklogFile, activeBacklogId);
        if (uploadResult) {
          photoUrl = (uploadResult.url && uploadResult.url.startsWith('http'))
            ? uploadResult.url
            : `${import.meta.env.VITE_WORKER_URL}/images/infra-backlog/${uploadResult.key}`;
          
          await supabase.from('infra_backlog_photos').upsert({
            backlog_id: activeBacklogId,
            photo_url: photoUrl
          }, { onConflict: 'backlog_id' });
        }
        setUploadingBacklog(false);
      }

      setItems(prev => prev.map(i =>
        i.id === activeBacklogItem
          ? {
              ...i,
              backlogs: (i.backlogs || []).map(b => b.id === activeBacklogId ? { ...b, description: backlogDesc.trim(), risk: backlogRisk!, photo: photoUrl || undefined } : b)
            }
          : i
      ));
      toast.success('Backlog updated');
    } else {
      // Find an empty auto-created backlog from triggers
      const emptyBacklog = (item.backlogs || []).find(b => !b.description || b.description.trim() === '');
      let newId: string;
      let finalPhotoUrl = backlogPhoto;

      if (emptyBacklog) {
        // Reuse empty auto-created backlog
        const { error } = await supabase
          .from('infra_backlogs')
          .update({ description: backlogDesc.trim(), risk_score: backlogRisk })
          .eq('id', emptyBacklog.id);
        
        if (error) { toast.error(error.message); return; }
        newId = emptyBacklog.id;
      } else {
        // Insert new manually
        const { data: insp } = await supabase
          .from('infra_inspections')
          .select('location_id')
          .eq('id', inspectionId)
          .single();

        const { data: newBacklog, error } = await supabase.from('infra_backlogs').insert({
          item_id: activeBacklogItem,
          location_id: insp?.location_id,
          title: item.description,
          description: backlogDesc.trim(),
          risk_score: backlogRisk,
          due_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        }).select('id').single();

        if (error) { toast.error(error.message); return; }
        newId = newBacklog.id;
      }

      // Handle photo upload for new backlog
      if (pendingBacklogFile) {
        setUploadingBacklog(true);
        const uploadResult = await uploadBacklogPhoto(pendingBacklogFile, newId);
        if (uploadResult) {
          finalPhotoUrl = (uploadResult.url && uploadResult.url.startsWith('http'))
            ? uploadResult.url
            : `${import.meta.env.VITE_WORKER_URL}/images/infra-backlog/${uploadResult.key}`;
          
          await supabase.from('infra_backlog_photos').upsert({
            backlog_id: newId,
            photo_url: finalPhotoUrl
          }, { onConflict: 'backlog_id' });
        }
        setUploadingBacklog(false);
      }

      if (emptyBacklog) {
        setItems(prev => prev.map(i =>
          i.id === activeBacklogItem
            ? {
                ...i,
                backlogs: (i.backlogs || []).map(b => b.id === newId ? { ...b, description: backlogDesc.trim(), risk: backlogRisk!, photo: finalPhotoUrl || undefined } : b)
              }
            : i
        ));
      } else {
        setItems(prev => prev.map(i =>
          i.id === activeBacklogItem
            ? {
                ...i,
                backlogs: [...(i.backlogs || []), { id: newId, description: backlogDesc.trim(), risk: backlogRisk!, photo: finalPhotoUrl || undefined }]
              }
            : i
        ));
      }
      toast.success('Backlog saved');
    }

    cancelBacklog();
  };

  const cancelBacklog = () => {
    setActiveBacklogItem(null);
    setActiveBacklogId(null);
    setBacklogDesc('');
    setBacklogRisk(null);
    setBacklogPhoto(null);
    setPendingBacklogFile(null);
  };

  const handleCloseInspection = async () => {
    setSubmitting(true);
    const { error } = await supabase
      .from('infra_inspections')
      .update({ status: 'submitted' })
      .eq('id', inspectionId);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Inspection closed successfully!');
      onComplete();
    }
    setSubmitting(false);
  };
  
  const handlePhotoClick = (itemId: string) => {
    activePhotoItemId.current = itemId;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const itemId = activePhotoItemId.current;
    
    if (!file || !itemId) return;
    
    setUploadingItem(itemId);
    const toastId = toast.loading('Uploading photo...');

    try {
      // 1. Upload via Service (handles JWT and Worker endpoint)
      const result = await uploadInfraPhoto(file, inspectionId, itemId);
      
      if (!result) throw new Error('Upload failed');

      const photoUrl = (result.url && result.url.startsWith('http'))
        ? result.url
        : `${import.meta.env.VITE_WORKER_URL}/images/infra-inspection/${result.key}`;

      // 2. Save to Supabase
      const { error: dbError } = await supabase
        .from('infra_item_photos')
        .upsert(
          { item_id: itemId, photo_url: photoUrl },
          { onConflict: 'item_id' }
        );

      if (dbError) throw dbError;

      // 3. Update State
      setItems(prev => prev.map(i => i.id === itemId ? { ...i, photo: photoUrl } : i));
      toast.success('Photo uploaded', { id: toastId });

    } catch (error: any) {
      console.error('Upload Error:', error);
      toast.error(`Upload failed: ${error.message}`, { id: toastId });
    } finally {
      setUploadingItem(null);
      activePhotoItemId.current = null;
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const progress = items.length === 0 ? 0 : Math.round((items.filter(i => i.isOk !== null).length / items.length) * 100);
  const nokWithoutBacklog = items.filter(i => i.isOk === false && (!i.backlogs || i.backlogs.filter(b => b.description?.trim()).length === 0)).length;
  const isComplete = progress === 100 && nokWithoutBacklog === 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 opacity-60">
        <FaSpinner className="animate-spin text-2xl" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up pb-36">
      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*" 
        onChange={handleFileChange} 
      />

      {/* Sticky Header / Progress */}
      <div className="flex items-center justify-between mb-4 sticky top-0 z-10 p-4 rounded-xl border border-white/10 backdrop-blur-md shadow-lg"
           style={{ background: activeTheme.container.color }}>
        <div>
          <h2 className="text-lg font-bold">Inspection In Progress</h2>
          <div className="text-sm opacity-60">{locationName} – Period {period}</div>
        </div>
        <div className="text-right">
          <div className={`text-2xl font-bold ${isComplete ? 'text-emerald-500' : 'text-blue-500'}`}>{progress}%</div>
          <div className="text-xs opacity-50">Completed</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1.5 bg-white/10 rounded-full mb-6 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${isComplete ? 'bg-emerald-500' : 'bg-blue-500'}`}
             style={{ width: `${progress}%` }} />
      </div>

      {/* Items */}
      <div className="space-y-4">
        {items.map(item => (
          <div key={item.id}
               className={`p-4 rounded-xl border transition-all duration-300 ${
                 item.isOk === false ? 'border-red-500/50 bg-red-500/5' :
                 item.isOk === true  ? 'border-emerald-500/50 bg-emerald-500/5' :
                 'border-white/10 bg-white/5'
               }`}>
            <div className="flex gap-4">
              <div className="flex-1">
                <p className="font-medium mb-3">{item.description}</p>
                <div className="flex flex-wrap gap-3 items-center">
                  <button 
                    onClick={() => handlePhotoClick(item.id)}
                    disabled={uploadingItem === item.id}
                    className={`p-2 rounded-lg border border-dashed flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition-colors ${
                      item.photo ? 'border-blue-500 text-blue-500 bg-blue-500/10' : 'border-white/20 opacity-60 hover:opacity-100'
                    }`}>
                    {uploadingItem === item.id ? (
                      <FaSpinner className="animate-spin" />
                    ) : (
                      <FaCamera />
                    )}
                    {uploadingItem === item.id ? 'Uploading...' : item.photo ? 'Retake' : 'Add Photo'}
                  </button>
                  
                  {item.photo && (
                    <a href={item.photo} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:text-blue-300 underline">
                      View Taken Photo
                    </a>
                  )}

                  {item.examplePhoto && (
                    <a href={item.examplePhoto} target="_blank" rel="noopener noreferrer" className="text-xs text-purple-400 hover:text-purple-300 underline flex items-center gap-1.5 border-l border-white/10 pl-3">
                      <FaImage size={10} /> View Example
                    </a>
                  )}

                  <div className="h-6 w-px bg-white/10" />

                  <div className="flex bg-black/20 p-1 rounded-lg">
                    <button onClick={() => handleStatusChange(item.id, true)}
                      className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 text-sm font-bold transition-all ${
                        item.isOk === true ? 'bg-emerald-500 text-white shadow-lg' : 'opacity-50 hover:opacity-100'
                      }`}>
                      <FaCheck size={11} /> OK
                    </button>
                    <button onClick={() => handleStatusChange(item.id, false)}
                      className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 text-sm font-bold transition-all ${
                        item.isOk === false ? 'bg-red-500 text-white shadow-lg' : 'opacity-50 hover:opacity-100'
                      }`}>
                      <FaTimes size={11} /> NOK
                    </button>
                  </div>

                  {item.isOk === false && (
                    <button onClick={() => openNewBacklogDialog(item.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                        item.backlogs?.some(b => b.description?.trim())
                          ? 'bg-amber-500/20 border border-amber-500/40 text-amber-400 hover:bg-amber-500/30'
                          : 'bg-red-600/20 border border-red-500/40 text-red-400 hover:bg-red-600/30 animate-pulse'
                      }`}>
                      <FaPlus size={10} />
                      {item.backlogs?.some(b => b.description?.trim()) ? 'Add Another Backlog' : 'Add Backlog'}
                    </button>
                  )}
                </div>

                {item.isOk === false && item.backlogs && item.backlogs.some(b => b.description?.trim()) && (
                  <div className="mt-3 space-y-2">
                    {item.backlogs.filter(b => b.description?.trim()).map(bl => (
                      <div key={bl.id} className="p-3 rounded-lg bg-red-400/10 border border-red-400/20 text-sm">
                        <div className="flex items-center gap-2 text-red-400 font-bold mb-1">
                          <FaExclamationTriangle size={12} />
                          Issue Reported
                          <span className={`ml-auto px-2 py-0.5 rounded text-white text-xs ${RISK_COLORS[bl.risk] || 'bg-gray-500'}`}>
                            Risk {bl.risk}
                          </span>
                          <button onClick={() => openEditBacklogDialog(item.id, bl)} className="text-white/60 hover:text-white ml-2">Edit</button>
                          <button onClick={() => handleDeleteBacklog(item.id, bl.id)} className="text-red-400/60 hover:text-red-400 ml-2">Delete</button>
                        </div>
                        <p className="opacity-80 text-xs mb-2">{bl.description}</p>
                        {bl.photo && (
                          <a href={bl.photo} target="_blank" rel="noopener noreferrer" className="inline-block relative group">
                            <img src={bl.photo} alt="Backlog" className="w-20 h-20 object-cover rounded-lg border border-white/10" />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                              <FaImage className="text-white" />
                            </div>
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Close Inspection Button */}
      <div className="fixed bottom-6 right-6 left-6 md:left-auto md:w-96">
        <button
          disabled={!isComplete || submitting}
          onClick={handleCloseInspection}
          className={`w-full py-4 rounded-xl font-bold shadow-2xl flex items-center justify-center gap-2 transition-all duration-300 ${
            isComplete && !submitting
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
              : 'bg-white/5 border border-white/10 opacity-50 cursor-not-allowed'
          }`}>
          {submitting ? (
            <><FaSpinner className="animate-spin" /> Closing…</>
          ) : isComplete ? (
            <><FaClipboardCheck /> Close Inspection</>
          ) : progress < 100 ? (
            <><FaLock size={13} /> Close Inspection ({progress}% done)</>
          ) : (
            <><FaLock size={13} /> {nokWithoutBacklog} NOK item{nokWithoutBacklog > 1 ? 's' : ''} missing backlog</>
          )}
        </button>
      </div>

      {/* Backlog Dialog */}
      {activeBacklogItem && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-start justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto pt-10 md:pt-24">
          <div className="w-full max-w-md rounded-2xl shadow-2xl border border-white/10 overflow-hidden animate-fade-in-up mb-10"
               style={{ background: activeTheme.container.color }}>
            <div className="p-5 border-b border-white/10 flex justify-between items-center">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <FaExclamationTriangle className="text-red-400" /> Report Issue
              </h3>
              <button onClick={cancelBacklog} className="opacity-50 hover:opacity-100 transition-opacity"><FaTimes /></button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-bold mb-2 opacity-70">Description *</label>
                <textarea value={backlogDesc} onChange={e => setBacklogDesc(e.target.value)} rows={3}
                  placeholder="Describe the issue..."
                  className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-sm focus:outline-none focus:border-blue-500 transition-colors resize-none" />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2 opacity-70">Risk Level *</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(r => (
                    <button key={r} onClick={() => setBacklogRisk(r)}
                      className={`flex-1 py-2.5 rounded-lg font-bold text-sm transition-all ${
                        backlogRisk === r ? `${RISK_COLORS[r]} text-white shadow-lg scale-105` : 'bg-white/5 border border-white/10 hover:bg-white/10 opacity-70'
                      }`}>{r}</button>
                  ))}
                </div>
                <div className="flex justify-between text-xs opacity-40 mt-1 px-1"><span>Low</span><span>High</span></div>
              </div>

              <div>
                <label className="block text-sm font-bold mb-2 opacity-70">Photo Evidence</label>
                <div className="flex items-center gap-4">
                  {(backlogPhoto || pendingBacklogFile) ? (
                    <div className="relative w-24 h-24 rounded-xl overflow-hidden border border-white/10 group">
                      <img 
                        src={pendingBacklogFile ? URL.createObjectURL(pendingBacklogFile) : backlogPhoto!} 
                        alt="Preview" 
                        className="w-full h-full object-cover" 
                      />
                      <button 
                        onClick={() => { setBacklogPhoto(null); setPendingBacklogFile(null); }}
                        className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <FaTimes className="text-white" />
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/*';
                        input.onchange = (e) => {
                          const file = (e.target as HTMLInputElement).files?.[0];
                          if (file) setPendingBacklogFile(file);
                        };
                        input.click();
                      }}
                      className="w-24 h-24 rounded-xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-1 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all text-sm opacity-60 hover:opacity-100"
                    >
                      <FaCamera className="text-lg" />
                      <span>Photo</span>
                    </button>
                  )}
                  <div className="flex-1 text-xs opacity-50">
                    <p>Take or upload a photo to document this specific issue.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 pt-0 flex gap-3">
              <button onClick={cancelBacklog}
                className="flex-1 py-3 rounded-xl border border-white/10 font-bold hover:bg-white/5 transition-colors">
                Cancel
              </button>
              <button onClick={submitBacklog} disabled={!backlogDesc.trim() || backlogRisk === null || uploadingBacklog}
                className={`flex-1 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                  backlogDesc.trim() && backlogRisk !== null && !uploadingBacklog ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-white/5 opacity-40 cursor-not-allowed'
                }`}>
                {uploadingBacklog ? <FaSpinner className="animate-spin" /> : 'Save Backlog'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default InspectionForm;
