// // ============================================
// // components/MovementModal.tsx
// // ============================================

// import React, { useEffect, useState, useMemo } from 'react';
// import toast from 'react-hot-toast';
// import {
//   TankWithLocation,
//   ConsumerUnit,
//   ClusterWithConsumers,
//   GreaseCluster,
//   TankMovement,
// } from '../types/grease.types';

// // NOTE: Please ensure the image paths below are correct in your project structure
// // Import images (DUMMY PATHS - REPLACE WITH ACTUAL IMPORTS)
// import GreaseTankIcon from '../../../../../images/icon/grease-tank.png';
// import GreaseTankIconYellow from '../../../../../images/icon/grease-tank-alt.png';
// import LubcarEmpty from '../../../../../images/icon/lubcar-empty.png';
// import LubcarAlbida from '../../../../../images/icon/lubcar-mounted.png';
// import LubcarAlvania from '../../../../../images/icon/lubcar-mounted-alt.png';
// import Warehouse from '../../../../../images/icon/warehouse.png';
// import Factory from '../../../../../images/icon/factory.png';

// import { supabase } from '../../../../../db/SupabaseClient';
// import { MAIN_WAREHOUSE_STORAGE_CLUSTER } from '../types/grease.constants';

// interface MovementModalProps {
//   tank: TankWithLocation;
//   fromCluster: GreaseCluster | undefined;
//   toCluster: GreaseCluster;
//   isToConsumer: boolean;
//   isDroppedOnUnit: boolean;
//   consumerTargetId: string;
//   consumersList: ConsumerUnit[];
//   clusterGroups: ClusterWithConsumers[];
//   onConfirm: (data: {
//     reference_no: string;
//     pic_movement: string;
//     to_qty: number | null;
//     consumer_id: string | null;
//   }) => void;
//   onCancel: () => void;
// }

// export const MovementModal: React.FC<MovementModalProps> = ({
//   tank,
//   fromCluster,
//   toCluster,
//   isToConsumer,
//   isDroppedOnUnit,
//   consumerTargetId,
//   consumersList,
//   clusterGroups,
//   onConfirm,
//   onCancel,
// }) => {
//   // ========== STATE ==========
//   const [referenceNo, setReferenceNo] = useState('');
//   const [picMovement, setPicMovement] = useState('');
//   const [toQty, setToQty] = useState<number | null>(null);
//   const [previousMovements, setPreviousMovements] = useState<TankMovement[]>([]);
//   const [selectedConsumerId, setSelectedConsumerId] = useState<string | null>(null);
//   const modalRef = React.useRef<HTMLDivElement>(null);
//   const contentRef = React.useRef<HTMLDivElement>(null);

//   // ========== COMPUTED VALUES ==========
//   const isToReceivingCluster = !isToConsumer && (toCluster?.is_receiving || false);
//   const isReferenceNoMandatory = isToReceivingCluster || toCluster.name.toLowerCase() === 'register';

//   const isFromSefas = fromCluster?.name.toUpperCase() === 'SEFAS';
//   const isToSefas = toCluster.name.toUpperCase() === 'SEFAS';
//   const isFromMainWarehouse = fromCluster?.name.toUpperCase() === MAIN_WAREHOUSE_STORAGE_CLUSTER;
//   const isToMainWarehouse = toCluster.name.toUpperCase() === MAIN_WAREHOUSE_STORAGE_CLUSTER;
//   const isFromRegister = !fromCluster || fromCluster.name.toLowerCase() === 'register';

//   // Check if this is a replacement scenario
//   const isReplacement = isToConsumer && selectedConsumerId;
//   const oldTankInConsumer = selectedConsumerId ? consumersList.find((c) => c.id === selectedConsumerId) : null;
//   const hasOldTank = oldTankInConsumer?.current_tank_id !== null && oldTankInConsumer?.current_grease_type !== 'EMPTY';

//   // Determine flow type
//   // INSTALL: To Consumer, no old tank, AND NOT coming from Register
//   const isInstallFlow = isToConsumer && !hasOldTank && !isFromRegister; 
  
//   // Dismantling: NOT To Consumer, TO Main Warehouse, NOT from Register, AND NOT from SEFAS
//   const isDismantlingFlow = !isToConsumer && isToMainWarehouse && isFromRegister === false && !isFromSefas; 
//   const isReplacementFlow = isReplacement && hasOldTank;

//   // NEW FLOW TYPES
//   const isRefillToSefasFlow = isFromMainWarehouse && isToSefas; // Main Warehouse -> SEFAS (Refill)
//   const isRestockFromSefasFlow = isFromSefas && isToMainWarehouse; // SEFAS -> Main Warehouse (Restock)

//   // Initial consumer ID for pre-selection
//   const initialConsumerId = useMemo(() => {
//     if (isToConsumer && isDroppedOnUnit) {
//       return consumerTargetId;
//     }
//     return null;
//   }, [isToConsumer, isDroppedOnUnit, consumerTargetId]);

//   // ========== LIFECYCLE ==========
//   useEffect(() => {
//     if (initialConsumerId) {
//       setSelectedConsumerId(initialConsumerId);
//     }
//   }, [initialConsumerId]);

//   useEffect(() => {
//     const fetchPreviousMovements = async () => {
//       const { data } = await supabase
//         .from('grease_tank_movements')
//         .select('id, reference_no, from_qty, to_qty, from_status, to_status, movement_date')
//         .eq('grease_tank_id', tank.id)
//         .order('movement_date', { ascending: false })
//         .limit(5);
//       setPreviousMovements(data || []);
//     };
//     fetchPreviousMovements();
//   }, [tank.id]);

//   useEffect(() => {
//     // 1. Issuing from Warehouse to Consumer: Use current quantity
//     if (isFromMainWarehouse && isToConsumer) {
//       setToQty(tank.qty);
//     // 2. Dismantling (Return to Warehouse): Set to 0 (DC status)
//     } else if (isDismantlingFlow) {
//       setToQty(0);
//     // 3. Refill to SEFAS: Set to 0 (Issuing to factory)
//     } else if (isRefillToSefasFlow) {
//       setToQty(0);
//     // 4. Restock (SEFAS -> Warehouse) or Register -> Warehouse: User MUST input received quantity (null)
//     } else if (isRestockFromSefasFlow || (isFromRegister && isToMainWarehouse)) {
//       setToQty(null);
//     } else {
//       // Default: Use current tank quantity
//       setToQty(tank.qty);
//     }
//   }, [isRestockFromSefasFlow, isRefillToSefasFlow, isDismantlingFlow, isFromMainWarehouse, isToConsumer, isFromRegister, isToMainWarehouse, isToSefas, tank.qty]);

//   // ========== KEYBOARD & OUTSIDE CLICK HANDLERS ==========
//   useEffect(() => {
//     const handleKeyDown = (e: KeyboardEvent) => {
//       if (e.key === 'Escape') {
//         onCancel();
//       }
//     };

//     window.addEventListener('keydown', handleKeyDown);
//     return () => window.removeEventListener('keydown', handleKeyDown);
//   }, [onCancel]);

//   const handleBackdropClick = (e: React.MouseEvent) => {
//     if (e.target === modalRef.current) {
//       onCancel();
//     }
//   };

//   // ========== HANDLERS ==========
//   const handleSubmit = (e: React.FormEvent) => {
//     e.preventDefault();
    
//     // --- VALIDASI REGISTER BARU: HANYA KE MAIN WAREHOUSE ---
//     if (isFromRegister && (isToConsumer || isToSefas)) {
//       toast.error('Tank from REGISTER must be moved to the Main Warehouse first, not directly to a unit/SEFAS.');
//       return;
//     }
//     // ----------------------------------------------------

//     if (isReferenceNoMandatory && !referenceNo.trim()) {
//       toast.error('Reference number is required for this destination (Receiving/Register).');
//       return;
//     }

//     if (!picMovement.trim()) {
//       toast.error('PIC is required');
//       return;
//     }

//     // Validation only for scenarios that require manual Qty input
//     if ((isRestockFromSefasFlow || (isFromRegister && isToMainWarehouse)) && (toQty === null || toQty < 0)) {
//       toast.error('Please enter a valid quantity received.');
//       return;
//     }

//     if (isToConsumer && !selectedConsumerId) {
//       toast.error('Unit Destination/Consumer selection is required.');
//       return;
//     }

//     onConfirm({
//       reference_no: referenceNo,
//       pic_movement: picMovement,
//       to_qty: toQty,
//       consumer_id: selectedConsumerId,
//     });
//   };

//   // ========== HELPER FUNCTIONS ==========
//   const getTankIcon = (tipe: string | null) => {
//     return tipe === 'ALVANIA' ? GreaseTankIconYellow : GreaseTankIcon;
//   };

//   const getLubcarIcon = (greaseType: string) => {
//     if (greaseType === 'ALBIDA') return LubcarAlbida;
//     if (greaseType === 'ALVANIA') return LubcarAlvania;
//     return LubcarEmpty;
//   };

//   const getConsumerLabel = (consumer: ConsumerUnit) => {
//     const desc = consumer.description ? ` (${consumer.description})` : '';
//     const type = consumer.current_grease_type === 'EMPTY' ? '' : ` [${consumer.current_grease_type}]`;
//     return `${consumer.unit_id || consumer.id}${desc}${type}`;
//   };

//   const getConsumersForCluster = (clusterId: string): ConsumerUnit[] => {
//     return consumersList.filter((c) => c.grease_cluster_id === clusterId);
//   };

//   // ========== RENDER ==========
//   return (
//     <div 
//       ref={modalRef}
//       onClick={handleBackdropClick}
//       className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
//     >
//       <div 
//         ref={contentRef}
//         className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
//       >
        
//         {/* ========== HEADER WITH CLOSE BUTTON ========== */}
//         <div className="border-b px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 sticky top-0 z-10 flex items-center justify-between">
//           <div>
//             <h3 className="text-lg font-bold text-gray-800">Confirm Tank Movement</h3>
//             <p className="text-sm text-gray-600 mt-1">
//               Moving <span className="font-semibold text-blue-600">{tank.nomor_gt}</span> from{' '}
//               <span className="font-semibold text-blue-600">{fromCluster?.name || 'REGISTER'}</span>{' '}
//               to <span className="font-semibold text-indigo-600">{toCluster.name}</span>
//             </p>
//             <p className="text-xs text-gray-500 mt-2">
//               Type: <span className="font-mono">{tank.tipe}</span> | Status: <span className="font-mono">{tank.status}</span> | Current Qty: <span className="font-mono">{tank.qty}L</span>
//             </p>
//           </div>
          
//           {/* Close Button */}
//           <button
//             onClick={onCancel}
//             className="ml-4 flex-shrink-0 text-gray-400 hover:text-gray-600 transition p-1 rounded-lg hover:bg-gray-200"
//             title="Close (Esc)"
//           >
//             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
//             </svg>
//           </button>
//         </div>

//         {/*
//         |====================================================================|
//         |  HERO SECTIONS                                                     |
//         |====================================================================|
//         */}

//         {/* ========== HERO SECTION: REPLACEMENT FLOW (ISSUING FROM WH) ========== */}
//         {isReplacementFlow && (
//           <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200 px-6 py-8">
//             <p className="text-xs font-semibold text-blue-900 mb-4">Tank Replacement Flow</p>
//             <div className="flex items-center justify-between gap-3">
              
//               {/* NEW TANK */}
//               <div className="flex-1 flex flex-col items-center">
//                 <div className="relative bg-white rounded-xl p-6 mb-4 shadow-md border-2 border-blue-200 hover:shadow-lg transition">
//                   {/* RIBBON NEW TANK */}
//                   <div className="absolute top-0 left-0 transform -translate-x-1 -translate-y-1 z-20">
//                     <div className="bg-blue-600 text-white text-xs font-bold uppercase py-1 px-4 rounded-br-lg shadow-lg">
//                       {tank.nomor_gt}
//                     </div>
//                   </div>
//                   {/* END RIBBON */}
//                   <img src={getTankIcon(tank.tipe)} alt={`Tank ${tank.nomor_gt}`} className="h-24 w-24 object-contain mx-auto" />
//                 </div>
//                 <div className="text-center">
//                   <div className="text-sm font-bold text-gray-900 bg-blue-100 px-3 py-1 rounded-full inline-block mb-2">
//                     NEW
//                   </div>
//                   <div className="text-base font-bold text-gray-900">{tank.nomor_gt}</div>
//                   <div className="text-xs text-gray-600 mt-2">From: <span className="font-semibold">{fromCluster?.name || 'WAREHOUSE'}</span></div>
//                   <div className="mt-3 space-y-1">
//                     <div className="inline-block bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded">Qty: {tank.qty}L</div>
//                     <div className="block text-xs text-gray-600 mt-1">Type: <span className="font-mono">{tank.tipe}</span></div>
//                     <div className="text-xs text-green-600 font-semibold mt-1">Status: {tank.status}</div>
//                   </div>
//                 </div>
//               </div>

//               {/* ARROW */}
//               <div className="flex flex-col items-center gap-3 flex-shrink-0 h-full justify-center">
//                 <div className="h-16 border-l-2 border-dashed border-indigo-300"></div>
//                 <div className="relative">
//                   <div className="absolute inset-0 bg-indigo-500 rounded-full animate-pulse opacity-30"></div>
//                   <div className="relative z-10 bg-gradient-to-r from-indigo-500 to-blue-500 p-2 rounded-full">
//                     <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
//                       <path d="M16.01 11H4v2h12.01v3L20 12l-3.99-4v3z" />
//                     </svg>
//                   </div>
//                 </div>
//                 <div className="text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-blue-600 px-3 py-2 rounded-full shadow-lg">REPLACING</div>
//                 <div className="h-16 border-l-2 border-dashed border-orange-300"></div>
//               </div>

//               {/* OLD TANK */}
//               <div className="flex-1 flex flex-col items-center">
//                 <div className="relative bg-white rounded-xl p-6 mb-4 shadow-md border-2 border-orange-200 hover:shadow-lg transition">
//                    {/* RIBBON OLD TANK */}
//                   <div className="absolute top-0 left-0 transform -translate-x-1 -translate-y-1 z-20">
//                     <div className="bg-orange-600 text-white text-xs font-bold uppercase py-1 px-4 rounded-br-lg shadow-lg">
//                       {oldTankInConsumer?.current_tank_nomor_gt || 'N/A'}
//                     </div>
//                   </div>
//                   {/* END RIBBON */}
//                   <img src={getTankIcon(oldTankInConsumer?.current_grease_type ?? null)} alt="Old Tank" className="h-24 w-24 object-contain mx-auto opacity-50 hue-rotate-180" />
//                 </div>
//                 <div className="text-center">
//                   <div className="text-sm font-bold text-gray-900 bg-orange-100 px-3 py-1 rounded-full inline-block mb-2">OLD (DC)</div>
//                   <div className="text-base font-bold text-gray-900">{oldTankInConsumer?.current_tank_nomor_gt || 'N/A'}</div>
//                   <div className="text-xs text-gray-600 mt-2">At: <span className="font-semibold">{oldTankInConsumer?.unit_id || 'UNIT'}</span></div>
//                   <div className="mt-3 space-y-1">
//                     <div className="inline-block bg-orange-100 text-orange-700 text-xs font-bold px-2 py-1 rounded">Qty: {oldTankInConsumer?.current_tank_qty}L</div>
//                     <div className="text-xs font-semibold text-orange-600 mt-1">Will be marked DC</div>
//                     <div className="text-xs text-orange-700 mt-2 font-semibold">Return to {MAIN_WAREHOUSE_STORAGE_CLUSTER}</div>
//                   </div>
//                 </div>
//               </div>
//             </div>
//             <div className="mt-4 bg-white rounded-lg px-4 py-3 border-l-4 border-indigo-600 shadow-sm">
//               <p className="text-xs text-gray-800 font-medium">
//                 <span className="text-indigo-600 font-bold">Note:</span> Old tank will be marked as DC and returned to {MAIN_WAREHOUSE_STORAGE_CLUSTER}
//               </p>
//             </div>
//           </div>
//         )}

//         {/* ========== HERO SECTION: INSTALLATION FLOW (ISSUING FROM WH) ========== */}
//         {isInstallFlow && (
//           <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-200 px-6 py-8">
//             <p className="text-xs font-semibold text-green-900 mb-4">Installation Flow</p>
//             <div className="flex items-center justify-center gap-4">
//               {/* GREASE TANK */}
//               <div className="flex flex-col items-center">
//                 <div className="relative bg-white rounded-xl p-6 mb-4 shadow-md border-2 border-green-200 hover:shadow-lg transition">
//                   {/* RIBBON GT */}
//                   <div className="absolute top-0 left-0 transform -translate-x-1 -translate-y-1 z-20">
//                     <div className="bg-green-600 text-white text-xs font-bold uppercase py-1 px-4 rounded-br-lg shadow-lg">
//                       {tank.nomor_gt}
//                     </div>
//                   </div>
//                   {/* END RIBBON */}
//                   <img src={getTankIcon(tank.tipe)} alt="Grease Tank" className="h-20 w-20 object-contain" />
//                 </div>
//                 <div className="text-center">
//                   <div className="text-sm font-bold text-gray-900 bg-green-100 px-3 py-1 rounded-full inline-block mb-2">GT</div>
//                   <div className="text-base font-bold text-gray-900">{tank.nomor_gt}</div>
//                   <div className="text-xs text-gray-600 mt-2">Qty: <span className="font-semibold">{tank.qty}L</span></div>
//                   <div className="text-xs text-green-600 font-semibold mt-1">Type: {tank.tipe}</div>
//                 </div>
//               </div>

//               {/* ARROW */}
//               <div className="flex flex-col items-center">
//                 <svg className="w-6 h-6 text-green-600 animate-bounce" fill="currentColor" viewBox="0 0 24 24">
//                   <path d="M16.01 11H4v2h12.01v3L20 12l-3.99-4v3z" />
//                 </svg>
//                 <div className="text-xs font-bold text-white bg-green-600 px-2 py-1 rounded-full mt-2">INSTALL</div>
//               </div>

//               {/* LUBCAR EMPTY */}
//               <div className="flex flex-col items-center">
//                 <div className="bg-white rounded-xl p-6 mb-4 shadow-md border-2 border-green-200 hover:shadow-lg transition">
//                   <img src={LubcarEmpty} alt="Lubcar Empty" className="h-20 w-20 object-contain" />
//                 </div>
//                 <div className="text-center">
//                   <div className="text-sm font-bold text-gray-900 bg-gray-100 px-3 py-1 rounded-full inline-block mb-2">EMPTY</div>
//                   <div className="text-base font-bold text-gray-900">{consumerTargetId ? consumersList.find(c => c.id === consumerTargetId)?.unit_id : 'Unit'}</div>
//                   <div className="text-xs text-gray-600 mt-2">Lubcar <span className="font-semibold">Empty</span></div>
//                 </div>
//               </div>
//             </div>
//           </div>
//         )}

//         {/* ========== HERO SECTION: DISMANTLING FLOW (Return Unit -> Warehouse) ========== */}
//         {isDismantlingFlow && (
//           <div className="bg-gradient-to-r from-orange-50 to-red-50 border-b border-orange-200 px-6 py-8">
//             <p className="text-xs font-semibold text-orange-900 mb-4">Dismantling Flow (Return to Warehouse)</p>
//             <div className="flex items-center justify-center gap-4">
//               {/* LUBCAR FILLED (Returned GT) */}
//               <div className="flex flex-col items-center">
//                 <div className="relative bg-white rounded-xl p-6 mb-4 shadow-md border-2 border-orange-200 hover:shadow-lg transition">
//                   {/* RIBBON DC */}
//                   <div className="absolute top-0 left-0 transform -translate-x-1 -translate-y-1 z-20">
//                     <div className="bg-red-600 text-white text-xs font-bold uppercase py-1 px-4 rounded-br-lg shadow-lg">
//                       {tank.nomor_gt}
//                     </div>
//                   </div>
//                   {/* END RIBBON */}
//                   <img src={getLubcarIcon(tank.tipe || '')} alt="Lubcar Filled" className="h-20 w-20 object-contain opacity-60 hue-rotate-180" />
//                 </div>
//                 <div className="text-center">
//                   <div className="text-sm font-bold text-gray-900 bg-red-100 px-3 py-1 rounded-full inline-block mb-2">DC UNIT</div>
//                   <div className="text-base font-bold text-gray-900">{tank.nomor_gt}</div>
//                   <div className="text-xs text-gray-600 mt-2">Qty: <span className="font-semibold">{tank.qty}L</span></div>
//                   <div className="text-xs text-red-600 font-semibold mt-1">Status: DC</div>
//                 </div>
//               </div>

//               {/* ARROW */}
//               <div className="flex flex-col items-center">
//                 <svg className="w-6 h-6 text-orange-600 animate-bounce" fill="currentColor" viewBox="0 0 24 24">
//                   <path d="M16.01 11H4v2h12.01v3L20 12l-3.99-4v3z" />
//                 </svg>
//                 <div className="text-xs font-bold text-white bg-orange-600 px-2 py-1 rounded-full mt-2">RETURN</div>
//               </div>

//               {/* WAREHOUSE (Target) */}
//               <div className="flex flex-col items-center">
//                 <div className="bg-white rounded-xl p-6 mb-4 shadow-md border-2 border-orange-200 hover:shadow-lg transition">
//                   <img src={Warehouse} alt="Warehouse Icon" className="h-20 w-20 object-contain opacity-80" />
//                 </div>
//                 <div className="text-center">
//                   <div className="text-sm font-bold text-gray-900 bg-orange-100 px-3 py-1 rounded-full inline-block mb-2">STORAGE</div>
//                   <div className="text-base font-bold text-gray-900">{MAIN_WAREHOUSE_STORAGE_CLUSTER}</div>
//                   <div className="text-xs text-gray-600 mt-2">Warehouse <span className="font-semibold">Receiving</span></div>
//                 </div>
//               </div>
//             </div>
//           </div>
//         )}
        
//         {/* ========== HERO SECTION: REFILL (Main Warehouse -> SEFAS) ========== */}
//         {isRefillToSefasFlow && (
//           <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-200 px-6 py-8">
//             <p className="text-xs font-semibold text-purple-900 mb-4">Refill Flow (Issuing GT to Factory)</p>
//             <div className="flex items-center justify-center gap-4">
              
//               {/* GT in DC (MAIN WAREHOUSE) */}
//               <div className="flex flex-col items-center">
//                 <div className="relative bg-white rounded-xl p-6 mb-4 shadow-md border-2 border-purple-200 hover:shadow-lg transition">
//                   {/* RIBBON GT WAREHOUSE */}
//                   <div className="absolute top-0 left-0 transform -translate-x-1 -translate-y-1 z-20">
//                     <div className="bg-purple-600 text-white text-xs font-bold uppercase py-1 px-4 rounded-br-lg shadow-lg">
//                       {tank.nomor_gt}
//                     </div>
//                   </div>
//                   {/* END RIBBON */}
//                   <img src={getTankIcon(tank.tipe)} alt="Grease Tank" className="h-20 w-20 object-contain" />
//                 </div>
//                 <div className="text-center">
//                   <div className="text-sm font-bold text-gray-900 bg-purple-100 px-3 py-1 rounded-full inline-block mb-2">DC GT</div>
//                   <div className="text-base font-bold text-gray-900">{tank.nomor_gt}</div>
//                   <div className="text-xs text-gray-600 mt-2">From: <span className="font-semibold">{fromCluster?.name}</span></div>
//                   <div className="text-xs text-purple-600 font-semibold mt-1">Qty: {tank.qty}L</div>
//                 </div>
//               </div>

//               {/* ARROW */}
//               <div className="flex flex-col items-center">
//                 <svg className="w-6 h-6 text-purple-600 animate-bounce" fill="currentColor" viewBox="0 0 24 24">
//                   <path d="M16.01 11H4v2h12.01v3L20 12l-3.99-4v3z" />
//                 </svg>
//                 <div className="text-xs font-bold text-white bg-purple-600 px-2 py-1 rounded-full mt-2">REFILL</div>
//               </div>

//               {/* FACTORY (SEFAS) */}
//               <div className="flex flex-col items-center">
//                 <div className="bg-white rounded-xl p-6 mb-4 shadow-md border-2 border-pink-200 hover:shadow-lg transition">
//                   <img src={Factory} alt="Factory Icon" className="h-20 w-20 object-contain" />
//                 </div>
//                 <div className="text-center">
//                   <div className="text-sm font-bold text-gray-900 bg-pink-100 px-3 py-1 rounded-full inline-block mb-2">FACTORY</div>
//                   <div className="text-base font-bold text-gray-900">{toCluster.name}</div>
//                   <div className="text-xs text-gray-600 mt-2">Destination <span className="font-semibold">SEFAS</span></div>
//                 </div>
//               </div>
//             </div>
//           </div>
//         )}
        
//         {/* ========== HERO SECTION: RESTOCK (SEFAS -> Main Warehouse) ========== */}
//         {isRestockFromSefasFlow && (
//           <div className="bg-gradient-to-r from-red-50 to-orange-50 border-b border-red-200 px-6 py-8">
//             <p className="text-xs font-semibold text-red-900 mb-4">Restock Flow (Receiving GT from Factory)</p>
//             <div className="flex items-center justify-center gap-4">
              
//               {/* GT NEW FROM FACTORY (SEFAS) */}
//               <div className="flex flex-col items-center">
//                 <div className="relative bg-white rounded-xl p-6 mb-4 shadow-md border-2 border-red-200 hover:shadow-lg transition">
//                   {/* RIBBON GT NEW */}
//                   <div className="absolute top-0 left-0 transform -translate-x-1 -translate-y-1 z-20">
//                     <div className="bg-red-600 text-white text-xs font-bold uppercase py-1 px-4 rounded-br-lg shadow-lg">
//                       {tank.nomor_gt}
//                     </div>
//                   </div>
//                   {/* END RIBBON */}
//                   <img src={getTankIcon(tank.tipe)} alt="Grease Tank" className="h-20 w-20 object-contain" />
//                 </div>
//                 <div className="text-center">
//                   <div className="text-sm font-bold text-gray-900 bg-red-100 px-3 py-1 rounded-full inline-block mb-2">NEW GT</div>
//                   <div className="text-base font-bold text-gray-900">{tank.nomor_gt}</div>
//                   <div className="text-xs text-gray-600 mt-2">From: <span className="font-semibold">{fromCluster?.name}</span></div>
//                   <div className="text-xs text-red-600 font-semibold mt-1">Type: {tank.tipe}</div>
//                 </div>
//               </div>

//               {/* ARROW */}
//               <div className="flex flex-col items-center">
//                 <svg className="w-6 h-6 text-red-600 animate-bounce" fill="currentColor" viewBox="0 0 24 24">
//                   <path d="M16.01 11H4v2h12.01v3L20 12l-3.99-4v3z" />
//                 </svg>
//                 <div className="text-xs font-bold text-white bg-red-600 px-2 py-1 rounded-full mt-2">RESTOCK</div>
//               </div>

//               {/* WAREHOUSE (MAIN WAREHOUSE) */}
//               <div className="flex flex-col items-center">
//                 <div className="bg-white rounded-xl p-6 mb-4 shadow-md border-2 border-orange-200 hover:shadow-lg transition">
//                   <img src={Warehouse} alt="Warehouse Icon" className="h-20 w-20 object-contain" />
//                 </div>
//                 <div className="text-center">
//                   <div className="text-sm font-bold text-gray-900 bg-orange-100 px-3 py-1 rounded-full inline-block mb-2">RECEIVING</div>
//                   <div className="text-base font-bold text-gray-900">{toCluster.name}</div>
//                   <div className="text-xs text-gray-600 mt-2">Storage <span className="font-semibold">Warehouse</span></div>
//                 </div>
//               </div>
//             </div>
//           </div>
//         )}

//         {/* ========== HERO SECTION: REGISTER TO WAREHOUSE (INFO) ========== */}
//         {isFromRegister && isToMainWarehouse && (
//              <div className="bg-gradient-to-r from-teal-50 to-cyan-50 border-b border-teal-200 px-6 py-4">
//                 <p className="text-xs font-semibold text-teal-900 mb-2">Registration Flow</p>
//                 <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-teal-300">
//                     <svg className="w-6 h-6 text-teal-600 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
//                     <p className="text-sm text-teal-800">
//                         Tangki baru **{tank.nomor_gt}** didaftarkan. Harap **input Qty** yang diterima di Warehouse. Status akan diubah menjadi **FULL**.
//                     </p>
//                 </div>
//             </div>
//         )}

//         {/* ========== FORM ========== */}
//         <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
//           {/* TAMPILKAN ERROR JIKA DARI REGISTER KE CUSTOMER/SEFAS */}
//           {isFromRegister && (isToConsumer || isToSefas) && (
//               <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg font-semibold text-sm">
//                   <p>🚫 **Akses Ditolak.** Tangki dari **REGISTER** harus dipindahkan ke **MAIN WAREHOUSE** terlebih dahulu. Tidak boleh langsung ke Unit Konsumen atau SEFAS.</p>
//               </div>
//           )}

//           {/* Reference No */}
//           <div>
//             <label className="block text-sm font-semibold text-gray-700 mb-1">
//               Reference No {isReferenceNoMandatory && <span className="text-red-500">*</span>}
//             </label>
//             <input
//               type="text"
//               value={referenceNo}
//               onChange={(e) => setReferenceNo(e.target.value)}
//               placeholder="e.g., DO-2025-001"
//               className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
//             />
//           </div>

//           {/* PIC Movement */}
//           <div>
//             <label className="block text-sm font-semibold text-gray-700 mb-1">
//               PIC Movement <span className="text-red-500">*</span>
//             </label>
//             <input
//               type="text"
//               value={picMovement}
//               onChange={(e) => setPicMovement(e.target.value)}
//               placeholder="Person In Charge"
//               className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
//             />
//           </div>

//           {/* To Qty: MANUAL INPUT vs. AUTO DISPLAY */}
//           {(isRestockFromSefasFlow) || (isFromRegister && isToMainWarehouse) ? (
//             // Manual Input for Restock (SEFAS -> WH) or New Registration (Register -> WH)
//             <div>
//               <label className="block text-sm font-semibold text-gray-700 mb-1">
//                 Qty Received (Liters) <span className="text-red-500">*</span>
//               </label>
//               <input
//                 type="number"
//                 value={toQty ?? ''}
//                 onChange={(e) => setToQty(e.target.value ? parseInt(e.target.value) : null)}
//                 placeholder="0"
//                 min="0"
//                 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
//               />
//             </div>
//           ) : (
//             // Auto Display for Dismantling (To Qty = 0L) or Issuing (To Qty = Tank.Qty)
//             <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
//               <p className="text-sm text-blue-800">
//                 <span className="font-semibold">To Qty (Auto):</span>{' '}
//                 <span className="font-mono font-bold text-lg">{toQty !== null ? `${toQty}L` : 'Calculating...'}</span>
//               </p>
//               {isDismantlingFlow && (
//                  <p className="text-xs text-red-600 mt-1 font-medium">Qty otomatis **0L** karena unit dicatat sebagai **Dirty Container (DC)** di Warehouse.</p>
//               )}
//                {isRefillToSefasFlow && (
//                  <p className="text-xs text-purple-600 mt-1 font-medium">Qty otomatis **0L** karena unit dikeluarkan untuk **Refill/Pabrik**.</p>
//               )}
//             </div>
//           )}

//           {/* Consumer Selection */}
//           {isToConsumer && (
//             <div>
//               <label className="block text-sm font-semibold text-gray-700 mb-1">
//                 Select Unit Destination <span className="text-red-500">*</span>
//               </label>
//               <select
//                 value={selectedConsumerId || ''}
//                 onChange={(e) => setSelectedConsumerId(e.target.value || null)}
//                 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
//                 // Menonaktifkan jika validasi Register -> Consumer akan memblokir submit
//                 disabled={isFromRegister && isToConsumer} 
//               >
//                 <option value="">-- Select a Consumer --</option>
//                 {getConsumersForCluster(toCluster.id).map((consumer) => (
//                   <option key={consumer.id} value={consumer.id}>
//                     {getConsumerLabel(consumer)}
//                   </option>
//                 ))}
//               </select>
//             </div>
//           )}

//           {/* Previous Movements */}
//           {previousMovements.length > 0 && (
//             <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
//               <p className="text-xs font-semibold text-gray-700 mb-3">Previous Movements (Last 5)</p>
//               <div className="space-y-2 max-h-40 overflow-y-auto">
//                 {previousMovements.map((movement) => (
//                   <div key={movement.id} className="text-xs bg-white p-2 rounded border border-gray-100 hover:bg-gray-50">
//                     <div className="flex justify-between items-start mb-1">
//                       <span className="font-semibold text-blue-600">{movement.reference_no || 'N/A'}</span>
//                       <span className="text-gray-500 text-[10px]">{new Date(movement.movement_date).toLocaleDateString()}</span>
//                     </div>
//                     <div className="text-gray-700">
//                       <span className="font-mono bg-gray-100 px-1 py-0.5 rounded">{movement.from_qty}L</span>
//                       <span className="text-gray-400 mx-1">→</span>
//                       <span className="font-mono bg-gray-100 px-1 py-0.5 rounded">{movement.to_qty}L</span>
//                     </div>
//                     <div className="text-gray-500 mt-1">{movement.from_status} → {movement.to_status}</div>
//                   </div>
//                 ))}
//               </div>
//             </div>
//           )}

//           {/* Summary */}
//           <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
//             <p className="text-xs text-indigo-900 font-semibold mb-2">Summary:</p>
//             <ul className="text-xs text-indigo-800 space-y-1">
//               <li>Tank: <span className="font-mono font-bold">{tank.nomor_gt}</span></li>
//               <li>From: <span className="font-semibold">{fromCluster?.name || 'REGISTER'}</span></li>
//               <li>To: <span className="font-semibold">{toCluster.name}</span>
//                 {isToConsumer && selectedConsumerId && (
//                   <> → <span className="font-semibold text-blue-600">{consumersList.find((c) => c.id === selectedConsumerId)?.unit_id}</span></>
//                 )}
//               </li>
//               <li>Qty: <span className="font-mono font-bold">{toQty !== null ? `${toQty}L` : 'N/A (Manual Input Required)'}</span></li>
//             </ul>
//           </div>

//           {/* Buttons */}
//           <div className="flex gap-3 pt-4 border-t">
//             <button
//               type="button"
//               onClick={onCancel}
//               className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold transition"
//             >
//               Cancel
//             </button>
//             <button
//               type="submit"
//               className={`flex-1 px-4 py-2 text-white rounded-lg font-semibold transition shadow-md 
//                 ${(isFromRegister && (isToConsumer || isToSefas)) 
//                   ? 'bg-gray-400 cursor-not-allowed' // Style disabled
//                   : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700'
//                 }`}
//               disabled={isFromRegister && (isToConsumer || isToSefas)} // Disable button based on validation
//             >
//               Confirm Movement
//             </button>
//           </div>
//         </form>
//       </div>
//     </div>
//   );
// };