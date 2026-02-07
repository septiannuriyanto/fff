import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../db/SupabaseClient';
import { useAuth } from '../../../pages/Authentication/AuthContext';
import ReusableSwitcher from '../../../components/Switchers/SwitcherFour';
import { FaPlus, FaTrash } from 'react-icons/fa';

interface Manpower {
  nrp: string;
  nama: string;
}

interface Material {
  id: number;
  material_code: string;
  item_description: string;
}

interface OrderItem {
  id?: string;
  material_code: string | null;
  item_description: string;
  qty_orders: number;
  item_no: number;
  allocation?: string;
}

interface OutstandingOrderProps {
    onSuccess?: () => void;
    existingOrder?: any; // Use specific type if possible
}

const OutstandingOrder = ({ onSuccess, existingOrder }: OutstandingOrderProps) => {
  const { currentUser } = useAuth();
  const [manpowerList, setManpowerList] = useState<Manpower[]>([]);
  const [materialsList, setMaterialsList] = useState<Material[]>([]);
  
  // Header State
  const [supplyTo, setSupplyTo] = useState('');
  const [selectedSupplyToNrp, setSelectedSupplyToNrp] = useState<string | null>(null);
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [isStocked, setIsStocked] = useState(true);
  const [isHeaderCreated, setIsHeaderCreated] = useState(false);
  
  // Headers State
  const [activeOrderId, setActiveOrderId] = useState<number | null>(null);
  const [creatorName, setCreatorName] = useState('');

  // Items State
  const [items, setItems] = useState<OrderItem[]>([]);
  const [newItemCode, setNewItemCode] = useState('');
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemAllocation, setNewItemAllocation] = useState('');
  const [newItemQty, setNewItemQty] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // UI State
  const [showSupplyToSuggestions, setShowSupplyToSuggestions] = useState(false);
  const [showMaterialSuggestions, setShowMaterialSuggestions] = useState(false);
  const supplyToRef = useRef<HTMLDivElement>(null);
  const materialRef = useRef<HTMLDivElement>(null);
  const descInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchManpower();
    
    if (existingOrder) {
        setActiveOrderId(existingOrder.id);
        setIsHeaderCreated(true);
        setIsStocked(existingOrder.stocked_item);
        // We might not need to set SupplyTo name if we hide the header form
        // But if we want to show it disabled:
        // Set it inside fetchManpower or separate effect once manpower loaded?
        // Let's just rely on activeOrderId for now.
    }

    if (isStocked || existingOrder?.stocked_item) {
      fetchMaterials();
    }
    
    if (currentUser?.nrp) {
        fetchCreatorName(currentUser.nrp);
    }

    if (activeOrderId) {
        fetchItems(activeOrderId);
    }
  }, [currentUser?.nrp, isStocked, existingOrder, activeOrderId]);

  const fetchItems = async (orderId: number) => {
      const { data } = await supabase
          .from('orders_item')
          .select('*')
          .eq('mr_number', orderId)
          .order('item_no', { ascending: true });
      
      if (data) setItems(data);
  };

  const fetchCreatorName = async (nrp: string) => {
    const { data } = await supabase.from('manpower').select('nama').eq('nrp', nrp).single();
    if(data) setCreatorName(data.nama);
  };

  const fetchManpower = async () => {
    const { data } = await supabase.from('manpower').select('nrp, nama').eq('active', true);
    if (data) setManpowerList(data);
  };

  const fetchMaterials = async () => {
    const { data } = await supabase.from('materials').select('id, material_code, item_description');
    if (data) setMaterialsList(data);
  };

  const handleCreateHeader = async () => {
    // ... (validation)
    if (!selectedSupplyToNrp) {
        alert('Please select who to supply to.');
        return;
    }

    const { data, error } = await supabase
      .from('orders')
      .insert([
        {
          creator: currentUser?.nrp, 
          supply_to: selectedSupplyToNrp,
          stocked_item: isStocked,
          status: 'WAITING APPROVAL MR',
          order_date: orderDate,
        }
      ])
      .select('id')
      .single();

    if (error) {
      console.error('Error creating order header:', error);
      alert('Failed to create order header.');
    } else {
      setActiveOrderId(data.id);
      setIsHeaderCreated(true);
      if(onSuccess) onSuccess(); 
    }
  };

  const handleAddItem = () => {
    if (!activeOrderId) {
        alert('Please create order header first.');
        return;
    }
    if (!newItemDesc && !newItemCode) return;

    const newItemNo = items.length + 1;

    const itemCodeUpper = (isStocked ? newItemCode : '').toUpperCase();
    const itemDescUpper = newItemDesc.toUpperCase();

    const newItem: OrderItem = {
      material_code: isStocked ? itemCodeUpper : null,
      item_description: itemDescUpper,
      allocation: newItemAllocation.toUpperCase(),
      qty_orders: newItemQty,
      item_no: newItemNo,
    };

    setItems([...items, newItem]);
    setNewItemCode('');
    setNewItemDesc('');
    setNewItemAllocation('');
    setNewItemQty(0);
    // Focus back to description
    if (descInputRef.current) descInputRef.current.focus();
  };

  const handleSaveAll = async () => {
      if (!activeOrderId) return;
      
      const newItems = items.filter(item => !item.id);
      if (newItems.length === 0) {
          if(onSuccess) onSuccess();
          return;
      }

      setIsSubmitting(true);
      const { error } = await supabase.from('orders_item').insert(
          newItems.map(item => ({
              mr_number: activeOrderId,
              material_code: item.material_code,
              item_description: item.item_description,
              allocation: item.allocation,
              qty_orders: item.qty_orders,
              item_no: item.item_no
          }))
      );

      setIsSubmitting(false);

      if (error) {
          console.error('Error saving items:', error);
          alert('Failed to save items');
      } else {
          alert('Successfully saved all items');
          if(onSuccess) onSuccess();
      }
  };

  const handleDeleteItem = async (itemId: string | undefined, index: number) => {
      if (!confirm('Are you sure you want to delete this item?')) return;

      if (itemId) {
          const { error } = await supabase
              .from('orders_item')
              .delete()
              .eq('id', itemId);
          
          if (error) {
              console.error('Error deleting item:', error);
              alert('Failed to delete item');
              return;
          }
      }
      
      // If no ID (local only) or successful DB delete
      const newItems = items.filter((_, i) => i !== index);
      // Re-index item_no
      const reindexed = newItems.map((item, idx) => ({
          ...item,
          item_no: idx + 1
      }));
      setItems(reindexed);
  };

  const filteredManpower = manpowerList.filter(mp => 
    mp.nama && mp.nama.toLowerCase().includes(supplyTo.toLowerCase())
  );

  const filteredMaterials = materialsList.filter(mat => 
    (mat.material_code && mat.material_code.toLowerCase().includes(newItemCode.toLowerCase())) ||
    (mat.item_description && mat.item_description.toLowerCase().includes(newItemCode.toLowerCase()))
  );

  return (
    <div className="flex flex-col h-full space-y-4 p-4 text-black dark:text-white">
      {/* Header Section */}
      {/* Header Section - Hide if existing order */}
      {!existingOrder && (
      <div className="bg-white dark:bg-boxdark p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700">
        <h3 className="font-bold text-lg mb-4">New Order Header</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Date</label>
            <input 
                type="date" 
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                disabled={isHeaderCreated}
                className={`w-full px-3 py-2 border rounded outline-none focus:border-blue-500 dark:bg-slate-800 dark:border-gray-600 ${isHeaderCreated ? 'bg-gray-100 cursor-not-allowed' : ''}`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Created By</label>
            <input 
                type="text" 
                value={creatorName || currentUser?.nrp || 'Loading...'} 
                disabled 
                className="w-full px-3 py-2 border rounded bg-gray-100 dark:bg-gray-700 dark:border-gray-600 cursor-not-allowed"
            />
          </div>
          
          <div className="relative" ref={supplyToRef}>
            <label className="block text-sm font-medium mb-1">Supply To</label>
            <input 
                type="text" 
                value={supplyTo}
                onChange={(e) => {
                    setSupplyTo(e.target.value);
                    setShowSupplyToSuggestions(true);
                    if(!e.target.value) setSelectedSupplyToNrp(null);
                }}
                onFocus={() => setShowSupplyToSuggestions(true)}
                disabled={isHeaderCreated}
                className={`w-full px-3 py-2 border rounded outline-none focus:border-blue-500 dark:bg-slate-800 dark:border-gray-600 ${isHeaderCreated ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                placeholder="Search Manpower..."
            />
            {showSupplyToSuggestions && !isHeaderCreated && supplyTo && (
                <div className="absolute z-10 w-full bg-white dark:bg-boxdark border border-gray-200 dark:border-gray-600 rounded shadow-lg max-h-40 overflow-y-auto mt-1">
                    {filteredManpower.map(mp => (
                        <div 
                            key={mp.nrp} 
                            className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                            onClick={() => {
                                setSupplyTo(mp.nama);
                                setSelectedSupplyToNrp(mp.nrp);
                                setShowSupplyToSuggestions(false);
                            }}
                        >
                            {mp.nama}
                        </div>
                    ))}
                </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium">Stocked Item?</label>
             <ReusableSwitcher
                textTrue="Yes"
                textFalse="No"
                value={isStocked}
                onChange={() => {
                    if(!isHeaderCreated) setIsStocked(!isStocked);
                }}
             />
          </div>
        </div>

        {!isHeaderCreated && (
            <div className="mt-4 flex justify-end">
                <button 
                    onClick={handleCreateHeader}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                >
                    Create Header
                </button>
            </div>
        )}
      </div>
      )}

      {/* Items Section */}
      {isHeaderCreated && (
        <div className="bg-white dark:bg-boxdark p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700 flex-1 flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 text-sm">#{activeOrderId}</span>
                    Order Items
                </h3>
                <button 
                    onClick={handleSaveAll}
                    disabled={isSubmitting}
                    className={`px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-bold text-sm shadow-lg shadow-blue-500/20 flex items-center gap-2 active:scale-95 disabled:opacity-50 disabled:active:scale-100`}
                >
                    {isSubmitting ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            Saving...
                        </>
                    ) : (
                        'Save & Finish'
                    )}
                </button>
            </div>
            
            {/* Input Row */}
            <div className="flex flex-col md:flex-row gap-2 mb-4 items-end bg-gray-50 dark:bg-gray-800 p-3 rounded">
                <div className={`relative flex-1 ${!isStocked ? 'hidden' : ''}`} ref={materialRef}>
                    <label className="text-xs mb-1 block">Material Code</label>
                    <input 
                        type="text" 
                        value={newItemCode}
                        onChange={(e) => {
                            setNewItemCode(e.target.value);
                            setShowMaterialSuggestions(true);
                        }}
                        onFocus={() => setShowMaterialSuggestions(true)}
                        placeholder="Search Material..."
                        className="w-full px-2 py-1 border rounded text-sm dark:bg-slate-700"
                    />
                     {showMaterialSuggestions && isStocked && newItemCode && (
                        <div className="absolute z-10 w-full bg-white dark:bg-boxdark border border-gray-200 dark:border-gray-600 rounded shadow-lg max-h-40 overflow-y-auto mt-1">
                            {filteredMaterials.map(mat => (
                                <div 
                                    key={mat.id} 
                                    className="px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                                    onClick={() => {
                                        setNewItemCode(mat.material_code);
                                        setNewItemDesc(mat.item_description || '');
                                        setShowMaterialSuggestions(false);
                                    }}
                                >
                                    <span className="font-bold">{mat.material_code}</span> - {mat.item_description}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                
                <div className="flex-[2]">
                     <label className="text-xs mb-1 block">Description</label>
                     <input 
                        type="text" 
                        ref={descInputRef}
                        value={newItemDesc}
                        onChange={(e) => setNewItemDesc(e.target.value)}
                        placeholder="Item Description"
                        className="w-full px-2 py-1 border rounded text-sm dark:bg-slate-700"
                        disabled={isStocked && !!newItemCode}
                     />
                </div>

                <div className="flex-1">
                     <label className="text-xs mb-1 block">Allocation</label>
                     <input 
                        type="text" 
                        value={newItemAllocation}
                        onChange={(e) => setNewItemAllocation(e.target.value)}
                        placeholder="Allocation (e.g. BD501)"
                        className="w-full px-2 py-1 border rounded text-sm dark:bg-slate-700"
                     />
                </div>

                <div className="w-24">
                     <label className="text-xs mb-1 block">Qty</label>
                     <input 
                        type="number" 
                        value={newItemQty}
                        onChange={(e) => setNewItemQty(Number(e.target.value))}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                handleAddItem();
                            }
                        }}
                        className="w-full px-2 py-1 border rounded text-sm dark:bg-slate-700"
                     />
                </div>

                <button 
                    onClick={handleAddItem}
                    className="p-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                    <FaPlus />
                </button>
            </div>

            {/* Items List */}
            <div className="flex-1 overflow-hidden rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900/50">
                <div className="overflow-y-auto h-full">
                    <table className="w-full text-left text-sm border-collapse">
                        <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 sticky top-0 z-10">
                                <th className="px-4 py-3 font-bold text-[11px] text-slate-600 dark:text-slate-400 uppercase tracking-wider w-12">No</th>
                                {isStocked && <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Code</th>}
                                <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Description</th>
                                <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-400 w-24">Allocation</th>
                                <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-400 text-right">Qty</th>
                                <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-400 text-center w-20">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                            {items.length > 0 ? (
                                items.map((item, idx) => (
                                    <tr 
                                        key={idx} 
                                        className="group hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors duration-150 even:bg-slate-50/30 dark:even:bg-slate-800/10"
                                    >
                                        <td className="px-4 py-3.5 text-slate-500 dark:text-slate-500 font-medium">{item.item_no}</td>
                                        {isStocked && (
                                            <td className="px-4 py-3.5 font-mono text-xs text-blue-600 dark:text-blue-400">
                                                <span className="bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded">
                                                    {item.material_code}
                                                </span>
                                            </td>
                                        )}
                                        <td className="px-4 py-3.5 text-slate-700 dark:text-slate-300 font-medium">
                                            {item.item_description}
                                        </td>
                                        <td className="px-4 py-3.5 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase truncate max-w-[100px]">
                                            {item.allocation || '-'}
                                        </td>
                                        <td className="px-4 py-3.5 text-right font-bold text-slate-900 dark:text-white">
                                            {item.qty_orders}
                                        </td>
                                        <td className="px-4 py-3.5 text-center">
                                            <button 
                                                onClick={() => handleDeleteItem(item.id, idx)}
                                                className={`p-2 rounded-full transition-all duration-200 ${item.id ? 'text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20' : 'text-blue-400 hover:text-blue-600 bg-blue-50/50 dark:bg-blue-900/20'}`}
                                                title={item.id ? 'Delete from Database' : 'Remove from Staging'}
                                            >
                                                <FaTrash size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={isStocked ? 5 : 4} className="px-4 py-12 text-center">
                                        <div className="flex flex-col items-center justify-center text-slate-400 dark:text-slate-600">
                                            <div className="w-12 h-12 mb-3 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
                                                <FaPlus className="opacity-20" />
                                            </div>
                                            <p className="text-sm italic font-medium">Belum ada item ditambahkan</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default OutstandingOrder;
