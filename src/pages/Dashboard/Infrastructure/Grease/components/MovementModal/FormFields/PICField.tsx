// ============================================
// components/MovementModal/FormFields/PICField.tsx
// ============================================

import React from 'react';

interface PICFieldProps {
  value: string;
  onChange: (value: string) => void;
}

export const PICField: React.FC<PICFieldProps> = ({ value, onChange }) => {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1">
        PIC Movement <span className="text-red-500">*</span>
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Person In Charge"
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
      />
    </div>
  );
};