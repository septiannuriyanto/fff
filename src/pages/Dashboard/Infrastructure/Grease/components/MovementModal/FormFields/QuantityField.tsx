// ============================================
// components/MovementModal/FormFields/QuantityField.tsx
// ============================================

import React from 'react';

interface QuantityFieldProps {
  value: number | null;
  onChange: (value: number | null) => void;
  isManualInput: boolean;
  isDismantlingFlow: boolean;
  isRefillToSupplierFlow: boolean;
}

export const QuantityField: React.FC<QuantityFieldProps> = ({
  value,
  onChange,
  isManualInput,
  isDismantlingFlow,
  isRefillToSupplierFlow,
}) => {
  if (isManualInput) {
    return (
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">
          Qty Received (Liters) <span className="text-red-500">*</span>
        </label>
        <input
          type="number"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value ? parseInt(e.target.value) : null)}
          placeholder="0"
          min="0"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
      </div>
    );
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
      <p className="text-sm text-blue-800">
        <span className="font-semibold">To Qty (Auto):</span>{' '}
        <span className="font-mono font-bold text-lg">
          {value !== null ? `${value}L` : 'Calculating...'}
        </span>
      </p>
      {isDismantlingFlow && (
        <p className="text-xs text-red-600 mt-1 font-medium">
          Qty otomatis <strong>0L</strong> karena unit dicatat sebagai{' '}
          <strong>Dirty Container (DC)</strong> di Warehouse.
        </p>
      )}
      {isRefillToSupplierFlow && (
        <p className="text-xs text-purple-600 mt-1 font-medium">
          Qty otomatis <strong>0L</strong> karena unit dikeluarkan untuk <strong>Refill/Pabrik</strong>.
        </p>
      )}
    </div>
  );
};