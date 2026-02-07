import { useEffect, useState } from 'react';
import { supabase } from '../../../db/SupabaseClient';
import { FaCheck, FaArrowDown, FaTrash, FaInbox, FaCalendarAlt, FaUser, FaTruckLoading, FaStickyNote, FaLayerGroup } from 'react-icons/fa';
import OutstandingOrder from './OutstandingOrder';
import { useAuth } from '../../Authentication/AuthContext';

interface OrderDetailProps {
    order: any;
    manpowerList: any[];
    onClose: () => void;
    onUpdate: () => void;
}

const ORDER_STATUSES = [
    'WAITING APPROVAL MR',
    'WAITING PR NUMBER',
    'WAITING APPROVAL PR',
    'WAITING RESERVATION',
    'WAITING APPROVAL RESERVATION',
    'WAITING SUPPLY',
    'CLOSED'
];

const OrderDetail = ({ order, manpowerList, onClose, onUpdate }: OrderDetailProps) => {
    const { currentUser } = useAuth();
    const [items, setItems] = useState<any[]>([]);
    const [showConfirm, setShowConfirm] = useState(false);
    const [userPosition, setUserPosition] = useState<number | null>(null);
    const [targetStatus, setTargetStatus] = useState('');
    const [inputNumber, setInputNumber] = useState('');
    const [loading, setLoading] = useState(true);

    const getManpowerName = (nrp: string) => {
        const mp = manpowerList.find(m => m.nrp === nrp);
        return mp ? mp.nama : nrp;
    };

    const fetchItems = async () => {
        if (!order?.id) return;
        setLoading(true);
        const { data, error } = await supabase
            .from('orders_item')
            .select('*')
            .eq('mr_number', order.id)
            .order('item_no', { ascending: true });
        
        if (error) {
            console.error('Error fetching items:', error);
        } else {
            setItems(data || []);
        }
        setLoading(false);
    };

    const getDynamicLabel = (status: string) => {
        if (status === 'WAITING APPROVAL MR') return order.mr_approved ? 'MR Approved' : 'Wait Approval MR';
        if (status === 'WAITING PR NUMBER') return order.pr_number ? `PR: ${order.pr_number}` : 'Wait PR Number';
        if (status === 'WAITING APPROVAL PR') return order.pr_approved ? 'PR Approved' : 'Wait Approval PR';
        if (status === 'WAITING RESERVATION') return order.reservation_number ? `RES: ${order.reservation_number}` : 'Wait Reservation';
        if (status === 'WAITING APPROVAL RESERVATION') return order.res_approved ? 'RES Approved' : 'Wait Approval RES';
        if (status === 'WAITING SUPPLY') return 'Wait Supply';
        
        return status;
    };

    useEffect(() => {
        fetchItems();
    }, [order]);

    useEffect(() => {
        const fetchUserPosition = async () => {
            if (currentUser?.nrp) {
                const { data, error } = await supabase
                    .from('manpower')
                    .select('position')
                    .eq('nrp', currentUser.nrp)
                    .single();
                
                if (!error && data) {
                    setUserPosition(data.position);
                }
            }
        };
        fetchUserPosition();
    }, [currentUser]);

    const handleStatusClick = (status: string, index: number) => {
        // Validation: Only allow clicking the CURRENT active status/bullet
        if (status !== order.status) {
            // Optional: Alert user they must follow the sequence
            return;
        }

        // Validation for MR Approval step
        if (status === 'WAITING APPROVAL MR') {
            if (userPosition !== 0 && userPosition !== 1) {
                alert('Minta approval ke Group Leader');
                return;
            }
        }

        // Clicking current status progresses to next
        if (index < ORDER_STATUSES.length - 1) {
            setTargetStatus(ORDER_STATUSES[index + 1]);
            setShowConfirm(true);
        }
    };

    const confirmStatusUpdate = async () => {
        const updateData: any = { status: targetStatus };
        
        // Handle input fields: They should be saved when LEAVING the respective "WAITING ... NUMBER" phase
        if (order.status === 'WAITING PR NUMBER') {
            updateData.pr_number = inputNumber;
        } else if (order.status === 'WAITING RESERVATION') {
            updateData.reservation_number = inputNumber;
        }

        // Handle Approval Flags based on progression
        if (order.status === 'WAITING APPROVAL MR' && targetStatus === 'WAITING PR NUMBER') {
            updateData.mr_approved = true;
        } else if (order.status === 'WAITING APPROVAL PR' && targetStatus === 'WAITING RESERVATION') {
            updateData.pr_approved = true;
        } else if (order.status === 'WAITING APPROVAL RESERVATION' && targetStatus === 'WAITING SUPPLY') {
            updateData.res_approved = true;
        } else if (order.status === 'WAITING SUPPLY' && targetStatus === 'CLOSED') {
            updateData.po_approved = true;
        }

        const { error } = await supabase
            .from('orders')
            .update(updateData)
            .eq('id', order.id);
            
        if (!error) {
            onUpdate();
            setShowConfirm(false);
            setInputNumber('');
            onClose();
        } else {
            console.error('Error updating status:', error);
            alert('Failed to update status');
        }
    };

    const handleDeleteItem = async (itemId: string) => {
        if (!confirm('Are you sure you want to delete this item?')) return;

        const { error } = await supabase
            .from('orders_item')
            .delete()
            .eq('id', itemId);
        
        if (error) {
            console.error('Error deleting item:', error);
            alert('Failed to delete item');
        } else {
            fetchItems();
            onUpdate();
        }
    };

    const noItems = !loading && items.length === 0;

    return (
        <div className="flex flex-col h-full gap-3 relative bg-white dark:bg-slate-900 overflow-hidden">
            {/* Elegant Modern Header Info - Streamlined for Mobile */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 px-2">
                <div className="bg-slate-50 dark:bg-slate-800/40 p-2 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 flex-shrink-0">
                        <FaInbox size={14} />
                    </div>
                    <div>
                        <span className="block text-[8px] text-slate-400 uppercase font-bold tracking-wider">Order ID</span>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase">#{String(order.id)}</span>
                    </div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/40 p-2 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 flex-shrink-0">
                        <FaCalendarAlt size={14} />
                    </div>
                    <div>
                        <span className="block text-[8px] text-slate-400 uppercase font-bold tracking-wider">Date</span>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                            {order.order_date ? new Date(order.order_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }) : '-'}
                        </span>
                    </div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                        <FaUser size={14} />
                    </div>
                    <div className="truncate">
                        <span className="block text-[8px] text-slate-400 uppercase font-bold tracking-wider">Creator</span>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate block">{getManpowerName(order.creator).split(' ')[0]}</span>
                    </div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400 flex-shrink-0">
                        <FaTruckLoading size={14} />
                    </div>
                    <div className="truncate">
                        <span className="block text-[8px] text-slate-400 uppercase font-bold tracking-wider">Supply</span>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate block">{getManpowerName(order.supply_to).split(' ')[0]}</span>
                    </div>
                </div>
            </div>

            {/* Subtle Extra Info Bar */}
            <div className="flex flex-wrap gap-4 px-2">
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/40 px-3 py-1.5 rounded-full border border-slate-100 dark:border-slate-800">
                     <FaLayerGroup size={12} className="text-slate-400" />
                     <span className="text-[11px] font-bold text-slate-400 uppercase mr-1">Stocked:</span>
                     <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${order.stocked_item ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-600'}`}>
                        {order.stocked_item ? 'YES' : 'NO'}
                     </span>
                </div>
                {order.pr_number && (
                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/40 px-3 py-1.5 rounded-full border border-slate-100 dark:border-slate-800">
                        <FaStickyNote size={12} className="text-slate-400" />
                        <span className="text-[11px] font-bold text-slate-400 uppercase mr-1">PR:</span>
                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">{order.pr_number}</span>
                    </div>
                )}
                {order.reservation_number && (
                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/40 px-3 py-1.5 rounded-full border border-slate-100 dark:border-slate-800">
                        <FaStickyNote size={12} className="text-slate-400" />
                        <span className="text-[11px] font-bold text-slate-400 uppercase mr-1">RES:</span>
                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">{order.reservation_number}</span>
                    </div>
                )}
            </div>

            {/* Content Logic */}
            {noItems ? (
                 <div className="flex-1 overflow-y-auto px-2">
                    <div className="p-6 mb-6 bg-amber-50 dark:bg-amber-900/10 text-amber-800 dark:text-amber-200 rounded-2xl border border-amber-100 dark:border-amber-800/50 flex items-center gap-4 animate-in fade-in zoom-in-95">
                        <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                            <FaLayerGroup size={20} />
                        </div>
                        <div>
                            <p className="font-bold text-lg">Order is Incomplete</p>
                            <p className="text-sm opacity-80">Please add at least one item below to activate the workflow timeline.</p>
                        </div>
                    </div>
                    <OutstandingOrder 
                        existingOrder={order} 
                        onSuccess={() => {
                            onUpdate();
                            fetchItems();
                        }} 
                    />
                 </div>
            ) : (
                <div className="flex flex-col flex-1 gap-3 px-2 overflow-hidden">
                    {/* Modern Timeline - Fixed for visibility */}
                    <div className="w-full py-2 px-2 overflow-x-auto scrollbar-show touch-pan-x">
                        <div className="flex items-start justify-between min-w-[900px] relative py-4 mr-10">
                             {/* Background Progress Path - Centered at 36px (16px padding + 20px half-circle) */}
                             <div className="absolute top-[34.5px] left-[60px] right-[60px] h-[3px] bg-slate-100 dark:bg-slate-800 -z-10 rounded-full"></div>

                             {ORDER_STATUSES.map((status, index) => {
                                const currentIndex = ORDER_STATUSES.indexOf(order.status);
                                const isCurrent = currentIndex === index;
                                
                                // Determine if this step is "Passed" based on logic or flags
                                let isPassed = currentIndex > index;
                                if (status === 'WAITING APPROVAL MR') isPassed = order.mr_approved;
                                if (status === 'WAITING APPROVAL PR') isPassed = order.pr_approved;
                                if (status === 'WAITING APPROVAL RESERVATION') isPassed = order.res_approved;
                                if (status === 'WAITING SUPPLY') isPassed = order.po_approved;
                                // For input steps, if we have the number, consider it passed/completed visually
                                if (status === 'WAITING PR NUMBER' && order.pr_number) isPassed = true;
                                if (status === 'WAITING RESERVATION' && order.reservation_number) isPassed = true;

                                const dynamicLabel = getDynamicLabel(status);
                                                                return (
                                    <div key={status} className={`flex flex-col items-center relative w-32 group ${isCurrent ? 'cursor-pointer' : 'cursor-default'}`} onClick={() => handleStatusClick(status, index)}>
                                         {/* Active Path Segment - Pointing Forward, centered at 18.5px within bullet container */}
                                         {index < ORDER_STATUSES.length - 1 && isPassed && (
                                              <div className="absolute top-[18.5px] left-[50%] w-[128px] h-[3px] bg-emerald-500 z-10 rounded-full" style={{ left: '50%', width: '128px' }}></div>
                                         )}

                                         <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 bg-white dark:bg-slate-900 mb-3 relative z-20
                                            ${isCurrent ? 'border-blue-600 text-blue-600 ring-4 ring-blue-50 dark:ring-blue-900/20 scale-110 shadow-lg' : 
                                              isPassed ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-500' : 
                                              'border-slate-200 dark:border-slate-700 text-slate-300'}`}>
                                            {isPassed ? <FaCheck size={14} /> : <span className="text-xs font-bold">{index + 1}</span>}
                                         </div>
                                         <span className={`text-[9px] text-center font-bold px-1 leading-tight max-w-[110px] transition-colors duration-300 uppercase tracking-tighter
                                            ${isCurrent ? 'text-blue-600' : isPassed ? 'text-emerald-500' : 'text-slate-400'}`}>
                                            {dynamicLabel}
                                         </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Elegant Row Items Table (Custom Replace AG Grid for Aesthetic control) */}
                    <div className="flex-1 overflow-hidden flex flex-col min-h-0 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-sm bg-white dark:bg-slate-900/50">
                        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/30 flex justify-between items-center">
                            <h4 className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                <FaLayerGroup className="text-slate-400" /> Order Items List
                            </h4>
                            <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 text-[10px] font-bold">
                                {items.length} ITEMS
                            </span>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            <table className="w-full text-left text-sm border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-slate-100 dark:bg-slate-800 z-10">
                                        <th className="px-4 py-2.5 font-bold text-[11px] text-slate-600 dark:text-slate-400 uppercase tracking-wider w-16">No</th>
                                        {order.stocked_item && <th className="px-4 py-2.5 font-bold text-[11px] text-slate-600 dark:text-slate-400 uppercase tracking-wider">Material Code</th>}
                                        <th className="px-4 py-2.5 font-bold text-[11px] text-slate-600 dark:text-slate-400 uppercase tracking-wider">Item Description</th>
                                        <th className="px-4 py-2.5 font-bold text-[11px] text-slate-600 dark:text-slate-400 uppercase tracking-wider">Allocation</th>
                                        <th className="px-4 py-2.5 font-bold text-[11px] text-slate-600 dark:text-slate-400 uppercase tracking-wider text-right">Qty Order</th>
                                        <th className="px-4 py-2.5 font-bold text-[11px] text-slate-600 dark:text-slate-400 uppercase tracking-wider text-right">Received</th>
                                        {items.length === 0 && <th className="px-4 py-2.5 font-bold text-[11px] text-slate-600 dark:text-slate-400 uppercase tracking-wider text-center w-20">Action</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                                    {items.map((item) => (
                                        <tr key={item.id} className="group hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors duration-150 even:bg-slate-50/30 dark:even:bg-slate-800/10 leading-relaxed">
                                            <td className="px-4 py-2.5 text-slate-400 font-mono text-xs">{item.item_no}</td>
                                            {order.stocked_item && (
                                                <td className="px-4 py-2.5">
                                                    <span className="font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded text-xs uppercase letter-spacing-wide">
                                                        {item.material_code}
                                                    </span>
                                                </td>
                                            )}
                                            <td className="px-4 py-2.5 font-semibold text-slate-700 dark:text-slate-200 uppercase letter-spacing-tight">
                                                {item.item_description}
                                            </td>
                                            <td className="px-4 py-2.5">
                                                <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase px-2 py-1 bg-slate-50 dark:bg-slate-800 rounded">
                                                    {item.allocation || '-'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2.5 text-right">
                                                <span className="font-ex-bold text-slate-900 dark:text-white text-base">
                                                    {item.qty_orders}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2.5 text-right">
                                                <span className={`font-bold ${item.qty_received >= item.qty_orders ? 'text-emerald-500' : 'text-slate-400'}`}>
                                                    {item.qty_received}
                                                </span>
                                            </td>
                                            {items.length === 0 && (
                                                <td className="px-4 py-2.5 text-center">
                                                    <button 
                                                        onClick={() => handleDeleteItem(item.id)}
                                                        className="opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all duration-200"
                                                        title="Remove Item"
                                                    >
                                                        <FaTrash size={14} />
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmation Dialog - Enhanced */}
            {showConfirm && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in transition-all">
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-[32px] shadow-2xl w-full max-w-sm border border-slate-100 dark:border-slate-700 animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                        <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 mx-auto mb-6">
                            <FaTruckLoading size={24} />
                        </div>
                        <h3 className="text-xl font-bold mb-2 text-center text-slate-900 dark:text-white uppercase tracking-tight">
                            {order.status === 'WAITING APPROVAL MR' && targetStatus === 'WAITING PR NUMBER' ? 'Approve MR Request' :
                             order.status === 'WAITING PR NUMBER' && targetStatus === 'WAITING APPROVAL PR' ? 'Submit PR Number' :
                             order.status === 'WAITING APPROVAL PR' && targetStatus === 'WAITING RESERVATION' ? 'Approve PR Request' :
                             'Update Status'}
                        </h3>
                        
                        <p className="text-sm text-center text-slate-500 dark:text-slate-400 mb-8 px-4 leading-relaxed font-medium">
                            {order.status === 'WAITING APPROVAL MR' && targetStatus === 'WAITING PR NUMBER' ? 
                                'Confirm the Materials Requisition approval to proceed to PR creation.' :
                                'Are you sure you want to transition this order to the next phase?'}
                        </p>

                        <div className="flex flex-col items-center gap-4 mb-8 bg-slate-50 dark:bg-slate-900/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
                            <div className="font-bold text-[10px] text-slate-400 uppercase tracking-widest text-center">From CURRENT PHASE</div>
                            <div className="font-bold text-slate-400 line-through text-xs text-center">{order.status}</div>
                            <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center shadow-sm">
                                <FaArrowDown className="text-slate-400 animate-bounce" size={12} />
                            </div>
                            <div className="font-bold text-[10px] text-blue-500 uppercase tracking-widest text-center">To TARGET PHASE</div>
                            <div className="font-bold text-blue-600 dark:text-blue-400 text-sm text-center">{targetStatus}</div>
                        </div>

                        {(order.status === 'WAITING PR NUMBER' || order.status === 'WAITING RESERVATION') && (
                            <div className="mb-6 animate-in slide-in-from-bottom-2">
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-2 tracking-wider">
                                    Input {order.status === 'WAITING PR NUMBER' ? 'PR Number' : 'Reservation Number'}
                                </label>
                                <input 
                                    type="text"
                                    value={inputNumber}
                                    onChange={(e) => setInputNumber(e.target.value.toUpperCase())}
                                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 text-slate-900 dark:text-white font-bold text-center focus:ring-2 focus:ring-blue-500 outline-none transition-all uppercase"
                                    placeholder={order.status === 'WAITING PR NUMBER' ? '8xxxxxxxxx' : '1xxxxxxxxx'}
                                />
                                <p className="mt-2 text-[10px] text-center text-slate-400 italic font-medium">Please provide the identification number above to proceed.</p>
                            </div>
                        )}

                        <div className="flex flex-col gap-3">
                             <button 
                                onClick={confirmStatusUpdate} 
                                disabled={(order.status === 'WAITING PR NUMBER' || order.status === 'WAITING RESERVATION') && !inputNumber}
                                className="w-full py-4 text-sm font-bold text-white bg-blue-600 rounded-2xl hover:bg-blue-700 transition shadow-lg shadow-blue-500/20 active:scale-95 disabled:opacity-50 disabled:grayscale disabled:active:scale-100"
                            >
                                YES, UPDATE STATUS
                             </button>
                             <button 
                                onClick={() => setShowConfirm(false)} 
                                className="w-full py-4 text-sm font-bold text-slate-500 bg-slate-100 dark:bg-slate-700 dark:text-slate-300 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-600 transition active:scale-95"
                            >
                                CANCEL
                             </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default OrderDetail;
