// --- MOVEMENT MODAL COMPONENT (TEMPORARY DEFINITION) ---
// CATATAN: Anda harus memindahkan komponen ini ke file terpisah (misal: MovementModal.tsx) 
// dan melakukan import di bagian atas jika kode ini berada di file yang sama dengan GreaseClusterMonitoring.

import React, { useState } from "react";
import toast from "react-hot-toast";
import { ConsumerUnit } from "../types/consumerUnit";

export const MovementModal: React.FC<any> = ({ tank, fromCluster, toCluster, isToConsumer, isDroppedOnUnit, consumerTargetId, consumersList, onConfirm, onCancel }) => {
    const [referenceNo, setReferenceNo] = useState('');
    const [picMovement, setPicMovement] = useState('');
    const [toQty, setToQty] = useState<number | null>(null); 
    const [showQtyInput, setShowQtyInput] = useState(false);
    const initialConsumerId = (isToConsumer && isDroppedOnUnit) ? consumerTargetId : null; 
    const [selectedConsumerId, setSelectedConsumerId] = useState<string | null>(initialConsumerId);
    const [showConsumerInput, setShowConsumerInput] = useState(false);
  
    const isIssuingFrom = fromCluster?.is_issuing || false; 
    const isToReceivingCluster = !isToConsumer && (toCluster?.is_receiving || false); 
    const isReferenceNoMandatory = !isToConsumer; 
    
    React.useEffect(() => {
      // Logic untuk mengatur visibility input (UNCHANGED)
      if (isToReceivingCluster) setShowQtyInput(true); else { setShowQtyInput(false); setToQty(null); }
      if (isToConsumer || isIssuingFrom) {
        setShowConsumerInput(true);
        if (isToConsumer && !isDroppedOnUnit) setSelectedConsumerId(null);
      } else {
        setShowConsumerInput(false); setSelectedConsumerId(null);
      }
    }, [isToReceivingCluster, isToConsumer, isIssuingFrom, isDroppedOnUnit]);
  
    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      // ... (Validation logic UNCHANGED) ...
      if (isReferenceNoMandatory && !referenceNo.trim()) { toast.error('Nomor referensi wajib.'); return; }
      if (!picMovement.trim()) { toast.error('PIC wajib diisi'); return; }
      if (showQtyInput && (toQty === null || toQty < 0)) { toast.error('Masukkan kuantitas yang valid'); return; }
      if (showConsumerInput && !selectedConsumerId) { toast.error('Pilihan Unit Destinasi wajib.'); return; }
  
      onConfirm({
        reference_no: referenceNo,
        pic_movement: picMovement,
        to_qty: toQty,
        consumer_id: selectedConsumerId, 
      });
    };
  
    const getConsumerLabel = (consumer: ConsumerUnit) => {
      const desc = consumer.description ? ` (${consumer.description})` : '';
      const status = consumer.current_tank_id ? ` (ISI: ${consumer.current_grease_type})` : ` (KOSONG)`;
      return `${consumer.unit_id || consumer.id}${desc}${status}`;
    }
    
    const consumerDetail = consumersList.find((c: { id: any; }) => c.id === consumerTargetId)?.unit_id || 'N/A';
    const destinationDetail = isToConsumer
      ? (isDroppedOnUnit ? `Unit: ${consumerDetail}` : 'Manual Unit Selection')
      : 'Cluster Destination';
  
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="border-b px-6 py-4">
          <h3 className="text-lg font-bold text-gray-800">Konfirmasi Pergerakan Tangki</h3>
          <p className="text-sm text-gray-600 mt-1">
            Memindahkan <span className="font-semibold">{tank.nomor_gt}</span> dari{' '}
            <span className="font-semibold">{fromCluster?.name || 'Register'}</span> ke{' '}
            <span className="font-semibold">{toCluster.name}</span>
          </p>
          <p className="text-xs text-gray-500 mt-0.5">Destinasi: {destinationDetail}</p>
          {(isIssuingFrom || isToConsumer) && (
            <div className="mt-2 bg-orange-50 border border-orange-200 rounded px-3 py-2">
              <p className="text-xs text-orange-800">⚠️ **Status Tangki akan berubah menjadi DC** (Dikonsumsi) setelah pergerakan ini.</p>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Reference Number & PIC (UNCHANGED) */}
          {/* ... */}
          
          {/* Consumer Selection (REVISED) */}
          {showConsumerInput && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unit Destinasi/Consumer <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedConsumerId ?? ''}
                onChange={(e) => setSelectedConsumerId(e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={isDroppedOnUnit} 
              >
                <option value="" disabled>Pilih Unit</option>
                {/* Filter: Hanya Unit yang terikat ke toCluster DAN sedang KOSONG */}
                {consumersList
                    .filter((c: { grease_cluster_id: any; }) => c.grease_cluster_id === toCluster.id || (!c.grease_cluster_id && toCluster.name.toLowerCase() === 'register'))
                    .map((consumer: ConsumerUnit) => (
                    <option 
                        key={consumer.id} 
                        value={consumer.id}
                        disabled={!!consumer.current_tank_id} // Disable jika unit sudah terisi
                    >
                        {getConsumerLabel(consumer)}
                    </option>
                ))}
              </select>
              {isDroppedOnUnit && (<p className="text-xs text-gray-500 mt-1">Destinasi telah dipilih dari droppoint.</p>)}
            </div>
          )}

          {/* Quantity (Conditional) */}
          {/* ... (unchanged) ... */}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Konfirmasi Pergerakan
            </button>
          </div>
        </form>
      </div>
      </div>
    );
  };