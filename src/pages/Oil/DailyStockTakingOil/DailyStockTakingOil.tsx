import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../db/SupabaseClient';
import { computeQtyFromInput } from './components/computeQtyFromInput';

type StorageOil = {
  id: number;
  unit_id: string;
  warehouse_id: string;
  location?: string;
};

type Material = {
  material_code: string;
  item_description?: string;
};

type LocalDraft = {
  key: string;
  warehouse_id: string;
  unit_id?: string | null;
  location?: string | null;
  material_code: string;
  item_description?: string | null;
  tank_number: number;
  uoi: string;
  input_value: string;
  qty?: number | null;
};

const LS_PREFIX = 'dailyStock-';
const UOI_OPTIONS = ['LITR', 'IBC', 'DRUM', 'PAIL', 'KG'];

const DailyStockTakingOil: React.FC = () => {
  // master data
  const [storages, setStorages] = useState<StorageOil[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [tankNumbers, setTankNumbers] = useState<number[]>([]);

  // selection
  const [selectedStorage, setSelectedStorage] = useState<StorageOil | null>(null);
  const [selectedMaterial, setSelectedMaterial] = useState<string>('');
  const [tankNumber, setTankNumber] = useState<number | null>(null);
  const [selectedUOI, setSelectedUOI] = useState<string>('LITR');

  // current form values (ke localStorage debounced)
  const [inputValue, setInputValueState] = useState<string>('');
  const [qty, setQty] = useState<number | null>(null);

  // drafts (all items from localStorage)
  const [drafts, setDrafts] = useState<LocalDraft[]>([]);

  // ------------ helpers ------------
  const getLsKey = (warehouse_id?: string, material?: string, tank?: number, uoi?: string) => {
    if (!warehouse_id || !material || tank === undefined || tank === null || !uoi) return null;
    return `${LS_PREFIX}${warehouse_id}-${material}-${tank}-${uoi}`;
  };

  // load storages on mount
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from('storage_oil').select('*').order('warehouse_id', { ascending: true });
      if (error) {
        console.error('fetch storages', error);
        return;
      }
      setStorages(data || []);
    })();
  }, []);

  // when warehouse changes: reset material/tank and fetch materials for that warehouse
  useEffect(() => {
    setMaterials([]);
    setSelectedMaterial('');
    setTankNumbers([]);
    setTankNumber(null);
    setInputValueState('');
    setQty(null);
    setSelectedUOI('LITR');

    if (!selectedStorage) return;

    (async () => {
      const { data: setupData, error: setupErr } = await supabase
        .from('storage_oil_setup')
        .select('material_code')
        .eq('warehouse_id', selectedStorage.warehouse_id);

      if (setupErr) {
        console.error('fetch setup', setupErr);
        return;
      }

      const materialCodes = Array.from(new Set((setupData || []).map((r: any) => r.material_code)));
      if (!materialCodes.length) {
        setMaterials([]);
        return;
      }

      const { data: matData } = await supabase
        .from('materials')
        .select('material_code, item_description')
        .in('material_code', materialCodes);

      const merged: Material[] = materialCodes.map((c: string) => ({
        material_code: c,
        item_description: matData?.find((m: any) => m.material_code === c)?.item_description || '',
      }));

      setMaterials(merged);
    })();
  }, [selectedStorage]);

  // when material changes: fetch tank numbers for this (warehouse, material)
  useEffect(() => {
    setTankNumbers([]);
    setTankNumber(null);
    setInputValueState('');
    setQty(null);

    if (!selectedStorage || !selectedMaterial) return;

    (async () => {
      const { data, error } = await supabase
        .from('storage_oil_setup')
        .select('tank_number')
        .eq('warehouse_id', selectedStorage.warehouse_id)
        .eq('material_code', selectedMaterial);

      if (error) {
        console.error('fetch tanks', error);
        return;
      }
      const tanks = Array.from(new Set((data || []).map((r: any) => r.tank_number))).sort((a: number, b: number) => a - b);
      setTankNumbers(tanks);
      setTankNumber(tanks[0] || null);
    })();
  }, [selectedMaterial, selectedStorage]);

  // ------------ load single draft into form when selection changes ------------
  useEffect(() => {
    const key = getLsKey(selectedStorage?.warehouse_id, selectedMaterial, tankNumber ?? undefined, selectedUOI);
    if (!key) {
      setInputValueState('');
      setQty(null);
      return;
    }
    const raw = localStorage.getItem(key);
    if (!raw) {
      setInputValueState('');
      setQty(null);
      return;
    }
    try {
      const obj = JSON.parse(raw);
      setInputValueState(obj.input_value ?? '');
      setQty(obj.qty ?? null);
      // if uoi in saved entry differs, don't override selectedUOI by default (we keep selection), but we could
    } catch {
      setInputValueState('');
      setQty(null);
    }
  }, [selectedStorage, selectedMaterial, tankNumber, selectedUOI]);

  // ------------ debounce-save current form to localStorage OR auto-delete if input empty ------------
  useEffect(() => {
    // only save when selection is complete
    const key = getLsKey(selectedStorage?.warehouse_id, selectedMaterial, tankNumber ?? undefined, selectedUOI);
    if (!key) return;

    const handler = setTimeout(() => {
      if ((inputValue || '').toString().trim() === '') {
        // remove draft if input cleared
        localStorage.removeItem(key);
        loadDrafts(); // refresh table
        return;
      }
      const draftPayload = {
        warehouse_id: selectedStorage!.warehouse_id,
        unit_id: selectedStorage!.unit_id,
        location: selectedStorage!.location ?? null,
        material_code: selectedMaterial,
        item_description: materials.find((m) => m.material_code === selectedMaterial)?.item_description ?? null,
        tank_number: tankNumber!,
        uoi: selectedUOI,
        input_value: inputValue,
        qty: qty ?? null,
      };
      try {
        localStorage.setItem(key, JSON.stringify(draftPayload));
      } catch (e) {
        console.warn('localStorage set failed', e);
      }
      loadDrafts();
    }, 600);

    return () => clearTimeout(handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputValue, qty, selectedUOI, selectedStorage, selectedMaterial, tankNumber]);

  // ------------ load all drafts from localStorage ------------
  const loadDrafts = () => {
    const rows: LocalDraft[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (!k.startsWith(LS_PREFIX)) continue;
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      try {
        const obj = JSON.parse(raw);
        // ensure required fields exist; if not, try to parse key
        let parsed: LocalDraft | null = null;
        if (obj && obj.warehouse_id && obj.material_code && obj.tank_number !== undefined && obj.uoi) {
          parsed = {
            key: k,
            warehouse_id: obj.warehouse_id,
            unit_id: obj.unit_id ?? null,
            location: obj.location ?? null,
            material_code: obj.material_code,
            item_description: obj.item_description ?? null,
            tank_number: Number(obj.tank_number),
            uoi: obj.uoi,
            input_value: obj.input_value ?? '',
            qty: obj.qty ?? null,
          };
        } else {
          // fallback: parse key pattern dailyStock-<warehouse>-<material>-<tank>-<uoi>
          const rest = k.slice(LS_PREFIX.length);
          const parts = rest.split('-');
          if (parts.length >= 4) {
            const uoi = parts.pop()!;
            const tankStr = parts.pop()!;
            const material = parts.pop()!;
            const warehouse = parts.join('-');
            parsed = {
              key: k,
              warehouse_id: warehouse,
              unit_id: null,
              location: null,
              material_code: material,
              item_description: null,
              tank_number: Number(tankStr),
              uoi,
              input_value: obj.input_value ?? '',
              qty: obj.qty ?? null,
            };
          }
        }
        if (parsed) rows.push(parsed);
      } catch {
        // ignore malformed stored value
      }
    }
    // sort rows by warehouse then material then tank
    rows.sort((a, b) => a.warehouse_id.localeCompare(b.warehouse_id) || a.material_code.localeCompare(b.material_code) || (a.tank_number - b.tank_number));
    setDrafts(rows);
  };

  // call once on mount
  useEffect(() => {
    loadDrafts();
    // also schedule a refresh after 700ms to catch debounced writes that might have just happened
    const t = setTimeout(loadDrafts, 700);
    return () => clearTimeout(t);
  }, []);




  const handleGetQty = async() =>  {
    const qty = await computeQtyFromInput(selectedStorage!.warehouse_id, inputValue);
    setQty(qty ?? 0);
    // save immediately to localStorage for current key (no debounce) so draft table refreshes quicker:
    const key = getLsKey(selectedStorage?.warehouse_id, selectedMaterial, tankNumber ?? undefined, selectedUOI);
    if (key) {
      const draftPayload = {
        warehouse_id: selectedStorage!.warehouse_id,
        unit_id: selectedStorage!.unit_id,
        location: selectedStorage!.location ?? null,
        material_code: selectedMaterial,
        item_description: materials.find((m) => m.material_code === selectedMaterial)?.item_description ?? null,
        tank_number: tankNumber!,
        uoi: selectedUOI,
        input_value: inputValue,
        qty: qty,
      };
      try {
        localStorage.setItem(key, JSON.stringify(draftPayload));
      } catch {}
      loadDrafts();
    }
  };
// ------------ Get Qty All (fills qty for all local drafts only if qty null) ------------
// misalnya computeQtyFromInput sekarang async:
// export const computeQtyFromInput = async (warehouseId: string, v: string): Promise<number|null> => { ... }

const handleGetQtyAll = async () => {
  // map semua draft -> Promise
  const updatedDrafts = await Promise.all(
    drafts.map(async (d) => {
      if (d.qty == null || d.qty === undefined) {
        // hitung qty dengan warehouseId + input_value
        const computed = await computeQtyFromInput(d.warehouse_id, d.input_value || '');
        try {
          // update localStorage entry yang bersangkutan
          const raw = localStorage.getItem(d.key);
          const obj = raw ? JSON.parse(raw) : {};
          const newObj = { ...(obj || {}), qty: computed };
          localStorage.setItem(d.key, JSON.stringify(newObj));
        } catch (e) {
          console.warn('failed set qty all for', d.key, e);
        }
        return { ...d, qty: computed ?? null };
      }
      // kalau sudah ada qty biarkan saja
      return d;
    })
  );

  setDrafts(updatedDrafts);
};




  // ------------ Submit single draft (current selection) ------------
const handleSubmit = async () => {
  if (!selectedStorage || !selectedMaterial || tankNumber === null) return;
  try {
    const payload = {
      warehouse_id: selectedStorage.warehouse_id,
      unit_id: selectedStorage.unit_id,
      location: selectedStorage.location ?? null,
      material_code: selectedMaterial,
      item_description:
        materials.find((m) => m.material_code === selectedMaterial)
          ?.item_description ?? null,
      tank_number: tankNumber,
      uoi: selectedUOI,
      input_value: inputValue ? Number(inputValue) : null,
      qty,
      date_dst: new Date().toISOString().split('T')[0],
    };
    const { error } = await supabase.from('dst_oli').insert([payload]);
    if (error) throw error;

    // hapus draft yang sama di localStorage
    const key = getLsKey(
      selectedStorage.warehouse_id,
      selectedMaterial,
      tankNumber,
      selectedUOI
    );
    if (key) localStorage.removeItem(key);

    loadDrafts();
    setInputValueState('');
    setQty(null);
    alert('Saved successfully');
  } catch (err) {
    console.error(err);
    alert('Save failed');
  }
};



  // ------------ Submit All (bulk) ------------
const handleSubmitAll = async () => {
  if (!drafts.length) return;
  try {
    // supaya item_description terisi benar
    const matCodes = Array.from(new Set(drafts.map((r) => r.material_code)));
    const { data: matData } = await supabase
      .from('materials')
      .select('material_code,item_description')
      .in('material_code', matCodes);

    const rows = drafts.map((d) => ({
      warehouse_id: d.warehouse_id,
      unit_id: d.unit_id,
      location: d.location,
      material_code: d.material_code,
      item_description:
        (matData || []).find((m) => m.material_code === d.material_code)
          ?.item_description ?? d.item_description ?? null,
      tank_number: d.tank_number,
      uoi: d.uoi,
      input_value: d.input_value ? Number(d.input_value) : null,
      qty: d.qty,
      date_dst: new Date().toISOString().split('T')[0],
    }));

    const { error } = await supabase.from('dst_oli').insert(rows);
    if (error) throw error;

    drafts.forEach((d) => localStorage.removeItem(d.key));
    loadDrafts();
    alert('All saved successfully');
  } catch (err) {
    console.error('submit all', err);
    alert('Batch save failed');
  }
};



  const handleDeleteDraft = (key: string) => {
    localStorage.removeItem(key);
    loadDrafts();
  };
  return (
    <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark mb-6 p-4 sm:p-6">
      <h2 className="mb-4 font-bold text-black dark:text-white sm:text-title-sm">Daily Stock Taking Oil</h2>

      {/* Warehouse */}
      <div className="mb-4">
        <label className="block mb-1 font-medium">Select Warehouse</label>
        <select
          className="border p-2 w-full rounded"
          value={selectedStorage?.id ?? ''}
          onChange={(e) => {
            const st = storages.find((s) => s.id === Number(e.target.value)) || null;
            setSelectedStorage(st);
          }}
        >
          <option value="">-- Select Warehouse --</option>
          {storages.map((s) => (
            <option key={s.id} value={s.id}>
              {s.warehouse_id} - {s.unit_id} {s.location ? `- ${s.location}` : ''}
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
            <option key={n} value={n}>{n}</option>
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
        >
          {UOI_OPTIONS.map((u) => <option key={u} value={u}>{u}</option>)}
        </select>
      </div>

      {/* Input */}
      <div className="mb-4">
        <label className="block mb-1 font-medium">Input Value</label>
        <input
          value={inputValue}
          onChange={(e) => setInputValueState(e.target.value)}
          className="border p-2 w-full rounded"
          placeholder="Type measured value..."
        />
      </div>

      {/* Qty */}
      <div className="mb-4 text-center">
        <span className="text-2xl font-bold">{qty !== null ? qty : '---'}</span>
      </div>

      {/* Buttons: Get Qty, Submit (single), Get Qty All, Submit All */}
      <div className="flex justify-center gap-3 mb-4">
        <button className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600" onClick={handleGetQty} disabled={!selectedStorage || !selectedMaterial || !tankNumber}>
          Get Qty
        </button>

        <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600" onClick={handleSubmit} disabled={!selectedStorage || !selectedMaterial || !tankNumber || qty === null}>
          Submit
        </button>

        <button className="px-4 py-2 bg-amber-500 text-white rounded hover:bg-amber-600" onClick={handleGetQtyAll} disabled={!drafts.length}>
          Get Qty All
        </button>

        <button className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700" onClick={handleSubmitAll} disabled={!drafts.length}>
          Submit All
        </button>
      </div>

      {/* Drafts table: header shading slate, row separators only */}
      <div className="mt-6">
        <h3 className="font-semibold mb-2">Pending Local Drafts</h3>
        <div className="overflow-auto">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-2 text-left">Warehouse</th>
                <th className="p-2 text-left">Material</th>
                <th className="p-2 text-left">Tank</th>
                <th className="p-2 text-left">UOI</th>
                <th className="p-2 text-left">Input</th>
                <th className="p-2 text-left">Qty</th>
                <th className="p-2 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {drafts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-2 text-center text-gray-500">No pending drafts</td>
                </tr>
              ) : (
                drafts.map((d) => (
                  <tr key={d.key} className="border-b">
                    <td className="p-2">{d.warehouse_id}</td>
                    <td className="p-2">{d.material_code}{d.item_description ? ` - ${d.item_description}` : ''}</td>
                    <td className="p-2">{d.tank_number}</td>
                    <td className="p-2">{d.uoi}</td>
                    <td className="p-2">{d.input_value}</td>
                    <td className="p-2">{d.qty ?? '---'}</td>
                    <td className="p-2 text-center">
                      <button className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600" onClick={() => handleDeleteDraft(d.key)}>Delete</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DailyStockTakingOil;
