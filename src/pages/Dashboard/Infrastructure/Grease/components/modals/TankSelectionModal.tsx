// ============================================
// components/modals/TankSelectionModal.tsx
// ============================================

import React, { useMemo } from 'react';
import { TankWithLocation, ConsumerUnit, ClusterWithConsumers } from '../../types/grease.types';
import { MAIN_WAREHOUSE_STORAGE_CLUSTER } from '../../types/grease.constants';
import { getTankIcon } from '../MovementModal/utils/iconHelpers';

interface TankSelectionModalProps {
  tanks: TankWithLocation[];
  consumer: ConsumerUnit;
  clusterGroups: ClusterWithConsumers[];
  onSelectTank: (tank: TankWithLocation) => void;
  onCancel: () => void;
}

export const TankSelectionModal: React.FC<TankSelectionModalProps> = ({
  tanks,
  consumer,
  clusterGroups,
  onSelectTank,
  onCancel,
}) => {
  // Filter: Only NEW/FULL tanks from Main Warehouse
  const availableTanks = useMemo(() => {
    const mainWarehouse = clusterGroups.find(
      (c) => c.name.trim().toUpperCase() === MAIN_WAREHOUSE_STORAGE_CLUSTER.trim().toUpperCase()
    );

    if (!mainWarehouse) return [];

    return tanks
      .filter((t) => t.current_cluster_id === mainWarehouse.id)
      .filter((t) => t.status === 'NEW' || t.status === 'FULL')
      .sort((a, b) => {
        // Sort: ALBIDA first, then ALVANIA, then by number
        const typeA = a.tipe?.toUpperCase();
        const typeB = b.tipe?.toUpperCase();
        
        if (typeA !== typeB) {
          if (typeA === 'ALBIDA') return -1;
          if (typeB === 'ALBIDA') return 1;
          if (typeA === 'ALVANIA') return -1;
          if (typeB === 'ALVANIA') return 1;
        }
        
        return (a.nomor_gt || '').localeCompare(b.nomor_gt || '');
      });
  }, [tanks, clusterGroups]);

  // Group by type
  const albidaTanks = availableTanks.filter((t) => t.tipe === 'ALBIDA');
  const alvaniaTanks = availableTanks.filter((t) => t.tipe === 'ALVANIA');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="border-b px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 sticky top-0 z-10 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-800">
              Pilih Grease Tank untuk {consumer.unit_id}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Available tanks di {MAIN_WAREHOUSE_STORAGE_CLUSTER}
            </p>
          </div>
          <button
            onClick={onCancel}
            className="ml-4 flex-shrink-0 text-gray-400 hover:text-gray-600 transition p-1 rounded-lg hover:bg-gray-200"
            title="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {availableTanks.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p className="text-gray-500 font-semibold">Tidak ada tank tersedia</p>
              <p className="text-gray-400 text-sm mt-2">Semua tank sedang digunakan atau dalam status DC</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Summary */}
              <div className="flex items-center justify-center gap-4 bg-gray-50 rounded-lg p-3">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{albidaTanks.length}</div>
                  <div className="text-xs text-gray-600">🔵 ALBIDA</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{alvaniaTanks.length}</div>
                  <div className="text-xs text-gray-600">🟡 ALVANIA</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{availableTanks.length}</div>
                  <div className="text-xs text-gray-600">Total Available</div>
                </div>
              </div>

              {/* ALBIDA Tanks */}
              {albidaTanks.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <h4 className="text-sm font-bold text-blue-700 bg-blue-100 px-3 py-1 rounded">
                      🔵 ALBIDA ({albidaTanks.length})
                    </h4>
                  </div>
                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3">
                    {albidaTanks.map((tank) => (
                      <TankSelectCard key={tank.id} tank={tank} onSelect={() => onSelectTank(tank)} />
                    ))}
                  </div>
                </div>
              )}

              {/* ALVANIA Tanks */}
              {alvaniaTanks.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <h4 className="text-sm font-bold text-yellow-700 bg-yellow-100 px-3 py-1 rounded">
                      🟡 ALVANIA ({alvaniaTanks.length})
                    </h4>
                  </div>
                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3">
                    {alvaniaTanks.map((tank) => (
                      <TankSelectCard key={tank.id} tank={tank} onSelect={() => onSelectTank(tank)} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4 bg-gray-50">
          <button
            onClick={onCancel}
            className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold transition"
          >
            Batal
          </button>
        </div>
      </div>
    </div>
  );
};

// Tank Card Component
const TankSelectCard: React.FC<{ tank: TankWithLocation; onSelect: () => void }> = ({ tank, onSelect }) => {
  return (
    <button
      onClick={onSelect}
      className="group relative p-3 border-2 border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 cursor-pointer text-center"
      title={`${tank.nomor_gt} - ${tank.tipe} (${tank.qty}L)`}
    >
      <img
        src={getTankIcon(tank.tipe)}
        className="h-12 mx-auto object-contain group-hover:scale-110 transition-transform"
        alt={tank.nomor_gt}
      />
      <div className="text-[10px] font-bold text-gray-700 mt-1 truncate">
        {tank.nomor_gt}
      </div>
      <div className="text-[9px] text-gray-500">{tank.qty}L</div>
      <div className="absolute inset-0 border-2 border-transparent group-hover:border-blue-500 rounded-lg pointer-events-none"></div>
    </button>
  );
};