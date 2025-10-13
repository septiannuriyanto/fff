// ============================================
// components/MovementModal/Shared/SummarySection.tsx
// ============================================

import React from 'react';
import { SummarySectionProps } from '../types/modal.types';
import { findConsumerById } from '../utils/consumerHelpers';

export const SummarySection: React.FC<SummarySectionProps> = ({
  tank,
  fromCluster,
  toCluster,
  selectedConsumerId,
  toQty,
  consumersList,
  isToConsumer,
}) => {
  const selectedConsumer = selectedConsumerId
    ? findConsumerById(selectedConsumerId, consumersList)
    : null;

  return (
    <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
      <p className="text-xs text-indigo-900 font-semibold mb-2">Summary:</p>
      <ul className="text-xs text-indigo-800 space-y-1">
        <li>
          Tank: <span className="font-mono font-bold">{tank.nomor_gt}</span>
        </li>
        <li>
          From: <span className="font-semibold">{fromCluster?.name || 'REGISTER'}</span>
        </li>
        <li>
          To: <span className="font-semibold">{toCluster.name}</span>
          {isToConsumer && selectedConsumer && (
            <>
              {' '}
              → <span className="font-semibold text-blue-600">{selectedConsumer.unit_id}</span>
            </>
          )}
        </li>
        <li>
          Qty:{' '}
          <span className="font-mono font-bold">
            {toQty !== null ? `${toQty}L` : 'N/A (Manual Input Required)'}
          </span>
        </li>
      </ul>
    </div>
  );
};