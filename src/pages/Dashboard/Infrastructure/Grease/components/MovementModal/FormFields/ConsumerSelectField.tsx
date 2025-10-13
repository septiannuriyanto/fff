// ============================================
// components/MovementModal/FormFields/ConsumerSelectField.tsx
// ============================================

import React from 'react';
import { ConsumerUnit } from '../../../types/grease.types';
import { getConsumerLabel, getConsumersForCluster } from '../utils/consumerHelpers';

interface ConsumerSelectFieldProps {
  value: string | null;
  onChange: (value: string | null) => void;
  clusterId: string;
  consumersList: ConsumerUnit[];
  isDisabled: boolean;
}

export const ConsumerSelectField: React.FC<ConsumerSelectFieldProps> = ({
  value,
  onChange,
  clusterId,
  consumersList,
  isDisabled,
}) => {
  const consumers = getConsumersForCluster(clusterId, consumersList);

  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1">
        Select Unit Destination <span className="text-red-500">*</span>
      </label>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value || null)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        disabled={isDisabled}
      >
        <option value="">-- Select a Consumer --</option>
        {consumers.map((consumer) => (
          <option key={consumer.id} value={consumer.id}>
            {getConsumerLabel(consumer)}
          </option>
        ))}
      </select>
    </div>
  );
};