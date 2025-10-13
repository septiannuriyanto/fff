// ============================================
// components/modals/ConsumerConfirmationModal.tsx
// ============================================

import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { ConsumerUnit } from '../../types/grease.types';

interface ConsumerConfirmationModalProps {
  consumer: ConsumerUnit;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConsumerConfirmationModal: React.FC<ConsumerConfirmationModalProps> = ({
  consumer,
  onConfirm,
  onCancel,
}) => {
  const hasGrease = consumer.current_grease_type !== 'EMPTY' && consumer.current_tank_id;

  // ✅ Handle Escape key
  useEffect(() => {
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };

    window.addEventListener('keydown', handleEscapeKey);
    return () => window.removeEventListener('keydown', handleEscapeKey);
  }, [onCancel]);

  // ✅ Handle click outside modal
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="border-b px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-800">
            {hasGrease ? 'Replacement Grease Tank' : 'Instalasi Grease Tank'}
          </h3>
          {/* ✅ Close button */}
          <button
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-700 transition p-1 rounded-lg hover:bg-gray-200"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {hasGrease ? (
            // Replacement message
            <div className="space-y-4">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <p className="text-sm text-gray-800">
                  <span className="font-bold text-orange-700">{consumer.unit_id}</span> Anda saat ini berisi:
                </p>
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between bg-white rounded p-2">
                    <span className="text-xs text-gray-600">Tank Number:</span>
                    <span className="text-sm font-bold text-gray-900">
                      {consumer.current_tank_nomor_gt}
                    </span>
                  </div>
                  <div className="flex items-center justify-between bg-white rounded p-2">
                    <span className="text-xs text-gray-600">Grease Type:</span>
                    <span className="text-sm font-bold text-gray-900">
                      {consumer.current_grease_type}
                    </span>
                  </div>
                  <div className="flex items-center justify-between bg-white rounded p-2">
                    <span className="text-xs text-gray-600">Quantity:</span>
                    <span className="text-sm font-bold text-gray-900">
                      {consumer.current_tank_qty} KG
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-700 text-center">
                Apakah Anda ingin melakukan <span className="font-bold text-orange-600">replacement</span> Grease Tank?
              </p>
            </div>
          ) : (
            // Installation message
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-gray-800">
                  <span className="font-bold text-green-700">{consumer.unit_id}</span> Anda belum terinstall Grease Tank.
                </p>
              </div>
              <p className="text-sm text-gray-700 text-center">
                Apakah Anda ingin melakukan <span className="font-bold text-green-600">instalasi baru</span> untuk Grease Tank?
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="border-t px-6 py-4 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold transition"
          >
            Tidak
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2 text-white rounded-lg font-semibold transition shadow-md ${
              hasGrease
                ? 'bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700'
                : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700'
            }`}
          >
            Ya, Lanjutkan
          </button>
        </div>
      </div>
    </div>
  );
};