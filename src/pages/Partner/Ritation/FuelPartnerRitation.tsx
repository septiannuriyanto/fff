import React, { useEffect, useState } from 'react';
import { supabase } from '../../../db/SupabaseClient';
import DataFleetSelector from './components/DataFleetSelector';
import FlowmeterPanel from './components/FlowmeterPanel';
import SondingPanel from './components/SondingPanel';
import ViewTeraModal from './components/ViewTeraModal';
import SummaryPanel from './components/SummaryPanel';
import { useAuth } from '../../Authentication/AuthContext';
import { DocumentTextIcon } from '@heroicons/react/24/solid';
import { validateRitasiForm } from './functions/validateRitasi';

interface ManpowerItem {
  nrp: string;
  nama: string;
}
interface StorageItem {
  id: number;
  warehouse_id: string;
  unit_id: string;
}
export interface TeraPoint {
  unit_id: string;
  height_mm: number;
  qty_liter: number;
}

interface DraftRitasi {
  no_surat_jalan: string;
  queue_num: number | null;
  ritation_date: string;
  warehouse_id: string | null;
  qty_sj: number;
  qty_sonding_before: number;
  qty_sonding_after: number;
  qty_sonding: number;
  sonding_before_front: number;
  sonding_before_rear: number;
  sonding_after_front: number;
  sonding_after_rear: number;
  operator_id: string;
  fuelman_id: string;
  qty_flowmeter_before: number;
  qty_flowmeter_after: number;
  isValidated: boolean;
  petugas_pencatatan: string;
  shift: '1' | '2';
  // photoPreview?: string;
}

const FuelPartnerRitation: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().slice(0, 10),
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

  const [photoPreview, setPhotoPreview] = useState<string>('');

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
  const [editingDraftIndex, setEditingDraftIndex] = useState<number | null>(null);

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
      console.error("Failed to load drafts from local storage:", error);
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

  const generateSuratJalanNumber = (queue: number, dateStr: string, shift: string) => {
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
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const [loadingSubmit, setLoadingSubmit] = useState(false);

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
      // photoPreview
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
      flowmeter_before_url: '',
      flowmeter_after_url: '',
      operator_id: operator,
      fuelman_id: fuelman,
      qty_flowmeter_before: before,
      qty_flowmeter_after: after,
      isValidated: false,
      petugas_pencatatan: selectedPetugas,
      shift: shift,
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

  const handleSaveLocal = () => {
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
      photoPreview
    });

    if (errorMsg) {
      return alert(errorMsg);
    }

    const selectedWarehouse = units.find((u) => u.unit_id === unit)?.warehouse_id || null;

    // Get the next queue number for the draft
    const nextDraftQueue = (localDrafts.length > 0 ? Math.max(...localDrafts.map(d => d.queue_num ?? 0)) : queueNum ?? 0) + 1;
    const nextDraftSJ = generateSuratJalanNumber(nextDraftQueue, selectedDate, shift);

    const payload: DraftRitasi = {
      no_surat_jalan: nextDraftSJ,
      queue_num: nextDraftQueue,
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
      // photoPreview,
    };

    let updatedDrafts: DraftRitasi[];
    if (editingDraftIndex !== null) {
      updatedDrafts = [...localDrafts];
      updatedDrafts[editingDraftIndex] = payload;
      setEditingDraftIndex(null); 
    } else {
      updatedDrafts = [...localDrafts, payload];
    }

    setLocalDrafts(updatedDrafts);
    localStorage.setItem('ritasi_draft', JSON.stringify(updatedDrafts));
    alert('Data tersimpan ke lokal!');
    fetchNextQueue(); 
    handleResetForm();
  };


  const handleDeleteDraft = (index: number) => {
    const updated = [...localDrafts];
    updated.splice(index, 1);
    // Re-assign sequential queue numbers
    const newDrafts = updated.map((d, i) => {
      const newQueue = (d.queue_num ?? 0) - 1;
      return {
        ...d,
        queue_num: newQueue,
        no_surat_jalan: generateSuratJalanNumber(newQueue, d.ritation_date, d.shift)
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
    // setPhotoPreview(draft.photoPreview || '');
    
    setEditingDraftIndex(index);
    setShowDraftModal(false);
  };


  const handleSubmitAllLocal = async () => {
    if (localDrafts.length === 0) {
      return;
    }
    try {
      setLoadingSubmit(true);
      const { error } = await supabase.from('ritasi_fuel').insert(localDrafts);
      if (error) {
        throw error;
      }
      alert('Semua draft berhasil dikirim!');
      setLocalDrafts([]);
      localStorage.removeItem('ritasi_draft');
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
      const draftsForDate = localDrafts.filter(d => d.ritation_date === selectedDate);
      const maxQueueDraft = draftsForDate.length > 0 ? Math.max(...draftsForDate.map(d => d.queue_num ?? 0)) : 0;
      
      const nextQueue = Math.max(maxQueueDB, maxQueueDraft) + 1;

      if (!manualNN) {
        setQueueNum(nextQueue);
        setManualNN(String(nextQueue));
      }
    } catch (err) {
      console.error('fetchNextQueue error', err);
      const draftsForDate = localDrafts.filter(d => d.ritation_date === selectedDate);
      const maxQueueDraft = draftsForDate.length > 0 ? Math.max(...draftsForDate.map(d => d.queue_num ?? 0)) : 0;
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
    setSelectedDate(new Date().toISOString().slice(0, 10));
    setShift(new Date().getHours() >= 6 && new Date().getHours() < 18 ? '1' : '2');
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
    setEditingDraftIndex(null);
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
          <input type="file" accept="image/*" onChange={handlePhoto} />
        </div>
        {photoPreview && (
          <div className="mt-2">
            <img
              src={photoPreview}
              alt="Preview Surat Jalan"
              className="max-h-64 border rounded mx-auto"
            />
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
            disabled={loadingSubmit}
            className={`text-white px-4 py-2 rounded w-full sm:w-auto ${loadingSubmit ? 'bg-slate-400' : 'bg-blue-500 hover:bg-blue-600'}`}
          >
            {loadingSubmit ? 'Mengirim...' : 'Submit'}
          </button>
          <button
            onClick={handleSaveLocal}
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-boxdark p-6 rounded shadow max-w-2xl w-full">
            <h3 className="text-lg font-bold mb-4">Draft Ritasi Lokal</h3>
            <div className="overflow-auto max-h-64 mb-4">
              <table className="min-w-full border">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="p-2 border">No SJ</th>
                    <th className="p-2 border">Tanggal</th>
                    <th className="p-2 border">Unit</th>
                    <th className="p-2 border">Qty SJ</th>
                    <th className="p-2 border">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {localDrafts.map((d, i) => (
                    <tr key={i}>
                      <td className="p-2 border">{d.no_surat_jalan}</td>
                      <td className="p-2 border">{d.ritation_date}</td>
                      <td className="p-2 border">{d.warehouse_id}</td>
                      <td className="p-2 border">{d.qty_sj}</td>
                      <td className="p-2 border text-center space-x-2">
                        <button
                          onClick={() => handleEditDraft(i)}
                          className="bg-yellow-500 hover:bg-yellow-600 text-white px-2 py-1 rounded text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteDraft(i)}
                          className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-sm"
                        >
                          Hapus
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDraftModal(false)}
                className="bg-gray-300 px-4 py-2 rounded"
              >
                Tutup
              </button>
              <button
                onClick={handleSubmitAllLocal}
                disabled={loadingSubmit}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
              >
                {loadingSubmit ? 'Mengirim...' : 'Submit All'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FuelPartnerRitation;