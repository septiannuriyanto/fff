import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type FormEvent,
} from 'react';
import toast from 'react-hot-toast';
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  ChevronLeft,
  Droplets,
  Edit2,
  Gauge,
  ImageIcon,
  MapPin,
  RefreshCw,
  Plus,
  RotateCcw,
  Save,
  Search,
  Trash2,
  Upload,
  Warehouse,
} from 'lucide-react';
import ThemedPanelContainer from '../../../common/ThemedComponents/ThemedPanelContainer';
import ThemedGlassmorphismPanel from '../../../common/ThemedComponents/ThemedGlassmorphismPanel';
import { useTheme } from '../../../contexts/ThemeContext';
import { supabase } from '../../../db/SupabaseClient';

type WarehouseOption = {
  warehouse_id: string;
  unit_id: string | null;
  source: 'FUEL' | 'OIL';
  status?: string | null;
  alias?: string | null;
  location?: string | null;
  type?: string | null;
};

type FlowmeterMappingRecord = {
  id: string;
  warehouse_code: string | null;
  material_type: string | null;
  location: string | null;
  serial_number: string | null;
  type: string | null;
  function: string | null;
  front_photo_url: string | null;
  sn_photo_url: string | null;
  installation_position: string | null;
  recorded_at: string;
};

type FlowmeterForm = {
  warehouse_code: string;
  material_type: string;
  location: string;
  serial_number: string;
  type: string;
  function: string;
  installation_position: string;
  recorded_at: string;
};

type FlowmeterDraft = FlowmeterForm & {
  draftId: string;
  front_photo_base64: string | null;
  sn_photo_base64: string | null;
  front_photo_name: string | null;
  sn_photo_name: string | null;
};

const MATERIAL_TYPE_OPTIONS = ['FUEL', 'OIL'];
const METER_TYPE_OPTIONS = [
  'Mechanical',
  'Digital',
  'Oval Gear',
  'Turbine',
  'Positive Displacement',
];
const FUNCTION_OPTIONS = ['Receiving', 'Issuing', 'Transfer', 'Return', 'Calibration'];

const toLocalDateTimeInput = (date = new Date()) => {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

const initialForm = (): FlowmeterForm => ({
  warehouse_code: '',
  material_type: MATERIAL_TYPE_OPTIONS[0],
  location: '',
  serial_number: '',
  type: '',
  function: '',
  installation_position: '',
  recorded_at: toLocalDateTimeInput(),
});

const sanitizePathPart = (value: string) =>
  value.trim().replace(/[^a-zA-Z0-9-_]/g, '-').replace(/-+/g, '-').slice(0, 80);

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message?: unknown }).message === 'string'
  ) {
    return (error as { message: string }).message;
  }
  return 'Terjadi kesalahan. Silakan coba lagi.';
};

const formatRecordedAt = (value: string | null) => {
  if (!value) return '-';

  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
};

interface FieldLabelProps {
  label: string;
  required?: boolean;
  color: string;
}

const FieldLabel = ({ label, required = false, color }: FieldLabelProps) => (
  <label className="mb-2.5 block text-sm font-medium" style={{ color }}>
    {label}
    {required && <span className="ml-1 inline-block h-2 w-2 rounded-full bg-meta-1" />}
  </label>
);

interface PhotoDropzoneProps {
  inputKey: number;
  id: string;
  title: string;
  file: File | null;
  previewUrl: string;
  hasValue: boolean;
  panelStyle: CSSProperties;
  textColor: string;
  mutedColor: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
}

const PhotoDropzone = ({
  inputKey,
  id,
  title,
  file,
  previewUrl,
  hasValue,
  panelStyle,
  textColor,
  mutedColor,
  onChange,
  onClear,
}: PhotoDropzoneProps) => (
  <div className="min-h-[14rem]" style={panelStyle}>
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2">
        <Camera size={17} className="shrink-0 text-primary" />
        <p className="truncate text-sm font-semibold" style={{ color: textColor }}>
          {title}
        </p>
      </div>
      {hasValue && (
        <button
          type="button"
          onClick={onClear}
          className="shrink-0 text-xs font-semibold text-meta-1 hover:opacity-80"
        >
          Clear
        </button>
      )}
    </div>

    <label
      htmlFor={id}
      className="mt-4 flex h-42.5 cursor-pointer flex-col items-center justify-center gap-3 overflow-hidden rounded border border-dashed transition hover:border-primary"
      style={{
        borderColor: panelStyle.borderColor,
        color: mutedColor,
      }}
    >
      {previewUrl ? (
        <img src={previewUrl} alt={title} className="h-full w-full object-cover" />
      ) : (
        <>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Upload size={22} />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium" style={{ color: textColor }}>
              Upload photo
            </p>
            <p className="text-xs" style={{ color: mutedColor }}>
              JPG, PNG, or HEIC
            </p>
          </div>
        </>
      )}
    </label>

    <input
      key={`${id}-${inputKey}`}
      id={id}
      type="file"
      accept="image/*"
      className="hidden"
      onChange={onChange}
    />

    <div className="mt-3 flex items-center gap-2 text-xs" style={{ color: mutedColor }}>
      <ImageIcon size={14} className="shrink-0" />
      <span className="truncate">{file?.name ?? (previewUrl ? 'Existing photo' : 'No file selected')}</span>
    </div>
  </div>
);

const hexToRgba = (hex: string, alpha: number) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const OilFlowmeterMapping = () => {
  const { activeTheme } = useTheme();
  const isDark = activeTheme.baseTheme === 'dark';

  const [form, setForm] = useState<FlowmeterForm>(() => initialForm());
  const [fuelWarehouses, setFuelWarehouses] = useState<WarehouseOption[]>([]);
  const [oilWarehouses, setOilWarehouses] = useState<WarehouseOption[]>([]);
  const [records, setRecords] = useState<FlowmeterMappingRecord[]>([]);
  const [editingRecord, setEditingRecord] = useState<FlowmeterMappingRecord | null>(null);
  const [frontPhotoFile, setFrontPhotoFile] = useState<File | null>(null);
  const [snPhotoFile, setSnPhotoFile] = useState<File | null>(null);
  const [existingFrontPhotoUrl, setExistingFrontPhotoUrl] = useState('');
  const [existingSnPhotoUrl, setExistingSnPhotoUrl] = useState('');
  const [frontPreviewUrl, setFrontPreviewUrl] = useState('');
  const [snPreviewUrl, setSnPreviewUrl] = useState('');
  const [fileInputKey, setFileInputKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [oilMaterials, setOilMaterials] = useState<string[]>([]);

  // New navigation states
  const [viewMode, setViewMode] = useState<'SELECT_MATERIAL' | 'WAREHOUSE_LIST' | 'DETAIL' | 'FORM'>('SELECT_MATERIAL');
  const [selectedMaterial, setSelectedMaterial] = useState<'FUEL' | 'OIL' | null>(null);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<'FUEL' | 'OIL' | string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<FlowmeterDraft[]>([]);

  const inputTheme = activeTheme.input;
  const containerTheme = activeTheme.container;
  const gridTheme = activeTheme.grid;
  const primaryButton = activeTheme.button.primary;
  const secondaryButton = activeTheme.button.secondary;
  const mutedText = gridTheme.secondaryTextColor || hexToRgba(containerTheme.textColor, isDark ? 0.7 : 0.62) || containerTheme.textColor;
  const panelBackground =
    hexToRgba(gridTheme.backgroundColor, isDark ? 0.18 : 0.76) ||
    (isDark ? 'rgba(255,255,255,0.04)' : '#F7F9FC');

  const inputStyle: CSSProperties = {
    backgroundColor: inputTheme.color,
    color: inputTheme.textColor,
    borderColor: inputTheme.borderColor,
    borderWidth: inputTheme.borderWidth,
    borderRadius: inputTheme.borderRadius,
    boxShadow: inputTheme.shadow,
    opacity: inputTheme.opacity,
  };

  const panelStyle: CSSProperties = {
    backgroundColor: panelBackground,
    border: `1px solid ${containerTheme.borderColor}`,
    borderColor: containerTheme.borderColor,
    borderRadius: activeTheme.card.borderRadius,
    color: containerTheme.textColor,
  };

  const softPanelStyle: CSSProperties = {
    ...panelStyle,
    padding: '1rem',
  };

  const primaryButtonStyle: CSSProperties = {
    backgroundColor: primaryButton.color,
    color: primaryButton.textColor,
    borderRadius: primaryButton.borderRadius,
    borderColor: primaryButton.borderColor,
    borderWidth: primaryButton.borderWidth,
    boxShadow: primaryButton.shadow,
  };

  const secondaryButtonStyle: CSSProperties = {
    backgroundColor: secondaryButton.color,
    color: secondaryButton.textColor,
    borderRadius: secondaryButton.borderRadius,
    borderColor: secondaryButton.borderColor,
    borderWidth: secondaryButton.borderWidth,
  };

  const warehousesWithStatus = useMemo(() => {
    if (!selectedMaterial) return [];
    const sourceWarehouses = selectedMaterial === 'OIL' ? oilWarehouses : fuelWarehouses;

    return sourceWarehouses.map((w) => {
      const mappings = records.filter(
        (r) => r.warehouse_code === w.warehouse_id && r.material_type === selectedMaterial,
      );
      return {
        ...w,
        isMapped: mappings.length > 0,
        mappingRecords: mappings,
      };
    });
  }, [selectedMaterial, fuelWarehouses, oilWarehouses, records]);

  const filteredWarehouses = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return warehousesWithStatus;

    return warehousesWithStatus.filter((w) =>
      [w.warehouse_id, w.unit_id, w.location, w.alias].some((val) =>
        val?.toLowerCase()?.includes(query),
      ),
    );
  }, [warehousesWithStatus, searchQuery]);

  const handleSelectMaterial = (material: 'FUEL' | 'OIL') => {
    setSelectedMaterial(material);
    setViewMode('WAREHOUSE_LIST');
    setSearchQuery('');
  };

  const handleWarehouseClick = (warehouse: (typeof warehousesWithStatus)[0]) => {
    setSelectedWarehouseId(warehouse.warehouse_id);
    if (warehouse.isMapped) {
      setViewMode('DETAIL');
    } else {
      setShowConfirmation(true);
    }
  };

  const confirmAddMapping = () => {
    const warehouse = warehousesWithStatus.find((w) => w.warehouse_id === selectedWarehouseId);
    if (!warehouse || !selectedMaterial) return;

    resetForm();
    setForm((prev) => ({
      ...prev,
      warehouse_code: warehouse.warehouse_id,
      material_type: selectedMaterial,
      location: warehouse.location ?? '',
      type: selectedMaterial === 'FUEL' ? 'DIESEL FUEL' : '',
    }));
    setViewMode('FORM');
    setShowConfirmation(false);
  };

  const handleBack = () => {
    if (viewMode === 'WAREHOUSE_LIST') {
      setViewMode('SELECT_MATERIAL');
      setSelectedMaterial(null);
    } else if (viewMode === 'DETAIL' || viewMode === 'FORM') {
      setViewMode('WAREHOUSE_LIST');
      setSelectedWarehouseId(null);
      if (viewMode === 'FORM') resetForm();
    }
  };

  const fetchMappings = useCallback(async () => {
    const { data, error } = await supabase
      .from('flowmeter_mapping')
      .select('id, warehouse_code, material_type, location, serial_number, type, function, front_photo_url, sn_photo_url, recorded_at')
      .order('recorded_at', { ascending: false })
      .limit(50);

    if (error) {
      toast.error(`Gagal memuat mapping: ${error.message}`);
      return;
    }

    setRecords((data || []) as FlowmeterMappingRecord[]);
  }, []);

  const fetchReferenceData = useCallback(async () => {
    setLoading(true);

    try {
      const [storageResult, oilStorageResult] = await Promise.all([
        supabase
          .from('storage')
          .select('warehouse_id, unit_id, status')
          .neq('status', 'OUT')
          .order('unit_id', { ascending: true }),
        supabase
          .from('storage_oil')
          .select('warehouse_id, unit_id, location, type, alias')
          .order('unit_id', { ascending: true }),
      ]);

      if (storageResult.error) {
        toast.error(`Gagal memuat fuel storage: ${storageResult.error.message}`);
      } else {
        const fuelRows = ((storageResult.data || []) as Array<{
          warehouse_id: string;
          unit_id: string | null;
          status: string | null;
        }>).map((warehouse) => ({
          ...warehouse,
          source: 'FUEL' as const,
          location: null,
          type: null,
          alias: null,
        }));

        setFuelWarehouses(fuelRows);
      }

      if (oilStorageResult.error) {
        toast.error(`Gagal memuat oil storage: ${oilStorageResult.error.message}`);
      } else {
        const oilRows = ((oilStorageResult.data || []) as Array<{
          warehouse_id: string;
          unit_id: string | null;
          location: string | null;
          type: string | null;
          alias: string | null;
        }>).map((warehouse) => ({
          ...warehouse,
          source: 'OIL' as const,
          status: null,
        }));

        setOilWarehouses(oilRows);
      }

      // Fetch Oil Materials
      const materialsResult = await supabase
        .from('materials')
        .select('item_description')
        .eq('material_group', 'OIL')
        .order('item_description', { ascending: true });

      if (materialsResult.error) {
        toast.error(`Gagal memuat oil materials: ${materialsResult.error.message}`);
      } else {
        setOilMaterials((materialsResult.data || []).map((m) => m.item_description).filter(Boolean));
      }

      await fetchMappings();
    } finally {
      setLoading(false);
    }
  }, [fetchMappings]);

  useEffect(() => {
    void fetchReferenceData();
  }, [fetchReferenceData]);

  useEffect(() => {
    const savedDrafts = localStorage.getItem('flowmeter_mapping_drafts');
    if (savedDrafts) {
      try {
        setDrafts(JSON.parse(savedDrafts) as FlowmeterDraft[]);
      } catch (e) {
        console.error('Failed to parse drafts', e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('flowmeter_mapping_drafts', JSON.stringify(drafts));
  }, [drafts]);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const base64ToFile = (base64: string, filename: string): File => {
    const arr = base64.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  };

  useEffect(() => {
    return () => {
      if (frontPreviewUrl) URL.revokeObjectURL(frontPreviewUrl);
    };
  }, [frontPreviewUrl]);

  useEffect(() => {
    return () => {
      if (snPreviewUrl) URL.revokeObjectURL(snPreviewUrl);
    };
  }, [snPreviewUrl]);

  const resetForm = () => {
    setForm(initialForm());
    setEditingRecord(null);
    setFrontPhotoFile(null);
    setSnPhotoFile(null);
    setExistingFrontPhotoUrl('');
    setExistingSnPhotoUrl('');
    setFrontPreviewUrl('');
    setSnPreviewUrl('');
    setFileInputKey((key) => key + 1);
    setShowConfirmation(false);
  };


  const handlePhotoChange = (
    event: ChangeEvent<HTMLInputElement>,
    target: 'front' | 'serial-number',
  ) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('File harus berupa gambar.');
      return;
    }

    const previewUrl = URL.createObjectURL(file);

    if (target === 'front') {
      setFrontPhotoFile(file);
      setFrontPreviewUrl(previewUrl);
      return;
    }

    setSnPhotoFile(file);
    setSnPreviewUrl(previewUrl);
  };

  const clearPhoto = (target: 'front' | 'serial-number') => {
    if (target === 'front') {
      setFrontPhotoFile(null);
      setExistingFrontPhotoUrl('');
      setFrontPreviewUrl('');
      setFileInputKey((key) => key + 1);
      return;
    }

    setSnPhotoFile(null);
    setExistingSnPhotoUrl('');
    setSnPreviewUrl('');
    setFileInputKey((key) => key + 1);
  };

  const getAuthToken = async () => {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error || !session) {
      throw new Error('Authentication failed. Please log in again.');
    }

    return session.access_token;
  };

  const getWorkerUrl = () => {
    const workerUrl = import.meta.env.VITE_WORKER_URL;
    if (!workerUrl) throw new Error('VITE_WORKER_URL is not configured.');
    return workerUrl.replace(/\/$/, '');
  };

  const uploadPhoto = async (
    file: File | null,
    photoType: 'front' | 'serial-number',
    token: string,
    mappingId: string
  ) => {
    if (!file) return null;

    const response = await fetch(`${getWorkerUrl()}/upload/flowmeter-mapping`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': file.type || 'image/jpeg',
        'X-Flowmeter-Mapping-Id': mappingId,
        'X-Photo-Type': photoType,
        'X-File-Name': file.name,
      },
      body: file,
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(`Upload failed: ${message}`);
    }

    const result = (await response.json()) as { key?: string; url?: string };

    if (result.url?.startsWith('http')) return result.url;
    if (result.key) return `${getWorkerUrl()}/images/flowmeter-mapping/${result.key}`;

    throw new Error('Upload failed: worker did not return a direct image URL.');
  };

  const deletePhoto = async (photoUrl: string | null | undefined, token: string) => {
    if (!photoUrl) return true;

    const response = await fetch(
      `${getWorkerUrl()}/upload/flowmeter-mapping?url=${encodeURIComponent(photoUrl)}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    return response.ok;
  };

  const cleanupUploadedPhotos = async (photoUrls: string[], token: string) => {
    await Promise.allSettled(photoUrls.map((url) => deletePhoto(url, token)));
  };

  const handleEdit = (record: FlowmeterMappingRecord) => {
    const materialType = MATERIAL_TYPE_OPTIONS.includes(record.material_type || '')
      ? record.material_type || MATERIAL_TYPE_OPTIONS[0]
      : MATERIAL_TYPE_OPTIONS[0];

    setEditingRecord(record);
    setForm({
      warehouse_code: record.warehouse_code || '',
      material_type: materialType,
      location: record.location || '',
      serial_number: record.serial_number || '',
      type: record.type || '',
      function: record.function || '',
      installation_position: record.installation_position || '',
      recorded_at: record.recorded_at ? toLocalDateTimeInput(new Date(record.recorded_at)) : toLocalDateTimeInput(),
    });
    setFrontPhotoFile(null);
    setSnPhotoFile(null);
    setExistingFrontPhotoUrl(record.front_photo_url || '');
    setExistingSnPhotoUrl(record.sn_photo_url || '');
    setFrontPreviewUrl('');
    setSnPreviewUrl('');
    setFileInputKey((key) => key + 1);
    setViewMode('FORM');
  };

  const performUpload = async (
    data: FlowmeterForm,
    frontFile: File | null,
    snFile: File | null,
    existingFrontUrl: string,
    existingSnUrl: string,
    mappingId?: string,
    oldPhotoUrls: string[] = []
  ) => {
    const loadingToast = toast.loading(mappingId ? 'Mengupdate mapping...' : 'Menyimpan mapping...');
    setSaving(true);
    let token = '';
    const uploadedPhotoUrls: string[] = [];

    try {
      token = await getAuthToken();
      let frontPhotoUrl = existingFrontUrl || null;
      let snPhotoUrl = existingSnUrl || null;

      const uploadId = mappingId || sanitizePathPart(data.serial_number) || Date.now().toString();

      if (frontFile) {
        frontPhotoUrl = await uploadPhoto(frontFile, 'front', token, uploadId);
        if (frontPhotoUrl) uploadedPhotoUrls.push(frontPhotoUrl);
      }

      if (snFile) {
        snPhotoUrl = await uploadPhoto(snFile, 'serial-number', token, uploadId);
        if (snPhotoUrl) uploadedPhotoUrls.push(snPhotoUrl);
      }

      const payload = {
        warehouse_code: data.warehouse_code,
        material_type: data.material_type,
        location: data.location.trim() || null,
        serial_number: data.serial_number.trim(),
        type: data.material_type === 'FUEL' ? 'DIESEL FUEL' : (data.type.trim() || null),
        function: data.function.trim() || null,
        installation_position: data.installation_position.trim() || null,
        front_photo_url: frontPhotoUrl,
        sn_photo_url: snPhotoUrl,
        recorded_at: data.recorded_at ? new Date(data.recorded_at).toISOString() : new Date().toISOString(),
      };

      const { error } = mappingId
        ? await supabase.from('flowmeter_mapping').update(payload).eq('id', mappingId)
        : await supabase.from('flowmeter_mapping').insert([payload]);

      if (error) throw error;

      // Cleanup old photos if update successful and new photos uploaded
      if (mappingId && oldPhotoUrls.length) {
        await cleanupUploadedPhotos(oldPhotoUrls, token);
      }

      toast.dismiss(loadingToast);
      toast.success(mappingId ? 'Flowmeter mapping diperbarui.' : 'Flowmeter mapping tersimpan.');

      await fetchMappings();
      return true;
    } catch (error) {
      if (token && uploadedPhotoUrls.length) {
        await cleanupUploadedPhotos(uploadedPhotoUrls, token);
      }

      toast.dismiss(loadingToast);
      const message = getErrorMessage(error);
      const duplicateMessage =
        message.includes('flowmeter_mapping_serial_number_key') || message.toLowerCase().includes('duplicate')
          ? 'Serial number sudah terdaftar di flowmeter mapping.'
          : message;
      toast.error(duplicateMessage);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleUploadDraft = async (draft: FlowmeterDraft) => {
    const frontFile = draft.front_photo_base64 ? base64ToFile(draft.front_photo_base64, draft.front_photo_name || 'front.jpg') : null;
    const snFile = draft.sn_photo_base64 ? base64ToFile(draft.sn_photo_base64, draft.sn_photo_name || 'sn.jpg') : null;

    const success = await performUpload(draft, frontFile, snFile, '', '');
    if (success) {
      setDrafts((prev) => prev.filter((d) => d.draftId !== draft.draftId));
    }
  };

  const handleSaveDraft = async () => {
    try {
      const frontBase64 = frontPhotoFile ? await fileToBase64(frontPhotoFile) : null;
      const snBase64 = snPhotoFile ? await fileToBase64(snPhotoFile) : null;

      const newDraft: FlowmeterDraft = {
        ...form,
        draftId: Date.now().toString(),
        front_photo_base64: frontBase64,
        sn_photo_base64: snBase64,
        front_photo_name: frontPhotoFile?.name || null,
        sn_photo_name: snPhotoFile?.name || null,
      };

      setDrafts((prev) => [...prev, newDraft]);
      toast.success('Mapping disimpan sebagai draft.');
      resetForm();
      setViewMode('WAREHOUSE_LIST');
    } catch (error) {
      toast.error('Gagal menyimpan draft: ' + getErrorMessage(error));
    }
  };

  const handleDeleteDraft = (draftId: string) => {
    setDrafts((prev) => prev.filter((d) => d.draftId !== draftId));
    toast.success('Draft dihapus.');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;

    if (!form.warehouse_code || !form.material_type || !form.serial_number.trim()) {
      toast.error('Warehouse, material type, dan serial number wajib diisi.');
      return;
    }

    const oldPhotoUrls = editingRecord
      ? [
        frontPhotoFile ? editingRecord.front_photo_url : null,
        snPhotoFile ? editingRecord.sn_photo_url : null,
      ].filter((url): url is string => Boolean(url))
      : [];

    const success = await performUpload(
      form,
      frontPhotoFile,
      snPhotoFile,
      existingFrontPhotoUrl,
      existingSnPhotoUrl,
      editingRecord?.id,
      oldPhotoUrls
    );
    if (success) {
      resetForm();
      setViewMode('WAREHOUSE_LIST');
      setSelectedWarehouseId(null);
    }
  };

  const handleDelete = async (record: FlowmeterMappingRecord) => {
    if (!window.confirm(`Delete mapping ${record.serial_number || record.warehouse_code || ''}?`)) return;

    const loadingToast = toast.loading('Menghapus flowmeter mapping...');
    setDeletingId(record.id);

    try {
      const token = await getAuthToken();
      const { error } = await supabase.from('flowmeter_mapping').delete().eq('id', record.id);
      if (error) throw error;

      const imageDeletes = await Promise.allSettled([
        deletePhoto(record.front_photo_url, token),
        deletePhoto(record.sn_photo_url, token),
      ]);
      const hasImageDeleteFailure = imageDeletes.some(
        (result) => result.status === 'rejected' || (result.status === 'fulfilled' && !result.value),
      );

      if (editingRecord?.id === record.id) resetForm();
      setViewMode('WAREHOUSE_LIST');
      setSelectedWarehouseId(null);

      toast.dismiss(loadingToast);
      if (hasImageDeleteFailure) {
        toast.error('Mapping terhapus, tapi ada image R2 yang gagal dihapus.');
      } else {
        toast.success('Flowmeter mapping terhapus.');
      }

      await fetchMappings();
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error(getErrorMessage(error));
    } finally {
      setDeletingId(null);
    }
  };

  const renderDraftPanel = () => (
    <div className="rounded-2xl border p-6 mb-8 bg-amber-50/30 dark:bg-amber-900/10 border-amber-200/50 dark:border-amber-700/30">
      <div className="flex items-center gap-3 mb-4 text-amber-600 dark:text-amber-400">
        <Save size={20} />
        <h3 className="text-lg font-bold">Draft Mappings ({drafts.length})</h3>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {drafts.map((draft) => (
          <div
            key={draft.draftId}
            className="flex flex-col p-4 rounded-xl border bg-white/40 dark:bg-black/20"
            style={{ borderColor: containerTheme.borderColor }}
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="text-xs font-bold uppercase opacity-60">{draft.material_type}</p>
                <h4 className="font-bold">{draft.warehouse_code}</h4>
              </div>
              <button
                onClick={() => handleDeleteDraft(draft.draftId)}
                className="p-1.5 text-meta-1 hover:bg-meta-1/10 rounded-lg transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>

            <div className="text-sm space-y-1 mb-4 opacity-80">
              <p>SN: {draft.serial_number || '-'}</p>
              <p>Date: {formatRecordedAt(draft.recorded_at)}</p>
            </div>

            {(draft.front_photo_base64 || draft.sn_photo_base64) && (
              <div className="flex gap-2 mb-4">
                {draft.front_photo_base64 && (
                  <div className="relative h-12 w-12 rounded-lg overflow-hidden border border-white/20">
                    <img src={draft.front_photo_base64} alt="Front" className="h-full w-full object-cover" />
                  </div>
                )}
                {draft.sn_photo_base64 && (
                  <div className="relative h-12 w-12 rounded-lg overflow-hidden border border-white/20">
                    <img src={draft.sn_photo_base64} alt="S/N" className="h-full w-full object-cover" />
                  </div>
                )}
              </div>
            )}

            <button
              onClick={() => void handleUploadDraft(draft)}
              className="mt-auto w-full flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-bold bg-amber-500 text-white hover:bg-amber-600 transition-colors"
              disabled={saving}
            >
              {saving ? <RotateCcw size={14} className="animate-spin" /> : <Upload size={14} />}
              Upload Now
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <ThemedPanelContainer
      title="Oil Flowmeter Mapping"
      className="mb-6"
      contentClassName="p-0"
      actions={
        <div className="flex items-center gap-2">
          {viewMode !== 'SELECT_MATERIAL' && (
            <button
              onClick={handleBack}
              className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold transition hover:bg-primary/10 hover:text-primary"
              style={{ color: mutedText }}
            >
              <ChevronLeft size={16} />
              <span>Back</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => void fetchReferenceData()}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-60"
            style={secondaryButtonStyle}
            disabled={loading || saving}
            title="Refresh data"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      }
    >
      <div className="min-h-[60vh] p-4 sm:p-6">
        {/* Navigation Title Bar */}
        {viewMode !== 'SELECT_MATERIAL' && (
          <div className="mb-6 flex items-center justify-between border-b pb-4" style={{ borderColor: containerTheme.borderColor }}>
            <h2 className="text-xl font-bold">
              {viewMode === 'WAREHOUSE_LIST' && `${selectedMaterial} Warehouses`}
              {viewMode === 'DETAIL' && 'Flowmeter Detail'}
              {viewMode === 'FORM' && (editingRecord ? 'Edit Mapping' : 'Add Mapping')}
            </h2>
          </div>
        )}
        {/* Step 1: Select Material Type */}
        {viewMode === 'SELECT_MATERIAL' && (
          <div className="flex h-full flex-col items-center justify-center py-12">
            <div className="grid w-full max-w-2xl grid-cols-1 gap-6 sm:grid-cols-2">
              {(['FUEL', 'OIL'] as const).map((material) => (
                <button
                  key={material}
                  onClick={() => handleSelectMaterial(material)}
                  className="group relative flex flex-col items-center gap-6 overflow-hidden rounded-2xl border-2 p-8 transition-all hover:border-primary hover:bg-primary/5 active:scale-[0.98]"
                  style={{
                    backgroundColor: panelBackground,
                    borderColor: containerTheme.borderColor,
                  }}
                >
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
                    {material === 'FUEL' ? <Droplets size={40} /> : <Droplets size={40} className="rotate-180" />}
                  </div>
                  <div className="text-center">
                    <h3 className="text-2xl font-bold">{material}</h3>
                    <p className="mt-2 text-sm" style={{ color: mutedText }}>
                      View and manage flowmeter mappings for {material.toLowerCase()} storage.
                    </p>
                  </div>
                  <div className="absolute -bottom-2 -right-2 rotate-12 text-primary/5 transition-transform group-hover:scale-125">
                    <Gauge size={100} />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Warehouse List */}
        {viewMode === 'WAREHOUSE_LIST' && (
          <div className="space-y-6">
            {drafts.length > 0 && renderDraftPanel()}

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-xl font-bold" style={{ color: containerTheme.textColor }}>
                  {selectedMaterial} Warehouses
                </h3>
                <p className="text-sm opacity-60">
                  {warehousesWithStatus.filter(w => w.isMapped).length} / {warehousesWithStatus.length} Warehouses Mapped
                </p>
              </div>
              <div className="relative w-full sm:max-w-md">
                <Search
                  size={20}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2"
                  style={{ color: mutedText }}
                />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search warehouse ID, unit, or location..."
                  className="w-full rounded-xl py-3 pl-12 pr-4 outline-none transition focus:ring-2 focus:ring-primary/20"
                  style={inputStyle}
                />
              </div>
              <div className="flex items-center gap-2 text-sm font-medium" style={{ color: mutedText }}>
                <span className="flex h-2 w-2 rounded-full bg-primary" />
                {filteredWarehouses.length} Total Warehouses
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredWarehouses.map((w) => (
                <button
                  key={w.warehouse_id}
                  onClick={() => handleWarehouseClick(w)}
                  className="flex flex-col overflow-hidden rounded-xl border transition-all hover:border-primary hover:shadow-lg active:scale-[0.99]"
                  style={{
                    backgroundColor: panelBackground,
                    borderColor: containerTheme.borderColor,
                  }}
                >
                  <div className="flex items-center justify-between p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Warehouse size={20} />
                    </div>
                    {w.isMapped ? (
                      <div className="flex items-center gap-1.5 rounded-full bg-green-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-green-500">
                        <CheckCircle2 size={12} />
                        {w.mappingRecords?.length} Mapped
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 rounded-full bg-slate-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        <AlertCircle size={12} />
                        Not Mapped
                      </div>
                    )}
                  </div>
                  <div className="flex-1 px-4 pb-4">
                    <h4 className="text-lg font-bold truncate">{w.warehouse_id}</h4>
                    <div className="mt-2 flex flex-col gap-1 text-sm" style={{ color: mutedText }}>
                      <div className="flex items-center gap-2">
                        <Gauge size={14} className="shrink-0" />
                        <span className="truncate">{w.unit_id || 'No Unit ID'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin size={14} className="shrink-0" />
                        <span className="truncate">{w.location || 'No Location'}</span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {!filteredWarehouses.length && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Search size={48} className="mb-4 opacity-20" />
                <p className="text-lg font-medium" style={{ color: mutedText }}>
                  No warehouses found for "{searchQuery}"
                </p>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Detail View */}
        {viewMode === 'DETAIL' && selectedWarehouseId && (
          <div className="mx-auto max-w-6xl animate-in fade-in slide-in-from-bottom-4 duration-300">
            {(() => {
              const warehouse = warehousesWithStatus.find((w) => w.warehouse_id === selectedWarehouseId);
              if (!warehouse) return null;
              const records = warehouse.mappingRecords || [];

              return (
                <ThemedGlassmorphismPanel className="p-8 shadow-2xl">
                  <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-6" style={{ borderColor: containerTheme.borderColor }}>
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <Warehouse size={28} />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold">Flowmeter Mapping List</h3>
                        <p className="text-sm opacity-60">
                          Warehouse: <span className="font-bold">{warehouse.warehouse_id}</span> 
                          {warehouse.unit_id && ` | Unit: ${warehouse.unit_id}`}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={confirmAddMapping}
                      className="flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 font-bold text-white shadow-lg transition-all hover:opacity-90 active:scale-95"
                    >
                      <Plus size={20} />
                      <span>Add New Flowmeter</span>
                    </button>
                  </div>

                  {records.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b text-[10px] font-bold uppercase tracking-widest opacity-40" style={{ borderColor: containerTheme.borderColor }}>
                            <th className="px-4 py-4">Photos</th>
                            <th className="px-4 py-4">Serial Number</th>
                            <th className="px-4 py-4">Material / Type</th>
                            <th className="px-4 py-4">Function / Position</th>
                            <th className="px-4 py-4">Location</th>
                            <th className="px-4 py-4">Recorded At</th>
                            <th className="px-4 py-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y" style={{ borderColor: containerTheme.borderColor }}>
                          {records.map((record) => (
                            <tr key={record.id} className="group hover:bg-black/5 transition-colors">
                              <td className="px-4 py-4">
                                <div className="flex gap-2">
                                  {record.front_photo_url ? (
                                    <img
                                      src={record.front_photo_url}
                                      alt="Front"
                                      className="h-12 w-12 cursor-zoom-in rounded-lg object-cover border"
                                      style={{ borderColor: containerTheme.borderColor }}
                                      onClick={() => setZoomedImage(record.front_photo_url)}
                                    />
                                  ) : (
                                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-black/5 opacity-20 border" style={{ borderColor: containerTheme.borderColor }}>
                                      <ImageIcon size={16} />
                                    </div>
                                  )}
                                  {record.sn_photo_url ? (
                                    <img
                                      src={record.sn_photo_url}
                                      alt="S/N"
                                      className="h-12 w-12 cursor-zoom-in rounded-lg object-cover border"
                                      style={{ borderColor: containerTheme.borderColor }}
                                      onClick={() => setZoomedImage(record.sn_photo_url)}
                                    />
                                  ) : (
                                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-black/5 opacity-20 border" style={{ borderColor: containerTheme.borderColor }}>
                                      <ImageIcon size={16} />
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-4">
                                <p className="font-bold text-base">{record.serial_number}</p>
                              </td>
                              <td className="px-4 py-4">
                                <p className="font-semibold text-sm">{record.type}</p>
                                <p className="text-[10px] uppercase opacity-50">{record.material_type}</p>
                              </td>
                              <td className="px-4 py-4">
                                <div className="flex flex-col gap-1">
                                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary w-fit">
                                    {record.function}
                                  </span>
                                  {record.installation_position && (
                                    <span className="text-[10px] opacity-60 italic">Pos: {record.installation_position}</span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-4">
                                <div className="flex items-center gap-1.5 text-sm opacity-70">
                                  <MapPin size={14} />
                                  <span>{record.location || '-'}</span>
                                </div>
                              </td>
                              <td className="px-4 py-4">
                                <p className="text-xs opacity-50">{formatRecordedAt(record.recorded_at)}</p>
                              </td>
                              <td className="px-4 py-4 text-right">
                                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => handleEdit(record)}
                                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors hover:bg-primary hover:text-white"
                                  >
                                    <Edit2 size={16} />
                                  </button>
                                  <button
                                    onClick={() => void handleDelete(record)}
                                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-meta-1/10 text-meta-1 transition-colors hover:bg-meta-1 hover:text-white"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 opacity-30">
                      <Gauge size={64} className="mb-4" />
                      <p className="text-xl font-bold">No Flowmeters Mapped Yet</p>
                    </div>
                  )}
                </ThemedGlassmorphismPanel>
              );
            })()}
          </div>
        )}

        {/* Step 4: Form View */}
        {viewMode === 'FORM' && (
          <div className="mx-auto max-w-5xl space-y-6">
            {drafts.length > 0 && renderDraftPanel()}
            <form onSubmit={handleSubmit} className="mx-auto max-w-5xl animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6">
              <div className="rounded-3xl border p-8 shadow-2xl" style={panelStyle}>
                <div className="mb-8 flex items-center justify-between">
                  <div className="flex items-center gap-4 text-primary">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                      <Gauge size={28} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold">Mapping Information</h3>
                      <p className="text-sm opacity-60">Lengkapi data flowmeter untuk warehouse ini</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                  {/* Left Column: Form Fields */}
                  <div className="space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <FieldLabel label="Warehouse" color={inputTheme.textColor} />
                        <div
                          className="rounded-xl px-4 py-3.5 font-bold bg-primary/5 border border-dashed truncate"
                          style={{ borderColor: containerTheme.borderColor }}
                        >
                          {form.warehouse_code}
                        </div>
                      </div>
                      <div>
                        <FieldLabel label="Location" color={inputTheme.textColor} />
                        <div className="relative">
                          <MapPin
                            size={16}
                            className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50"
                          />
                          <input
                            type="text"
                            value={form.location}
                            onChange={(e) => setForm({ ...form, location: e.target.value })}
                            placeholder="Location"
                            className="w-full rounded-xl py-3.5 pl-10 pr-3 text-sm outline-none transition focus:ring-2 focus:ring-primary/20 border"
                            style={inputStyle}
                            disabled={saving}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <FieldLabel label="Material Type" color={inputTheme.textColor} />
                        <div
                          className="rounded-xl px-4 py-3.5 font-bold bg-primary/5 border border-dashed text-center truncate"
                          style={{ borderColor: containerTheme.borderColor }}
                        >
                          {form.material_type}
                        </div>
                      </div>
                      <div>
                        <FieldLabel label="Material" required color={inputTheme.textColor} />
                        {form.material_type === 'FUEL' ? (
                          <div
                            className="rounded-xl px-4 py-3.5 font-bold bg-primary/5 border border-dashed text-center truncate"
                            style={{ borderColor: containerTheme.borderColor }}
                          >
                            DIESEL FUEL
                          </div>
                        ) : (
                          <select
                            value={form.type}
                            onChange={(e) => setForm({ ...form, type: e.target.value })}
                            className="w-full rounded-xl px-4 py-3.5 text-sm outline-none transition focus:ring-2 focus:ring-primary/20 appearance-none border"
                            style={inputStyle}
                            disabled={saving}
                            required
                          >
                            <option value="">Select oil</option>
                            {oilMaterials.map((material) => (
                              <option key={material} value={material}>
                                {material}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <FieldLabel label="Serial Number" required color={inputTheme.textColor} />
                        <input
                          type="text"
                          value={form.serial_number}
                          onChange={(e) => setForm({ ...form, serial_number: e.target.value })}
                          placeholder="Serial"
                          className="w-full rounded-xl px-4 py-3.5 text-sm outline-none transition focus:ring-2 focus:ring-primary/20 border"
                          style={inputStyle}
                          required
                          disabled={saving}
                        />
                      </div>
                      <div>
                        <FieldLabel label="Function" color={inputTheme.textColor} />
                        <select
                          value={form.function}
                          onChange={(e) => setForm({ ...form, function: e.target.value })}
                          className="w-full rounded-xl px-4 py-3.5 text-sm outline-none transition focus:ring-2 focus:ring-primary/20 appearance-none border"
                          style={inputStyle}
                          disabled={saving}
                        >
                          <option value="">Select</option>
                          {FUNCTION_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <FieldLabel label="Installation Position" color={inputTheme.textColor} />
                        <input
                          type="text"
                          value={form.installation_position}
                          onChange={(e) => setForm({ ...form, installation_position: e.target.value })}
                          placeholder="e.g. Tank left side"
                          className="w-full rounded-xl px-4 py-3.5 text-sm outline-none transition focus:ring-2 focus:ring-primary/20 border"
                          style={inputStyle}
                          disabled={saving}
                        />
                      </div>
                      <div>
                        <FieldLabel label="Recorded Date" color={inputTheme.textColor} />
                        <input
                          type="datetime-local"
                          value={form.recorded_at}
                          onChange={(e) => setForm({ ...form, recorded_at: e.target.value })}
                          className="w-full rounded-xl px-4 py-3.5 text-sm outline-none transition focus:ring-2 focus:ring-primary/20 border"
                          style={inputStyle}
                          disabled={saving}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Photos */}
                  <div className="flex flex-col gap-6">
                    <FieldLabel label="Documentation Photos" color={inputTheme.textColor} />
                    <div className="grid grid-cols-2 gap-3 flex-1 min-h-[160px]">
                      <PhotoDropzone
                        inputKey={fileInputKey}
                        id="flowmeter-front-photo"
                        title="Front"
                        file={frontPhotoFile}
                        previewUrl={frontPreviewUrl || existingFrontPhotoUrl}
                        hasValue={Boolean(frontPhotoFile || frontPreviewUrl || existingFrontPhotoUrl)}
                        panelStyle={{ ...softPanelStyle, height: '100%' }}
                        textColor={containerTheme.textColor}
                        mutedColor={mutedText}
                        onChange={(event) => handlePhotoChange(event, 'front')}
                        onClear={() => clearPhoto('front')}
                      />
                      <PhotoDropzone
                        inputKey={fileInputKey}
                        id="flowmeter-sn-photo"
                        title="S/N"
                        file={snPhotoFile}
                        previewUrl={snPreviewUrl || existingSnPhotoUrl}
                        hasValue={Boolean(snPhotoFile || snPreviewUrl || existingSnPhotoUrl)}
                        panelStyle={{ ...softPanelStyle, height: '100%' }}
                        textColor={containerTheme.textColor}
                        mutedColor={mutedText}
                        onChange={(event) => handlePhotoChange(event, 'serial-number')}
                        onClear={() => clearPhoto('serial-number')}
                      />
                    </div>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="mt-10 grid grid-cols-2 gap-3 border-t pt-8" style={{ borderColor: containerTheme.borderColor }}>
                  <button
                    type="button"
                    onClick={() => void handleSaveDraft()}
                    className="flex flex-col sm:flex-row items-center justify-center gap-2 rounded-2xl py-3.5 font-bold border-2 transition-all hover:bg-black/5 active:scale-[0.95]"
                    style={{ borderColor: containerTheme.borderColor, color: containerTheme.textColor }}
                    disabled={saving}
                  >
                    <Save size={20} />
                    <span className="text-xs sm:text-base">Save Draft</span>
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="group relative flex flex-col sm:flex-row items-center justify-center gap-2 overflow-hidden rounded-2xl py-3.5 font-bold text-white shadow-xl transition-all hover:shadow-primary/25 active:scale-[0.95] disabled:opacity-70"
                    style={{
                      background: `linear-gradient(135deg, ${primaryButton.color}, ${hexToRgba(primaryButton.color, 0.8)})`,
                    }}
                  >
                    {saving ? (
                      <RotateCcw className="h-6 w-6 animate-spin" />
                    ) : (
                      <>
                        <Upload size={20} className="transition-transform group-hover:-translate-y-1" />
                        <span className="text-xs sm:text-base">{editingRecord ? 'Update' : 'Upload'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowConfirmation(false)}
          />
          <ThemedGlassmorphismPanel className="relative w-full max-w-md p-8 text-center animate-in zoom-in-95 duration-200">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
              <AlertCircle size={32} />
            </div>
            <h3 className="mb-3 text-xl font-bold">Mapping Not Found</h3>
            <p className="mb-8 leading-relaxed opacity-80">
              Warehouse <span className="font-bold">{selectedWarehouseId}</span> belum memiliki mapping flowmeter. Apakah anda akan menambahkan mapping untuk warehouse tersebut?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmation(false)}
                className="flex-1 rounded-xl py-3 font-bold border transition-colors hover:bg-black/5"
                style={{ borderColor: containerTheme.borderColor }}
              >
                Batal
              </button>
              <button
                onClick={confirmAddMapping}
                className="flex-1 rounded-xl py-3 font-bold transition-opacity hover:opacity-90"
                style={primaryButtonStyle}
              >
                Ya, Tambahkan
              </button>
            </div>
          </ThemedGlassmorphismPanel>
        </div>
      )}

      {/* Image Zoom Overlay */}
      {zoomedImage && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md animate-in fade-in duration-300 cursor-zoom-out"
          onClick={() => setZoomedImage(null)}
        >
          <button
            onClick={() => setZoomedImage(null)}
            className="absolute right-6 top-6 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
          >
            <RotateCcw className="rotate-45" size={24} />
          </button>
          <img
            src={zoomedImage}
            alt="Zoomed"
            className="max-h-full max-w-full rounded-lg shadow-2xl animate-in zoom-in-95 duration-300 cursor-default"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

    </ThemedPanelContainer>
  );
};

export default OilFlowmeterMapping;
