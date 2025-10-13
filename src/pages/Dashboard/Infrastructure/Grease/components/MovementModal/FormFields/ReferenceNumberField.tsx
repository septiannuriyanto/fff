// ============================================
// components/MovementModal/FormFields/ReferenceNumberField.tsx
// ============================================

import React from 'react';

interface ReferenceNumberFieldProps {
  value: string;
  onChange: (value: string) => void;
  isMandatory: boolean;
}

export const ReferenceNumberField: React.FC<ReferenceNumberFieldProps> = ({
  value,
  onChange,
  isMandatory,
}) => {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1">
        Reference No {isMandatory && <span className="text-red-500">*</span>}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g., DO-2025-001"
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
      />
    </div>
  );
};