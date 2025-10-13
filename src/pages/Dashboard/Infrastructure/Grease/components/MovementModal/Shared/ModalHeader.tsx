// ============================================
// components/MovementModal/Shared/ModalHeader.tsx
// ============================================

import React from 'react';
import { ModalHeaderProps } from '../types/modal.types';

export const ModalHeader: React.FC<ModalHeaderProps> = ({ tank, fromCluster, toCluster, onClose }) => {
  return (
    <div className="border-b px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 sticky top-0 z-10 flex items-center justify-between">
      <div>
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

      {/* Close Button */}
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
  );
};