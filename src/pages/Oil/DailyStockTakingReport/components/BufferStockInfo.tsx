import React, { useEffect, useState } from "react";
import OilReorderInfo from "./OilReorderInfo";
import { fetchAvailableStorageOil } from "./fetchOilDstRecords";
import { DstOliWithLocation } from "./DstOliWithLocation";
import IBCEngine from '../../../../images/icon/ibc-engine.png';
import IBCHydraulic from '../../../../images/icon/ibc-hydraulic.png';
import IBCTransmission from '../../../../images/icon/ibc-transmission.png';
import { ArrowRight, Target, Package } from 'lucide-react';
import { MATERIALS, TARGET_BUFFERS } from "./supplierConfig";




const OIL_ICONS: Record<string, string> = {
  engine: IBCEngine,
  transmission: IBCTransmission,
  hydraulic: IBCHydraulic,
};

const OIL_COLORS: Record<string, { ribbon: string; bg: string; border: string }> = {
  engine: {
    ribbon: 'bg-gradient-to-r from-blue-600 to-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-300 dark:border-blue-700',
  },
  transmission: {
    ribbon: 'bg-gradient-to-r from-yellow-600 to-yellow-500',
    bg: 'bg-yellow-50 dark:bg-yellow-900/20',
    border: 'border-yellow-300 dark:border-yellow-700',
  },
  hydraulic: {
    ribbon: 'bg-gradient-to-r from-purple-600 to-purple-500',
    bg: 'bg-purple-50 dark:bg-purple-900/20',
    border: 'border-purple-300 dark:border-purple-700',
  },
};


interface BufferSummary {
  type: string;
  availableIBC: number;
  emptySpaceOW: number;
  remainingIBC: number;
  targetBuffer: number; // Tambahkan target buffer ke interface
}

interface BufferStockPanelProps {
  records: DstOliWithLocation[];
}

const BufferStockPanel: React.FC<BufferStockPanelProps> = ({ records }) => {
  const [summary, setSummary] = useState<BufferSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        console.log('🚀 Starting buffer stock calculation...');
        setLoading(true);
        setError(null);

        const setupData = await fetchAvailableStorageOil();

        if (!records || !Array.isArray(records)) {
          throw new Error("Records data tidak valid");
        }

        if (!setupData || !Array.isArray(setupData)) {
          throw new Error("Setup data tidak valid");
        }

        const results: BufferSummary[] = [];

        for (const [type, matCode] of Object.entries(MATERIALS)) {
          const om1 = records.find(
            (r) => r.warehouse_id === "OM01" && r.material_code === matCode
          );
          const ow01 = records.find(
            (r) => r.warehouse_id === "OW01" && r.material_code === matCode
          );

          const tankSetup = setupData.find(
            (s) => s.warehouse_id === "OW01" && s.material_code === matCode
          );

          const maxCap = tankSetup?.storage_model === "tank6000" ? 6000 : 2000;
          const filled = ow01?.qty ?? 0;
          const emptySpace = maxCap - filled;

          const available = om1?.qty ?? 0;
          const availableIBC = Math.floor(available / 1000);
          const emptyIBC = Math.ceil(emptySpace / 1000);
          const remainingIBC = availableIBC - emptyIBC;

          results.push({
            type,
            availableIBC,
            emptySpaceOW: emptyIBC,
            remainingIBC,
            targetBuffer: TARGET_BUFFERS[type] || 5, // Ambil target buffer per jenis oli
          });
        }

        if (isMounted) {
          setSummary(results);
          console.log('✅ Buffer stock calculation completed');
        }
      } catch (err) {
        console.error("❌ Error calculating buffer stock:", err);
        if (isMounted) {
          setError(
            err instanceof Error
              ? err.message
              : "Terjadi kesalahan saat menghitung buffer stock"
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
          console.log('🏁 Loading state set to false');
        }
      }
    };

    if (records && records.length > 0) {
      loadData();
    } else {
      setLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [records]);

  if (loading) {
    return (
      <div className="p-2 flex items-center gap-1 text-xs text-gray-500">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 dark:border-gray-100"></div>
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-2 text-xs text-red-600 dark:text-red-400 border border-red-300 dark:border-red-700 rounded bg-red-50 dark:bg-red-900/20">
        ⚠️ {error}
      </div>
    );
  }

  if (summary.length === 0) {
    return (
      <div className="p-2 text-xs text-yellow-700 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded">
        Tidak ada data buffer stock.
      </div>
    );
  }

  const renderIBCIcons = (count: number, icon: string) => {
    const displayCount = Math.min(count, 8);
    const remaining = Math.max(0, count - 8);
    
    return (
      <div className="flex items-center gap-0.5">
        {Array.from({ length: displayCount }).map((_, idx) => (
          <img
            key={idx}
            src={icon}
            alt="IBC"
            className="w-4 h-4 object-contain"
            title="IBC"
          />
        ))}
        {remaining > 0 && (
          <span className="text-[0.6rem] font-bold text-gray-600 dark:text-gray-400 ml-0.5">
            +{remaining}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-sm">
      <h3 className="text-xs font-semibold mb-2 text-gray-800 dark:text-gray-100">
        Buffer Stock (OM1 → OW01)
      </h3>

      <div className="grid sm:grid-cols-3 gap-2">
        {summary.map((item) => {
          const colors = OIL_COLORS[item.type];
          const icon = OIL_ICONS[item.type];
          const toTransfer = item.emptySpaceOW;
          const targetBuffer = item.targetBuffer; // Gunakan target buffer dari data
          
          // Hitung status berdasarkan target buffer masing-masing
          const bufferStatus = item.remainingIBC < 2 
            ? 'critical' 
            : item.remainingIBC < targetBuffer 
            ? 'warning' 
            : 'good';

          return (
            <div
              key={item.type}
              className={`relative rounded border-2 ${colors.border} ${colors.bg} overflow-hidden text-xs`}
            >
              {/* Ribbon */}
              <div className={`${colors.ribbon} text-white px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide`}>
                {item.type.toUpperCase()}
              </div>

              <div className="p-1.5 space-y-1">
                {/* Available in OM1 */}
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">OM1({item.availableIBC} IBC)</span>
                  <div className="text-right">
                    {renderIBCIcons(item.availableIBC, icon)}
                  </div>
                </div>

                {/* Transfer Arrow */}
                <div className="flex items-center justify-center">
                  <ArrowRight className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                </div>

                {/* To be transferred */}
                <div className="flex items-center justify-between bg-white/40 dark:bg-gray-900/30 px-1 py-0.5 rounded text-orange-600 dark:text-orange-400 text-xs font-bold">
                  <span className="text-gray-600 dark:text-gray-400">To OW01:</span>
                  <span>{toTransfer}</span>
                </div>

                {/* Buffer Status */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-0.5">
                    <Target className="w-2.5 h-2.5 text-blue-600 dark:text-blue-400" />
                    <span className="text-gray-600 dark:text-gray-400">Target</span>
                  </div>
                  <span className="font-medium text-gray-800 dark:text-gray-200">{targetBuffer}</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-0.5">
                    <Package className="w-2.5 h-2.5 text-green-600 dark:text-green-400" />
                    <span className="text-gray-600 dark:text-gray-400">Buffer</span>
                  </div>
                  <span className={`font-medium ${
                    bufferStatus === 'critical'
                      ? 'text-red-600 dark:text-red-400'
                      : bufferStatus === 'warning'
                      ? 'text-orange-600 dark:text-orange-400'
                      : 'text-green-600 dark:text-green-400'
                  }`}>
                    {item.remainingIBC}
                  </span>
                </div>

                {/* Status Badge */}
                <div className="mt-1 pt-1 border-t border-gray-300 dark:border-gray-600">
                  <div className={`text-center py-0.5 px-1 rounded text-[0.6rem] font-bold ${
                    bufferStatus === 'critical'
                      ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                      : bufferStatus === 'warning'
                      ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300'
                      : 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                  }`}>
                    {bufferStatus === 'critical' ? 'CRIT' : bufferStatus === 'warning' ? 'WARN' : 'OK'}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-2">
        <OilReorderInfo bufferInfo={summary} />
      </div>
    </div>
  );
};

export default BufferStockPanel;