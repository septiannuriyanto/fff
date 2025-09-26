import React, { useEffect, useState } from 'react';
import { supabase } from '../../../db/SupabaseClient';
import DataFleetSelector from './components/DataFleetSelector';
import FlowmeterPanel from './components/FlowmeterPanel';
import SondingPanel from './components/SondingPanel';
import ViewTeraModal from './components/ViewTeraModal';
import SummaryPanel from './components/SummaryPanel';
import { useAuth } from '../../Authentication/AuthContext';
import { DocumentTextIcon } from '@heroicons/react/24/solid';
import { validateRitasiForm, validateRitasiLocal } from './functions/validateRitasi';
import { Camera, ImageIcon, RotateCcw } from 'lucide-react';
import { DraftRitasi } from './types/drafts';
import { TeraPoint } from './types/teraPoint';
import { StorageItem } from './types/storageItem';
import { ManpowerItem } from './types/manpowerItem';
import formatIDNumber from './functions/formatIdNumber';
import { getMakassarDate } from '../../../Utils/TimeUtility';

const FuelPartnerRitation: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(
    getMakassarDate(),
  );
  const { currentUser } = useAuth();
  const [shift, setShift] = useState<'1' | '2'>('1');
  const [manualNN, setManualNN] = useState('');
  const [queueNum, setQueueNum] = useState<number | null>(null);
  const [noSuratJalan, setNoSuratJalan] = useState('');

  const [unit, setUnit] = useState('');
  const [operator, setOperator] = useState('');
  const [fuelman, setFuelman] = useState('');
  const [selectedPetugas, setSelectedPetugas] = useState<string>(
    () => localStorage.getItem('selectedPetugas') || '',
  );

  const [sondingBeforeRear, setSondingBeforeRear] = useState('');
  const [sondingBeforeFront, setSondingBeforeFront] = useState('');
  const [sondingAfterRear, setSondingAfterRear] = useState('');
  const [sondingAfterFront, setSondingAfterFront] = useState('');

  const [flowmeterBefore, setFlowmeterBefore] = useState('');
  const [flowmeterAfter, setFlowmeterAfter] = useState('');
  const [useDekaliter, setUseDekaliter] = useState(true);

  const [volumeBefore, setVolumeBefore] = useState(0);
  const [volumeAfter, setVolumeAfter] = useState(0);

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [rotationAngle, setRotationAngle] = useState(0);
  const [isPhotoUploaded, setIsPhotoUploaded] = useState(false);

  const [units, setUnits] = useState<StorageItem[]>([]);
  const [operators, setOperators] = useState<ManpowerItem[]>([]);
  const [fuelmans, setFuelmans] = useState<ManpowerItem[]>([]);
  const [petugasList, setPetugasList] = useState<ManpowerItem[]>([]);
  const [loadingDropdowns, setLoadingDropdowns] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [teraAll, setTeraAll] = useState<Record<string, TeraPoint[]>>({});
  const [loadingTera, setLoadingTera] = useState(false);
  const [showTeraModal, setShowTeraModal] = useState(false);

  const [localDrafts, setLocalDrafts] = useState<DraftRitasi[]>([]);
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [editingDraftIndex, setEditingDraftIndex] = useState<number | null>(
    null,
  );
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [isLoadingPhoto, setIsLoadingPhoto] = useState(false);
  const [zoomUrl, setZoomUrl] = useState<string | null>(null);

  useEffect(() => {
    const hour = new Date().getHours();
    setShift(hour >= 6 && hour < 18 ? '1' : '2');
  }, []);

  useEffect(() => {
    if (currentUser && !selectedPetugas) {
      setSelectedPetugas(currentUser.nrp);
    }
  }, [currentUser, selectedPetugas]);

  useEffect(() => {
    if (selectedPetugas) {
      localStorage.setItem('selectedPetugas', selectedPetugas);
    } else {
      localStorage.removeItem('selectedPetugas');
    }
  }, [selectedPetugas]);

  useEffect(() => {
    try {
      const savedDrafts = localStorage.getItem('ritasi_draft');
      if (savedDrafts) {
        setLocalDrafts(JSON.parse(savedDrafts));
      }
    } catch (error) {
      console.error('Failed to load drafts from local storage:', error);
      setLocalDrafts([]);
    }
  }, []);

  useEffect(() => {
    const fetchDropdowns = async () => {
      setLoadingDropdowns(true);
      setFetchError(null);
      try {
        const { data: unitData, error: unitErr } = await supabase
          .from('storage')
          .select('id, unit_id, warehouse_id')
          .eq('type', 'FT')
          .eq('status', 'RUNNING')
          .order('warehouse_id', { ascending: true });
        if (unitErr) throw unitErr;
        setUnits((unitData as any) || []);

        const { data: opJoined, error: opJoinErr } = await supabase
          .from('manpower')
          .select('nrp, nama, incumbent:position (id, incumbent)')
          .order('nama', { ascending: true });
        if (opJoinErr) throw opJoinErr;

        const opJoinedArr = (opJoined as any[]) || [];
        setOperators(
          opJoinedArr
            .filter((r) => r.incumbent?.incumbent === 'OPERATOR FT')
            .map((r) => ({ nrp: r.nrp, nama: r.nama })),
        );
        setFuelmans(
          opJoinedArr
            .filter((r) => r.incumbent?.incumbent === 'FUELMAN')
            .map((r) => ({ nrp: r.nrp, nama: r.nama })),
        );
        setPetugasList(
          opJoinedArr
            .filter((r) => r.incumbent?.incumbent === 'FUELMAN_PARTNER')
            .map((r) => ({ nrp: r.nrp, nama: r.nama })),
        );
      } catch (err: any) {
        console.error('fetchDropdowns error', err);
        setFetchError(err?.message || 'Gagal mengambil data dropdown');
      } finally {
        setLoadingDropdowns(false);
      }
    };
    fetchDropdowns();
  }, []);

  const fetchTeraAll = async () => {
    setLoadingTera(true);
    try {
      let allData: TeraPoint[] = [];
      let from = 0;
      const batchSize = 1000;
      while (true) {
        const { data, error } = await supabase
          .from('tera_tangki')
          .select('unit_id, height_mm, qty_liter')
          .order('unit_id', { ascending: true })
          .order('height_mm', { ascending: true })
          .range(from, from + batchSize - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;

        allData = [...allData, ...(data as TeraPoint[])];
        if (data.length < batchSize) break;
        from += batchSize;
      }
      const grouped = allData.reduce<Record<string, TeraPoint[]>>((acc, t) => {
        if (!acc[t.unit_id]) acc[t.unit_id] = [];
        acc[t.unit_id].push(t);
        return acc;
      }, {});
      setTeraAll(grouped);
    } catch (err) {
      console.error('fetchTeraAll error', err);
    } finally {
      setLoadingTera(false);
    }
  };

  useEffect(() => {
    fetchTeraAll();
  }, []);

  const generateSuratJalanNumber = (
    queue: number,
    dateStr: string,
    shift: string,
  ) => {
    if (!queue || !dateStr || !shift) return '';
    const date = new Date(dateStr);
    const yy = date.getFullYear().toString().slice(-2);
    const mm = (date.getMonth() + 1).toString().padStart(2, '0');
    const dd = date.getDate().toString().padStart(2, '0');
    const ss = shift.padStart(2, '0');
    const nn = String(queue).padStart(2, '0');
    return `G${yy}${mm}${dd}${ss}${nn}`;
  };

  useEffect(() => {
    if (queueNum) {
      setNoSuratJalan(generateSuratJalanNumber(queueNum, selectedDate, shift));
    } else {
      setNoSuratJalan('');
    }
  }, [queueNum, selectedDate, shift]);

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validasi file
      if (file.size > 10 * 1024 * 1024) { // 10MB max
        alert('File terlalu besar. Maksimal 10MB.');
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        alert('File harus berupa gambar.');
        return;
      }

      console.log('Selected file size:', (file.size / 1024).toFixed(2), 'KB');

      // Cleanup previous blob URL if exists
      if (photoPreview && photoPreview.startsWith('blob:')) {
        URL.revokeObjectURL(photoPreview);
      }

      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
      setRotationAngle(0);
      setIsPhotoUploaded(false);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  if (e.target.files && e.target.files[0]) {
    const file = e.target.files[0];
    const blobUrl = URL.createObjectURL(file); // preview lokal

    setPhotoUrl(blobUrl);
    setPhotoFile(file);
  }
};


  const handleRotate = () => {
    setRotationAngle((prevAngle) => (prevAngle + 90) % 360);
  };

  // Fungsi untuk kompresi gambar dengan target maksimal 100KB
  const compressImage = async (canvas: HTMLCanvasElement, targetSizeKB: number = 100): Promise<Blob> => {
    const targetSize = targetSizeKB * 1024; // Convert to bytes
    let quality = 0.9;
    let blob: Blob | null = null;

    // Binary search untuk menemukan quality yang tepat
    let minQuality = 0.1;
    let maxQuality = 0.9;
    
    while (minQuality <= maxQuality) {
      quality = (minQuality + maxQuality) / 2;
      
      blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/jpeg', quality);
      });

      if (!blob) {
        throw new Error('Failed to create compressed blob');
      }

      if (blob.size <= targetSize) {
        // Size is acceptable, try higher quality
        minQuality = quality + 0.01;
      } else {
        // Size too large, try lower quality
        maxQuality = quality - 0.01;
      }

      // Prevent infinite loop
      if (maxQuality - minQuality < 0.01) {
        break;
      }
    }

    // Final compression with the found quality
    blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', quality);
    });

    if (!blob) {
      throw new Error('Failed to create final compressed blob');
    }

    // Jika masih terlalu besar, resize canvas dan coba lagi
    if (blob.size > targetSize) {
      const maxDimension = 1280; // Reduce max dimension
      const ratio = Math.min(maxDimension / canvas.width, maxDimension / canvas.height);
      
      if (ratio < 1) {
        const resizeCanvas = document.createElement('canvas');
        const resizeCtx = resizeCanvas.getContext('2d')!;
        
        resizeCanvas.width = canvas.width * ratio;
        resizeCanvas.height = canvas.height * ratio;
        
        // Set background putih
        resizeCtx.fillStyle = 'white';
        resizeCtx.fillRect(0, 0, resizeCanvas.width, resizeCanvas.height);
        
        // Resize dengan smoothing
        resizeCtx.imageSmoothingEnabled = true;
        resizeCtx.imageSmoothingQuality = 'high';
        resizeCtx.drawImage(canvas, 0, 0, resizeCanvas.width, resizeCanvas.height);
        
        // Recursive call dengan canvas yang lebih kecil
        return compressImage(resizeCanvas, targetSizeKB);
      }
    }

    return blob;
  };

  const handleSaveAndUpload = async () => {
    if (!photoFile) {
      alert("Tidak ada foto untuk diunggah.");
      return;
    }
    if (!noSuratJalan) {
      alert("Mohon isi data Tanggal, Shift, dan Nomor SJ terlebih dahulu.");
      return;
    }

    setIsLoadingPhoto(true);
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = photoPreview;
      });

      console.log('Original image size:', (photoFile.size / 1024).toFixed(2), 'KB');
      console.log('Original dimensions:', img.width, 'x', img.height);

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;

      // Resize jika gambar terlalu besar untuk menghemat memori dan ukuran file
      const maxDimension = 1920;
      let drawWidth = img.width;
      let drawHeight = img.height;
      
      if (img.width > maxDimension || img.height > maxDimension) {
        const ratio = Math.min(maxDimension / img.width, maxDimension / img.height);
        drawWidth = img.width * ratio;
        drawHeight = img.height * ratio;
      }

      // Calculate proper canvas dimensions based on rotation
      let canvasWidth, canvasHeight;
      if (rotationAngle === 90 || rotationAngle === 270) {
        canvasWidth = drawHeight;
        canvasHeight = drawWidth;
      } else {
        canvasWidth = drawWidth;
        canvasHeight = drawHeight;
      }

      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      // Set white background to avoid transparency issues
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      // Clear the canvas and reset transformations
      ctx.save();

      // Move to center, rotate, then draw
      ctx.translate(canvasWidth / 2, canvasHeight / 2);
      ctx.rotate((rotationAngle * Math.PI) / 180);
      
      // Draw image centered at origin with proper sizing
      ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
      
      // Restore the context
      ctx.restore();

      console.log('Canvas dimensions after rotation:', canvasWidth, 'x', canvasHeight);

      // Compress image to maximum 100KB
      const compressedBlob = await compressImage(canvas, 100);
      
      console.log('Compressed image size:', (compressedBlob.size / 1024).toFixed(2), 'KB');

      if (compressedBlob.size > 102400) { // 100KB + small buffer
        console.warn('Warning: Compressed image still larger than 100KB');
      }

      const filename = `${noSuratJalan}.jpg`;
      const date = new Date(selectedDate);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const path = `ritasi/${year}/${month}/${day}/${filename}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(path, compressedBlob, {
          upsert: true,
          contentType: 'image/jpeg',
          cacheControl: '3600'
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicUrlData } = supabase.storage
        .from('documents')
        .getPublicUrl(path);

      if (publicUrlData) {
        // Cleanup old blob URL
        if (photoPreview && photoPreview.startsWith('blob:')) {
          URL.revokeObjectURL(photoPreview);
        }
        
        // Set new preview with cache busting
        setPhotoUrl(publicUrlData.publicUrl);
        setPhotoPreview(publicUrlData.publicUrl + '?t=' + Date.now());
        setIsPhotoUploaded(true);
        setPhotoFile(null);
        alert(`Foto berhasil diunggah! (${(compressedBlob.size / 1024).toFixed(2)} KB)`);
      }

    } catch (err: any) {
      console.error('Upload foto gagal:', err);
      alert('Gagal mengunggah foto: ' + err.message);
      setIsPhotoUploaded(false);
    } finally {
      setIsLoadingPhoto(false);
    }
  };

  const handleSubmit = async () => {
    const before = parseFloat(flowmeterBefore || '0');
    const after = parseFloat(flowmeterAfter || '0');
    const multiplier = useDekaliter ? 10 : 1;
    const diff = (after - before) * multiplier;

    const errorMsg = validateRitasiForm({
      selectedPetugas,
      unit,
      diff,
      noSuratJalan,
      operator,
      fuelman,
      sondingBeforeRear,
      sondingBeforeFront,
      sondingAfterRear,
      sondingAfterFront,
      volumeBefore,
      volumeAfter,
      photoUrl,
    });

    if (errorMsg) {
      return alert(errorMsg);
    }

    const selectedWarehouse =
      units.find((u) => u.unit_id === unit)?.warehouse_id || null;

    const payload = {
      no_surat_jalan: noSuratJalan,
      queue_num: queueNum,
      ritation_date: selectedDate,
      warehouse_id: selectedWarehouse,
      qty_sj: diff,
      qty_sonding_before: volumeBefore,
      qty_sonding_after: volumeAfter,
      qty_sonding: volumeAfter - volumeBefore,
      sonding_before_front: parseFloat(sondingBeforeFront),
      sonding_before_rear: parseFloat(sondingBeforeRear),
      sonding_after_front: parseFloat(sondingAfterFront),
      sonding_after_rear: parseFloat(sondingAfterRear),
      operator_id: operator,
      fuelman_id: fuelman,
      qty_flowmeter_before: before,
      qty_flowmeter_after: after,
      isValidated: false,
      petugas_pencatatan: selectedPetugas,
      shift: shift,
      photo_url: photoUrl,
    };

    try {
      setLoadingSubmit(true);
      const { error } = await supabase.from('ritasi_fuel').insert([payload]);
      if (error) {
        throw error;
      }

      alert(`Surat Jalan ${noSuratJalan} berhasil dikirim!`);
      handleResetForm();
    } catch (err: any) {
      console.error(err);
      alert(`Gagal mengirim data: ${err.message || err}`);
    } finally {
      setLoadingSubmit(false);
    }
  };

  const handleSaveLocal = async () => {
  const before = parseFloat(flowmeterBefore || '0');
  const after = parseFloat(flowmeterAfter || '0');
  const multiplier = useDekaliter ? 10 : 1;
  const diff = (after - before) * multiplier;

  // validasi lokal: kirim file juga
  const errorMsg = validateRitasiLocal({
    selectedPetugas,
    unit,
    diff,
    noSuratJalan,
    operator,
    fuelman,
    sondingBeforeRear,
    sondingBeforeFront,
    sondingAfterRear,
    sondingAfterFront,
    volumeBefore,
    volumeAfter,
    photoFile, // kirim file yang dipilih
  });

  if (errorMsg) {
    return alert(errorMsg);
  }

  const selectedWarehouse =
    units.find((u) => u.unit_id === unit)?.warehouse_id || null;

  // Ambil draft yang sedang diedit (jika ada)
  const editingDraft = editingDraftIndex !== null ? localDrafts[editingDraftIndex] : null;

  // Tentukan assignedQueue:
  // - kalau edit: pakai queue dari draft yang diedit (jangan ubah)
  // - kalau tambah baru: gunakan queueNum kalau ada, kalau tidak fallback ke max local + 1
  let assignedQueue: number;
  if (editingDraft) {
    assignedQueue = (editingDraft.queue_num as number) ?? (queueNum ?? 1);
  } else {
    const maxLocal = localDrafts.length > 0 ? Math.max(...localDrafts.map(d => d.queue_num ?? 0)) : 0;
    assignedQueue = (typeof queueNum === 'number' && queueNum > 0) ? queueNum : maxLocal + 1;
  }

  // buat no surat jalan berdasarkan assignedQueue
  const assignedSJ = generateSuratJalanNumber(assignedQueue, selectedDate, shift);

  // previewUrl: jika ada file baru gunakan blob, kalau edit dan tidak mengganti file pakai existing preview
  const previewUrl =
    photoFile ? URL.createObjectURL(photoFile) : (editingDraft?.photo_url ?? undefined);

  // simpan file asli di draft (untuk upload nanti saat Submit All)
  const payload: DraftRitasi = {
    no_surat_jalan: assignedSJ,
    queue_num: assignedQueue,
    ritation_date: selectedDate,
    warehouse_id: selectedWarehouse,
    qty_sj: diff,
    qty_sonding_before: volumeBefore,
    qty_sonding_after: volumeAfter,
    qty_sonding: volumeAfter - volumeBefore,
    sonding_before_front: parseFloat(sondingBeforeFront || '0'),
    sonding_before_rear: parseFloat(sondingBeforeRear || '0'),
    sonding_after_front: parseFloat(sondingAfterFront || '0'),
    sonding_after_rear: parseFloat(sondingAfterRear || '0'),
    operator_id: operator,
    fuelman_id: fuelman,
    qty_flowmeter_before: before,
    qty_flowmeter_after: after,
    isValidated: false,
    petugas_pencatatan: selectedPetugas,
    shift: shift,
    // simpan file & preview url di draft (File disimpan di memory, tidak ke localStorage)
    photo_file: photoFile ?? editingDraft?.photo_file ?? undefined,
    photo_url: previewUrl,
  };

  // update array drafts
  let updatedDrafts: DraftRitasi[];
  if (editingDraftIndex !== null) {
    updatedDrafts = [...localDrafts];
    updatedDrafts[editingDraftIndex] = payload;
    setEditingDraftIndex(null);
  } else {
    updatedDrafts = [...localDrafts, payload];
  }

  // simpan ke state
  setLocalDrafts(updatedDrafts);

  // simpan ke localStorage tanpa property photo_file (File tidak serializable)
  const draftsToSave = updatedDrafts.map(d => {
    const { photo_file, ...rest } = d;
    return rest;
  });
  localStorage.setItem('ritasi_draft', JSON.stringify(draftsToSave));

  // Setelah sukses simpan lokal, baru increment queueNum (hanya untuk penambahan baru)
  if (editingDraftIndex === null) {
    const nextQueue = assignedQueue + 1;
    setQueueNum(nextQueue);
    setManualNN(String(nextQueue));
  }

  // Reset fields form (manual) — JANGAN reset queueNum
  setNoSuratJalan('');
  setUnit('');
  setOperator('');
  setFuelman('');
  setSondingBeforeRear('');
  setSondingBeforeFront('');
  setSondingAfterRear('');
  setSondingAfterFront('');
  setVolumeBefore(0);
  setVolumeAfter(0);
  setFlowmeterBefore('');
  setFlowmeterAfter('');
  setUseDekaliter(true);
  setPhotoPreview('');
  setPhotoFile(null);

  alert('Data tersimpan ke lokal!');
  // optional: kalau mau sinkronisasi penuh dengan DB, panggil fetchNextQueue() di tempat terpisah
};



  const handleDeleteDraft = (index: number) => {
    const updated = [...localDrafts];
    updated.splice(index, 1);
    const newDrafts = updated.map((d, i) => {
      const newQueue = (d.queue_num ?? 0) - 1;
      return {
        ...d,
        queue_num: newQueue,
        no_surat_jalan: generateSuratJalanNumber(
          newQueue,
          d.ritation_date,
          d.shift,
        ),
      };
    });
    setLocalDrafts(newDrafts);
    localStorage.setItem('ritasi_draft', JSON.stringify(newDrafts));
    fetchNextQueue();
  };

  const handleEditDraft = (index: number) => {
    const draft = localDrafts[index];
    setSelectedDate(draft.ritation_date);
    setQueueNum(draft.queue_num);
    setManualNN(draft.queue_num?.toString() ?? '');
    setNoSuratJalan(draft.no_surat_jalan);
    setUnit(draft.warehouse_id || '');
    setOperator(draft.operator_id || '');
    setFuelman(draft.fuelman_id || '');
    setSondingBeforeRear(draft.sonding_before_rear?.toString() ?? '');
    setSondingBeforeFront(draft.sonding_before_front?.toString() ?? '');
    setSondingAfterRear(draft.sonding_after_rear?.toString() ?? '');
    setSondingAfterFront(draft.sonding_after_front?.toString() ?? '');
    setVolumeBefore(draft.qty_sonding_before || 0);
    setVolumeAfter(draft.qty_sonding_after || 0);
    setFlowmeterBefore(draft.qty_flowmeter_before?.toString() ?? '');
    setFlowmeterAfter(draft.qty_flowmeter_after?.toString() ?? '');
    setUseDekaliter(true);
    setPhotoPreview(draft.photo_url || '');
    setIsPhotoUploaded(!!draft.photo_url);
    setPhotoFile(null);
    setRotationAngle(0); // Reset rotation untuk draft yang di-edit

    setEditingDraftIndex(index);
    setShowDraftModal(false);
  };

  const handleSubmitAllLocal = async () => {
  if (localDrafts.length === 0) {
    return;
  }
  try {
    setLoadingSubmit(true);

    // upload foto + update photo_url dulu
    const draftsWithPhotoUrl = await Promise.all(
      localDrafts.map(async (draft) => {
        // kalau ada file foto dan photo_url belum berupa publicUrl
        if (draft.photo_file && !(draft.photo_url && draft.photo_url.startsWith('http'))) {
          // format tanggal jadi yyyy/mm/dd
          const date = new Date(draft.ritation_date);
          const yyyy = date.getFullYear();
          const mm = String(date.getMonth() + 1).padStart(2, '0');
          const dd = String(date.getDate()).padStart(2, '0');

          // path file sesuai permintaan: yyyy/mm/dd/<no_surat_jalan>.jpg
          const filePath = `${yyyy}/${mm}/${dd}/${draft.no_surat_jalan}.jpg`;

          // upload file
          const { error: uploadError } = await supabase.storage
            .from('ritasi')
            .upload(filePath, draft.photo_file, { upsert: true });
          if (uploadError) throw uploadError;

          // ambil public url
          const { data: publicData } = supabase.storage
            .from('ritasi')
            .getPublicUrl(filePath);

          // update photo_url di draft
          return { ...draft, photo_url: publicData.publicUrl };
        }

        // kalau tidak ada file baru, pakai draft apa adanya
        console.log('No new photo to upload for draft:', draft.no_surat_jalan);
        return draft;
      })
    );

    // setelah semua foto terupload, insert ke table ritasi_fuel

    console.log('Drafts to insert:', draftsWithPhotoUrl);
    return;

    const { error } = await supabase.from('ritasi_fuel').insert(draftsWithPhotoUrl);
    if (error) throw error;

    alert('Semua draft berhasil dikirim!');
    setShowDraftModal(false);
    fetchNextQueue();
  } catch (err: any) {
    alert('Gagal submit draft: ' + err.message);
  } finally {
    setLoadingSubmit(false);
  }
};




  const fetchNextQueue = async () => {
    if (!selectedDate) {
      return;
    }
    try {
      const { data, error } = await supabase
        .from('ritasi_fuel')
        .select('queue_num')
        .eq('ritation_date', selectedDate)
        .order('queue_num', { ascending: false })
        .limit(1);
      if (error) {
        throw error;
      }

      const maxQueueDB = data?.[0]?.queue_num ?? 0;
      const draftsForDate = localDrafts.filter(
        (d) => d.ritation_date === selectedDate,
      );
      const maxQueueDraft =
        draftsForDate.length > 0
          ? Math.max(...draftsForDate.map((d) => d.queue_num ?? 0))
          : 0;

      const nextQueue = Math.max(maxQueueDB, maxQueueDraft) + 1;

      if (!manualNN) {
        setQueueNum(nextQueue);
        setManualNN(String(nextQueue));
      }
    } catch (err) {
      console.error('fetchNextQueue error', err);
      const draftsForDate = localDrafts.filter(
        (d) => d.ritation_date === selectedDate,
      );
      const maxQueueDraft =
        draftsForDate.length > 0
          ? Math.max(...draftsForDate.map((d) => d.queue_num ?? 0))
          : 0;
      const nextQueue = maxQueueDraft + 1;
      if (!manualNN) {
        setQueueNum(nextQueue);
        setManualNN(String(nextQueue));
      }
    }
  };

  useEffect(() => {
    fetchNextQueue();
  }, [selectedDate, shift, localDrafts]);

  const handleResetForm = () => {
    // Cleanup photo preview URL if it's a blob URL
    if (photoPreview && photoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(photoPreview);
    }
    
    setSelectedDate(new Date().toISOString().slice(0, 10));
    setShift(
      new Date().getHours() >= 6 && new Date().getHours() < 18 ? '1' : '2',
    );
    setManualNN('');
    setQueueNum(null);
    setNoSuratJalan('');
    setUnit('');
    setOperator('');
    setFuelman('');
    setSondingBeforeRear('');
    setSondingBeforeFront('');
    setSondingAfterRear('');
    setSondingAfterFront('');
    setVolumeBefore(0);
    setVolumeAfter(0);
    setFlowmeterBefore('');
    setFlowmeterAfter('');
    setUseDekaliter(true);
    setPhotoPreview('');
    setPhotoFile(null);
    setRotationAngle(0);
    setIsPhotoUploaded(false);
    setEditingDraftIndex(null);
    setPhotoUrl('');
    
    // Clear file input values
    const fileInputs = document.querySelectorAll('input[type="file"]');
    fileInputs.forEach((input: any) => {
      input.value = '';
    });
    
    fetchNextQueue();
  };

  return (
    <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark mb-6">
      <ViewTeraModal
        visible={showTeraModal}
        onClose={() => setShowTeraModal(false)}
        teraData={Object.values(teraAll).flat()}
        units={Object.keys(teraAll)}
      />

      <div className="p-4 sm:p-6">
        <h2 className="mb-4 font-bold text-black dark:text-white sm:text-title-sm">
          Fuel Partner Ritation
        </h2>

        <div className="mb-4 flex items-center gap-2">
          <button
            className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded"
            onClick={() => setShowTeraModal(true)}
          >
            View Tera
          </button>
          <button
            className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded"
            onClick={fetchTeraAll}
            disabled={loadingTera}
          >
            {loadingTera ? 'Refreshing...' : 'Refresh Tera'}
          </button>
          {loadingTera && (
            <span className="text-sm ml-2">Fetching tera...</span>
          )}
        </div>

        <div className="mb-4">
          <label className="block mb-1">Tanggal</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border rounded p-2 w-full"
          />
        </div>

        <div className="mb-4">
          <label className="block mb-1">Shift</label>
          <select
            value={shift}
            onChange={(e) => setShift(e.target.value as '1' | '2')}
            className="border rounded p-2 w-full"
          >
            <option value="1">Shift 1 (06.00 - 18.00)</option>
            <option value="2">Shift 2 (18.00 - 06.00)</option>
          </select>
        </div>

        <div className="mb-4">
          <label className="block mb-1">Nama Petugas</label>
          <select
            value={selectedPetugas}
            onChange={(e) => setSelectedPetugas(e.target.value)}
            className="border rounded p-2 w-full"
            disabled={loadingDropdowns}
          >
            <option value="">Pilih Petugas</option>
            {petugasList.map((p) => (
              <option key={p.nrp} value={p.nrp}>
                {p.nama}
              </option>
            ))}
          </select>
          {fetchError && (
            <p className="text-sm text-red-500 mt-1">Error: {fetchError}</p>
          )}
        </div>

        <div className="mb-4 text-center w-full justify-center">
          <label className="block mb-1 text-left">
            Nomor Surat Jalan Manual (NN)
          </label>
          <input
            type="number"
            min={0}
            value={manualNN}
            onChange={(e) => {
              setManualNN(e.target.value.replace(/\D/g, ''));
              setQueueNum(parseInt(e.target.value) || null);
            }}
            className="border rounded p-2 w-full"
            placeholder="Masukkan nomor SJ (angka)"
          />

          {noSuratJalan ? (
            <p className="mt-1 font-bold text-lg">{noSuratJalan}</p>
          ) : (
            <p className="mt-1 text-sm text-gray-500">
              Nomor SJ akan tampil setelah Tanggal, Shift, dan Nomor SJ terisi
            </p>
          )}
        </div>

        <hr className="my-4" />

        <DataFleetSelector
          unit={unit}
          operator={operator}
          fuelman={fuelman}
          units={units}
          operators={operators}
          fuelmans={fuelmans}
          loading={loadingDropdowns}
          onChange={(field, value) => {
            if (field === 'unit') {
              setUnit(value);
            }
            if (field === 'operator') {
              setOperator(value);
            }
            if (field === 'fuelman') {
              setFuelman(value);
            }
          }}
        />

        <SondingPanel
          title="Sonding Before"
          unitId={unit}
          teraData={teraAll[unit] || []}
          sondingRear={sondingBeforeRear}
          sondingFront={sondingBeforeFront}
          rearFieldName="sondingBeforeRear"
          frontFieldName="sondingBeforeFront"
          unit="cm"
          onChange={(field, value) => {
            if (field === 'sondingBeforeRear') {
              setSondingBeforeRear(value);
            }
            if (field === 'sondingBeforeFront') {
              setSondingBeforeFront(value);
            }
          }}
          onVolumeChange={(vol) => setVolumeBefore(vol ?? 0)}
        />

        <SondingPanel
          title="Sonding After"
          unitId={unit}
          teraData={teraAll[unit] || []}
          sondingRear={sondingAfterRear}
          sondingFront={sondingAfterFront}
          rearFieldName="sondingAfterRear"
          frontFieldName="sondingAfterFront"
          unit="cm"
          onChange={(field, value) => {
            if (field === 'sondingAfterRear') {
              setSondingAfterRear(value);
            }
            if (field === 'sondingAfterFront') {
              setSondingAfterFront(value);
            }
          }}
          onVolumeChange={(vol) => setVolumeAfter(vol ?? 0)}
        />

        <hr className="my-4" />

        <FlowmeterPanel
          flowmeterBefore={flowmeterBefore}
          flowmeterAfter={flowmeterAfter}
          useDekaliter={useDekaliter}
          onChange={(field, value) => {
            if (field === 'flowmeterBefore') {
              setFlowmeterBefore(value as string);
            }
            if (field === 'flowmeterAfter') {
              setFlowmeterAfter(value as string);
            }
            if (field === 'useDekaliter') {
              setUseDekaliter(value as boolean);
            }
          }}
        />

        <SummaryPanel
          unit={unit}
          operator={operator}
          fuelman={fuelman}
          beforeRear={
            sondingBeforeRear.toString() ? parseFloat(sondingBeforeRear) : 0
          }
          beforeFront={
            sondingBeforeFront.toString() ? parseFloat(sondingBeforeFront) : 0
          }
          afterRear={
            sondingAfterRear.toString() ? parseFloat(sondingAfterRear) : 0
          }
          afterFront={
            sondingAfterFront.toString() ? parseFloat(sondingAfterFront) : 0
          }
          flowmeterBefore={parseFloat(flowmeterBefore || '0')}
          flowmeterAfter={parseFloat(flowmeterAfter || '0')}
          qtyTeraAfter={volumeAfter}
          qtyTeraBefore={volumeBefore}
        />

        <div className="mt-4">
          <label className="block mb-1">Foto Surat Jalan</label>
          <div className="flex gap-3">
            <label className="cursor-pointer flex flex-col items-center text-center border p-2 rounded border-blue-400">
              <Camera className="w-8 h-8 text-blue-400" />
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handlePhoto}
              />
            </label>
            <label className="cursor-pointer flex flex-col items-center text-center border p-2 rounded border-blue-400">
              <ImageIcon className="w-8 h-8 text-blue-400" />
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhoto}
              />
            </label>
          </div>
        </div>

        {photoPreview && (
          <div className={`mt-4 border-2 border-dashed border-gray-400 rounded-md p-2 flex flex-col items-center ${isLoadingPhoto ? 'opacity-30' : ''}`}>
            <h4 className="font-semibold mb-2">Pratinjau Foto:</h4>
            
            {/* Container dengan aspect ratio yang konsisten */}
            <div className="w-full max-w-md mx-auto bg-gray-50 rounded overflow-hidden">
              <div className="relative" style={{ paddingBottom: '75%' }}> {/* 4:3 aspect ratio */}
                <img
                  src={photoPreview}
                  alt="Surat Jalan Preview"
                  className="absolute inset-0 w-full h-full object-contain"
                  style={{ 
                    // Jika sudah diupload, tidak perlu rotasi lagi karena gambar server sudah dalam orientasi yang benar
                    // Jika belum diupload, terapkan rotasi untuk preview
                    transform: isPhotoUploaded ? 'none' : `rotate(${rotationAngle}deg)`,
                    transformOrigin: 'center center',
                    transition: 'transform 0.3s ease-in-out'
                  }}
                  onLoad={(e) => {
                    console.log('Preview image loaded:', (e.target as HTMLImageElement).naturalWidth, 'x', (e.target as HTMLImageElement).naturalHeight);
                  }}
                  onError={(e) => {
                    console.error('Preview image failed to load');
                  }}
                />
              </div>
            </div>
            
            {/* Status info dengan size indicator */}
            <div className="text-sm text-gray-600 mt-2">
              {isPhotoUploaded ? (
                <span className="text-green-600 font-medium">✓ Foto telah diunggah dan disimpan</span>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <span>Preview dengan rotasi: {rotationAngle}°</span>
                  {photoFile && (
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                      Ukuran asli: {(photoFile.size / 1024).toFixed(2)} KB
                      {photoFile.size > 102400 && (
                        <span className="text-orange-600 ml-1">
                          (akan dikompres ke ≤100 KB)
                        </span>
                      )}
                    </span>
                  )}
                </div>
              )}
            </div>
            
            {/* Controls - hanya tampil jika belum diupload */}
            {!isPhotoUploaded && (
              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleRotate}
                  disabled={isLoadingPhoto}
                  className="px-3 py-1 bg-gray-200 text-gray-800 rounded-full flex items-center gap-1 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RotateCcw size={16} /> Rotasi
                </button>
                <button
                  onClick={handleSaveAndUpload}
                  disabled={isLoadingPhoto || !photoFile}
                  className={`px-4 py-2 rounded-full text-white flex items-center gap-1 ${
                    isLoadingPhoto || !photoFile 
                      ? 'bg-blue-300 cursor-not-allowed' 
                      : 'bg-blue-500 hover:bg-blue-600'
                  }`}
                >
                  {isLoadingPhoto ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Mengunggah...
                    </>
                  ) : (
                    'Simpan & Unggah'
                  )}
                </button>
              </div>
            )}
            
            {/* Button untuk ganti foto jika sudah diupload */}
            {isPhotoUploaded && (
              <button
                onClick={() => {
                  // Reset untuk upload foto baru
                  if (photoPreview && photoPreview.startsWith('blob:')) {
                    URL.revokeObjectURL(photoPreview);
                  }
                  setPhotoPreview('');
                  setPhotoFile(null);
                  setRotationAngle(0);
                  setIsPhotoUploaded(false);
                  // Clear file inputs
                  const fileInputs = document.querySelectorAll('input[type="file"]');
                  fileInputs.forEach((input: any) => {
                    input.value = '';
                  });
                }}
                className="mt-2 px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                Ganti Foto
              </button>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:justify-end items-center gap-2 mt-6">
          {editingDraftIndex !== null && (
            <button
              onClick={handleResetForm}
              className="px-4 py-2 rounded w-full sm:w-auto border-gray-600 border text-gray-600"
            >
              Cancel Edit
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={loadingSubmit || isLoadingPhoto}
            className={`text-white px-4 py-2 rounded w-full sm:w-auto ${
              loadingSubmit || isLoadingPhoto ? 'bg-slate-400' : 'bg-blue-500 hover:bg-blue-600'
            }`}
          >
            {loadingSubmit ? 'Mengirim...' : 'Submit'}
          </button>
          <button
            onClick={handleSaveLocal}
            disabled={isLoadingPhoto}
            className="px-4 py-2 rounded w-full sm:w-auto border-blue-600 border text-blue-600"
          >
            {editingDraftIndex !== null ? 'Update Draft' : 'Save to Local'}
          </button>
        </div>
      </div>

      {localDrafts.length > 0 && (
        <button
          onClick={() => setShowDraftModal(true)}
          className="fixed bottom-6 right-6 bg-purple-600 hover:bg-purple-700 text-white p-4 rounded-full shadow-lg"
          title="Lihat Draft Ritasi"
        >
          <DocumentTextIcon className="h-6 w-6" />
        </button>
      )}

      {showDraftModal && (
  <>
    {/* Modal daftar draft */}
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-boxdark p-6 rounded shadow max-w-4xl w-full max-h-[80vh] overflow-y-auto">
        <h3 className="text-lg font-bold mb-4">Draft Ritasi Lokal</h3>
        <div className="overflow-auto max-h-64 mb-4">
          <table className="min-w-full border">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-800">
                <th className="p-2 border">No SJ</th>
                <th className="p-2 border">Tanggal</th>
                <th className="p-2 border">Unit</th>
                <th className="p-2 border">Qty SJ</th>
                <th className="p-2 border">Foto</th>
                <th className="p-2 border">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {localDrafts.map((d, i) => (
                <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="p-2 border">{d.no_surat_jalan}</td>
                  <td className="p-2 border">{d.ritation_date}</td>
                  <td className="p-2 border">{d.warehouse_id}</td>
                  <td className="p-2 border">{formatIDNumber(d.qty_sj)} L</td>
                  <td className="p-2 border text-center">
                    {d.photo_url && (
                      <img
                        src={d.photo_url}
                        alt="thumb"
                        className="h-12 w-12 object-cover rounded cursor-zoom-in"
                        onClick={() => setZoomUrl(d.photo_url!)}
                      />
                    )}
                  </td>
                  <td className="p-2 border text-center">
                    <div className="flex justify-center gap-1">
                      <button
                        onClick={() => handleEditDraft(i)}
                        className="bg-yellow-500 hover:bg-yellow-600 text-white px-2 py-1 rounded text-sm"
                        title="Edit draft"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Yakin ingin menghapus draft ini?')) {
                            handleDeleteDraft(i);
                          }
                        }}
                        className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-sm"
                        title="Hapus draft"
                      >
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">
            Total: {localDrafts.length} draft tersimpan
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setShowDraftModal(false)}
              className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded"
            >
              Tutup
            </button>
            <button
              onClick={() => {
                if (confirm(`Yakin ingin mengirim semua ${localDrafts.length} draft?`)) {
                  handleSubmitAllLocal();
                }
              }}
              disabled={loadingSubmit}
              className={`px-4 py-2 rounded text-white ${
                loadingSubmit
                  ? 'bg-blue-300 cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600'
              }`}
            >
              {loadingSubmit ? 'Mengirim...' : `Submit All (${localDrafts.length})`}
            </button>
          </div>
        </div>
      </div>
    </div>

    {/* Modal zoom foto */}
    {zoomUrl && (
      <div
        className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center"
        onClick={() => setZoomUrl(null)}
      >
        <img
          src={zoomUrl}
          alt="zoom"
          className="max-h-[90vh] max-w-[90vw] object-contain rounded"
          onClick={(e) => e.stopPropagation()} // supaya klik fotonya tidak close
        />
      </div>
    )}
  </>
)}

    </div>
  );
};

export default FuelPartnerRitation;