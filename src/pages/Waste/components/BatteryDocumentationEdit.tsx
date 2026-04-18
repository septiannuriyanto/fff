import React, { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate, useParams } from 'react-router-dom';
import {
  TbArrowLeft,
  TbBattery,
  TbCamera,
  TbChecklist,
  TbPhoto,
  TbSend,
  TbTrash,
  TbEdit,
  TbLoader,
} from 'react-icons/tb';
import ThemedPanelContainer from '../../../common/ThemedComponents/ThemedPanelContainer';
import { hexToRgba, useTheme } from '../../../contexts/ThemeContext';
import { supabase } from '../../../db/SupabaseClient';
import { useAuth } from '../../Authentication/AuthContext';
import { sendTelegramMessageViaEdgeFunction } from '../../../services/TelegramSender';

interface BatteryRecordDraft {
  bassReferenceNumber: string;
  classificationN: string;
  customClassificationN: string;
  notes: string;
  photoFile: File | null;
  photoPreview: string;
  existingPhotoUrl?: string; // Cache for editing
}

interface BatteryRecordItem {
  id: string;
  bassReferenceNumber: string;
  classificationN: string;
  ampere: number;
  notes: string;
  photoFile: File | null; // Null if using existing photo
  photoPreview: string;
  existingPhotoUrl?: string;
}

const classificationOptions = ['20', '50', '70', '75', '100', '150', '200', 'OTHER'] as const;

const emptyDraft: BatteryRecordDraft = {
  bassReferenceNumber: '',
  classificationN: '',
  customClassificationN: '',
  notes: '',
  photoFile: null,
  photoPreview: '',
};

const formatDisplayDate = (date: Date) =>
  new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date);

const BatteryDocumentationEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { activeTheme } = useTheme();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const latestDraftPreviewRef = useRef('');
  const latestRecordPreviewsRef = useRef<string[]>([]);

  const [docNo, setDocNo] = useState('');
  const [creatorName, setCreatorName] = useState('');
  const [reportDate, setReportDate] = useState<Date>(new Date());
  const [planLoadingDate, setPlanLoadingDate] = useState('');
  const [draft, setDraft] = useState<BatteryRecordDraft>(emptyDraft);
  const [records, setRecords] = useState<BatteryRecordItem[]>([]);
  const [isDraftPreviewOwned, setIsDraftPreviewOwned] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  
  // Dirty state tracking
  const [initialPlanLoadingDate, setInitialPlanLoadingDate] = useState('');
  const [initialRecordsJson, setInitialRecordsJson] = useState('');

  // Fetch Initial Data
  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;

      try {
        setIsInitialLoading(true);
        const { data: report, error: reportError } = await supabase
          .from('battery_documentation_reports')
          .select('*, manpower:created_by_nrp(nama)')
          .eq('id', id)
          .single();

        if (reportError) throw reportError;
        
        setDocNo(report.doc_no);
        setPlanLoadingDate(report.plan_loading_date || '');
        setReportDate(new Date(report.created_at));
        setCreatorName((report.manpower as any)?.nama || report.created_by_nrp);

        // Fetch Report Items
        const { data: items, error: itemsError } = await supabase
          .from('battery_documentation_items')
          .select('*')
          .eq('report_id', id)
          .order('line_no', { ascending: true });

        if (itemsError) throw itemsError;

        const mappedRecords: BatteryRecordItem[] = items.map((item: any) => ({
          id: item.id,
          bassReferenceNumber: item.bass_reference_number,
          classificationN: String(item.classification_n),
          ampere: Number(item.ampere),
          notes: item.notes || '',
          photoFile: null,
          photoPreview: item.photo_url,
          existingPhotoUrl: item.photo_url,
        }));

        setRecords(mappedRecords);
        setInitialRecordsJson(JSON.stringify(mappedRecords));
        setInitialPlanLoadingDate(report.plan_loading_date || '');
      } catch (error: any) {
        console.error('Error fetching report:', error);
        toast.error('Failed to load report data: ' + error.message);
        navigate('/waste/battery-documentation');
      } finally {
        setIsInitialLoading(false);
      }
    };

    fetchData();
  }, [id, navigate]);

  useEffect(() => {
    latestDraftPreviewRef.current = draft.photoPreview;
  }, [draft.photoPreview]);

  useEffect(() => {
    latestRecordPreviewsRef.current = records.map((record) => record.photoPreview);
  }, [records]);

  useEffect(() => {
    return () => {
      if (latestDraftPreviewRef.current && isDraftPreviewOwned) {
        URL.revokeObjectURL(latestDraftPreviewRef.current);
      }

      // We only revoke URLs we created (not existingPhotoUrls which are external)
      // Actually, in Edit mode, we need to be careful.
    };
  }, [isDraftPreviewOwned]);

  const borderColor = activeTheme.container.borderColor;
  const textColor = activeTheme.container.textColor;
  const primaryColor = activeTheme.ui.primaryColor;
  const buttonTheme = activeTheme.button.primary;
  const secondaryButtonTheme = activeTheme.button.secondary;
  const tertiaryButtonTheme = activeTheme.button.tertiary;
  const softPrimary = hexToRgba(primaryColor, 0.08) ?? 'rgba(59,130,246,0.08)';
  const softBorder = hexToRgba(primaryColor, 0.18) ?? 'rgba(59,130,246,0.18)';
  const mutedBg =
    hexToRgba(activeTheme.container.borderColor, activeTheme.baseTheme === 'dark' ? 0.16 : 0.08) ??
    'rgba(148,163,184,0.08)';

  const grandTotalAmpere = useMemo(
    () => records.reduce((total, record) => total + record.ampere, 0),
    [records],
  );

  const resolvedClassificationValue = useMemo(() => {
    if (draft.classificationN === 'OTHER') {
      return draft.customClassificationN.trim();
    }
    return draft.classificationN.trim();
  }, [draft.classificationN, draft.customClassificationN]);

  const resolvedAmpere = useMemo(() => {
    const parsed = Number(resolvedClassificationValue);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }, [resolvedClassificationValue]);

  const hasChanges = useMemo(() => {
    if (isInitialLoading) return false;
    
    const isPlanDateChanged = planLoadingDate !== initialPlanLoadingDate;
    const currentRecordsJson = JSON.stringify(records);
    const isRecordsChanged = currentRecordsJson !== initialRecordsJson;
    
    return isPlanDateChanged || isRecordsChanged;
  }, [planLoadingDate, initialPlanLoadingDate, records, initialRecordsJson, isInitialLoading]);

  const handleDraftChange =
    (
      field: keyof Omit<
        BatteryRecordDraft,
        'photoFile' | 'photoPreview' | 'classificationN' | 'customClassificationN' | 'existingPhotoUrl'
      >,
    ) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setDraft((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const handleClassificationSelect = (value: (typeof classificationOptions)[number]) => {
    setDraft((prev) => ({
      ...prev,
      classificationN: value,
      customClassificationN: value === 'OTHER' ? prev.customClassificationN : '',
    }));
  };

  const handleCustomClassificationChange = (event: ChangeEvent<HTMLInputElement>) => {
    const sanitizedValue = event.target.value.replace(/\D/g, '');
    setDraft((prev) => ({
      ...prev,
      customClassificationN: sanitizedValue,
    }));
  };

  const handleFileSelect = (file: File | null) => {
    if (!file) return;

    if (draft.photoPreview && isDraftPreviewOwned) {
      URL.revokeObjectURL(draft.photoPreview);
    }

    const previewUrl = URL.createObjectURL(file);
    setDraft((prev) => ({
      ...prev,
      photoFile: file,
      photoPreview: previewUrl,
    }));
    setIsDraftPreviewOwned(true);
  };

  const resetDraft = () => {
    if (draft.photoPreview && isDraftPreviewOwned) {
      URL.revokeObjectURL(draft.photoPreview);
    }

    setDraft(emptyDraft);
    setIsDraftPreviewOwned(false);
    setEditingRecordId(null);

    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const validateDraft = () => {
    if (!draft.photoPreview) {
      toast.error('Foto baterai wajib ada.');
      return false;
    }

    if (!draft.bassReferenceNumber.trim()) {
      toast.error('BASS Reference Number wajib diisi.');
      return false;
    }

    if (!draft.classificationN.trim()) {
      toast.error('Klasifikasi N wajib diisi.');
      return false;
    }

    if (draft.classificationN === 'OTHER' && !draft.customClassificationN.trim()) {
      toast.error('Other harus diisi angka.');
      return false;
    }

    if (resolvedAmpere <= 0) {
      toast.error('Nilai ampere harus lebih dari 0.');
      return false;
    }

    return true;
  };

  const handleAddRecord = () => {
    if (!validateDraft()) return;

    if (editingRecordId) {
      setRecords((prev) =>
        prev.map((r) =>
          r.id === editingRecordId
            ? {
                ...r,
                bassReferenceNumber: draft.bassReferenceNumber.trim().toUpperCase(),
                classificationN: resolvedClassificationValue.trim().toUpperCase().replace(/^N/i, ''),
                ampere: resolvedAmpere,
                notes: draft.notes.trim(),
                photoFile: draft.photoFile,
                photoPreview: draft.photoPreview,
                existingPhotoUrl: draft.existingPhotoUrl,
              }
            : r,
        ),
      );
      toast.success('Record baterai diperbarui.');
    } else {
      const nextRecord: BatteryRecordItem = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        bassReferenceNumber: draft.bassReferenceNumber.trim().toUpperCase(),
        classificationN: resolvedClassificationValue.trim().toUpperCase().replace(/^N/i, ''),
        ampere: resolvedAmpere,
        notes: draft.notes.trim(),
        photoFile: draft.photoFile,
        photoPreview: draft.photoPreview,
        existingPhotoUrl: draft.existingPhotoUrl,
      };

      setRecords((prev) => [nextRecord, ...prev]);
      toast.success('Record baterai ditambahkan.');
    }
    resetDraft();
  };

  const handleDeleteRecord = (id: string) => {
    setRecords((prev) => {
      const target = prev.find((item) => item.id === id);
      // Only revoke if we created the object URL
      if (target?.photoPreview && target.photoPreview.startsWith('blob:')) {
        URL.revokeObjectURL(target.photoPreview);
      }
      return prev.filter((item) => item.id !== id);
    });
  };

  const handleSubmit = async () => {
    if (records.length === 0) {
      toast.error('Minimal harus ada 1 record sebelum submit.');
      return;
    }

    if (!planLoadingDate) {
      toast.error('Plan Loading Date wajib diisi.');
      return;
    }

    try {
      setIsSubmitting(true);
      const workerUrl = import.meta.env.VITE_WORKER_URL;
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) throw new Error('Session expired');

      const reportDateStr = reportDate.toISOString().slice(0, 10);

      const uploadedItems = await Promise.all(
        records.map(async (record, index) => {
          // If it's a new photo, upload it
          if (record.photoFile) {
            const uploadResponse = await fetch(`${workerUrl}/upload/battery-documentation`, {
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'X-Report-Date': reportDateStr,
                'X-Bass-Reference': record.bassReferenceNumber,
                'X-Line-No': String(index + 1),
                'X-File-Name': record.photoFile.name,
                'Content-Type': record.photoFile.type || 'image/jpeg',
              },
              body: record.photoFile,
            });

            if (!uploadResponse.ok) throw new Error(await uploadResponse.text());

            const uploadResult = await uploadResponse.json();
            const photoUrl = uploadResult.url && String(uploadResult.url).startsWith('http')
              ? uploadResult.url
              : `${workerUrl}/documents/battery-documentation/${uploadResult.key}`;

            return {
              line_no: index + 1,
              bass_reference_number: record.bassReferenceNumber,
              classification_n: record.classificationN,
              ampere: record.ampere,
              photo_url: photoUrl,
              photo_path: uploadResult.key,
              notes: record.notes || null,
            };
          }

          // Use existing photo
          return {
            line_no: index + 1,
            bass_reference_number: record.bassReferenceNumber,
            classification_n: record.classificationN,
            ampere: record.ampere,
            photo_url: record.photoPreview,
            notes: record.notes || null,
          };
        }),
      );

      const { error } = await supabase.rpc('rpc_update_battery_documentation_report', {
        p_report_id: id,
        p_plan_loading_date: planLoadingDate,
        p_items: uploadedItems,
      });

      if (error) throw error;

      // Send Telegram Notification (Edge)
      try {
        const message = `🔄 *BATTERY DOCUMENTATION RESUBMITTED*\n\n` +
          `*Doc No:* ${docNo}\n` +
          `*Qty:* ${records.length} Items / ${grandTotalAmpere} Amp\n` +
          `*Resubmitted By:* ${(currentUser as any)?.nama || currentUser?.nrp}\n\n` +
          `_Please re-check for approval._`;
        
        await sendTelegramMessageViaEdgeFunction(message, '60');
      } catch (err) {
        console.error('Failed to send resubmit notification:', err);
      }

      toast.success(`Report ${docNo} updated and resubmitted.`);
      navigate('/waste/battery-documentation', {
        replace: true,
        state: { shouldRefresh: true },
      });
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Submit gagal diproses.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isInitialLoading) {
    return (
      <ThemedPanelContainer title="Edit Battery Documentation">
        <div className="flex h-64 items-center justify-center gap-3 opacity-60">
          <TbLoader className="animate-spin" size={24} />
          <span className="text-sm font-medium">Loading report data...</span>
        </div>
      </ThemedPanelContainer>
    );
  }

  return (
    <ThemedPanelContainer title={`Edit Report: ${docNo}`}>
      <div className="space-y-5">
        <div className="flex items-center justify-start">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold"
            style={{
              backgroundColor: tertiaryButtonTheme.color,
              color: tertiaryButtonTheme.textColor,
              borderRadius: tertiaryButtonTheme.borderRadius,
              border: `${tertiaryButtonTheme.borderWidth} ${tertiaryButtonTheme.border} ${tertiaryButtonTheme.borderColor}`,
            }}
          >
            <TbArrowLeft size={18} />
            Back
          </button>
        </div>

        <section
          className="grid gap-4 rounded-2xl border p-4 md:grid-cols-2"
          style={{ borderColor, backgroundColor: softPrimary }}
        >
          <div className="rounded-xl border p-4" style={{ borderColor: softBorder, backgroundColor: mutedBg }}>
            <div className="mb-2 flex items-center gap-2">
              <TbChecklist size={18} style={{ color: primaryColor }} />
              <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: textColor }}>
                Header Info
              </p>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] opacity-70" style={{ color: textColor }}>
                  Created Date
                </p>
                <p className="mt-1 text-base font-semibold" style={{ color: textColor }}>
                  {formatDisplayDate(reportDate)}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.16em] opacity-70" style={{ color: textColor }}>
                  Original Creator
                </p>
                <p className="mt-1 text-base font-semibold" style={{ color: textColor }}>
                  {creatorName}
                </p>
              </div>
              <div>
                <label className="mb-2 block text-xs uppercase tracking-[0.16em] opacity-70" style={{ color: textColor }}>
                  Plan Loading Date
                </label>
                <input
                  type="date"
                  value={planLoadingDate}
                  onChange={(e) => setPlanLoadingDate(e.target.value)}
                  className="w-full rounded-xl border px-4 py-3 text-sm outline-none"
                  style={{ borderColor, color: textColor, backgroundColor: activeTheme.input.color }}
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl border p-4" style={{ borderColor: softBorder, backgroundColor: mutedBg }}>
            <div className="mb-2 flex items-center gap-2">
              <TbBattery size={18} style={{ color: primaryColor }} />
              <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: textColor }}>
                Edit Policy
              </p>
            </div>
            <div className="space-y-2 text-sm leading-6" style={{ color: textColor }}>
              <p>Anda sedang merubah laporan yang membutuhkan perbaikan.</p>
              <p>Setelah di-submit, status laporan akan berubah menjadi <span className="font-bold text-orange-500">RESUBMITTED</span> untuk diperiksa kembali.</p>
              <p>Anda bisa mengganti foto atau menyesuaikan data tiap record.</p>
            </div>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <div ref={formRef} className="rounded-2xl border p-5" style={{ borderColor, backgroundColor: mutedBg }}>
             <div className="mb-4 flex items-center gap-2">
              <TbCamera size={20} style={{ color: primaryColor }} />
              <h3 className="text-lg font-semibold" style={{ color: textColor }}>Add/Update Record</h3>
            </div>
            
            <div className="space-y-4">
               <div>
                <label className="mb-2 block text-sm font-medium" style={{ color: textColor }}>Foto Baterai</label>
                <div className="rounded-2xl border border-dashed p-4" style={{ borderColor: softBorder, backgroundColor: hexToRgba(primaryColor, 0.04) }}>
                  <div className="flex flex-wrap gap-3">
                    <button type="button" onClick={() => cameraInputRef.current?.click()} className="inline-flex items-center gap-2 px-4 py-2" style={{ backgroundColor: buttonTheme.color, color: buttonTheme.textColor, borderRadius: '12px' }}>
                      <TbCamera /> Foto Baru
                    </button>
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-2 px-4 py-2" style={{ backgroundColor: secondaryButtonTheme.color, color: secondaryButtonTheme.textColor, borderRadius: '12px' }}>
                      <TbPhoto /> Upload Baru
                    </button>
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileSelect(e.target.files?.[0] || null)} />
                  <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFileSelect(e.target.files?.[0] || null)} />
                  
                  <div className="mt-4">
                    {draft.photoPreview ? (
                      <img src={draft.photoPreview} alt="Preview" className="h-48 w-full rounded-xl object-cover" />
                    ) : (
                      <div className="flex h-48 items-center justify-center rounded-xl bg-black/5 text-sm">Preview</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium">BASS Ref</label>
                  <input type="text" value={draft.bassReferenceNumber} onChange={handleDraftChange('bassReferenceNumber')} className="w-full rounded-xl border p-3" style={{ borderColor, backgroundColor: activeTheme.input.color }} />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Klasifikasi N</label>
                  <select 
                    value={draft.classificationN} 
                    onChange={(e) => handleClassificationSelect(e.target.value as any)}
                    className="w-full rounded-xl border p-3"
                    style={{ borderColor, backgroundColor: activeTheme.input.color }}
                  >
                    <option value="">Pilih N</option>
                    {classificationOptions.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              </div>

              {draft.classificationN === 'OTHER' && (
                <div>
                  <label className="mb-2 block text-sm font-medium">Custom N</label>
                  <input type="text" value={draft.customClassificationN} onChange={handleCustomClassificationChange} className="w-full rounded-xl border p-3" style={{ borderColor }} />
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-medium">Notes</label>
                <textarea value={draft.notes} onChange={handleDraftChange('notes')} className="w-full rounded-xl border p-3" style={{ borderColor }} />
              </div>

              <div className="flex gap-3">
                <button onClick={handleAddRecord} className="flex-1 rounded-xl py-3 font-bold text-white transition-all hover:opacity-90" style={{ backgroundColor: primaryColor }}>
                  {editingRecordId ? 'Update Record' : 'Add to List'}
                </button>
                <button onClick={resetDraft} className="rounded-xl border px-6 py-3 font-bold" style={{ borderColor }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border p-5" style={{ borderColor }}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold" style={{ color: textColor }}>Records ({records.length})</h3>
              <div className="text-right">
                <p className="text-xs opacity-60">Total Ampere</p>
                <p className="text-lg font-bold" style={{ color: primaryColor }}>{grandTotalAmpere}</p>
              </div>
            </div>

            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {records.map((r) => (
                <div key={r.id} className="flex gap-3 rounded-2xl border p-3" style={{ borderColor }}>
                  <img src={r.photoPreview} className="h-20 w-20 rounded-xl object-cover" />
                  <div className="flex-1">
                    <p className="text-xs font-bold text-primary">N{r.classificationN} - {r.ampere}A</p>
                    <p className="text-sm font-semibold">{r.bassReferenceNumber}</p>
                    {r.notes && <p className="text-[10px] opacity-60 truncate max-w-[150px]">{r.notes}</p>}
                  </div>
                  <div className="flex flex-col gap-2">
                    <button 
                      title="Edit Item"
                      onClick={() => {
                       setDraft({
                         bassReferenceNumber: r.bassReferenceNumber,
                         classificationN: classificationOptions.includes(r.classificationN as any) ? r.classificationN as any : 'OTHER',
                         customClassificationN: !classificationOptions.includes(r.classificationN as any) ? r.classificationN : '',
                         notes: r.notes,
                         photoFile: r.photoFile,
                         photoPreview: r.photoPreview,
                         existingPhotoUrl: r.existingPhotoUrl,
                       });
                       setEditingRecordId(r.id);
                       // Scroll to form ref
                       formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }} className="p-2 text-primary hover:bg-primary/10 rounded-lg"><TbEdit /></button>
                    <button onClick={() => handleDeleteRecord(r.id)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg"><TbTrash /></button>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={handleSubmit}
              disabled={isSubmitting || records.length === 0 || !hasChanges}
              className="mt-6 w-full flex items-center justify-center gap-2 rounded-2xl py-4 text-base font-bold text-white shadow-lg transition-all hover:scale-[1.01] disabled:opacity-50 disabled:grayscale-[0.5] disabled:cursor-not-allowed"
              style={{ backgroundColor: primaryColor, boxShadow: !hasChanges ? 'none' : `0 8px 20px ${hexToRgba(primaryColor, 0.3)}` }}
            >
              {isSubmitting ? <TbLoader className="animate-spin" /> : <TbSend />}
              {hasChanges ? 'Submit Changes & Resubmit' : 'No Changes Detected'}
            </button>
          </div>
        </section>
      </div>
    </ThemedPanelContainer>
  );
};

export default BatteryDocumentationEdit;
