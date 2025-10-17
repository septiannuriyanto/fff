// ===============================================
// src/components/OilReorderInfo.tsx
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

// *************************************************************
// ASUMSI IMPOR DARI supplierConfig.ts:
// Ini diperlukan untuk mendapatkan nama supplier yang sebenarnya

// *************************************************************

// ===============================================
// KONSTANTA MATERIAL CODE
// ===============================================
export const MATERIALS = {
  engine: '1000101471',
  transmission: '1000012900',
  hydraulic: '1000000763',
};

// ===============================================
// INTERFACES
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
  needOrder: boolean;
  urgency: 'critical' | 'warning' | 'normal' | 'good';
  recommendedQty: number;
  reason: string;
  shipments: number;
  supplierName: string; // Nama supplier yang sebenarnya
  supplierId: string;
  priorityScore: number;
  remainingIBC: number;
  emptySpaceOW: number;
}

interface CombinedOrderRecommendation {
  combination: { transmission: number; hydraulic: number; description: string };
  totalShipments: number;
  reason: string;
  transmission: BufferSummary | undefined;
  hydraulic: BufferSummary | undefined;
  priorityScore: number;
}

// ===============================================
// STYLE & ICON UTILITIES
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

// --- Komponen Panel Order Supplier A ---
const SupplierAPanel: React.FC<{ rec: RecommendationResult, target: OilBufferTarget, weight: number }> = ({ rec, target, weight }) => {
    const style = getUrgencyStyle(rec.urgency);

    return (
        <div className={`p-3 rounded border-2 ${style.border} ${style.bg} flex-1 min-w-[300px]`}>
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                    {getUrgencyIcon(rec.urgency)}
                    <h5 className={`font-bold text-sm ${style.text}`}>
                        Order Engine Oil ({rec.supplierName}) {/* MENGGUNAKAN NAMA SUPPLIER ASLI */}
                    </h5>
                </div>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/50 dark:bg-black/20 ${style.text}`}>
                    {style.label}
                </span>
            </div>

            <div className="text-sm p-2 bg-white/50 dark:bg-gray-800/50 rounded border border-gray-300 dark:border-gray-600">
                <div className="flex justify-between text-[11px] text-gray-700 dark:text-gray-300">
                    <span>Buffer Tersisa:</span>
                    <span className="font-semibold">{rec.remainingIBC} IBC</span>
                </div>
                <div className="flex justify-between text-[11px] text-gray-700 dark:text-gray-300">
                    <span>Target Buffer:</span>
                    <span className="font-semibold">{target.target_buffer} IBC</span>
                </div>

                {rec.needOrder && (
                    <div className="flex justify-between pt-1 mt-1 border-t border-gray-400 dark:border-gray-600/50">
                        <span className="font-bold text-gray-800 dark:text-gray-200">Order Rekomendasi:</span>
                        <span className="font-bold text-lg text-red-600 dark:text-red-400">
                            {rec.recommendedQty} IBC
                        </span>
                    </div>
                )}

                {/* {rec.needOrder && (
                    <div className="flex justify-between pt-1 mt-1 border-t border-gray-400 dark:border-gray-600/50">
                        <span className="font-bold text-gray-800 dark:text-gray-200">Prioritas Skor (W:{weight}):</span>
                        <span className="font-bold text-base text-red-600 dark:text-red-400">
                            {rec.priorityScore.toFixed(2)}
                        </span>
                    </div>
                )} */}
                
                <p className="text-[10px] italic pt-1 mt-1 border-t border-gray-400 dark:border-gray-600/50 opacity-80">
                    {rec.reason}
                </p>
            </div>
        </div>
    );
};

// --- Komponen Panel Kombinasi Supplier B ---
const SupplierBPanel: React.FC<{ combo: CombinedOrderRecommendation, targets: Record<string, OilBufferTarget>, weights: Record<string, number> }> = ({ combo, targets, weights }) => {
    const totalOrdered = combo.combination.transmission + combo.combination.hydraulic;
    const transTarget = targets.transmission?.target_buffer || 0;
    const hydroTarget = targets.hydraulic?.target_buffer || 0;
    const transWeight = weights.transmission || 1;
    const hydroWeight = weights.hydraulic || 1;
    const MAX_SHIPMENT_CAPACITY = 10; // Asumsi max IBC per shipment Supplier B
    
    // Ambil nama Supplier B yang sebenarnya
    const supplierBInfo = SUPPLIERS['SUPPLIER_B']; 
    const supplierBName = supplierBInfo ? supplierBInfo.name : 'Supplier B (Unknown)';

    // Logic untuk menentukan urgensi visual
    const isFullTruckOrder = totalOrdered >= MAX_SHIPMENT_CAPACITY;

    const panelClass = isFullTruckOrder 
        ? 'border-red-400 bg-red-50 dark:bg-red-900/30' 
        : 'border-blue-400 bg-blue-50 dark:bg-blue-900/30';
    
    const headerTextColor = isFullTruckOrder 
        ? 'text-red-800 dark:text-red-200' 
        : 'text-blue-800 dark:text-blue-200';

    const summaryBgClass = isFullTruckOrder 
        ? 'bg-red-100/50 dark:bg-red-900/50 border-red-300 dark:border-red-600'
        : 'bg-white/50 dark:bg-gray-800/50 border-blue-300 dark:border-blue-600';

    const orderedQtyColor = isFullTruckOrder 
        ? 'text-red-600 dark:text-red-400' 
        : 'text-blue-600 dark:text-blue-400';

    const instructionText = isFullTruckOrder
        ? 'SEGERA BUAT PERMINTAAN ORDER (Truk Penuh)'
        : 'Rencanakan order dalam beberapa hari ke depan';
        
    const instructionTextColor = isFullTruckOrder
        ? 'text-red-700 dark:text-red-300' // Merah untuk SEGERA
        : 'text-gray-700 dark:text-gray-300'; // Abu-abu/Normal untuk Rencanakan


    return (
        <div className={`p-3 rounded border-2 ${panelClass} flex-1 min-w-[300px]`}>
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                    {isFullTruckOrder 
                        ? <AlertCircle className="w-4 h-4 text-red-700 dark:text-red-300" />
                        : <Combine className="w-4 h-4 text-blue-700 dark:text-blue-300" />}
                    <h5 className={`font-bold text-sm ${headerTextColor}`}>
                        Kombinasi Order ({supplierBName}) {/* MENGGUNAKAN NAMA SUPPLIER ASLI */}
                    </h5>
                </div>
                {/* Tampilkan Skor Prioritas Kombinasi */}
                {/* <div className="flex items-center gap-1 text-sm font-bold text-blue-700 dark:text-blue-300 p-1 rounded bg-white/50 dark:bg-black/20">
                    <Zap className="w-3 h-3 text-yellow-500" />
                    Score: {combo.priorityScore.toFixed(2)}
                </div> */}
            </div>
            
            <div className="flex gap-2 mb-3 text-center">
                {/* Transmission Info */}
                <div className="flex-1 p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded border border-yellow-300">
                    <p className="text-[10px] text-yellow-700 dark:text-yellow-300">Trans (Target {transTarget} | W: {transWeight})</p>
                    <p className="text-xl font-bold text-yellow-800 dark:text-yellow-200">{combo.combination.transmission}</p>
                    <p className="text-[10px] text-gray-600 dark:text-gray-400 mt-0.5">Buffer: {combo.transmission?.remainingIBC} IBC</p>
                </div>
                {/* Hydraulic Info */}
                <div className="flex-1 p-2 bg-purple-100 dark:bg-purple-900/30 rounded border border-purple-300">
                    <p className="text-[10px] text-purple-700 dark:text-purple-300">Hydro (Target {hydroTarget} | W: {hydroWeight})</p>
                    <p className="text-xl font-bold text-purple-800 dark:text-purple-200">{combo.combination.hydraulic}</p>
                    <p className="text-[10px] text-gray-600 dark:text-gray-400 mt-0.5">Buffer: {combo.hydraulic?.remainingIBC} IBC</p>
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


// Fetch Konfigurasi Supabase
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
  // Fungsi Perhitungan
  // ========================
  const calculateRecommendation = (item: BufferSummary): RecommendationResult => {
    const conf = targets[item.type];
    const weight = weights[item.type] || 1;

    // Ambil info supplier yang sebenarnya
    const supplierInfo = getSupplierByOilType(item.type);
    const supplierName = supplierInfo ? supplierInfo.name : 'Supplier A (Unknown)';
    const supplierId = supplierInfo ? supplierInfo.id : 'SUPPLIER_A';


    if (!conf) {
      return {
        type: item.type as 'engine' | 'transmission' | 'hydraulic',
        needOrder: false,
        urgency: 'good',
        recommendedQty: 0,
        reason: 'Konfigurasi buffer tidak ditemukan',
        shipments: 0,
        supplierName: supplierName,
        supplierId: supplierId,
        priorityScore: 0,
        remainingIBC: item.remainingIBC,
        emptySpaceOW: item.emptySpaceOW,
      };
    }

    const { target_buffer, reorder_point, max_buffer } = conf;

    // Safety Stock ditentukan sebagai 50% dari Reorder Point
    const safetyStock = reorder_point / 2;

    let urgency: 'critical' | 'warning' | 'normal' | 'good';
    if (item.remainingIBC <= 0) urgency = 'critical';
    else if (item.remainingIBC < safetyStock) urgency = 'warning';
    else if (item.remainingIBC < reorder_point) urgency = 'normal';
    else urgency = 'good';

    const shortage = item.remainingIBC < reorder_point;
    const needToReach = Math.max(0, target_buffer - item.remainingIBC);

    let recommendedQty = 0;
    let reason = 'Stock aman';
    let shipments = 0;

    if (shortage || item.remainingIBC < target_buffer) {
      recommendedQty = Math.min(needToReach, max_buffer);
      shipments = 1;
      reason = `Order ${recommendedQty} IBC untuk capai target buffer (${target_buffer} IBC)`;

      // Tambahkan logika MOQ untuk Supplier A (Engine)
      if (item.type === 'engine' && recommendedQty < 8 && recommendedQty > 0) {
        recommendedQty = 8; // Asumsi MOQ Supplier A adalah 8 IBC
        reason = `Order minimal 8 IBC (MOQ) untuk capai target buffer`;
      }
    }
    
    // Skor Prioritas: Shortfall dari Reorder Point dikali Bobot
    const shortfall = Math.max(0, reorder_point - item.remainingIBC);
    const priorityScore = recommendedQty > 0 ? shortfall * weight : 0;

    return {
      type: item.type as 'engine' | 'transmission' | 'hydraulic',
      needOrder: recommendedQty > 0,
      urgency,
      recommendedQty,
      reason,
      shipments,
      supplierName: supplierName, // Menggunakan nama supplier yang sebenarnya
      supplierId: supplierId,
      priorityScore,
      remainingIBC: item.remainingIBC,
      emptySpaceOW: item.emptySpaceOW,
    };
  };

  const calculateSupplierBCombination = (bufferInfo: BufferSummary[]): CombinedOrderRecommendation | null => {
    const transmission = bufferInfo.find((i) => i.type === 'transmission');
    const hydraulic = bufferInfo.find((i) => i.type === 'hydraulic');
    if (!transmission || !hydraulic) return null;

    const transConf = targets.transmission;
    const hydroConf = targets.hydraulic;
    const transWeight = weights.transmission || 1;
    const hydroWeight = weights.hydraulic || 1;

    if (!transConf || !hydroConf) return null;

    const maxPerShipment = 10; // Asumsi max IBC per shipment Supplier B

    const transNeed = Math.max(0, transConf.target_buffer - transmission.remainingIBC);
    const hydroNeed = Math.max(0, hydroConf.target_buffer - hydraulic.remainingIBC);
    
    // Gunakan Reorder Point untuk perhitungan Shortfall Prioritas
    const transShortfall = Math.max(0, transConf.reorder_point - transmission.remainingIBC);
    const hydroShortfall = Math.max(0, hydroConf.reorder_point - hydraulic.remainingIBC);
    
    const transWeightedShortfall = transShortfall * transWeight;
    const hydroWeightedShortfall = hydroShortfall * hydroWeight;

    const totalNeed = transNeed + hydroNeed;
    const totalWeightedNeed = transNeed * transWeight + hydroNeed * hydroWeight;

    if (totalNeed === 0) return null;

    // Logika Alokasi IBC (distribusi berdasarkan bobot kebutuhan untuk 1 truk penuh)
    let transPortion = 0;
    let hydroPortion = 0;

    if (totalWeightedNeed > 0) {
      // Hitung proporsi berdasarkan kebutuhan berbobot
      transPortion = Math.round((transNeed * transWeight / totalWeightedNeed) * maxPerShipment);
      hydroPortion = Math.round((hydroNeed * hydroWeight / totalWeightedNeed) * maxPerShipment);
    } else {
      // Jika salah satu butuh tapi weighted need 0 (misal stok di atas ROP tapi di bawah Target)
      transPortion = Math.min(transNeed, maxPerShipment);
      hydroPortion = Math.min(hydroNeed, maxPerShipment - transPortion);
    }

    // Koreksi jika melebihi kapasitas truk
    if (transPortion + hydroPortion > maxPerShipment) {
      const excess = (transPortion + hydroPortion) - maxPerShipment;
      // Kurangi dari item dengan bobot lebih rendah atau kekurangan IBC yang lebih sedikit
      if (hydroWeight < transWeight) {
        hydroPortion = Math.max(0, hydroPortion - excess);
      } else {
        transPortion = Math.max(0, transPortion - excess);
      }
      // Koreksi final jika masih ada sisa
      if (transPortion + hydroPortion > maxPerShipment) {
           const finalExcess = (transPortion + hydroPortion) - maxPerShipment;
           transPortion = transPortion - finalExcess;
      }
    }
    
    // Pastikan order tidak melebihi kebutuhan
    transPortion = Math.min(transPortion, transNeed);
    hydroPortion = Math.min(hydroPortion, hydroNeed);

    // Hitung jumlah pengiriman aktual yang dibutuhkan
    const totalShipments = Math.ceil(totalNeed / maxPerShipment);

    // Skor Kombinasi: Ambil skor tertinggi dari Shortfall berbobot (yang paling urgent)
    const combinationScore = Math.max(transWeightedShortfall, hydroWeightedShortfall);

    const reason =
      totalNeed <= maxPerShipment
        ? `Rekomendasi 1 pengiriman: ${transPortion}T + ${hydroPortion}H`
        : `Total ${totalNeed} IBC, ${transPortion}T + ${hydroPortion}H untuk pengiriman pertama. Total ${totalShipments}x pengiriman`;

    return {
      combination: { transmission: transPortion, hydraulic: hydroPortion, description: `${transPortion}T + ${hydroPortion}H` },
      totalShipments,
      reason,
      transmission,
      hydraulic,
      priorityScore: combinationScore,
    };
  };

  // ========================
  // Generate Rekomendasi
  // ========================
  const engineRec = useMemo(() => {
    const engineItem = bufferInfo.find((i) => i.type === 'engine');
    if (!engineItem) return null;
    return calculateRecommendation(engineItem);
  }, [bufferInfo, weights, targets]);

  const supplierBCombo = useMemo(
    () => calculateSupplierBCombination(bufferInfo),
    [bufferInfo, weights, targets]
  );
  
  // Ambil Target dan Weight untuk ditampilkan di info summary
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
  // Render Komponen Utama
  // ========================
  return (
    <div className="space-y-4 relative">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 mb-2">
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
      <div className="flex flex-col lg:flex-row gap-4">
        
        {/* Panel Supplier A (Engine Oil) */}
        {engineRec && engineRec.needOrder && (
            <SupplierAPanel 
                rec={engineRec} 
                target={engineTarget}
                weight={engineWeight}
            />
        )}
        
        {/* Panel Supplier B (Transmission + Hydraulic Oil) */}
        {supplierBCombo && (
            <SupplierBPanel 
                combo={supplierBCombo} 
                targets={targets}
                weights={weights}
            />
        )}

        {/* Jika tidak ada order yang dibutuhkan sama sekali */}
        {(!engineRec || !engineRec.needOrder) && !supplierBCombo && (
            <div className="p-4 border rounded-lg bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700">
                <p className="text-green-800 dark:text-green-200 font-semibold">
                    <Package className="inline w-4 h-4 mr-2" /> 
                    Semua stok oli berada di atas Reorder Point. Tidak ada rekomendasi order saat ini.
                </p>
            </div>
        )}
        
        {/* Jika Engine order dibutuhkan TAPI tidak tampil karena tidak ada supplierBCombo, tampilkan Engine sendiri */}
        {engineRec && engineRec.needOrder && !supplierBCombo && (
             <SupplierAPanel 
                rec={engineRec} 
                target={engineTarget}
                weight={engineWeight}
            />
        )}
      </div>
      
      {/* --- Garis Pemisah --- */}
      <hr className="border-gray-200 dark:border-gray-700" />
      
      {/* Info Summary - Compact */}
      <div className="p-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-[10px] text-gray-700 dark:text-gray-300">
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