// components/SondingPanel.tsx
import React, { useEffect, useState } from "react";
import { interpolateVolume, TeraPoint } from "../functions/interpolateVolume";

interface SondingPanelProps {
  title: string;
  unitId: string;
  teraData: TeraPoint[]; // sudah mm
  sondingRear: string;   // input mm
  sondingFront: string;  // input mm
  rearFieldName: string;
  frontFieldName: string;
  onChange: (field: string, value: string) => void;
  onVolumeChange: (volume: number | null) => void;
}

const SondingPanel: React.FC<SondingPanelProps> = ({
  title,
  unitId,
  teraData,
  sondingRear,
  sondingFront,
  rearFieldName,
  frontFieldName,
  onChange,
  onVolumeChange,
}) => {
  const [loading, setLoading] = useState(false);
  const [volume, setVolume] = useState<number | null>(null);

  useEffect(() => {
    if (!sondingRear || !sondingFront || teraData.length === 0) {
      setVolume(null);
      onVolumeChange(null);
      return;
    }

    setLoading(true);
    const handler = setTimeout(() => {
      const rear = parseFloat(sondingRear);
      const front = parseFloat(sondingFront);
      if (Number.isNaN(rear) || Number.isNaN(front)) {
        setLoading(false);
        return;
      }
      const avg = (rear + front) / 2; // mm
      const vol = interpolateVolume(teraData, avg, { precision: 2 });
      setVolume(vol);
      onVolumeChange(vol ?? null);
      setLoading(false);
    }, 300); // debounce

    return () => clearTimeout(handler);
  }, [sondingRear, sondingFront, teraData, onVolumeChange]);

  const disabled = !unitId || teraData.length === 0;

  return (
    <div className={`mb-4 border rounded p-4 ${disabled ? "opacity-50" : ""}`}>
      <h3 className="text-center font-bold">{title}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
        <div>
          <label className="block mb-1">Belakang (mm)</label>
          <input
            type="number"
            value={sondingRear}
            onChange={(e) => onChange(rearFieldName, e.target.value)}
            className="border rounded p-2 w-full"
            disabled={disabled}
          />
        </div>
        <div>
          <label className="block mb-1">Depan (mm)</label>
          <input
            type="number"
            value={sondingFront}
            onChange={(e) => onChange(frontFieldName, e.target.value)}
            className="border rounded p-2 w-full"
            disabled={disabled}
          />
        </div>
      </div>
      <div className="mt-2 text-sm font-semibold">
        {loading && <span>Loading…</span>}
        {!loading && volume !== null && (
          <span>Volume: {volume.toLocaleString("id-ID")} liter</span>
        )}
        {!loading && volume === null && teraData.length === 0 && (
          <span className="text-red-300">Data tera tidak tersedia</span>
        )}
      </div>
    </div>
  );
};

export default SondingPanel;
