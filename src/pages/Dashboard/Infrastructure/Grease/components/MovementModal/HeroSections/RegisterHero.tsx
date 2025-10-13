// ============================================
// components/MovementModal/HeroSections/RegisterHero.tsx
// ============================================

import React from 'react';
import { HeroSectionBaseProps } from '../types/modal.types';

export const RegisterHero: React.FC<HeroSectionBaseProps> = ({ tank }) => {
  return (
    <div className="bg-gradient-to-r from-teal-50 to-cyan-50 border-b border-teal-200 px-6 py-4">
      <p className="text-xs font-semibold text-teal-900 mb-2">Registration Flow</p>
      <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-teal-300">
        <svg className="w-6 h-6 text-teal-600 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
        </svg>
        <p className="text-sm text-teal-800">
          Tangki baru <strong>{tank.nomor_gt}</strong> didaftarkan. Harap <strong>input Qty</strong>{' '}
          yang diterima di Warehouse. Status akan diubah menjadi <strong>FULL</strong>.
        </p>
      </div>
    </div>
  );
};