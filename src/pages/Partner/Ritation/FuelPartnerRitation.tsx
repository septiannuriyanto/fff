import React, { useEffect, useState } from 'react';
import { supabase } from '../../../db/SupabaseClient';
import DataFleetSelector from './components/DataFleetSelector';
import FlowmeterPanel from './components/FlowmeterPanel';
import SondingPanel from './components/SondingPanel';
import ViewTeraModal from './components/ViewTeraModal';
import SummaryPanel from './components/SummaryPanel';
import { useAuth } from '../../Authentication/AuthContext';

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

const FuelPartnerRitation: React.FC = () => {
  // core form state
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().slice(0, 10),
  );


  const { currentUser } = useAuth()

  const [shift, setShift] = useState<'1' | '2'>('1');
  const [manualNN, setManualNN] = useState('');
  const [queueNum, setQueueNum] = useState<number | null>(null);
  const [noSuratJalan, setNoSuratJalan] = useState('');

  // dropdown selections
  const [unit, setUnit] = useState('');
  const [operator, setOperator] = useState('');
  const [fuelman, setFuelman] = useState('');
  const [selectedPetugas, setSelectedPetugas] = useState<string>(
    () => localStorage.getItem('selectedPetugas') || '',
  );

  // sonding
  const [sondingBeforeRear, setSondingBeforeRear] = useState('');
  const [sondingBeforeFront, setSondingBeforeFront] = useState('');
  const [sondingAfterRear, setSondingAfterRear] = useState('');
  const [sondingAfterFront, setSondingAfterFront] = useState('');

  // flowmeter
  const [flowmeterBefore, setFlowmeterBefore] = useState('');
  const [flowmeterAfter, setFlowmeterAfter] = useState('');
  const [useDekaliter, setUseDekaliter] = useState(true);

  // volume
  const [volumeBefore, setVolumeBefore] = useState(0);
  const [volumeAfter, setVolumeAfter] = useState(0);

  // foto preview
  const [photoPreview, setPhotoPreview] = useState<string>('');

  // dropdown data
  const [units, setUnits] = useState<StorageItem[]>([]);
  const [operators, setOperators] = useState<ManpowerItem[]>([]);
  const [fuelmans, setFuelmans] = useState<ManpowerItem[]>([]);
  const [petugasList, setPetugasList] = useState<ManpowerItem[]>([]);
  const [loadingDropdowns, setLoadingDropdowns] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // tera tangki
  const [teraAll, setTeraAll] = useState<Record<string, TeraPoint[]>>({});
  const [loadingTera, setLoadingTera] = useState(false);
  const [showTeraModal, setShowTeraModal] = useState(false);

  // default shift berdasarkan jam
  useEffect(() => {
    const hour = new Date().getHours();
    setShift(hour >= 6 && hour < 18 ? '1' : '2');
  }, []);


  useEffect(() => {
    if (currentUser) {
      setSelectedPetugas(currentUser.nrp);
    }
  }, [currentUser]);

  // persist selectedPetugas
  useEffect(() => {
    if (selectedPetugas)
      localStorage.setItem('selectedPetugas', selectedPetugas);
    else localStorage.removeItem('selectedPetugas');
  }, [selectedPetugas]);

  // fetch dropdowns
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

  // fetch tera tangki
  // fetch tera tangki semua record >1000
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

        if (data.length < batchSize) break; // tidak ada data lagi
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

  // generate nomor surat jalan
  useEffect(() => {
    if (selectedDate && shift && manualNN !== '') {
      const numeric = String(manualNN).replace(/\D/g, '');
      const nn = numeric ? numeric.padStart(2, '0') : '';
      if (!nn) return setNoSuratJalan('');
      const date = new Date(selectedDate);
      const yy = date.getFullYear().toString().slice(-2);
      const mm = (date.getMonth() + 1).toString().padStart(2, '0');
      const dd = date.getDate().toString().padStart(2, '0');
      const ss = shift.padStart(2, '0');
      setNoSuratJalan(`G${yy}${mm}${dd}${ss}${nn}`);
    } else setNoSuratJalan('');
  }, [selectedDate, shift, manualNN]);

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setPhotoPreview(URL.createObjectURL(file));
  };

  const [loadingSubmit, setLoadingSubmit] = useState(false);

  const handleSubmit = async () => {
    const before = parseFloat(flowmeterBefore || '0');
    const after = parseFloat(flowmeterAfter || '0');
    const multiplier = useDekaliter ? 10 : 1;
    const diff = (after - before) * multiplier;

    if (!selectedPetugas) return alert('Pilih Nama Petugas terlebih dahulu!');
    if (!unit) return alert('Pilih Unit terlebih dahulu!');
    if (diff < 0) return alert('Selisih flowmeter tidak boleh negatif!');
    if (diff > 20000)
      return alert('Flowmeter tidak boleh melebihi maks tangki 20.000 liter!');
    if (!noSuratJalan) return alert('Nomor Surat Jalan tidak valid!');
    if (!operator) return alert('Pilih Operator terlebih dahulu!');
    if (!fuelman) return alert('Pilih Fuelman terlebih dahulu!');
    if (!sondingBeforeRear || !sondingBeforeFront)
      return alert('Isi Sonding Before terlebih dahulu!');
    if (!sondingAfterRear || !sondingAfterFront)
      return alert('Isi Sonding After terlebih dahulu!');
    if (volumeBefore === 0)
      return alert(
        'Volume Sonding Before tidak valid atau tidak ditemukan di tera tangki!',
      );
    if (volumeAfter === 0)
      return alert(
        'Volume Sonding After tidak valid atau tidak ditemukan di tera tangki!',
      );
    if (!photoPreview) return alert('Upload foto Surat Jalan terlebih dahulu!');


    const selectedWarehouse = units.find(u => u.unit_id === unit)?.warehouse_id || null;

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
      flowmeter_before_url: '', // nanti bisa diupload ke storage
      flowmeter_after_url: '',
      operator_id: operator,
      fuelman_id: fuelman,
      qty_flowmeter_before: before,
      qty_flowmeter_after: after,
      isValidated: false,
      petugas_pencatatan : selectedPetugas,
      shift : shift,
    };

    try {
      setLoadingSubmit(true);
      const { error } = await supabase
        .from('ritasi_fuel')
        .insert([payload]);
      if (error) throw error;

      alert(`Surat Jalan ${noSuratJalan} berhasil dikirim!`);

      // Reset semua field kecuali teraAll
      setSelectedDate(new Date().toISOString().slice(0, 10));
      setShift('1');
      setManualNN('');
      setNoSuratJalan('');
      setUnit('');
      setOperator('');
      setFuelman('');
      setSondingBeforeRear('');
      setSondingBeforeFront('');
      setSondingAfterRear('');
      setSondingAfterFront('');
      setFlowmeterBefore('');
      setFlowmeterAfter('');
      setUseDekaliter(true);
      setVolumeBefore(0);
      setVolumeAfter(0);
      setPhotoPreview('');
      fetchNextQueue();
    } catch (err: any) {
      console.error(err);
      alert(`Gagal mengirim data: ${err.message || err}`);
    } finally {
      setLoadingSubmit(false);
    }
  };



  const fetchNextQueue = async () => {
  if (!selectedDate) return;
  try {
    const { data, error } = await supabase
      .from('ritasi_fuel')
      .select('queue_num')
      .eq('ritation_date', selectedDate)
      .order('queue_num', { ascending: false })
      .limit(1);
    if (error) throw error;

    const maxQueue = data?.[0]?.queue_num ?? 0;
    const nextQueue = (maxQueue || 0) + 1;

    // hanya set kalau user belum mengetik manual
    if (!manualNN) {
      setQueueNum(nextQueue);
      setManualNN(String(nextQueue));
    }

  } catch (err) {
    console.error('fetchNextQueue error', err);
    setQueueNum(1);
    if (!manualNN) setManualNN('1');
  }
};

useEffect(() => {
  fetchNextQueue();
}, [selectedDate, shift, unit]);



  return (
    <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark mb-6">
      <ViewTeraModal
        visible={showTeraModal}
        onClose={() => setShowTeraModal(false)}
        teraData={Object.values(teraAll).flat()} // flatten semua unit
        units={Object.keys(teraAll)}
      />

      <div className="p-4 sm:p-6">
        <h2 className="mb-4 font-bold text-black dark:text-white sm:text-title-sm">
          Fuel Partner Ritation
        </h2>

        {/* tombol refresh tera */}
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

        {/* tanggal */}
        <div className="mb-4">
          <label className="block mb-1">Tanggal</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border rounded p-2 w-full"
          />
        </div>

        {/* shift */}
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

        {/* nama petugas */}
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

        {/* nomor surat jalan manual */}
        <div className="mb-4 text-center w-full justify-center">
          <label className="block mb-1 text-left">
            Nomor Surat Jalan Manual (NN)
          </label>
          <input
  type="number"
  min={0}
  value={manualNN}
  onChange={(e) => {
    setManualNN(e.target.value.replace(/\D/g, ''))
    setQueueNum(parseInt(e.target.value) || null)
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

        {/* Data Fleet */}
        <DataFleetSelector
          unit={unit}
          operator={operator}
          fuelman={fuelman}
          units={units}
          operators={operators}
          fuelmans={fuelmans}
          loading={loadingDropdowns}
          onChange={(field, value) => {
            if (field === 'unit') setUnit(value);
            if (field === 'operator') setOperator(value);
            if (field === 'fuelman') setFuelman(value);
          }}
        />

        {/* sonding before */}
        <SondingPanel
  title="Sonding Before"
  unitId={unit}
  teraData={teraAll[unit] || []}
  sondingRear={sondingBeforeRear}
  sondingFront={sondingBeforeFront}
  rearFieldName="sondingBeforeRear"
  frontFieldName="sondingBeforeFront"
  unit="cm" // <- inputnya cm
  onChange={(field, value) => {
    if (field === 'sondingBeforeRear') setSondingBeforeRear(value);
    if (field === 'sondingBeforeFront') setSondingBeforeFront(value);
  }}
  onVolumeChange={(vol) => setVolumeBefore(vol ?? 0)}
/>


        {/* sonding after */}
        <SondingPanel
          title="Sonding After"
          unitId={unit}
          teraData={teraAll[unit] || []}
          sondingRear={sondingAfterRear}
          sondingFront={sondingAfterFront}
          rearFieldName="sondingAfterRear"
          frontFieldName="sondingAfterFront"
          unit="cm" // <- inputnya cm
          onChange={(field, value) => {
            if (field === 'sondingAfterRear') setSondingAfterRear(value);
            if (field === 'sondingAfterFront') setSondingAfterFront(value);
          }}
          onVolumeChange={(vol) => setVolumeAfter(vol ?? 0)}
        />

        <hr className="my-4" />

        {/* flowmeter */}
        <FlowmeterPanel
          flowmeterBefore={flowmeterBefore}
          flowmeterAfter={flowmeterAfter}
          useDekaliter={useDekaliter}
          onChange={(field, value) => {
            if (field === 'flowmeterBefore')
              setFlowmeterBefore(value as string);
            if (field === 'flowmeterAfter') setFlowmeterAfter(value as string);
            if (field === 'useDekaliter') setUseDekaliter(value as boolean);
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

        {/* foto */}
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

        <button
          onClick={handleSubmit}
          disabled={loadingSubmit}
          className={`mt-6 ${
            loadingSubmit ? 'bg-slate-400' : 'bg-blue-500 hover:bg-blue-600'
          } text-white px-4 py-2 rounded w-full sm:w-auto`}
        >
          {loadingSubmit ? 'Mengirim...' : 'Submit'}
        </button>
      </div>
    </div>
  );
};

export default FuelPartnerRitation;
