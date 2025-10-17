// ===============================================
// src/components/OilReorderInfo.tsx (REVISI TOTAL)
// ===============================================

import React, { useMemo, useEffect, useState } from 'react';
import { AlertCircle, TrendingUp, Package, Truck, Combine, Zap, Settings } from 'lucide-react';
import { supabase } from '../../../../db/SupabaseClient';
import toast from 'react-hot-toast';
import { BufferSummary } from '../types/bufferSummary';
import OilSetupPanel from './OilSetupPanels';
import ExclusiveWidget from '../../../../common/TrialWrapper/ExclusiveWidget';
import { SUPERVISOR } from '../../../../store/roles';
import { getSupplierByOilType, SUPPLIERS } from './supplierConfig';

// ===============================================
// KONSTANTA MATERIAL CODE
// ===============================================
export const MATERIALS = {
  engine: '1000101471',
  transmission: '1000012900',
  hydraulic: '1000000763',
};

// ===============================================
// INTERFACES (Revisi: Tambah currentStock di Combo)
// ===============================================

interface OilPriorityWeight {
  material_code: string;
  priority_weight: number;
}

interface OilBufferTarget {
  warehouse_id: string;
  material_code: string;
  target_buffer: number;
  reorder_point: number;
  max_buffer: number;
  active: boolean;
}

interface RecommendationResult {
  type: 'engine' | 'transmission' | 'hydraulic';
  needOrder: boolean; // Apakah order dibutuhkan (berdasarkan stock AKTUAL)
  urgency: 'critical' | 'warning' | 'normal' | 'good'; // Urgensi visual (berdasarkan stock AKTUAL + SIMULASI)
  recommendedQty: number;
  reason: string;
  shipments: number;
  supplierName: string; 
  supplierId: string;
  priorityScore: number;
  remainingIBC: number; // Stock AKTUAL + SIMULASI
  actualIBC: number; // Stock IBC AKTUAL (tanpa simulasi)
  emptySpaceOW: number;
}

interface CombinedOrderRecommendation {
  combination: { transmission: number; hydraulic: number; description: string };
  totalShipments: number;
  reason: string;
  transmission: BufferSummary | undefined;
  hydraulic: BufferSummary | undefined;
  priorityScore: number;
  currentStock: { transmission: number; hydraulic: number }; // Stock AKTUAL + SIMULASI
  actualStock: { transmission: number; hydraulic: number }; // Stock IBC AKTUAL
}

// ===============================================
// STYLE & ICON UTILITIES (Dipertahankan)
// ===============================================
const getUrgencyStyle = (urgency: string) => {
  const styles = {
    critical: { bg: 'bg-red-100 dark:bg-red-900/30', border: 'border-red-400 dark:border-red-700', text: 'text-red-800 dark:text-red-300', label: 'CRITICAL' },
    warning: { bg: 'bg-orange-100 dark:bg-orange-900/30', border: 'border-orange-400 dark:border-orange-700', text: 'text-orange-800 dark:text-orange-300', label: 'WARNING' },
    normal: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', border: 'border-yellow-400 dark:border-yellow-700', text: 'text-yellow-800 dark:text-yellow-300', label: 'NORMAL' },
    good: { bg: 'bg-green-100 dark:bg-green-900/30', border: 'border-green-400 dark:border-green-700', text: 'text-green-800 dark:text-green-300', label: 'GOOD' },
  };
  return styles[urgency as keyof typeof styles] || styles.good;
};

const getUrgencyIcon = (urgency: string) => {
  if (urgency === 'critical' || urgency === 'warning') return <AlertCircle className="w-4 h-4" />;
  if (urgency === 'normal') return <TrendingUp className="w-4 h-4" />;
  return <Package className="w-4 h-4" />;
};

// ===============================================
// PANEL COMPONENTS
// ===============================================

// --- Komponen Panel Order Supplier A (Revisi: Tambah prop `incoming`) ---
const SupplierAPanel: React.FC<{
  rec: RecommendationResult,
  target: OilBufferTarget,
  onIncomingChange: (val: number) => void;
  weight: number,
  incoming: number // NEW: Menerima nilai incoming
}> = ({ rec, target, weight, incoming, onIncomingChange }) => {
    const style = getUrgencyStyle(rec.urgency);
    
    // Tentukan Order Qty yang ditampilkan
    const displayQty = rec.needOrder ? rec.recommendedQty : 0;
    
    // Tentukan Reason yang ditampilkan
    let displayReason = rec.reason;
    if (!rec.needOrder && incoming > 0) {
        displayReason = `Stok aman. Kedatangan simulasi (${incoming} IBC) menaikkan buffer ke ${rec.remainingIBC} IBC.`;
    } else if (!rec.needOrder && incoming === 0) {
        displayReason = `Stock aman (${rec.remainingIBC} IBC). Tidak ada rekomendasi order saat ini.`;
    }
    

    return (
        <div className={`p-3 rounded border-2 ${style.border} ${style.bg} flex-1 min-w-[300px]`}>
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                    {getUrgencyIcon(rec.urgency)}
                    <h5 className={`font-bold text-sm ${style.text}`}>
                        Order Engine Oil ({rec.supplierName})
                    </h5>
                </div>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/50 dark:bg-black/20 ${style.text}`}>
                    {style.label}
                </span>
            </div>

            <div className="text-sm p-2 bg-white/50 dark:bg-gray-800/50 rounded border border-gray-300 dark:border-gray-600">
                <div className="flex justify-between text-[11px] text-gray-700 dark:text-gray-300">
                    <span>Buffer Tersisa (Aktual {rec.actualIBC} + Sim {incoming}):</span>
                    <span className="font-semibold">{rec.remainingIBC} IBC</span>
                </div>
                <div className="flex justify-between text-[11px] text-gray-700 dark:text-gray-300">
                    <span>Target Buffer:</span>
                    <span className="font-semibold">{target.target_buffer} IBC</span>
                </div>
                
                {/* Input simulasi */}
                <div className="mt-2">
                  <label className="text-[10px] font-semibold block mb-0.5 text-gray-600 dark:text-gray-300">
                    Simulasi Kedatangan Hari Ini (IBC):
                  </label>
                  <input
                    type="number"
                    min={0}
                    className="w-full text-xs p-1 border rounded bg-white dark:bg-gray-700"
                    value={incoming === 0 ? '' : incoming} // Binding nilai
                    onChange={(e) => onIncomingChange(parseInt(e.target.value) || 0)}
                    placeholder="Masukkan jumlah IBC..."
                  />
                </div>

                {displayQty > 0 && (
                    <div className="flex justify-between pt-1 mt-1 border-t border-gray-400 dark:border-gray-600/50">
                        <span className="font-bold text-gray-800 dark:text-gray-200">Order Rekomendasi:</span>
                        <span className="font-bold text-lg text-red-600 dark:text-red-400">
                            {displayQty} IBC
                        </span>
                    </div>
                )}
                
                <p className="text-[10px] italic pt-1 mt-1 border-t border-gray-400 dark:border-gray-600/50 opacity-80">
                    {displayReason}
                </p>
            </div>
        </div>
    );
};

interface SupplierBPanelProps {
  combo: CombinedOrderRecommendation;
  targets: Record<string, OilBufferTarget>;
  weights: Record<string, number>;
  incoming: { transmission: number; hydraulic: number };
  onIncomingChange: (type: 'transmission' | 'hydraulic', val: number) => void;
}

// --- Komponen Panel Kombinasi Supplier B (REVISI FULL) ---
const SupplierBPanel: React.FC<SupplierBPanelProps> = ({
  combo,
  targets,
  weights,
  incoming,
  onIncomingChange
}) => {
    
    // Data dari combo (sudah termasuk simulasi)
    const totalOrdered = combo.combination.transmission + combo.combination.hydraulic;
    const transCurrentStock = combo.currentStock.transmission;
    const hydroCurrentStock = combo.currentStock.hydraulic;
    
    // Konfigurasi Target dan ROP
    const transTarget = targets.transmission?.target_buffer || 0;
    const hydroTarget = targets.hydraulic?.target_buffer || 0;
    const transROP = targets.transmission?.reorder_point || 0;
    const hydroROP = targets.hydraulic?.reorder_point || 0;
    const transWeight = weights.transmission || 1;
    const hydroWeight = weights.hydraulic || 1;
    const MAX_SHIPMENT_CAPACITY = 10;
    
    // Ambil nama Supplier B
    const supplierBInfo = SUPPLIERS['SUPPLIER_B']; 
    const supplierBName = supplierBInfo ? supplierBInfo.name : 'Supplier B (Unknown)';

    // Logika Penentuan Style
    const isTransUnderROP = transCurrentStock < transROP;
    const isHydroUnderROP = hydroCurrentStock < hydroROP;

    let panelClass = 'border-green-400 bg-green-50 dark:bg-green-900/30'; 
    let headerTextColor = 'text-green-800 dark:text-green-200';
    let summaryBgClass = 'bg-white/50 dark:bg-gray-800/50 border-gray-300 dark:border-gray-600';
    let orderedQtyColor = 'text-green-600 dark:text-green-400';
    let instructionText = 'Stock Aman. Order tidak diperlukan.';
    let instructionTextColor = 'text-green-700 dark:text-green-300';
    let headerIcon = <Package className="w-4 h-4 text-green-700 dark:text-green-300" />;

    if (totalOrdered > 0) {
        const isFullTruckOrder = totalOrdered >= MAX_SHIPMENT_CAPACITY && (isTransUnderROP || isHydroUnderROP);

        if (isFullTruckOrder) {
            // CRITICAL / Full Truck
            panelClass = 'border-red-400 bg-red-50 dark:bg-red-900/30'; 
            headerTextColor = 'text-red-800 dark:text-red-200';
            summaryBgClass = 'bg-red-100/50 dark:bg-red-900/50 border-red-300 dark:border-red-600';
            orderedQtyColor = 'text-red-600 dark:text-red-400';
            instructionText = 'SEGERA BUAT PERMINTAAN ORDER (Truk Penuh)';
            instructionTextColor = 'text-red-700 dark:text-red-300';
            headerIcon = <AlertCircle className="w-4 h-4 text-red-700 dark:text-red-300" />;
        } else {
            // WARNING / Partial Truck
            panelClass = 'border-orange-400 bg-orange-50 dark:bg-orange-900/30';
            headerTextColor = 'text-orange-800 dark:text-orange-200';
            summaryBgClass = 'bg-orange-100/50 dark:bg-orange-900/50 border-orange-300 dark:border-orange-600';
            orderedQtyColor = 'text-orange-600 dark:text-orange-400';
            instructionText = 'Rekomendasi Order Sebagian';
            instructionTextColor = 'text-orange-700 dark:text-orange-300';
            headerIcon = <Combine className="w-4 h-4 text-orange-700 dark:text-orange-300" />;
        }
    }


    return (
        <div className={`p-3 rounded border-2 ${panelClass} flex-1 min-w-[300px]`}>
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                    {headerIcon}
                    <h5 className={`font-bold text-sm ${headerTextColor}`}>
                        Kombinasi Order ({supplierBName})
                    </h5>
                </div>
                {/* Menampilkan status order/aman */}
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/50 dark:bg-black/20 ${headerTextColor}`}>
                    {totalOrdered > 0 ? 'ORDER DIBUTUHKAN' : 'STOCK AMAN'}
                </span>
            </div>
            
            <div className="flex gap-2 mb-3 text-center">
                {/* Transmission Info */}
                <div className="flex-1 p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded border border-yellow-300">
                    <p className="text-[10px] text-yellow-700 dark:text-yellow-300">Trans (Target {transTarget} | W: {transWeight})</p>
                    <p className={`text-xl font-bold text-yellow-800 dark:text-yellow-200 ${totalOrdered === 0 ? 'text-gray-500 dark:text-gray-400' : ''}`}>{combo.combination.transmission}</p>
                    <p className="text-[10px] text-gray-600 dark:text-gray-400 mt-0.5">Buffer (Aktual {combo.actualStock.transmission} + Sim {incoming.transmission}): {transCurrentStock} IBC</p>
                    {/* Input Simulasi */}
                    <input
                        type="number"
                        min={0}
                        className="w-full text-xs p-1 mt-1 border rounded bg-white dark:bg-slate-700"
                        placeholder="Kedatangan IBC..."
                        value={incoming.transmission === 0 ? '' : incoming.transmission} 
                        onChange={(e) => onIncomingChange('transmission', parseInt(e.target.value) || 0)}
                    />
                </div>
                {/* Hydraulic Info */}
                <div className="flex-1 p-2 bg-purple-100 dark:bg-purple-900/30 rounded border border-purple-300">
                    <p className="text-[10px] text-purple-700 dark:text-purple-300">Hydro (Target {hydroTarget} | W: {hydroWeight})</p>
                    <p className={`text-xl font-bold text-purple-800 dark:text-purple-200 ${totalOrdered === 0 ? 'text-gray-500 dark:text-gray-400' : ''}`}>{combo.combination.hydraulic}</p>
                    <p className="text-[10px] text-gray-600 dark:text-gray-400 mt-0.5">Buffer (Aktual {combo.actualStock.hydraulic} + Sim {incoming.hydraulic}): {hydroCurrentStock} IBC</p>
                    {/* Input Simulasi */}
                    <input
                        type="number"
                        min={0}
                        className="w-full text-xs p-1 mt-1 border rounded bg-white dark:bg-gray-700"
                        placeholder="Kedatangan IBC..."
                        value={incoming.hydraulic === 0 ? '' : incoming.hydraulic} 
                        onChange={(e) => onIncomingChange('hydraulic', parseInt(e.target.value) || 0)}
                    />
                </div>
            </div>

            <div className={`text-sm p-2 rounded border ${summaryBgClass}`}>
                <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 mb-1">Summary Order:</p>
                
                <div className="flex justify-between text-[11px] text-gray-700 dark:text-gray-300">
                    <span>Total IBC Dipesan:</span>
                    <span className={`font-bold text-base ${orderedQtyColor}`}>{totalOrdered} / {MAX_SHIPMENT_CAPACITY} IBC</span>
                </div>
                
                <div className="flex justify-between text-[11px] text-gray-700 dark:text-gray-300">
                    <span>Total Pengiriman:</span>
                    <span className="font-bold">{combo.totalShipments}x</span>
                </div>
                
                {/* Teks Instruksi dengan warna kondisional */}
                <p className={`text-[10px] font-bold pt-1 mt-1 border-t border-gray-400 dark:border-gray-600/50 ${instructionTextColor}`}>
                    {instructionText}
                </p>

                <p className="text-[10px] italic pt-1 mt-1 border-t border-gray-400 dark:border-gray-600/50 opacity-80">
                    {combo.reason}
                </p>
            </div>
        </div>
    );
};


// ===============================================
// MAIN COMPONENT
// ===============================================
const OilReorderInfo: React.FC<{ bufferInfo: BufferSummary[]; warehouseId: string }> = ({ bufferInfo, warehouseId }) => {
  const [weights, setWeights] = useState<Record<string, number>>({});
  const [targets, setTargets] = useState<Record<string, OilBufferTarget>>({});
  const [loading, setLoading] = useState(true);
  const [showSetupModal, setShowSetupModal] = useState(false); 
  const [incomingIBCs, setIncomingIBCs] = useState<Record<'engine' | 'transmission' | 'hydraulic', number>>({
    engine: 0,
    transmission: 0,
    hydraulic: 0,
  });


// Fetch Konfigurasi Supabase (Dipertahankan)
const fetchConfig = async () => {
    try {
      setLoading(true);

      const [{ data: weightData, error: wErr }, { data: targetData, error: tErr }] = await Promise.all([
        supabase.from('oil_priority_weight').select('*'),
        supabase.from('oil_buffer_target').select('*').eq('warehouse_id', warehouseId),
      ]);

      if (wErr) throw wErr;
      if (tErr) throw tErr;

      // Buat map bobot
      const weightMap: Record<string, number> = {};
      (weightData as OilPriorityWeight[]).forEach((w) => {
        const key = Object.keys(MATERIALS).find(
          (k) => MATERIALS[k as keyof typeof MATERIALS] === w.material_code
        );
        if (key) weightMap[key] = w.priority_weight;
      });

      // Buat map target buffer
      const targetMap: Record<string, OilBufferTarget> = {};
      (targetData as OilBufferTarget[]).forEach((t) => {
        const key = Object.keys(MATERIALS).find(
          (k) => MATERIALS[k as keyof typeof MATERIALS] === t.material_code
        );
        if (key) targetMap[key] = t;
      });

      setWeights(weightMap);
      setTargets(targetMap);
    } catch (err) {
      console.error(err);
      toast.error('Gagal memuat konfigurasi buffer & bobot.');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchConfig();
  }, [warehouseId]);


  // ========================
  // REVISI FUNGSI Perhitungan
  // ========================
  const calculateRecommendation = (item: BufferSummary, incoming = 0): RecommendationResult => {
    const conf = targets[item.type];
    const weight = weights[item.type] || 1;
    const supplierInfo = getSupplierByOilType(item.type);
    const supplierName = supplierInfo ? supplierInfo.name : 'Supplier A (Unknown)';
    const supplierId = supplierInfo ? supplierInfo.id : 'SUPPLIER_A';

    // 1. Stock Aktual
    const actualStock = item.remainingIBC;
    
    // 2. Stock Setelah Simulasi
    const currentStock = actualStock + incoming;

    if (!conf) {
      return {
        type: item.type as 'engine' | 'transmission' | 'hydraulic',
        needOrder: false,
        urgency: 'good',
        recommendedQty: 0,
        reason: 'Konfigurasi buffer tidak ditemukan',
        shipments: 0,
        supplierName,
        supplierId,
        priorityScore: 0,
        remainingIBC: currentStock,
        actualIBC: actualStock,
        emptySpaceOW: item.emptySpaceOW,
      };
    }

    const { target_buffer, reorder_point, max_buffer } = conf;
    const safetyStock = reorder_point / 2;

    // A. Urgensi Visual (Berdasarkan Current Stock: Aktual + Simulasi)
    let urgency: 'critical' | 'warning' | 'normal' | 'good';
    if (currentStock <= 0) urgency = 'critical';
    else if (currentStock < safetyStock) urgency = 'warning';
    else if (currentStock < reorder_point) urgency = 'normal';
    else urgency = 'good';

    // B. Kalkulasi Order (Berdasarkan Stock AKTUAL)
    const actualShortage = actualStock < reorder_point; 
    const actualNeedToReach = Math.max(0, target_buffer - actualStock);

    let recommendedQty = 0;
    let reason = 'Stock aman (setelah/tanpa order)';
    let shipments = 0;

    if (actualShortage || actualStock < target_buffer) {
        recommendedQty = Math.min(actualNeedToReach, max_buffer);
        shipments = 1;
        
        const stockAfterOrder = actualStock + recommendedQty;
        reason = `Order ${recommendedQty} IBC direkomendasikan untuk capai target (${target_buffer} IBC).`;

        if (item.type === 'engine' && recommendedQty < 8 && recommendedQty > 0) {
            recommendedQty = 8;
            reason = `Order minimal 8 IBC (MOQ) untuk capai target buffer.`;
        }

        // Tambahkan konteks simulasi
        if (incoming > 0) {
            if (currentStock >= reorder_point) {
                 // Jika simulasi sudah menutupi ROP, order tidak perlu
                recommendedQty = 0; 
                reason = `Stock saat ini (${actualStock} IBC) + Kedatangan simulasi (${incoming} IBC) = ${currentStock} IBC. Stock sudah melewati ROP. Order tidak diperlukan.`;
            } else {
                // Stock + incoming masih di bawah ROP, tapi kita tetap perlu order
                const finalStock = currentStock + recommendedQty;
                reason += ` Jika order dilakukan dan simulasi datang, total stok akan menjadi ${finalStock} IBC.`;
            }
        } else {
            // Tanpa simulasi
            reason += ` Jika order dilakukan, total stok akan menjadi ${stockAfterOrder} IBC.`;
        }
    }
    
    // Priority Score berdasarkan Shortfall AKTUAL (atau Shortfall setelah simulasi jika simulasi diaktifkan)
    const shortfall = Math.max(0, reorder_point - currentStock);
    const priorityScore = recommendedQty > 0 ? shortfall * weight : 0;

    return {
      type: item.type as 'engine' | 'transmission' | 'hydraulic',
      needOrder: recommendedQty > 0, // Order hanya dibutuhkan jika recommendedQty > 0
      urgency,
      recommendedQty,
      reason,
      shipments,
      supplierName,
      supplierId,
      priorityScore,
      remainingIBC: currentStock,
      actualIBC: actualStock,
      emptySpaceOW: item.emptySpaceOW,
    };
  };


  const calculateSupplierBCombination = (bufferInfo: BufferSummary[], incoming: { transmission: number; hydraulic: number }): CombinedOrderRecommendation | null => {
    const transmission = bufferInfo.find((i) => i.type === 'transmission');
    const hydraulic = bufferInfo.find((i) => i.type === 'hydraulic');
    if (!transmission || !hydraulic) return null;

    const transConf = targets.transmission;
    const hydroConf = targets.hydraulic;
    const transWeight = weights.transmission || 1;
    const hydroWeight = weights.hydraulic || 1;

    if (!transConf || !hydroConf) return null;

    const maxPerShipment = 10;

    // Stock Aktual
    const transActualStock = transmission.remainingIBC;
    const hydroActualStock = hydraulic.remainingIBC;

    // Stock Setelah Simulasi
    const transCurrentStock = transActualStock + incoming.transmission;
    const hydroCurrentStock = hydroActualStock + incoming.hydraulic;
    
    // Kebutuhan (dihitung berdasarkan Stock Setelah Simulasi)
    const transNeed = Math.max(0, transConf.target_buffer - transCurrentStock);
    const hydroNeed = Math.max(0, hydroConf.target_buffer - hydroCurrentStock);
    
    // Shortfall untuk Prioritas (dihitung berdasarkan Stock Setelah Simulasi)
    const transShortfall = Math.max(0, transConf.reorder_point - transCurrentStock);
    const hydroShortfall = Math.max(0, hydroConf.reorder_point - hydroCurrentStock);
    
    const transWeightedShortfall = transShortfall * transWeight;
    const hydroWeightedShortfall = hydroShortfall * hydroWeight;

    const totalNeed = transNeed + hydroNeed;
    const totalWeightedNeed = transNeed * transWeight + hydroNeed * hydroWeight;

    if (totalNeed === 0) return {
        combination: { transmission: 0, hydraulic: 0, description: 'Stock aman' },
        totalShipments: 0,
        reason: `Semua stock Transmission (${transCurrentStock} IBC) dan Hydraulic (${hydroCurrentStock} IBC) berada di atas Target Buffer.`,
        transmission,
        hydraulic,
        priorityScore: 0,
        currentStock: { transmission: transCurrentStock, hydraulic: hydroCurrentStock },
        actualStock: { transmission: transActualStock, hydraulic: hydroActualStock },
    };
    

    // Logika Alokasi IBC
    let transPortion = 0;
    let hydroPortion = 0;
    
    // Distribusi untuk 1 truk penuh (10 IBC)
    if (totalWeightedNeed > 0) {
      transPortion = Math.round((transNeed * transWeight / totalWeightedNeed) * maxPerShipment);
      hydroPortion = Math.round((hydroNeed * hydroWeight / totalWeightedNeed) * maxPerShipment);
    } else {
      transPortion = Math.min(transNeed, maxPerShipment);
      hydroPortion = Math.min(hydroNeed, maxPerShipment - transPortion);
    }

    // Koreksi jika melebihi kapasitas truk
    if (transPortion + hydroPortion > maxPerShipment) {
      const excess = (transPortion + hydroPortion) - maxPerShipment;
      // Prioritaskan yang memiliki bobot/shortfall lebih tinggi
      if (transWeightedShortfall > hydroWeightedShortfall) {
        hydroPortion = Math.max(0, hydroPortion - excess);
      } else {
        transPortion = Math.max(0, transPortion - excess);
      }
      
      if (transPortion + hydroPortion > maxPerShipment) {
           const finalExcess = (transPortion + hydroPortion) - maxPerShipment;
           transPortion = transPortion - finalExcess; 
      }
    }
    
    // Pastikan order tidak melebihi kebutuhan (NEED yang sudah dihitung dengan SIMULASI)
    transPortion = Math.min(transPortion, transNeed);
    hydroPortion = Math.min(hydroPortion, hydroNeed);

    // Hitung jumlah pengiriman aktual yang dibutuhkan
    const totalShipments = Math.ceil(totalNeed / maxPerShipment);

    // Skor Kombinasi
    const combinationScore = Math.max(transWeightedShortfall, hydroWeightedShortfall);

    const reason =
      totalNeed <= maxPerShipment
        ? `Rekomendasi 1 pengiriman: ${transPortion}T + ${hydroPortion}H. Stock akan mencapai Target Buffer.`
        : `Total ${totalNeed} IBC dibutuhkan. Pengiriman pertama: ${transPortion}T + ${hydroPortion}H. Total ${totalShipments}x pengiriman.`;

    return {
      combination: { transmission: transPortion, hydraulic: hydroPortion, description: `${transPortion}T + ${hydroPortion}H` },
      totalShipments,
      reason,
      transmission,
      hydraulic,
      priorityScore: combinationScore,
      currentStock: { transmission: transCurrentStock, hydraulic: hydroCurrentStock },
      actualStock: { transmission: transActualStock, hydraulic: hydroActualStock },
    };
  };

  // ========================
  // Generate Rekomendasi (Update dependencies useMemo)
  // ========================
  const engineRec = useMemo(() => {
    const engineItem = bufferInfo.find((i) => i.type === 'engine');
    if (!engineItem) return null;
    return calculateRecommendation(engineItem, incomingIBCs.engine);
  }, [bufferInfo, weights, targets, incomingIBCs.engine]);


  const supplierBCombo = useMemo(
    () => calculateSupplierBCombination(bufferInfo, { transmission: incomingIBCs.transmission, hydraulic: incomingIBCs.hydraulic }),
    [bufferInfo, weights, targets, incomingIBCs.transmission, incomingIBCs.hydraulic]
  );
  
  // Ambil Target dan Weight (Dipertahankan)
  const engineTarget = targets.engine;
  const transTarget = targets.transmission;
  const hydroTarget = targets.hydraulic;
  const engineWeight = weights.engine || 1;
  const transWeight = weights.transmission || 1;
  const hydroWeight = weights.hydraulic || 1;

  if (loading) {
    return <div className="p-4 text-gray-500 dark:text-gray-400 text-sm">Memuat konfigurasi dari Supabase...</div>;
  }

  if (!engineTarget || !transTarget || !hydroTarget) {
      return (
          <div className="p-4 border rounded-lg bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700">
              <p className="text-red-800 dark:text-red-200 font-semibold">
                  <AlertCircle className="inline w-4 h-4 mr-2" /> 
                  Konfigurasi Target Buffer belum lengkap di Supabase untuk semua jenis oli (Engine/Transmission/Hydraulic). Harap periksa tabel `oil_buffer_target`.
              </p>
          </div>
      );
  }

  // ========================
  // Render Komponen Utama (Revisi: Perbaiki kondisi render Engine Panel)
  // ========================
  return (
    <div className=" relative">
      {/* Header */}
      <div className="flex items-center justify-between mt-8">
        <div className="flex items-center gap-2 ">
          <Truck className="w-5 h-5 text-blue-600" />
          <h4 className="font-bold text-base text-gray-800 dark:text-gray-100">
            Rekomendasi Order Berdasarkan Supplier
          </h4>
        </div>

        {/* Tombol buka setup modal */}
        <ExclusiveWidget allowedRoles={SUPERVISOR}>
          <button
          onClick={() => setShowSetupModal(true)}
          className="flex items-center gap-1 px-2 py-1 text-xs font-semibold bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded transition"
        >
          <Settings className="w-3.5 h-3.5 text-slate-500" />
          Setup
        </button>
        </ExclusiveWidget>
      </div>

      {/* Main Order Panels - Flex Row di Web, Column di Mobile */}
      <div className="flex flex-col lg:flex-row gap-2 mt-0">
        
        {/* Panel Supplier A (Engine Oil) - SELALU RENDER JIKA ADA DATA */}
        {engineRec && (
            <SupplierAPanel 
                rec={engineRec} 
                target={engineTarget}
                weight={engineWeight}
                incoming={incomingIBCs.engine}
                onIncomingChange={(val) =>
                    setIncomingIBCs((prev) => ({ ...prev, engine: val }))
                }
            />
        )}
        
        {/* Panel Supplier B (Transmission + Hydraulic Oil) */}
        {supplierBCombo && (
            <SupplierBPanel 
                combo={supplierBCombo} 
                targets={targets}
                weights={weights}
                incoming={{ transmission: incomingIBCs.transmission, hydraulic: incomingIBCs.hydraulic }}
                onIncomingChange={(type, val) =>
                    setIncomingIBCs((prev) => ({ ...prev, [type]: val }))
                }
            />
        )}

        {/* Jika TIDAK ADA order yang dibutuhkan sama sekali */}
        {engineRec && !engineRec.needOrder && supplierBCombo && supplierBCombo.totalShipments === 0 && (
            <div className="p-4 border rounded-lg bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700">
                <p className="text-green-800 dark:text-green-200 font-semibold">
                    <Package className="inline w-4 h-4 mr-2" /> 
                    Semua stok oli berada di atas Reorder Point (Setelah memperhitungkan simulasi). Tidak ada rekomendasi order saat ini.
                </p>
            </div>
        )}
        
        {/* Jika Engine order dibutuhkan TAPI tidak tampil karena tidak ada supplierBCombo, tampilkan Engine sendiri */}
        {engineRec && engineRec.needOrder && !supplierBCombo && (
             <SupplierAPanel 
                rec={engineRec} 
                target={engineTarget}
                weight={engineWeight}
                incoming={incomingIBCs.engine}
                onIncomingChange={(val) =>
                    setIncomingIBCs((prev) => ({ ...prev, engine: val }))
                }
            />
        )}
      </div>
      
      {/* --- Garis Pemisah --- */}
      <hr className="border-gray-200 dark:border-gray-700 my-2" />
      
      {/* Info Summary - Compact */}
      <div className=" p-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-[10px] text-gray-700 dark:text-gray-300">
        <p className="font-semibold mb-1">ℹ️ Info Konfigurasi:</p>
        
        <p>• **Engine (W:{engineWeight})** | Target: {engineTarget.target_buffer} | ROP: {engineTarget.reorder_point} IBC</p>
        <p>• **Trans (W:{transWeight})** | Target: {transTarget.target_buffer} | ROP: {transTarget.reorder_point} IBC</p>
        <p>• **Hydro (W:{hydroWeight})** | Target: {hydroTarget.target_buffer} | ROP: {hydroTarget.reorder_point} IBC</p>
        
        <p className="italic text-[9px] mt-2">
          Safety Stock diasumsikan 50% dari ROP. Max IBC Supplier B diasumsikan 10 IBC.
        </p>
      </div>

      {/* MODAL SETUP CONFIG */}
      {/* ======================== */}
      {showSetupModal && (
        <div className="fixed inset-0 bg-black/50  flex items-center justify-center z-50"> 
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-[90%] max-w-3xl p-4 relative">
            <button
              onClick={() => {
                  setShowSetupModal(false);
                  fetchConfig(); // Muat ulang konfigurasi setelah modal ditutup
              }}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-800 dark:hover:text-white"
            >
              ✕
            </button>

            <h3 className="text-lg font-bold mb-3 text-gray-800 dark:text-gray-100">
              Konfigurasi Oil Buffer & Priority
            </h3>

            {/* Render komponen setup */}
            <div className="max-h-[70vh] overflow-y-auto border-t border-gray-300 dark:border-gray-600 pt-3">
              <OilSetupPanel warehouseId={warehouseId} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OilReorderInfo;