import React, { useEffect, useState } from "react";
import ReusableSwitcher from "../../../components/Switchers/SwitcherFour";
import { supabase } from "../../../db/SupabaseClient";

interface ManpowerItem {
  nrp: string;
  nama: string;
}
interface StorageItem {
  id: number;
  warehouse_id: string;
  unit_id: string;
}

const FuelPartnerRitation: React.FC = () => {
  // core form state
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [shift, setShift] = useState<"1" | "2">("1");
  const [manualNN, setManualNN] = useState(""); // nomor manual user (angka)
  const [noSuratJalan, setNoSuratJalan] = useState("");

  // dropdown selections
  const [unit, setUnit] = useState("");
  const [operator, setOperator] = useState("");
  const [fuelman, setFuelman] = useState("");

  // sonding
  const [sondingBeforeRear, setSondingBeforeRear] = useState("");
  const [sondingBeforeFront, setSondingBeforeFront] = useState("");
  const [sondingAfterRear, setSondingAfterRear] = useState("");
  const [sondingAfterFront, setSondingAfterFront] = useState("");

  // flowmeter
  const [flowmeterBefore, setFlowmeterBefore] = useState("");
  const [flowmeterAfter, setFlowmeterAfter] = useState("");
  const [useDekaliter, setUseDekaliter] = useState(true);

  // foto preview
  const [photoPreview, setPhotoPreview] = useState<string>("");

  // dropdown data from Supabase
  const [units, setUnits] = useState<StorageItem[]>([]);
  const [operators, setOperators] = useState<ManpowerItem[]>([]);
  const [fuelmans, setFuelmans] = useState<ManpowerItem[]>([]);
  const [petugasList, setPetugasList] = useState<ManpowerItem[]>([]);

  // nama petugas persisted (localStorage)
  const [selectedPetugas, setSelectedPetugas] = useState<string>(() => {
    return localStorage.getItem("selectedPetugas") || "";
  });

  const [loadingDropdowns, setLoadingDropdowns] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // set default shift based on hour
  useEffect(() => {
    const hour = new Date().getHours();
    setShift(hour >= 6 && hour < 18 ? "1" : "2");
  }, []);

  // persist selectedPetugas to localStorage
  useEffect(() => {
    if (selectedPetugas) {
      localStorage.setItem("selectedPetugas", selectedPetugas);
    } else {
      localStorage.removeItem("selectedPetugas");
    }
  }, [selectedPetugas]);

  // fetch dropdowns from Supabase
  useEffect(() => {
    const fetchDropdowns = async () => {
      setLoadingDropdowns(true);
      setFetchError(null);
      try {
        // units (storage.type = 'FT') ordered by warehouse_id
        const { data: unitData, error: unitErr } = await supabase
          .from("storage")
          .select("id, unit_id, warehouse_id")
          .eq("type", "FT")
          .order("warehouse_id", { ascending: true });
        if (unitErr) throw unitErr;
        setUnits((unitData as any) || []);

        // operators
        const { data: opData, error: opErr } = await supabase
          .from("manpower")
          .select("nrp, nama, position")
          // we cannot use .in on joined field in simple select, so fetch position id then filter client-side
          .order("nama", { ascending: true });
        if (opErr) throw opErr;

        // fetch incumbents table separately to know which position ids maps to which incumbent text
        // but in your schema 'position' is a FK to 'incumbent(id)'. We'll do a single query to manpower with join:
        const { data: opJoined, error: opJoinErr } = await supabase
          .from("manpower")
          .select("nrp, nama, incumbent:position (id, incumbent)")
          .order("nama", { ascending: true });
        if (opJoinErr) throw opJoinErr;

        const opJoinedArr = (opJoined as any[]) || [];

        // filter operators & fuelmans & petugas by incumbent text
        const ops = opJoinedArr
          .filter((r) => r.incumbent?.incumbent === "OPERATOR FT")
          .map((r) => ({ nrp: r.nrp, nama: r.nama }));
        const fms = opJoinedArr
          .filter((r) => r.incumbent?.incumbent === "FUELMAN")
          .map((r) => ({ nrp: r.nrp, nama: r.nama }));
        const ptg = opJoinedArr
          .filter((r) => r.incumbent?.incumbent === "FUELMAN_PARTNER")
          .map((r) => ({ nrp: r.nrp, nama: r.nama }));

        setOperators(ops);
        setFuelmans(fms);
        setPetugasList(ptg);
      } catch (err: any) {
        console.error("fetchDropdowns error", err);
        setFetchError(err?.message || "Gagal mengambil data dropdown");
      } finally {
        setLoadingDropdowns(false);
      }
    };

    fetchDropdowns();
  }, []);

  // format nomor surat jalan GYYMMDDSSNN whenever dependencies change
  useEffect(() => {
    if (selectedDate && shift && manualNN !== "") {
      // ensure manualNN is digits only
      const numeric = String(manualNN).replace(/\D/g, "");
      const nn = numeric ? numeric.padStart(2, "0") : "";
      if (!nn) {
        setNoSuratJalan("");
        return;
      }
      const date = new Date(selectedDate);
      const yy = date.getFullYear().toString().slice(-2);
      const mm = (date.getMonth() + 1).toString().padStart(2, "0");
      const dd = date.getDate().toString().padStart(2, "0");
      const ss = shift.padStart(2, "0");
      setNoSuratJalan(`G${yy}${mm}${dd}${ss}${nn}`);
    } else {
      setNoSuratJalan("");
    }
  }, [selectedDate, shift, manualNN]);

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = () => {
    const before = parseFloat(flowmeterBefore || "0");
    const after = parseFloat(flowmeterAfter || "0");
    const multiplier = useDekaliter ? 10 : 1;
    const diff = (after - before) * multiplier;

    // validations
    if (!selectedPetugas) {
      alert("Pilih Nama Petugas terlebih dahulu!");
      return;
    }
    if (!unit) {
      alert("Pilih Unit terlebih dahulu!");
      return;
    }
    if (diff < 0) {
      alert("Selisih flowmeter tidak boleh negatif!");
      return;
    }
    if (after * multiplier > 20000) {
      alert("Flowmeter tidak boleh melebihi maks tangki 20.000 liter!");
      return;
    }

    const payload = {
      tanggal: selectedDate,
      shift,
      noSuratJalan,
      unit,
      operator,
      fuelman,
      namaPetugas: selectedPetugas,
      sondingBeforeRear,
      sondingBeforeFront,
      sondingAfterRear,
      sondingAfterFront,
      flowmeterBefore,
      flowmeterAfter,
      satuan: useDekaliter ? "Dekaliter" : "Liter",
      selisihLiter: diff,
    };

    alert(JSON.stringify(payload, null, 2));
  };

  return (
    <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark mb-6">
      <div className="p-4 sm:p-6">
        <h2 className="mb-4 font-bold text-black dark:text-white sm:text-title-sm">
          Fuel Partner Ritation
        </h2>

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
            onChange={(e) => setShift(e.target.value as "1" | "2")}
            className="border rounded p-2 w-full"
          >
            <option value="1">Shift 1 (06.00 - 18.00)</option>
            <option value="2">Shift 2 (18.00 - 06.00)</option>
          </select>
        </div>

        {/* nama petugas (persist di localStorage) */}
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
          <label className="block mb-1 text-left">Nomor Surat Jalan Manual (NN)</label>
          <input
            type="number"
            min={0}
            value={manualNN}
            onChange={(e) => {
              // keep only digits, no negative sign
              const val = e.target.value.replace(/\D/g, "");
              setManualNN(val);
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
        <div className="mb-4 rounded p-4 border">
          <h3 className="text-center font-bold mb-3">Data Fleet</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block mb-1">Unit</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="border rounded p-2 w-full"
                disabled={loadingDropdowns}
              >
                <option value="">Pilih FT</option>
                {units.map((u) => (
                  <option key={`${u.id}-${u.unit_id}`} value={u.unit_id}>
                    {u.unit_id} ({u.warehouse_id})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block mb-1">Nama Operator</label>
              <select
                value={operator}
                onChange={(e) => setOperator(e.target.value)}
                className="border rounded p-2 w-full"
                disabled={loadingDropdowns}
              >
                <option value="">Pilih Operator</option>
                {operators.map((op) => (
                  <option key={op.nrp} value={op.nrp}>
                    {op.nama}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block mb-1">Nama Fuelman</label>
              <select
                value={fuelman}
                onChange={(e) => setFuelman(e.target.value)}
                className="border rounded p-2 w-full"
                disabled={loadingDropdowns}
              >
                <option value="">Pilih Fuelman</option>
                {fuelmans.map((fm) => (
                  <option key={fm.nrp} value={fm.nrp}>
                    {fm.nama}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* sonding before panel */}
        <div className="mb-4 border rounded p-4">
          <h3 className="text-center font-bold">Sonding Before</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
            <div>
              <label className="block mb-1">Belakang (mm)</label>
              <input
                type="number"
                value={sondingBeforeRear}
                onChange={(e) => setSondingBeforeRear(e.target.value)}
                className="border rounded p-2 w-full"
              />
            </div>
            <div>
              <label className="block mb-1">Depan (mm)</label>
              <input
                type="number"
                value={sondingBeforeFront}
                onChange={(e) => setSondingBeforeFront(e.target.value)}
                className="border rounded p-2 w-full"
              />
            </div>
          </div>
        </div>

        {/* sonding after panel */}
        <div className="mb-4 border rounded p-4">
          <h3 className="text-center font-bold">Sonding After</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
            <div>
              <label className="block mb-1">Belakang (mm)</label>
              <input
                type="number"
                value={sondingAfterRear}
                onChange={(e) => setSondingAfterRear(e.target.value)}
                className="border rounded p-2 w-full"
              />
            </div>
            <div>
              <label className="block mb-1">Depan (mm)</label>
              <input
                type="number"
                value={sondingAfterFront}
                onChange={(e) => setSondingAfterFront(e.target.value)}
                className="border rounded p-2 w-full"
              />
            </div>
          </div>
        </div>

        <hr className="my-4" />

        {/* flowmeter */}
        <div className="border rounded p-4">
          <h3 className="text-center font-bold mb-2">Flowmeter</h3>
          <div className="flex justify-center mb-4">
            <ReusableSwitcher
              textTrue="Dekaliter"
              textFalse="Liter"
              onChange={(state) => setUseDekaliter(state)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block mb-1">Flowmeter Before</label>
              <input
                type="number"
                value={flowmeterBefore}
                onChange={(e) => setFlowmeterBefore(e.target.value)}
                className="border rounded p-2 w-full"
              />
            </div>
            <div>
              <label className="block mb-1">Flowmeter After</label>
              <input
                type="number"
                value={flowmeterAfter}
                onChange={(e) => setFlowmeterAfter(e.target.value)}
                className="border rounded p-2 w-full"
              />
            </div>
          </div>
        </div>

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
          className="mt-6 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded w-full sm:w-auto"
        >
          Submit
        </button>
      </div>
    </div>
  );
};

export default FuelPartnerRitation;
