import React, { useState, useEffect } from "react";
import { supabase } from "../../../../db/SupabaseClient";
import { getVolumeFromTera } from "./getVolumeFromTera";
import Loader from "../../../../common/Loader/Loader";


interface StorageUnit {
  id: number;
  warehouse_id: string;
  unit_id: string;
}

interface SondingPair {
  awal: string;
  akhir: string;
}

interface StockResult {
  awalTera: number;
  akhirTera: number;
}

const StockReporting: React.FC = () => {
  const [units, setUnits] = useState<StorageUnit[]>([]);
  const [rawText, setRawText] = useState("");
  const [sondingData, setSondingData] = useState<Record<string, SondingPair>>({});
  const [teraResults, setTeraResults] = useState<Record<string, StockResult>>({});
  const [totalAwal, setTotalAwal] = useState<number>(0);
  const [totalAkhir, setTotalAkhir] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);

  // 🔹 Fetch storage aktif
  useEffect(() => {
    const fetchUnits = async () => {
      const { data, error } = await supabase
        .from("storage")
        .select("id, warehouse_id, unit_id")
        .neq("status", "OUT")
        .order("warehouse_id", { ascending: true });

      if (error) console.error("Error fetching storage:", error);
      else setUnits(data || []);
    };
    fetchUnits();
  }, []);

  // 🔹 Parsing otomatis dari raw text
  useEffect(() => {
    if (!rawText.trim()) return;

    const sondingSectionRegex = /\*SONDING[\s\S]*?(?=\*\w|\*Note|$)/i;
    const match = rawText.match(sondingSectionRegex);
    if (!match) return;

    const lines = match[0]
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("*"));

    const newData: Record<string, SondingPair> = {};

    lines.forEach((line) => {
      const match = line.match(/([A-Za-z0-9_-]+)\s*=\s*([0-9.,? -]*)/);
      if (match) {
        const unit = match[1].toUpperCase();
        let values = match[2]
          .split("-")
          .map((v) =>
            v
              .replace(/[^\d,.\-]/g, "")
              .replace(",", ".")
              .trim()
          )
          .filter((v) => v !== "" && !isNaN(parseFloat(v)));

        const awal = values[0] || "";
        const akhir = values[1] || values[0] || "";
        newData[unit] = { awal, akhir };
      }
    });

    setSondingData(newData);
  }, [rawText]);

  // 🔹 Hitung tera volume
  useEffect(() => {
    if (Object.keys(sondingData).length === 0) return;

    setIsLoading(true);
    const timer = setTimeout(async () => {
      const newTera: Record<string, StockResult> = {};
      let totalAwalAcc = 0;
      let totalAkhirAcc = 0;

      for (const [unit, { awal, akhir }] of Object.entries(sondingData)) {
        const awalNum = parseFloat(awal) || 0;
        const akhirNum = parseFloat(akhir) || awalNum;

        const awalTera = await getVolumeFromTera(unit, awalNum);
        const akhirTera = await getVolumeFromTera(unit, akhirNum);

        newTera[unit] = { awalTera, akhirTera };
        totalAwalAcc += awalTera;
        totalAkhirAcc += akhirTera;
      }

      setTeraResults(newTera);
      setTotalAwal(totalAwalAcc);
      setTotalAkhir(totalAkhirAcc);
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, [sondingData]);

  const handleInputChange = (
    unitId: string,
    field: "awal" | "akhir",
    value: string
  ) => {
    setSondingData((prev) => ({
      ...prev,
      [unitId]: { ...prev[unitId], [field]: value },
    }));
  };

  const handleClear = () => {
    setRawText("");
    setSondingData({});
    setTeraResults({});
    setTotalAwal(0);
    setTotalAkhir(0);
    setIsLoading(false);
  };

  return (
    <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark mb-6">
      <div className="w-full p-5">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-black dark:text-white text-lg">
            Laporan Stock (Fuelman)
          </h2>
          <button
            onClick={handleClear}
            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-md text-sm font-medium transition-all"
          >
            Clear
          </button>
        </div>

        {/* Textarea Input */}
        <textarea
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder="Paste laporan WhatsApp di sini..."
          rows={6}
          className="w-full border border-stroke dark:border-strokedark rounded-md p-3 mb-6 bg-transparent text-black dark:text-white"
        />

        {/* Loader tampil sebelum hasil komplit */}
        {isLoading ? (
          <Loader title="Menghitung volume berdasarkan tabel tera..." />
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {units.map((u) => {
                const sonding = sondingData[u.unit_id] || { awal: "", akhir: "" };
                const tera = teraResults[u.unit_id] || { awalTera: 0, akhirTera: 0 };

                return (
                  <div
                    key={u.id}
                    className="border border-stroke dark:border-strokedark rounded-lg p-4 bg-gray-50 dark:bg-gray-800 transition-all"
                  >
                    <label className="block mb-2 font-semibold text-black dark:text-white">
                      {u.unit_id}
                    </label>

                    <div className="flex gap-2 mb-2">
                      <input
                        type="number"
                        value={sonding.awal}
                        onChange={(e) =>
                          handleInputChange(u.unit_id, "awal", e.target.value)
                        }
                        placeholder="Awal (cm)"
                        className="w-1/2 border border-stroke dark:border-strokedark rounded-md p-2 text-black dark:text-white"
                      />
                      <input
                        type="number"
                        value={sonding.akhir}
                        onChange={(e) =>
                          handleInputChange(u.unit_id, "akhir", e.target.value)
                        }
                        placeholder="Akhir (cm)"
                        className="w-1/2 border border-stroke dark:border-strokedark rounded-md p-2 text-black dark:text-white"
                      />
                    </div>

                    <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300">
                      <span>Awal: {tera.awalTera.toFixed(0)} L</span>
                      <span>Akhir: {tera.akhirTera.toFixed(0)} L</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Summary */}
            <div className="mt-8 p-4 rounded-lg bg-blue-50 dark:bg-blue-900 text-black dark:text-white">
              <h3 className="font-semibold mb-2">📊 Summary Total Stock</h3>
              <p className="text-lg font-bold">
                Total Awal: {totalAwal.toLocaleString("id-ID")} L
              </p>
              <p className="text-lg font-bold">
                Total Akhir: {totalAkhir.toLocaleString("id-ID")} L
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default StockReporting;
