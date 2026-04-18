import React, { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import {
  TbArrowLeft,
  TbBattery,
  TbCamera,
  TbChecklist,
  TbPhoto,
  TbPlus,
  TbSend,
  TbTrash,
  TbUser,
  TbZoomIn,
  TbX,
} from 'react-icons/tb';
import ThemedPanelContainer from '../../../common/ThemedComponents/ThemedPanelContainer';
import { hexToRgba, useTheme } from '../../../contexts/ThemeContext';
import { supabase } from '../../../db/SupabaseClient';
import { useAuth } from '../../Authentication/AuthContext';
import { sendTelegramMessageViaEdgeFunction } from '../../../services/TelegramSender';
import TelegramTestButton from '../../../common/TelegramTestButton';

interface BatteryRecordDraft {
  bassReferenceNumber: string;
  classificationN: string;
  customClassificationN: string;
  notes: string;
  photoFile: File | null;
  photoPreview: string;
}

interface BatteryRecordItem {
  id: string;
  bassReferenceNumber: string;
  classificationN: string;
  ampere: number;
  notes: string;
  photoFile: File;
  photoPreview: string;
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

const formatInputDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const BatteryDocumentationAdd: React.FC = () => {
  const { activeTheme } = useTheme();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const latestDraftPreviewRef = useRef('');
  const latestRecordPreviewsRef = useRef<string[]>([]);

  const [creatorName, setCreatorName] = useState('');
  const [isLoadingCreator, setIsLoadingCreator] = useState(false);
  const [planLoadingDate, setPlanLoadingDate] = useState(formatInputDate(new Date()));
  const [draft, setDraft] = useState<BatteryRecordDraft>(emptyDraft);
  const [records, setRecords] = useState<BatteryRecordItem[]>([]);
  const [zoomedRecord, setZoomedRecord] = useState<BatteryRecordItem | null>(null);
  const [isDraftPreviewOwned, setIsDraftPreviewOwned] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const today = useMemo(() => new Date(), []);

  useEffect(() => {
    const fetchCreatorName = async () => {
      if (!currentUser?.nrp) return;

      try {
        setIsLoadingCreator(true);
        const { data, error } = await supabase
          .from('manpower')
          .select('nama')
          .eq('nrp', currentUser.nrp)
          .single();

        if (error) throw error;
        setCreatorName(data?.nama || currentUser.nrp);
      } catch (error) {
        console.error('Failed to fetch creator name:', error);
        setCreatorName(currentUser.nrp);
      } finally {
        setIsLoadingCreator(false);
      }
    };

    fetchCreatorName();
  }, [currentUser?.nrp]);

  useEffect(() => {
    latestDraftPreviewRef.current = draft.photoPreview;
  }, [draft.photoPreview]);

  useEffect(() => {
    latestRecordPreviewsRef.current = records.map((record) => record.photoPreview);
  }, [records]);

  useEffect(() => {
    return () => {
      if (latestDraftPreviewRef.current) {
        URL.revokeObjectURL(latestDraftPreviewRef.current);
      }

      latestRecordPreviewsRef.current.forEach((preview) => {
        if (preview) {
          URL.revokeObjectURL(preview);
        }
      });
    };
  }, []);

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

  const summaryByClassification = useMemo(() => {
    return records.reduce<Record<string, number>>((acc, record) => {
      const key = `N${record.classificationN}`;
      acc[key] = (acc[key] || 0) + record.ampere;
      return acc;
    }, {});
  }, [records]);

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

  const handleDraftChange =
    (
      field: keyof Omit<
        BatteryRecordDraft,
        'photoFile' | 'photoPreview' | 'classificationN' | 'customClassificationN'
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

    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const validateDraft = () => {
    if (!draft.photoFile) {
      toast.error('Foto baterai wajib diambil sebelum record ditambahkan.');
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
    if (!validateDraft() || !draft.photoFile) return;

    const nextRecord: BatteryRecordItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      bassReferenceNumber: draft.bassReferenceNumber.trim().toUpperCase(),
      classificationN: resolvedClassificationValue.trim().toUpperCase().replace(/^N/i, ''),
      ampere: resolvedAmpere,
      notes: draft.notes.trim(),
      photoFile: draft.photoFile,
      photoPreview: draft.photoPreview,
    };

    setRecords((prev) => [nextRecord, ...prev]);
    toast.success('Record baterai ditambahkan.');

    setDraft(emptyDraft);
    setIsDraftPreviewOwned(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const handleDeleteRecord = (id: string) => {
    setRecords((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target?.photoPreview) {
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

    if (!currentUser?.nrp) {
      toast.error('NRP user tidak ditemukan.');
      return;
    }

    try {
      setIsSubmitting(true);
      const workerUrl = import.meta.env.VITE_WORKER_URL;
      if (!workerUrl) {
        throw new Error('VITE_WORKER_URL is not configured');
      }

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error('Authentication failed. Please log in again.');
      }

      const reportDate = today.toISOString().slice(0, 10);
      const uploadedItems = await Promise.all(
        records.map(async (record, index) => {
          const uploadResponse = await fetch(`${workerUrl}/upload/battery-documentation`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'X-Report-Date': reportDate,
              'X-Bass-Reference': record.bassReferenceNumber,
              'X-Line-No': String(index + 1),
              'X-File-Name': record.photoFile.name,
              'Content-Type': record.photoFile.type || 'image/jpeg',
            },
            body: record.photoFile,
          });

          if (!uploadResponse.ok) {
            throw new Error(await uploadResponse.text());
          }

          const uploadResult = await uploadResponse.json();
          const photoUrl =
            uploadResult.url && String(uploadResult.url).startsWith('http')
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
        }),
      );

      const { data, error } = await supabase.rpc('rpc_create_battery_documentation_report', {
        p_created_by_nrp: currentUser.nrp,
        p_plan_loading_date: planLoadingDate,
        p_remarks: null,
        p_items: uploadedItems,
      });

      if (error) throw error;

      const docNo = data?.[0]?.doc_no || '';

      // Send Telegram Notification (Edge)
      try {
        const message = `🔋 *NEW BATTERY DOCUMENTATION*\n\n` +
          `*Doc No:* ${docNo}\n` +
          `*Qty:* ${uploadedItems.length} Items / ${grandTotalAmpere} Amp\n` +
          `*Plan Loading:* ${planLoadingDate || '-'}\n` +
          `*Created By:* ${creatorName || currentUser?.nrp}\n\n` +
          `_Please check for approval._`;

        await sendTelegramMessageViaEdgeFunction(message, '60');
      } catch (err) {
        console.error('Failed to send submit notification:', err);
      }

      toast.success(`Report ${docNo} berhasil dibuat.`);
      navigate('/waste/battery-documentation', {
        replace: true,
        state: { shouldRefresh: true },
      });
    } catch (error) {
      console.error(error);
      toast.error((error as Error).message || 'Submit gagal diproses.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate('/waste/battery-documentation', { replace: true });
  };

  return (
    <ThemedPanelContainer title="Add Battery Documentation">
      <div className="space-y-5">
        <div className="flex items-center justify-start">
          <button
            type="button"
            onClick={handleBack}
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
          style={{
            borderColor,
            backgroundColor: softPrimary,
          }}
        >
          <div className="rounded-xl border p-4" style={{ borderColor: softBorder, backgroundColor: mutedBg }}>
            <div className="mb-2 flex items-center gap-2">
              <TbChecklist size={18} style={{ color: primaryColor }} />
              <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: textColor }}>
                Header
              </p>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] opacity-70" style={{ color: textColor }}>
                  Tanggal
                </p>
                <p className="mt-1 text-base font-semibold" style={{ color: textColor }}>
                  {formatDisplayDate(today)}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.16em] opacity-70" style={{ color: textColor }}>
                  Created By
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="text-base font-semibold" style={{ color: textColor }}>
                    {isLoadingCreator ? 'Loading...' : creatorName || '-'}
                  </span>
                  <span
                    className="inline-flex items-center rounded-full px-3 py-1 text-xs font-bold"
                    style={{
                      backgroundColor: hexToRgba(primaryColor, 0.14),
                      color: primaryColor,
                      border: `1px solid ${softBorder}`,
                    }}
                  >
                    Payload NRP: {currentUser?.nrp || '-'}
                  </span>
                </div>
              </div>
              <div>
                <label
                  htmlFor="plan-loading-date"
                  className="mb-2 block text-xs uppercase tracking-[0.16em] opacity-70"
                  style={{ color: textColor }}
                >
                  Plan Loading Date
                </label>
                <input
                  id="plan-loading-date"
                  type="date"
                  value={planLoadingDate}
                  onChange={(event) => setPlanLoadingDate(event.target.value)}
                  className="w-full rounded-xl border px-4 py-3 text-sm outline-none"
                  style={{
                    borderColor,
                    color: textColor,
                    backgroundColor: activeTheme.input.color,
                  }}
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl border p-4" style={{ borderColor: softBorder, backgroundColor: mutedBg }}>
            <div className="mb-2 flex items-center gap-2">
              <TbBattery size={18} style={{ color: primaryColor }} />
              <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: textColor }}>
                Konsep Identifikasi
              </p>
            </div>
            <div className="space-y-2 text-sm leading-6" style={{ color: textColor }}>
              <p>Ambil foto baterai satu per satu, lalu identifikasi baterai yang sedang difoto.</p>
              <p>Setiap record wajib punya foto, BASS Reference Number, klasifikasi `N`, dan nilai ampere.</p>
              <p>Grand total di footer otomatis dihitung berdasarkan klasifikasi `N` dari semua record yang sudah ditambahkan.</p>
            </div>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border p-5" style={{ borderColor, backgroundColor: mutedBg }}>
            <div className="mb-4 flex items-center gap-2">
              <TbCamera size={20} style={{ color: primaryColor }} />
              <h3 className="text-lg font-semibold" style={{ color: textColor }}>
                Body
              </h3>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium" style={{ color: textColor }}>
                  Foto Baterai
                </label>
                <div
                  className="rounded-2xl border border-dashed p-4"
                  style={{
                    borderColor: softBorder,
                    backgroundColor: hexToRgba(primaryColor, 0.04),
                  }}
                >
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold"
                      style={{
                        backgroundColor: buttonTheme.color,
                        color: buttonTheme.textColor,
                        borderRadius: buttonTheme.borderRadius,
                        border: `${buttonTheme.borderWidth} ${buttonTheme.border} ${buttonTheme.borderColor}`,
                        boxShadow: buttonTheme.shadow,
                      }}
                    >
                      <TbCamera size={18} />
                      Foto Sekarang
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold"
                      style={{
                        backgroundColor: secondaryButtonTheme.color,
                        color: secondaryButtonTheme.textColor,
                        borderRadius: secondaryButtonTheme.borderRadius,
                        border: `${secondaryButtonTheme.borderWidth} ${secondaryButtonTheme.border} ${secondaryButtonTheme.borderColor}`,
                      }}
                    >
                      <TbPhoto size={18} />
                      Upload Gallery
                    </button>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => handleFileSelect(event.target.files?.[0] || null)}
                  />
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(event) => handleFileSelect(event.target.files?.[0] || null)}
                  />

                  <div className="mt-4">
                    {draft.photoPreview ? (
                      <img
                        src={draft.photoPreview}
                        alt="Battery preview"
                        className="h-56 w-full rounded-2xl object-cover"
                      />
                    ) : (
                      <div
                        className="flex h-56 items-center justify-center rounded-2xl text-sm"
                        style={{
                          backgroundColor: mutedBg,
                          color: textColor,
                          border: `1px dashed ${softBorder}`,
                        }}
                      >
                        Preview foto akan muncul di sini
                      </div>
                    )}
                  </div>
                </div>
              </div>


              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium" style={{ color: textColor }}>
                  Klasifikasi N
                </label>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {classificationOptions.map((option) => {
                    const isActive = draft.classificationN === option;
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => handleClassificationSelect(option)}
                        className="rounded-xl border px-4 py-3 text-sm font-semibold transition-all duration-200"
                        style={{
                          borderColor: isActive ? primaryColor : borderColor,
                          backgroundColor: isActive ? hexToRgba(primaryColor, 0.14) : activeTheme.input.color,
                          color: isActive ? primaryColor : textColor,
                          boxShadow: isActive ? `0 0 0 1px ${hexToRgba(primaryColor, 0.16)}` : 'none',
                        }}
                      >
                        {option === 'OTHER' ? 'Other' : `N ${option}`}
                      </button>
                    );
                  })}
                </div>
              </div>



              <div>
                <label className="mb-2 block text-sm font-medium" style={{ color: textColor }}>
                  Other
                </label>
                <div className="relative">
                  <span
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold"
                    style={{ color: textColor }}
                  >
                    N
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={draft.customClassificationN}
                    onChange={handleCustomClassificationChange}
                    disabled={draft.classificationN !== 'OTHER'}
                    placeholder="Isi angka jika pilih Other"
                    className="w-full rounded-xl border py-3 pl-9 pr-4 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-60"
                    style={{ borderColor, color: textColor, backgroundColor: activeTheme.input.color }}
                  />
                </div>
              </div>


              <div>
                <label className="mb-2 block text-sm font-medium" style={{ color: textColor }}>
                  Ampere
                </label>
                <input
                  type="text"
                  value={resolvedAmpere || ''}
                  readOnly
                  placeholder="Otomatis dari klasifikasi N"
                  className="w-full rounded-xl border px-4 py-3 text-sm outline-none"
                  style={{ borderColor, color: textColor, backgroundColor: activeTheme.input.color }}
                />
              </div>


              <div>
                <label className="mb-2 block text-sm font-medium" style={{ color: textColor }}>
                  BASS Reference Number
                </label>
                <input
                  type="text"
                  value={draft.bassReferenceNumber}
                  onChange={handleDraftChange('bassReferenceNumber')}
                  placeholder="Contoh: BASS-001245"
                  className="w-full rounded-xl border px-4 py-3 text-sm outline-none"
                  style={{ borderColor, color: textColor, backgroundColor: activeTheme.input.color }}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium" style={{ color: textColor }}>
                  Catatan
                </label>
                <textarea
                  value={draft.notes}
                  onChange={handleDraftChange('notes')}
                  rows={4}
                  placeholder="Opsional, misalnya kondisi fisik atau temuan identifikasi."
                  className="w-full rounded-xl border px-4 py-3 text-sm outline-none"
                  style={{ borderColor, color: textColor, backgroundColor: activeTheme.input.color }}
                />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleAddRecord}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold"
                style={{
                  backgroundColor: buttonTheme.color,
                  color: buttonTheme.textColor,
                  borderRadius: buttonTheme.borderRadius,
                  border: `${buttonTheme.borderWidth} ${buttonTheme.border} ${buttonTheme.borderColor}`,
                  boxShadow: buttonTheme.shadow,
                }}
              >
                <TbPlus size={18} />
                Add Record
              </button>

              <button
                type="button"
                onClick={resetDraft}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold"
                style={{
                  backgroundColor: tertiaryButtonTheme.color,
                  color: tertiaryButtonTheme.textColor,
                  borderRadius: tertiaryButtonTheme.borderRadius,
                  border: `${tertiaryButtonTheme.borderWidth} ${tertiaryButtonTheme.border} ${tertiaryButtonTheme.borderColor}`,
                }}
              >
                Reset Form
              </button>
            </div>
          </div>

          <div className="rounded-2xl border p-5" style={{ borderColor }}>
            <div className="mb-4 flex items-center gap-2">
              <TbUser size={20} style={{ color: primaryColor }} />
              <h3 className="text-lg font-semibold" style={{ color: textColor }}>
                Records
              </h3>
            </div>

            {records.length === 0 ? (
              <div
                className="flex min-h-[240px] items-center justify-center rounded-2xl border border-dashed text-sm"
                style={{ borderColor: softBorder, color: textColor, backgroundColor: mutedBg }}
              >
                Belum ada record. Tambahkan minimal 1 record untuk submit.
              </div>
            ) : (
              <div className="grid max-h-[720px] grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
                {records.map((record, index) => (
                  <div
                    key={record.id}
                    className="group relative overflow-hidden rounded-2xl border"
                    style={{ borderColor, backgroundColor: mutedBg }}
                  >
                    <div
                      className="absolute inset-0"
                      style={{
                        backgroundImage: `url(${record.photoPreview})`,
                        backgroundPosition: 'center',
                        backgroundSize: 'cover',
                      }}
                    />
                    <div
                      className="absolute inset-0"
                      style={{
                        background:
                          'linear-gradient(180deg, rgba(15,23,42,0.28) 0%, rgba(15,23,42,0.38) 30%, rgba(15,23,42,0.68) 100%)',
                      }}
                    />
                    <div
                      className="absolute inset-0"
                      style={{
                        background:
                          'radial-gradient(circle at center, rgba(15,23,42,0.02) 0%, rgba(15,23,42,0.1) 40%, rgba(15,23,42,0.32) 100%)',
                      }}
                    />

                    <div
                      className="absolute left-0 top-0 z-10 rounded-br-2xl px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em]"
                      style={{
                        backgroundColor: hexToRgba(primaryColor, 0.82),
                        color: buttonTheme.textColor,
                        borderRight: `1px solid ${hexToRgba(primaryColor, 0.32)}`,
                        borderBottom: `1px solid ${hexToRgba(primaryColor, 0.32)}`,
                      }}
                    >
                      Item {index + 1}
                    </div>

                    <div className="absolute right-3 top-3 z-10 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setZoomedRecord(record)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border backdrop-blur-sm"
                        style={{
                          borderColor: 'rgba(255,255,255,0.24)',
                          backgroundColor: 'rgba(15,23,42,0.28)',
                          color: '#fff',
                        }}
                      >
                        <TbZoomIn size={18} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteRecord(record.id)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border backdrop-blur-sm"
                        style={{
                          borderColor: 'rgba(255,255,255,0.24)',
                          backgroundColor: 'rgba(15,23,42,0.28)',
                          color: '#fff',
                        }}
                      >
                        <TbTrash size={18} />
                      </button>
                    </div>

                    <div className="relative flex min-h-[220px] flex-col justify-end p-4 text-center">
                      <div className="rounded-2xl border px-4 py-4 backdrop-blur-[2px]" style={{ borderColor: 'rgba(255,255,255,0.14)', backgroundColor: 'rgba(15,23,42,0.18)' }}>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/75">
                          N{record.classificationN}
                        </p>
                        <p className="mt-2 text-4xl font-black tracking-tight text-white">
                          {record.ampere}
                        </p>
                        <p className="text-lg font-bold text-white">
                          Amp
                        </p>
                        <p className="mt-4 line-clamp-2 text-sm font-semibold text-white">
                          {record.bassReferenceNumber}
                        </p>
                        {record.notes && (
                          <p className="mt-2 line-clamp-2 text-xs text-white/80">
                            {record.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section
          className="rounded-2xl border p-5"
          style={{
            borderColor,
            backgroundColor: softPrimary,
          }}
        >
          <div className="mb-4 flex items-center gap-2">
            <TbChecklist size={20} style={{ color: primaryColor }} />
            <h3 className="text-lg font-semibold" style={{ color: textColor }}>
              Footer Summary
            </h3>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-6">
              {Object.keys(summaryByClassification).length === 0 ? (
                <div
                  className="rounded-xl border border-dashed px-4 py-5 text-sm col-span-2 xl:col-span-6"
                  style={{ borderColor: softBorder, color: textColor }}
                >
                  Belum ada klasifikasi yang bisa dihitung.
                </div>
              ) : (
                Object.entries(summaryByClassification)
                  .sort(([left], [right]) => left.localeCompare(right, undefined, { numeric: true }))
                  .map(([classification, total]) => (
                    <div
                      key={classification}
                      className="rounded-xl border px-4 py-4 xl:col-span-2"
                      style={{ borderColor: softBorder, backgroundColor: mutedBg }}
                    >
                      <p className="text-xs uppercase tracking-[0.16em] opacity-70" style={{ color: textColor }}>
                        {classification}
                      </p>
                      <p className="mt-1 text-2xl font-bold" style={{ color: textColor }}>
                        {total} Amp
                      </p>
                    </div>
                  ))
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 xl:grid-cols-6">
              <div
                className="rounded-xl border px-4 py-4 col-span-2 xl:col-span-6"
                style={{ borderColor: softBorder, backgroundColor: mutedBg }}
              >
                <p className="text-xs uppercase tracking-[0.16em] opacity-70" style={{ color: textColor }}>
                  Grand Total Ampere
                </p>
                <p className="mt-1 text-2xl font-bold" style={{ color: textColor }}>
                  {grandTotalAmpere} Amp
                </p>
                <p className="mt-1 text-sm opacity-70" style={{ color: textColor }}>
                  {records.length} record teridentifikasi
                </p>
              </div>
            </div>

            {/* <div className="mb-4">
               <TelegramTestButton contextName="Battery Documentation Add" />
            </div> */}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={records.length === 0 || isSubmitting}
              className="inline-flex w-full items-center justify-center gap-2 px-4 py-3 text-sm font-semibold transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
              style={{
                backgroundColor: buttonTheme.color,
                color: buttonTheme.textColor,
                borderRadius: buttonTheme.borderRadius,
                border: `${buttonTheme.borderWidth} ${buttonTheme.border} ${buttonTheme.borderColor}`,
                boxShadow: buttonTheme.shadow,
              }}
            >
              <TbSend size={18} />
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </section>

        {zoomedRecord && (
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
            onClick={() => setZoomedRecord(null)}
          >
            <div
              className="relative w-full max-w-5xl overflow-hidden rounded-3xl border"
              style={{
                borderColor: softBorder,
                backgroundColor: activeTheme.container.color,
              }}
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setZoomedRecord(null)}
                className="absolute right-4 top-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border"
                style={{
                  borderColor: 'rgba(255,255,255,0.24)',
                  backgroundColor: 'rgba(15,23,42,0.55)',
                  color: '#fff',
                }}
              >
                <TbX size={20} />
              </button>

              <img
                src={zoomedRecord.photoPreview}
                alt={zoomedRecord.bassReferenceNumber}
                className="max-h-[80vh] w-full object-contain"
              />

              <div
                className="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-4"
                style={{ borderColor: softBorder, backgroundColor: mutedBg }}
              >
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] opacity-70" style={{ color: textColor }}>
                    {zoomedRecord.bassReferenceNumber}
                  </p>
                  <p className="mt-1 text-lg font-bold" style={{ color: textColor }}>
                    N{zoomedRecord.classificationN} · {zoomedRecord.ampere} Amp
                  </p>
                </div>
                {zoomedRecord.notes && (
                  <p className="max-w-2xl text-sm opacity-80" style={{ color: textColor }}>
                    {zoomedRecord.notes}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </ThemedPanelContainer>
  );
};

export default BatteryDocumentationAdd;
