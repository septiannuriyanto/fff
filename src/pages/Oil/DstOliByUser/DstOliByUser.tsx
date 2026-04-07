// /dst-oil/DailyStockTakingOil.tsx
import React, { useEffect, useState } from 'react';
import { supabase } from '../../../db/SupabaseClient';
import { toZonedTime, format } from 'date-fns-tz';
import { useParams } from 'react-router-dom';
import { computeQtyFromInput } from '../DailyStockTakingOil/components/computeQtyFromInput';
import { LocalDraft } from '../DailyStockTakingOil/components/LocalDraft';
import DraftsTable from '../DailyStockTakingOil/components/DraftsTable';
import { getMakassarShiftlyDateObject, getShiftString } from '../../../Utils/TimeUtility';


type StorageOilSetup = {
  id: number;
  warehouse_id: string;
  material_code: string;
  tank_number: number;
  uoi: string;
  conversion_factor: number;
  storage_model: string;
};

type Material = {
  material_code: string;
  item_description?: string;
};

const LS_PREFIX = 'dailyStockByUser-';
const FORM_LS_KEY = 'dstOliByUser-form-v1';

const parseInputNumber = (value: string) => {
  const normalized = value.replace(',', '.').trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const DailyStockTakingOilByUser: React.FC = () => {
  const [storageSetups, setStorageSetups] = useState<StorageOilSetup[]>([]);
  const [storageOils, setStorageOils] = useState<any[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [warehouses, setWarehouses] = useState<Array<{warehouse_id: string, unit_id: string, location?: string}>>([]);
  const [tankNumbers, setTankNumbers] = useState<number[]>([]);
  const [uoiOptions, setUoiOptions] = useState<string[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<{warehouse_id: string, unit_id: string, location?: string} | null>(null);
  const [selectedMaterial, setSelectedMaterial] = useState<string>('');
  const [tankNumber, setTankNumber] = useState<number | null>(null);
  const [selectedUOI, setSelectedUOI] = useState<string>('');
  const [inputValue, setInputValue] = useState<string>('');
  const [inputDate, setInputDate] = useState<string>(() => format(getMakassarShiftlyDateObject(), 'yyyy-MM-dd'));
  const [inputShift, setInputShift] = useState<'1' | '2'>(() => getShiftString());
  const [qty, setQty] = useState<number | null>(null);
  const [drafts, setDrafts] = useState<LocalDraft[]>([]);
  
  // State untuk URL parameter handling
  const [urlAlias, setUrlAlias] = useState<string | null>(null);
  const [isWarehouseDisabled, setIsWarehouseDisabled] = useState<boolean>(false);
  const [error403, setError403] = useState<boolean>(false);

  const getLsKey = (
    warehouse_id?: string,
    material?: string,
    tank?: number,
    uoi?: string
  ) => {
    if (!warehouse_id || !material || tank == null || !uoi) return null;
    return `${LS_PREFIX}${warehouse_id}-${material}-${tank}-${uoi}`;
  };

  // Check URL parameters on component mount
  const { alias } = useParams(); // baca /oil/dst/:alias
  useEffect(() => {
    if (alias) {
      setUrlAlias(alias);
      setIsWarehouseDisabled(true);
    }
  }, [alias]);

  // ambil storage_oil_setup dan storage_oil untuk mendapatkan unit_id dan location
  useEffect(() => {
    (async () => {
      console.log('Fetching data... urlAlias:', urlAlias);
      
      // ambil storage_oil_setup
      const { data: setupData } = await supabase
        .from('storage_oil_setup')
        .select('*')
        .order('warehouse_id, material_code, tank_number');

      // ambil storage_oil untuk mendapatkan unit_id, location, dan alias
      const { data: storageData } = await supabase
        .from('storage_oil')
        .select('id, warehouse_id, unit_id, location, alias')
        .order('id');

      console.log('Setup Data:', setupData);
      console.log('Storage Data:', storageData);

      if (setupData && storageData) {
        setStorageSetups(setupData);

        // extract unique warehouses dari setup yang ada di storage_oil, diurutkan by id storage_oil
        const uniqueWarehouseIds = Array.from(
          new Set(setupData.map(item => item.warehouse_id))
        );

        const warehousesWithDetails = storageData
          .filter(storage => uniqueWarehouseIds.includes(storage.warehouse_id))
          .map(storage => ({
            warehouse_id: storage.warehouse_id,
            unit_id: storage.unit_id,
            location: storage.location
          }));

        setWarehouses(warehousesWithDetails);

        // Check if URL alias parameter exists and is valid
        if (urlAlias) {
          console.log('Looking for alias:', urlAlias);
          
          // Cari berdasarkan alias dari storage_oil
          const foundStorageOil = storageData.find(storage => storage.alias === urlAlias);
          console.log('Found storage oil by alias:', foundStorageOil);
          
          if (foundStorageOil) {
            // Pastikan warehouse_id ini ada di setupData juga
            const hasSetupData = setupData.some(setup => setup.warehouse_id === foundStorageOil.warehouse_id);
            console.log('Has setup data for warehouse:', foundStorageOil.warehouse_id, hasSetupData);
            
            if (hasSetupData) {
              const warehouseDetail = {
                warehouse_id: foundStorageOil.warehouse_id,
                unit_id: foundStorageOil.unit_id,
                location: foundStorageOil.location
              };
              console.log('Setting selected warehouse:', warehouseDetail);
              setSelectedWarehouse(warehouseDetail);
              setError403(false);
            } else {
              console.log('No setup data found for warehouse:', foundStorageOil.warehouse_id);
              setError403(true);
            }
          } else {
            console.log('No storage oil found for alias:', urlAlias);
            setError403(true);
          }
        }
      }

      if (storageData) {
        setStorageOils(storageData);
      }
    })();
  }, [urlAlias]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(FORM_LS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { inputDate?: string; inputShift?: '1' | '2' };
      if (typeof parsed.inputDate === 'string') {
        setInputDate(parsed.inputDate);
      }
      if (parsed.inputShift === '1' || parsed.inputShift === '2') {
        setInputShift(parsed.inputShift);
      }
    } catch (err) {
      console.error('Failed to restore DstOliByUser form state', err);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        FORM_LS_KEY,
        JSON.stringify({
          inputDate,
          inputShift,
        }),
      );
    } catch (err) {
      console.error('Failed to persist DstOliByUser form state', err);
    }
  }, [inputDate, inputShift]);

  // ambil material untuk warehouse yang dipilih
  useEffect(() => {
    // reset material & tank & uoi on warehouse change
    setMaterials([]);
    setSelectedMaterial('');
    setTankNumbers([]);
    setTankNumber(null);
    setUoiOptions([]);
    setSelectedUOI('');
    setInputValue('');
    setQty(null);
    
    if (!selectedWarehouse) return;

    (async () => {
      // ambil material_code unik dari storage_oil_setup untuk warehouse ini
      const warehouseSetups = storageSetups.filter(
        setup => setup.warehouse_id === selectedWarehouse.warehouse_id
      );

      const materialCodes = Array.from(
        new Set(warehouseSetups.map(setup => setup.material_code))
      );

      if (!materialCodes.length) return;

      // join ke tabel materials untuk ambil deskripsi
      const { data: matData } = await supabase
        .from('materials')
        .select('material_code,item_description')
        .in('material_code', materialCodes);

      const merged: Material[] = materialCodes.map((code: string) => ({
        material_code: code,
        item_description:
          matData?.find((m: any) => m.material_code === code)?.item_description || '',
      }));

      setMaterials(merged);
    })();
  }, [selectedWarehouse, storageSetups]);

  // ambil tank numbers untuk material yang dipilih
  useEffect(() => {
    // reset tank & uoi on material change
    setTankNumbers([]);
    setTankNumber(null);
    setUoiOptions([]);
    setSelectedUOI('');
    setInputValue('');
    setQty(null);
    
    if (!selectedWarehouse || !selectedMaterial) return;

    // ambil tank numbers dari storage_oil_setup
    const materialSetups = storageSetups.filter(
      setup => setup.warehouse_id === selectedWarehouse.warehouse_id && 
               setup.material_code === selectedMaterial
    );

    const tanks = Array.from(
      new Set(materialSetups.map(setup => setup.tank_number))
    ).sort((a, b) => a - b);

    setTankNumbers(tanks);
    setTankNumber(tanks[0] || null);
  }, [selectedMaterial, selectedWarehouse, storageSetups]);

  // ambil UOI options untuk tank yang dipilih
  useEffect(() => {
    // reset uoi on tank change
    setUoiOptions([]);
    setSelectedUOI('');
    setInputValue('');
    setQty(null);
    
    if (!selectedWarehouse || !selectedMaterial || tankNumber == null) return;

    // ambil UOI dari storage_oil_setup
    const tankSetups = storageSetups.filter(
      setup => setup.warehouse_id === selectedWarehouse.warehouse_id &&
               setup.material_code === selectedMaterial &&
               setup.tank_number === tankNumber
    );

    const uois = Array.from(
      new Set(tankSetups.map(setup => setup.uoi))
    ).sort();

    setUoiOptions(uois);
    setSelectedUOI(uois[0] || '');
  }, [tankNumber, selectedWarehouse, selectedMaterial, storageSetups]);

  // compute qty + simpan LS (debounce)
  useEffect(() => {
    const key = getLsKey(
      selectedWarehouse?.warehouse_id,
      selectedMaterial,
      tankNumber ?? undefined,
      selectedUOI
    );
    if (!key || !selectedWarehouse || !selectedMaterial || tankNumber == null || !selectedUOI) return;

    const handler = setTimeout(async () => {
      const computed = await computeQtyFromInput(
        selectedWarehouse.warehouse_id,
        selectedMaterial,
        tankNumber,
        selectedUOI,
        inputValue
      );
      setQty(computed ?? null);

      if ((inputValue || '').trim() === '') {
        localStorage.removeItem(key);
      } else {
        const draftPayload: Omit<LocalDraft, 'key'> = {
          created_at: Date.now(),
          warehouse_id: selectedWarehouse.warehouse_id,
          unit_id: selectedWarehouse.unit_id,
          location: selectedWarehouse.location ?? null,
          material_code: selectedMaterial,
          item_description:
            materials.find((m) => m.material_code === selectedMaterial)
              ?.item_description ?? null,
          tank_number: tankNumber,
          uoi: selectedUOI,
          input_value: inputValue,
          qty: computed ?? null,
        };
        localStorage.setItem(key, JSON.stringify(draftPayload));
      }
      loadDrafts();
    }, 500);

    return () => clearTimeout(handler);
  }, [inputValue, selectedUOI, selectedWarehouse, selectedMaterial, tankNumber, materials]);

  const loadDrafts = () => {
    const rows: LocalDraft[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith(LS_PREFIX)) continue;

      const raw = localStorage.getItem(k);
      if (!raw) continue;

      try {
        const obj = JSON.parse(raw);
        rows.push({ key: k, ...obj });
      } catch (err) {
        console.error('Failed to parse draft', err);
      }
    }

    rows.sort((a, b) => {
      const whA = a.warehouse_id ?? '';
      const whB = b.warehouse_id ?? '';
      const matA = a.material_code ?? '';
      const matB = b.material_code ?? '';
      const tankA = Number(a.tank_number ?? 0);
      const tankB = Number(b.tank_number ?? 0);

      return (
        whA.localeCompare(whB) ||
        matA.localeCompare(matB) ||
        tankA - tankB
      );
    });

    setDrafts(rows);
  };

  useEffect(() => {
    loadDrafts();
  }, []);

  const handleGetQty = async () => {
    if (!selectedWarehouse || !selectedMaterial || tankNumber == null) return;
    const computed = await computeQtyFromInput(
      selectedWarehouse.warehouse_id,
      selectedMaterial,
      tankNumber,
      selectedUOI,
      inputValue
    );
    setQty(computed ?? null);
  };

  const handleGetQtyAll = async () => {
    const updated = await Promise.all(
      drafts.map(async (d) => {
        // cari setup data yang sesuai dari storageSetups untuk setiap draft
        const draftSetup = storageSetups.find(setup => 
          setup.warehouse_id === d.warehouse_id &&
          setup.material_code === d.material_code &&
          setup.tank_number === d.tank_number &&
          setup.uoi === d.uoi
        );

        const computed = await computeQtyFromInput(
          d.warehouse_id,
          d.material_code,
          d.tank_number,
          d.uoi,
          d.input_value,
          draftSetup // pass setup data yang sudah ada
        );
        
        // preserve created_at timestamp saat update
        const updatedDraft = { ...d, qty: computed ?? null };
        localStorage.setItem(d.key, JSON.stringify(updatedDraft));
        return updatedDraft;
      })
    );
    setDrafts(updated);
  };

  const handleSubmit = async () => {
    if (!selectedWarehouse || !selectedMaterial || tankNumber == null) return;
    const payload = {
      warehouse_id: selectedWarehouse.warehouse_id,
      unit_id: selectedWarehouse.unit_id,
      location: selectedWarehouse.location ?? null,
      material_code: selectedMaterial,
      item_description:
        materials.find((m) => m.material_code === selectedMaterial)?.item_description ??
        null,
      tank_number: tankNumber,
      uoi: selectedUOI,
      input_value: parseInputNumber(inputValue),
      qty,
      date_dst: inputDate,
      shift: Number(inputShift),
    };
    const { error } = await supabase.from('dst_oli').insert([payload]);
    if (!error) {
      const key = getLsKey(
        selectedWarehouse.warehouse_id,
        selectedMaterial,
        tankNumber,
        selectedUOI
      );
      if (key) localStorage.removeItem(key);
      loadDrafts();
      setInputValue('');
      setQty(null);
    }
  };

  const handleSubmitAll = async () => {
    if (!drafts.length) return;

    const rows = drafts.map((d) => ({
      warehouse_id: d.warehouse_id,
      unit_id: d.unit_id,
      location: d.location,
      material_code: d.material_code,
      item_description: d.item_description,
      tank_number: d.tank_number,
      uoi: d.uoi,
      input_value: parseInputNumber(String(d.input_value ?? '')),
      qty: d.qty,
      date_dst: inputDate,
      shift: Number(inputShift),
    }));

    const { error } = await supabase.from('dst_oli').insert(rows);
    if (!error) {
      alert('All drafts submitted successfully!');
      drafts.forEach((d) => localStorage.removeItem(d.key));
      loadDrafts();
    }
  };

  const handleDeleteDraft = (key: string) => {
    localStorage.removeItem(key);
    loadDrafts();
  };

  const hasDrafts = drafts.length > 0;

  // Tampilkan error 403 jika alias tidak ditemukan
  if (error403) {
    return (
      <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark mb-6 p-4 sm:p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-6xl font-bold text-red-500 mb-4">403</div>
            <div className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Warehouse Not Found
            </div>
            <div className="text-gray-600 dark:text-gray-400">
              The warehouse specified in the URL parameter is not found or not available in your access list.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark mb-6 p-4 sm:p-6">
      <h2 className="mb-4 font-bold text-black dark:text-white sm:text-title-sm">
        Daily Stock Taking Oil by User
      </h2>
      <div className="mb-5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-4 py-3 text-xs text-slate-600 dark:text-slate-300 leading-6">
        <p>1. Pilih warehouse</p>
        <p>2. Pilih material</p>
        <p>3. Input hasil sondingan dalam cm, tunggu hasil tera liternya keluar (tersimpan otomatis di draft local browser)</p>
        <p>4. Ulangi untuk material yang lain pada 1 lubcar/storage yang sama</p>
        <p>5. Tekan submit all jika sudah selesai input</p>
      </div>
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:gap-4">
        <div className="flex-1">
          <label className="block mb-1 font-medium">Date</label>
          <input
            type="date"
            value={inputDate}
            onChange={(e) => setInputDate(e.target.value)}
            className="border p-2 w-full rounded"
          />
        </div>
        <div className="min-w-[120px]">
          <label className="block mb-1 font-medium">Shift</label>
          <select
            value={inputShift}
            onChange={(e) => setInputShift(e.target.value as '1' | '2')}
            className="border p-2 w-full rounded bg-white dark:bg-boxdark"
          >
            <option value="1">Shift 1</option>
            <option value="2">Shift 2</option>
          </select>
        </div>
      </div>

      {/* Warehouse */}
      <div className="mb-4">
        <label className="block mb-1 font-medium">
          Select Warehouse
          {isWarehouseDisabled && (
            <span className="text-sm text-gray-500 ml-2">(Fixed by alias parameter)</span>
          )}
        </label>
        <select
          className={`border p-2 w-full rounded ${
            isWarehouseDisabled 
              ? 'bg-gray-100 dark:bg-gray-600 cursor-not-allowed' 
              : ''
          }`}
          value={selectedWarehouse?.warehouse_id ?? ''}
          onChange={(e) => {
            if (!isWarehouseDisabled) {
              const wh = warehouses.find((w) => w.warehouse_id === e.target.value) || null;
              setSelectedWarehouse(wh);
            }
          }}
          disabled={isWarehouseDisabled}
        >
          <option value="">-- Select Warehouse --</option>
          {warehouses.map((w) => (
            <option key={w.warehouse_id} value={w.warehouse_id}>
              {w.warehouse_id} - {w.unit_id} {w.location ? `- ${w.location}` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Material */}
      <div className="mb-4">
        <label className="block mb-1 font-medium">Select Material</label>
        <select
          className="border p-2 w-full rounded"
          value={selectedMaterial}
          onChange={(e) => setSelectedMaterial(e.target.value)}
          disabled={!materials.length}
        >
          <option value="">-- Select material --</option>
          {materials.map((m) => (
            <option key={m.material_code} value={m.material_code}>
              {m.material_code} {m.item_description ? `- ${m.item_description}` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Tank */}
      <div className="mb-4 hidden">
        <label className="block mb-1 font-medium">Select Tank Number</label>
        <select
          className="border p-2 w-full rounded"
          value={tankNumber ?? ''}
          onChange={(e) => setTankNumber(e.target.value ? Number(e.target.value) : null)}
          disabled={!tankNumbers.length}
        >
          <option value="">-- Select tank --</option>
          {tankNumbers.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>

      {/* UOI */}
      <div className="mb-4 hidden">
        <label className="block mb-1 font-medium">Select UOI</label>
        <select
          className="border p-2 w-full rounded"
          value={selectedUOI}
          onChange={(e) => setSelectedUOI(e.target.value)}
          disabled={!uoiOptions.length}
        >
          <option value="">-- Select UOI --</option>
          {uoiOptions.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      </div>

      {/* Input */}
      <div className="mb-4">
  <label className="block mb-1 font-medium">Input Value (cm)</label>
  <input
    value={inputValue}
    onChange={(e) => {
      const nextValue = e.target.value.replace(/[^\d.,]/g, '');
      if (nextValue === '' || /^\d*(?:[.,]\d*)?$/.test(nextValue)) {
        setInputValue(nextValue);
      }
    }}
    className="border p-2 w-full rounded"
    placeholder="Type measured value..."
    inputMode="decimal"
  />

  {/* Tambahkan Voice Input */}
  {/* <VoiceInputHandler
    onParsed={(val) => {
      // kalau mau langsung isi field input value
      if (val.tinggi) setInputValue(val.tinggi.toString());
      // kamu juga bisa memanfaatkan val.tank dan val.material kalau mau auto-select
      console.log("Voice parsed:", val);
    }}
  /> */}
</div>

      {/* Qty */}
      <div className="mb-4 text-center">
        <span className="text-2xl font-bold">{qty !== null ? qty : '---'}</span>
      </div>

      {/* Buttons */}
      <div className="flex justify-center gap-3 mb-4">
        {/* <button
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          onClick={handleGetQty}
          disabled={!selectedWarehouse || !selectedMaterial || !tankNumber || !selectedUOI}
        >
          Get Qty
        </button> */}

        {/* <button
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          onClick={handleSubmit}
          disabled={!selectedWarehouse || !selectedMaterial || !tankNumber || !selectedUOI || qty === null}
        >
          Submit
        </button> */}
{/* 
        <button
          className="px-4 py-2 bg-amber-500 text-white rounded hover:bg-amber-600"
          onClick={handleGetQtyAll}
          disabled={!drafts.length}
        >
          Get Qty All
        </button> */}

       
      </div>

      {/* Drafts table */}
      <DraftsTable
        drafts={drafts}
        onGetQtyAll={handleGetQtyAll}
        onSubmitAll={handleSubmitAll}
        handleDeleteDraft={handleDeleteDraft}
      />
       <button
          className="mt-2 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-purple-300 disabled:text-purple-100"
          onClick={handleSubmitAll}
          disabled={!hasDrafts}
        >
          Submit All
        </button>
    </div>
  );
};

export default DailyStockTakingOilByUser;
