// ============================================
// components/MovementModal/Shared/ModalHeader.tsx
// ============================================

import React from 'react';
import { ModalHeaderProps } from '../types/modal.types';

export const ModalHeader: React.FC<ModalHeaderProps & { onBack?: () => void }> = ({ 
  tank, 
  fromCluster, 
  toCluster, 
  onClose,
  onBack
}) => {
  return (
    <div className="border-b px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 sticky top-0 z-99">
      {/* === TOP ROW: Back | Title | Close === */}
      <div className="flex items-center justify-between relative mb-2">
        {/* Back Button (Left) */}
        <div className="flex-shrink-0">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 text-slate-600 hover:text-slate-800 transition px-2 py-1.5 rounded-lg hover:bg-white"
              title="Back to tank selection"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
        </div>

        {/* Title (Center) */}
        <div className="absolute left-1/2 transform -translate-x-1/2">
          <h3 className="text-lg font-bold text-slate-800 text-center">
            Confirm Tank Movement
          </h3>
        </div>

        {/* Close Button (Right) */}
        <div className="flex-shrink-0">
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition p-1.5 rounded-lg hover:bg-slate-200"
            title="Close (Esc)"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* === BOTTOM ROW: Descriptions === */}
      <div className="text-center">
        <p className="text-sm text-slate-600">
          Moving <span className="font-semibold text-blue-600">{tank.nomor_gt}</span> from{' '}
          <span className="font-semibold text-blue-600">{fromCluster?.name || 'REGISTER'}</span> to{' '}
          <span className="font-semibold text-indigo-600">{toCluster.name}</span>
        </p>
        <p className="text-xs text-slate-500 mt-1">
          Type: <span className="font-mono">{tank.tipe}</span> | Status:{' '}
          <span className="font-mono">{tank.status}</span> | Current Qty:{' '}
          <span className="font-mono">{tank.qty}L</span>
        </p>
      </div>
    </div>
  );
};
