// ============================================
// components/MovementModal/index.tsx
// ============================================

import React, { useEffect, useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { TankMovement } from '../../types/grease.types';
import { MovementModalProps } from './types/modal.types';
import { detectMovementFlow } from './utils/flowDetection';
import { findConsumerById } from './utils/consumerHelpers';

import { ModalHeader } from './Shared/ModalHeader';
import { SummarySection } from './Shared/SummarySection';

import { ReplacementHero } from './HeroSections/ReplacementHero';
import { InstallationHero } from './HeroSections/InstallationHero';
import { DismantlingHero } from './HeroSections/DismantlingHero';
import { RefillHero } from './HeroSections/RefillHero';
import { RestockHero } from './HeroSections/RestockHero';
import { RegisterHero } from './HeroSections/RegisterHero';

import { ReferenceNumberField } from './FormFields/ReferenceNumberField';
import { PICField } from './FormFields/PICField';
import { QuantityField } from './FormFields/QuantityField';
import { ConsumerSelectField } from './FormFields/ConsumerSelectField';
import { PreviousMovements } from './FormFields/PreviousMovements';
import { supabase } from '../../../../../../db/SupabaseClient';

export const MovementModal: React.FC<MovementModalProps> = ({
  tank,
  fromCluster,
  toCluster,
  isToConsumer,
  isDroppedOnUnit,
  consumerTargetId,
  consumersList,
  clusterGroups,
  onConfirm,
  onCancel,
  onBack, // ✅ NEW: Destructure onBack
}) => {
  const [referenceNo, setReferenceNo] = useState('');
  const [picMovement, setPicMovement] = useState('');
  const [toQty, setToQty] = useState<number | null>(null);
  const [previousMovements, setPreviousMovements] = useState<TankMovement[]>(
    [],
  );
  const [selectedConsumerId, setSelectedConsumerId] = useState<string | null>(
    null,
  );
  const modalRef = React.useRef<HTMLDivElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);

  const flowInfo = useMemo(
    () =>
      detectMovementFlow(
        fromCluster,
        toCluster,
        isToConsumer,
        selectedConsumerId,
        consumersList,
      ),
    [
      tank,
      fromCluster,
      toCluster,
      isToConsumer,
      selectedConsumerId,
      consumersList,
    ],
  );

  const {
    isReferenceNoMandatory,
    isFromRegister,
    isFromMainWarehouse,
    isToMainWarehouse,
    isToSupplier,
    isInstallFlow,
    isDismantlingFlow,
    isReplacementFlow,
    isRefillToSupplierFlow,
    isRestockFromSupplierFlow,
  } = flowInfo;

  const oldTankInConsumer = selectedConsumerId
    ? findConsumerById(selectedConsumerId, consumersList)
    : null;

  const initialConsumerId = useMemo(() => {
    if (isToConsumer && isDroppedOnUnit) {
      return consumerTargetId;
    }
    return null;
  }, [isToConsumer, isDroppedOnUnit, consumerTargetId]);

  useEffect(() => {
    if (initialConsumerId) {
      setSelectedConsumerId(initialConsumerId);
    }
  }, [initialConsumerId]);

  useEffect(() => {
    const fetchPreviousMovements = async () => {
      const { data } = await supabase
        .from('grease_tank_movements')
        .select(
          'id, reference_no, from_qty, to_qty, from_status, to_status, movement_date',
        )
        .eq('grease_tank_id', tank.id)
        .order('movement_date', { ascending: false })
        .limit(5);
      setPreviousMovements(data || []);
    };
    fetchPreviousMovements();
  }, [tank.id]);

  useEffect(() => {
    if (isFromMainWarehouse && isToConsumer) {
      setToQty(tank.qty);
    } else if (isDismantlingFlow) {
      setToQty(0);
    } else if (isRefillToSupplierFlow) {
      setToQty(0);
    } else if (
      isRestockFromSupplierFlow ||
      (isFromRegister && isToMainWarehouse)
    ) {
      setToQty(null);
    } else {
      setToQty(tank.qty);
    }
  }, [
    isRestockFromSupplierFlow,
    isRefillToSupplierFlow,
    isDismantlingFlow,
    isFromMainWarehouse,
    isToConsumer,
    isFromRegister,
    isToMainWarehouse,
    tank.qty,
  ]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === modalRef.current) {
      onCancel();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // ❌ HAPUS VALIDASI INI (sudah dicek sebelum modal dibuka)
    // if (isFromRegister && (isToConsumer || isToSupplier)) {
    //   toast.error('...');
    //   return;
    // }

    if (isReferenceNoMandatory && !referenceNo.trim()) {
      toast.error(
        'Reference number is required for this destination (Receiving/Register).',
      );
      return;
    }

    if (!picMovement.trim()) {
      toast.error('PIC is required');
      return;
    }

    if (
      (isRestockFromSupplierFlow || (isFromRegister && isToMainWarehouse)) &&
      (toQty === null || toQty < 0)
    ) {
      toast.error('Please enter a valid quantity received.');
      return;
    }

    if (isToConsumer && !selectedConsumerId) {
      toast.error('Unit Destination/Consumer selection is required.');
      return;
    }

    onConfirm({
      reference_no: referenceNo,
      pic_movement: picMovement,
      to_qty: toQty,
      consumer_id: selectedConsumerId,
    });
  };

  const renderHeroSection = () => {
    if (isReplacementFlow) {
      return (
        <ReplacementHero
          tank={tank}
          fromCluster={fromCluster}
          toCluster={toCluster}
          oldTankInConsumer={oldTankInConsumer}
        />
      );
    }

    if (isInstallFlow) {
      return (
        <InstallationHero
          tank={tank}
          toCluster={toCluster}
          consumerTargetId={consumerTargetId}
          consumersList={consumersList}
        />
      );
    }

    if (isDismantlingFlow) {
      return <DismantlingHero tank={tank} toCluster={toCluster} />;
    }

    if (isRefillToSupplierFlow) {
      return (
        <RefillHero
          tank={tank}
          fromCluster={fromCluster}
          toCluster={toCluster}
        />
      );
    }

    if (isRestockFromSupplierFlow) {
      return (
        <RestockHero
          tank={tank}
          fromCluster={fromCluster}
          toCluster={toCluster}
        />
      );
    }

    if (isFromRegister && isToMainWarehouse) {
      return <RegisterHero tank={tank} toCluster={toCluster} />;
    }

    return null;
  };

  const isManualQtyInput =
    isRestockFromSupplierFlow || (isFromRegister && isToMainWarehouse);

  return (
    <div
      ref={modalRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
    >
      <div
        ref={contentRef}
        className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        <ModalHeader
          tank={tank}
          fromCluster={fromCluster}
          toCluster={toCluster}
          onClose={onCancel}
          onBack={onBack}
        />

        {renderHeroSection()}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* ❌ HAPUS BAGIAN INI (error message sudah tidak perlu) */}
          {/* {isFromRegister && (isToConsumer || isToSupplier) && (
            <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg font-semibold text-sm">
              <p>...</p>
            </div>
          )} */}

          <ReferenceNumberField
            value={referenceNo}
            onChange={setReferenceNo}
            isMandatory={isReferenceNoMandatory}
          />

          <div className="flex flex-wrap gap-4">
  <div className="flex-1 min-w-[200px]">
    <PICField value={picMovement} onChange={setPicMovement} />
  </div>

  {isToConsumer && (
    <div className="flex-1 min-w-[200px]">
      <ConsumerSelectField
        value={selectedConsumerId}
        onChange={setSelectedConsumerId}
        clusterId={toCluster.id}
        consumersList={consumersList}
        isDisabled={false}
      />
    </div>
  )}
</div>


          <QuantityField
            value={toQty}
            onChange={setToQty}
            isManualInput={isManualQtyInput}
            isDismantlingFlow={isDismantlingFlow}
            isRefillToSupplierFlow={isRefillToSupplierFlow}
          />

          {/* <PreviousMovements movements={previousMovements} /> */}

          {/* <SummarySection
            tank={tank}
            fromCluster={fromCluster}
            toCluster={toCluster}
            selectedConsumerId={selectedConsumerId}
            toQty={toQty}
            consumersList={consumersList}
            isToConsumer={isToConsumer}
          /> */}

          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-[1px] py-[1px] rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 transition shadow-md"
            >
              <div className="w-full h-full bg-white rounded-lg flex items-center justify-center font-semibold text-gray-800 hover:bg-gray-50 transition">
                Cancel
              </div>
            </button>

            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-lg font-semibold transition shadow-md"
            >
              Checkout
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
