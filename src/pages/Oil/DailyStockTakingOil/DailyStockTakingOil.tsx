// /dst-oil/DailyStockTakingOil.tsx
import React, { useEffect, useState } from 'react';
import { supabase } from '../../../db/SupabaseClient';
import DraftsTable from './components/DraftsTable';
import { computeQtyFromInput } from './components/computeQtyFromInput';
import { LocalDraft } from './components/LocalDraft';
import { toZonedTime, format } from 'date-fns-tz';

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

const LS_PREFIX = 'dailyStock-';

const DailyStockTakingOil: React.FC = () => {
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
  const [qty, setQty] = useState<number | null>(null);
  const [drafts, setDrafts] = useState<LocalDraft[]>([]);
  
  // State untuk URL parameter handling
  const [urlWarehouse, setUrlWarehouse] = useState<string | null>(null);
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
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const warehouseParam = urlParams.get('warehouse');
    
    if (warehouseParam) {
      setUrlWarehouse(warehouseParam);
      setIsWarehouseDisabled(true);
    }
  }, []);

  // ambil storage_oil_setup dan storage_oil untuk mendapatkan unit_id dan location
  useEffect(() => {
    (async () => {
      // ambil storage_oil_setup
      const { data: setupData } = await supabase
        .from('storage_oil_setup')
        .select('*')
        .order('warehouse_id, material_code, tank_number');

      // ambil storage_oil untuk mendapatkan unit_id dan location, diurutkan by id
      const { data: storageData } = await supabase
        .from('storage_oil')
        .select('id, warehouse_id, unit_id, location')
        .order('id');

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

        // Check if URL warehouse parameter exists and is valid
        if (urlWarehouse) {
          const foundWarehouse = warehousesWithDetails.find(w => w.warehouse_id === urlWarehouse);
          if (foundWarehouse) {
            setSelectedWarehouse(foundWarehouse);
            setError403(false);
          } else {
            setError403(true);
          }
        }
      }

      if (storageData) {
        setStorageOils(storageData);
      }
    })();
  }, [urlWarehouse]);

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
      input_value: inputValue ? Number(inputValue) : null,
      qty,
      date_dst: new Date().toISOString().split('T')[0],
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

    // ambil tanggal sekarang
    const now = new Date();
    // definisikan timezone yang diinginkan
    const timeZone = 'Asia/Makassar'; // GMT+8

    // konversi UTC → zona yang dimaksud
    const zonedDate = toZonedTime(now, timeZone);

    // format YYYY-MM-DD sesuai zona
    const date_dst = format(zonedDate, 'yyyy-MM-dd');
    console.log('Formatted date_dst:', date_dst);

    const rows = drafts.map((d) => ({
      warehouse_id: d.warehouse_id,
      unit_id: d.unit_id,
      location: d.location,
      material_code: d.material_code,
      item_description: d.item_description,
      tank_number: d.tank_number,
      uoi: d.uoi,
      input_value: d.input_value ? Number(d.input_value) : null,
      qty: d.qty,
      date_dst, // hasil format dengan timezone
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

  // Tampilkan error 403 jika warehouse tidak ditemukan
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
              The warehouse specified in the URL parameter is not available in your access list.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark mb-6 p-4 sm:p-6">
      <h2 className="mb-4 font-bold text-black dark:text-white sm:text-title-sm">
        Daily Stock Taking Oil
      </h2>

      {/* Warehouse */}
      <div className="mb-4">
        <label className="block mb-1 font-medium">
          Select Warehouse
          {isWarehouseDisabled && (
            <span className="text-sm text-gray-500 ml-2">(Fixed by URL parameter)</span>
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
      <div className="mb-4">
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
      <div className="mb-4">
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
        <label className="block mb-1 font-medium">Input Value</label>
        <input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="border p-2 w-full rounded"
          placeholder="Type measured value..."
        />
      </div>

      {/* Qty */}
      <div className="mb-4 text-center">
        <span className="text-2xl font-bold">{qty !== null ? qty : '---'}</span>
      </div>

      {/* Buttons */}
      <div className="flex justify-center gap-3 mb-4">
        <button
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          onClick={handleGetQty}
          disabled={!selectedWarehouse || !selectedMaterial || !tankNumber || !selectedUOI}
        >
          Get Qty
        </button>

        <button
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          onClick={handleSubmit}
          disabled={!selectedWarehouse || !selectedMaterial || !tankNumber || !selectedUOI || qty === null}
        >
          Submit
        </button>

        <button
          className="px-4 py-2 bg-amber-500 text-white rounded hover:bg-amber-600"
          onClick={handleGetQtyAll}
          disabled={!drafts.length}
        >
          Get Qty All
        </button>

        <button
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
          onClick={handleSubmitAll}
          disabled={!drafts.length}
        >
          Submit All
        </button>
      </div>

      {/* Drafts table */}
      <DraftsTable
        drafts={drafts}
        onGetQtyAll={handleGetQtyAll}
        onSubmitAll={handleSubmitAll}
        handleDeleteDraft={handleDeleteDraft}
      />
    </div>
  );
};

export default DailyStockTakingOil;