// ============================================
// components/MovementModal/Shared/ModalHeader.tsx
// ============================================

import React from 'react';
import { ModalHeaderProps } from '../types/modal.types';

// ✅ UPDATED: Add onBack prop
export const ModalHeader: React.FC<ModalHeaderProps & { onBack?: () => void }> = ({ 
  tank, 
  fromCluster, 
  toCluster, 
  onClose,
  onBack // ✅ NEW
}) => {
  return (
    <div className="border-b px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 sticky top-0 z-10">
      <div className="flex items-center justify-between">
        {/* ✅ NEW: Back Button (Left) */}
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition px-3 py-2 rounded-lg hover:bg-white mr-4"
            title="Back to tank selection"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm font-semibold">Back</span>
          </button>
        )}

        {/* Title & Info (Center/Left) */}
        <div className="flex-1">
          <h3 className="text-lg font-bold text-gray-800">Confirm Tank Movement</h3>
          <p className="text-sm text-gray-600 mt-1">
            Moving <span className="font-semibold text-blue-600">{tank.nomor_gt}</span> from{' '}
            <span className="font-semibold text-blue-600">{fromCluster?.name || 'REGISTER'}</span> to{' '}
            <span className="font-semibold text-indigo-600">{toCluster.name}</span>
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Type: <span className="font-mono">{tank.tipe}</span> | Status:{' '}
            <span className="font-mono">{tank.status}</span> | Current Qty:{' '}
            <span className="font-mono">{tank.qty}L</span>
          </p>
        </div>

        {/* Close Button (Right) */}
        <button
          onClick={onClose}
          className="ml-4 flex-shrink-0 text-gray-400 hover:text-gray-600 transition p-1 rounded-lg hover:bg-gray-200"
          title="Close (Esc)"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};