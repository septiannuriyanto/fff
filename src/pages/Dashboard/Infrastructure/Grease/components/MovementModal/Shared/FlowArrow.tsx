// ============================================
// components/MovementModal/Shared/FlowArrow.tsx
// ============================================

import React from 'react';
import { FlowArrowProps } from '../types/modal.types';

export const FlowArrow: React.FC<FlowArrowProps> = ({ label, color }) => {
  return (
    <div className="flex flex-col items-center gap-3 flex-shrink-0 h-full justify-center">
      <div
        className={`h-16 border-l-2 border-dashed border-${color}-300`}
      ></div>
      <div className="relative">
        <div
          className={`absolute inset-0 bg-${color}-500 rounded-full animate-pulse opacity-30`}
        ></div>
        <div
          className={`relative z-10 bg-gradient-to-r from-${color}-500 to-${color}-600 p-2 rounded-full`}
        >
          <svg
            className="w-6 h-6 text-white"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M16.01 11H4v2h12.01v3L20 12l-3.99-4v3z" />
          </svg>
        </div>
      </div>
      <div
        className={`text-xs font-bold text-white bg-indigo-600 px-3 py-2 rounded-full shadow-md ring-1 ring-${color}-700/40`}
      >
        {label}
      </div>

      <div
        className={`h-16 border-l-2 border-dashed border-${color}-300`}
      ></div>
    </div>
  );
};

// Simplified version for smaller arrows
export const SimpleFlowArrow: React.FC<FlowArrowProps> = ({ label, color }) => {
  return (
    <div className="flex flex-col items-center">
      <svg
        className={`w-6 h-6 text-${color}-600 animate-bounce`}
        fill="currentColor"
        viewBox="0 0 24 24"
      >
        <path d="M16.01 11H4v2h12.01v3L20 12l-3.99-4v3z" />
      </svg>
      <div
        className={`text-xs font-bold text-white bg-${color}-600 px-2 py-1 rounded-full mt-2`}
      >
        {label}
      </div>
    </div>
  );
};
