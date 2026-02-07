import { useEffect, useState, useRef, useMemo } from 'react';
import { supabase } from '../../../db/SupabaseClient';
import { formatDateToString } from '../../../Utils/DateUtility';
import { FaPlus, FaTimes, FaSave } from 'react-icons/fa';
import DatePickerOne from '../../../components/Forms/DatePicker/DatePickerOne';
import OutstandingOrder from './OutstandingOrder';
import OrderDetail from './OrderDetail';
import { AgGridReact } from 'ag-grid-react'; // React Data Grid Component
import "ag-grid-community/styles/ag-grid.css"; // Mandatory CSS required by the grid
import "ag-grid-community/styles/ag-theme-quartz.css"; // Optional Theme applied to the grid
import { ColDef } from 'ag-grid-community';

interface Job {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  scheduled_date: Date | null;
  assignee_id: string | null;
  due_date: Date | null;
}

interface Manpower {
  nrp: string;
  nama: string;
}

interface Order {
    id: number;
    order_date: string;
    creator: string; // NRP
    supply_to: string; // NRP
    status: string;
    stocked_item: boolean;
    pr_number?: string;
    reservation_number?: string;
    po_number?: string;
    item_count?: number;
}

const BoardDetail = () => {
  const [scheduledJobs, setScheduledJobs] = useState<Job[]>([]);
  const [pendingJobs, setPendingJobs] = useState<Job[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [manpowerList, setManpowerList] = useState<Manpower[]>([]);
  
  // Tab State
  const [activeTab, setActiveTab] = useState<'scheduled' | 'pending' | 'orders'>('scheduled');
  const [statusFilter, setStatusFilter] = useState('All'); // New Status Filter

  // Add Job State
  const [isAddingType, setIsAddingType] = useState<'scheduled' | 'pending' | null>(null);
  const [newJobTitle, setNewJobTitle] = useState('');
  const [newJobDesc, setNewJobDesc] = useState('');
  const [newJobDate, setNewJobDate] = useState('');
  const [newJobDueDate, setNewJobDueDate] = useState<Date | null>(null);
  const [newJobAssignee, setNewJobAssignee] = useState('');
  const [selectedAssigneeNrp, setSelectedAssigneeNrp] = useState<string | null>(null);
  const [showAssigneeSuggestions, setShowAssigneeSuggestions] = useState(false);
  const assigneeInputRef = useRef<HTMLDivElement>(null);

  // Order Modal State
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // AG Grid Column Definitions
  const orderColDefs = useMemo<ColDef[]>(() => [
      { field: 'id', headerName: 'ID', width: 70, flex: 0, sort: 'asc' },
      { field: 'order_date', headerName: 'Date', width: 130, flex: 0, valueFormatter: (params) => params.value ? new Date(params.value).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-' },
      { 
        field: 'creator', 
        headerName: 'Created By', 
        width: 180,
        flex: 0,
        valueFormatter: (params) => {
            const mp = manpowerList.find(m => m.nrp === params.value);
            return mp ? mp.nama : params.value;
        }
      }, 
      { 
        field: 'supply_to', 
        headerName: 'Supply To', 
        width: 180,
        flex: 0,
        valueFormatter: (params) => {
            const mp = manpowerList.find(m => m.nrp === params.value);
            return mp ? mp.nama : params.value;
        }
      },
      { field: 'item_count', headerName: 'Items', width: 80, flex: 0, cellStyle: { textAlign: 'center' } },
      { field: 'pr_number', headerName: 'PR Number', width: 130, flex: 0 },
      { field: 'reservation_number', headerName: 'RES Number', width: 140, flex: 0 },
      { field: 'po_number', headerName: 'PO Number', width: 130, flex: 0 },
      { field: 'status', headerName: 'Status', minWidth: 200, flex: 1,
        cellRenderer: (params: any) => {
             if (params.data.item_count === 0) {
                 return <span className="text-red-800 font-bold">INCOMPLETE</span>;
             }
             return params.value;
        },
        cellStyle: (params) => {
          if (params.data.item_count === 0) return undefined;
          if (params.value === 'CLOSED') return { color: 'green', fontWeight: 'bold' };
          return { color: 'orange', fontWeight: 'normal' };
      }}
  ], [manpowerList]);

  const fetchManpower = async () => {
    const { data, error } = await supabase
      .from('manpower')
      .select('nrp, nama')
      .eq('active', true);

    if (error) {
      console.error('Error fetching manpower:', error);
    } else {
      setManpowerList(data || []);
    }
  };

  const fetchJobs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('board_jobs')
      .select('*')
      .order('scheduled_date', { ascending: true });

    if (error) {
      console.error('Error fetching jobs:', error);
      setLoading(false);
      return;
    }

    const scheduled: Job[] = [];
    const pending: Job[] = [];

    data.forEach((job: any) => {
      const mappedJob: Job = {
        ...job,
        scheduled_date: job.scheduled_date ? new Date(job.scheduled_date) : null,
        due_date: job.due_date ? new Date(job.due_date) : null,
      };

      if (job.status === 'scheduled') {
        scheduled.push(mappedJob);
      } else if (job.status === 'pending') {
        pending.push(mappedJob);
      }
    });

    setScheduledJobs(scheduled);
    setPendingJobs(pending);
    setLoading(false);
  };

  const fetchOrders = async () => {
      // Need nested count, Supabase supports count in join
      const { data, error } = await supabase
        .from('orders')
        .select(`
            *,
            orders_item (count)
        `)
        .order('id', { ascending: true });
      
      if(error) {
          console.error("Error fetching orders", error);
      } else {
          // Map to flatten count
          const mappedOrders = data ? data.map((o: any) => ({
              ...o,
              item_count: o.orders_item ? o.orders_item[0].count : 0
          })) : [];
          setOrders(mappedOrders || []);
      }
  }

  const handleAddJob = async () => {
    if (!newJobTitle.trim()) return;

    const status = isAddingType === 'scheduled' ? 'scheduled' : 'pending';
    const scheduledDate = isAddingType === 'scheduled' && newJobDate ? new Date(newJobDate) : null;

    const { error } = await supabase.from('board_jobs').insert([
      {
        title: newJobTitle,
        description: newJobDesc,
        status: status,
        scheduled_date: scheduledDate,
        assignee_id: selectedAssigneeNrp,
        due_date: newJobDueDate,
      },
    ]);

    if (error) {
      console.error('Error adding job:', error);
      alert('Failed to add job');
    } else {
      resetForm();
      fetchJobs();
    }
  };

  const resetForm = () => {
    setIsAddingType(null);
    setNewJobTitle('');
    setNewJobDesc('');
    setNewJobDate('');
    setNewJobDueDate(null);
    setNewJobAssignee('');
    setSelectedAssigneeNrp(null);
  };

  useEffect(() => {
    fetchJobs();
    fetchManpower();
    fetchOrders();
    
    // Click outside handler for assignee suggestions
    const handleClickOutside = (event: MouseEvent) => {
      if (assigneeInputRef.current && !assigneeInputRef.current.contains(event.target as Node)) {
        setShowAssigneeSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const statusCounts = useMemo(() => {
    const counts: any = {
      All: orders.length,
      INCOMPLETE: orders.filter(o => o.item_count === 0).length,
    };
    
    [
      'WAITING APPROVAL MR',
      'WAITING PR NUMBER',
      'WAITING APPROVAL PR',
      'WAITING RESERVATION',
      'WAITING APPROVAL RESERVATION',
      'WAITING SUPPLY',
      'CLOSED'
    ].forEach(status => {
      counts[status] = orders.filter(o => o.status === status).length;
    });
    
    return counts;
  }, [orders]);

  const filteredOrders = useMemo(() => {
    if (statusFilter === 'All') return orders;
    if (statusFilter === 'INCOMPLETE') return orders.filter(o => o.item_count === 0);
    return orders.filter(o => o.status === statusFilter);
  }, [orders, statusFilter]);

  const filteredManpower = manpowerList.filter(mp => 
    mp.nama && mp.nama.toLowerCase().includes(newJobAssignee.toLowerCase())
  );

  const renderAddForm = (type: 'scheduled' | 'pending') => (
    <div className="bg-white dark:bg-boxdark p-3 rounded shadow-sm border border-blue-200 dark:border-blue-700 mb-3 animate-in fade-in slide-in-from-top-2">
      <input
        type="text"
        placeholder="Title"
        className="w-full mb-2 px-2 py-1 border rounded text-sm dark:bg-slate-700 dark:border-gray-600 outline-none focus:border-blue-500"
        value={newJobTitle}
        onChange={(e) => setNewJobTitle(e.target.value)}
        autoFocus
      />
      
      {/* Assignee Auto-suggest */}
      <div className="relative mb-2" ref={assigneeInputRef}>
        <input
          type="text"
          placeholder="Assignee (Auto-suggest)"
          className="w-full px-2 py-1 border rounded text-sm dark:bg-slate-700 dark:border-gray-600 outline-none focus:border-blue-500"
          value={newJobAssignee}
          onChange={(e) => {
            setNewJobAssignee(e.target.value);
            setShowAssigneeSuggestions(true);
            if (!e.target.value) setSelectedAssigneeNrp(null);
          }}
          onFocus={() => setShowAssigneeSuggestions(true)}
        />
        {showAssigneeSuggestions && newJobAssignee && (
          <div className="absolute z-10 w-full bg-white dark:bg-boxdark border border-gray-200 dark:border-gray-600 rounded shadow-lg max-h-40 overflow-y-auto mt-1">
            {filteredManpower.length > 0 ? (
              filteredManpower.map((mp) => (
                <div
                  key={mp.nrp}
                  className="px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                  onClick={() => {
                    setNewJobAssignee(mp.nama);
                    setSelectedAssigneeNrp(mp.nrp);
                    setShowAssigneeSuggestions(false);
                  }}
                >
                  {mp.nama} <span className="text-xs text-gray-500">({mp.nrp})</span>
                </div>
              ))
            ) : (
              <div className="px-3 py-2 text-sm text-gray-500">No active manpower found</div>
            )}
          </div>
        )}
      </div>

      {/* Due Date Picker */}
      <div className="mb-2">
        <label className="text-xs text-gray-500 mb-1 block">Due Date</label>
        <DatePickerOne
          enabled={true}
          handleChange={(date) => setNewJobDueDate(date)}
          setValue={newJobDueDate ? newJobDueDate.toISOString() : ''}
        />
      </div>

      <textarea
        placeholder="Description (optional)"
        className="w-full mb-2 px-2 py-1 border rounded text-sm dark:bg-slate-700 dark:border-gray-600 outline-none focus:border-blue-500 resize-none"
        rows={2}
        value={newJobDesc}
        onChange={(e) => setNewJobDesc(e.target.value)}
      />
      {type === 'scheduled' && (
        <div className="mb-2">
           <label className="text-xs text-gray-500 mb-1 block">Scheduled Date</label>
            <input
            type="datetime-local"
            className="w-full px-2 py-1 border rounded text-sm dark:bg-slate-700 dark:border-gray-600 outline-none focus:border-blue-500"
            value={newJobDate}
            onChange={(e) => setNewJobDate(e.target.value)}
            />
        </div>
      )}
      <div className="flex justify-end gap-2">
        <button
          onClick={resetForm}
          className="p-1.5 text-red-500 hover:bg-red-50 rounded"
        >
          <FaTimes size={14} />
        </button>
        <button
          onClick={handleAddJob}
          className="p-1.5 text-blue-500 hover:bg-blue-50 rounded"
        >
          <FaSave size={14} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-white dark:bg-boxdark rounded-lg shadow-default border border-stroke dark:border-strokedark p-4">
       <h2 className="text-xl font-bold mb-4 text-black dark:text-white">Board Overview</h2>
      
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4 overflow-x-auto scrollbar-hide">
        <button
          className={`py-2 px-4 text-sm font-medium focus:outline-none flex items-center gap-2 ${
            activeTab === 'scheduled'
              ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
          onClick={() => setActiveTab('scheduled')}
        >
          Scheduled Jobs
          <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs font-semibold px-2 py-0.5 rounded-full">
            {scheduledJobs.length}
          </span>
        </button>
        <button
          className={`py-2 px-4 text-sm font-medium focus:outline-none flex items-center gap-2 ${
            activeTab === 'pending'
              ? 'text-orange-600 border-b-2 border-orange-600 dark:text-orange-400 dark:border-orange-400'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
          onClick={() => setActiveTab('pending')}
        >
          Pending Jobs
          <span className="bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 text-xs font-semibold px-2 py-0.5 rounded-full">
            {pendingJobs.length}
          </span>
        </button>
        <button
          className={`py-2 px-4 text-sm font-medium focus:outline-none flex items-center gap-2 ${
            activeTab === 'orders'
              ? 'text-green-600 border-b-2 border-green-600 dark:text-green-400 dark:border-green-400'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
          onClick={() => setActiveTab('orders')}
        >
          Outstanding Order
          <span className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs font-semibold px-2 py-0.5 rounded-full">
            {orders.length}
          </span>
        </button>
      </div>

      <div className="flex-1 overflow-hidden">
        {/* Scheduled Jobs View */}
        {activeTab === 'scheduled' && (
          <div className="flex flex-col h-[calc(100vh-400px)] min-h-[400px]">
            <div className="flex items-center justify-end mb-4">
              <button
                onClick={() => {
                  resetForm();
                  setIsAddingType('scheduled');
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
              >
                <FaPlus size={12} /> Add Scheduled Job
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 bg-gray-50 dark:bg-gray-800 rounded p-4 border border-gray-200 dark:border-gray-700">
              {isAddingType === 'scheduled' && renderAddForm('scheduled')}
              
              {loading ? (
                <p className="text-center text-gray-500">Loading...</p>
              ) : scheduledJobs.length > 0 ? (
                scheduledJobs.map((job) => (
                  <div
                    key={job.id}
                    className="bg-white dark:bg-boxdark p-3 rounded shadow-sm border border-gray-100 dark:border-gray-600 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-gray-800 dark:text-white truncate">
                        {job.title}
                      </h3>
                      {job.scheduled_date && (
                        <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                          {formatDateToString(job.scheduled_date)}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                      {job.description || 'No description'}
                    </p>
                  </div>
                ))
              ) : (
                !isAddingType && (
                  <p className="text-center text-gray-400 italic py-4">
                    No scheduled jobs
                  </p>
                )
              )}
            </div>
          </div>
        )}

        {/* Pending Jobs View */}
        {activeTab === 'pending' && (
          <div className="flex flex-col h-[calc(100vh-400px)] min-h-[400px]">
             <div className="flex items-center justify-end mb-4">
              <button
                onClick={() => {
                  resetForm();
                  setIsAddingType('pending');
                }}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 transition"
              >
                <FaPlus size={12} /> Add Pending Job
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-2 bg-gray-50 dark:bg-gray-800 rounded p-4 border border-gray-200 dark:border-gray-700">
              {isAddingType === 'pending' && renderAddForm('pending')}

              {loading ? (
                 <p className="text-center text-gray-500">Loading...</p>
              ) : pendingJobs.length > 0 ? (
                pendingJobs.map((job) => (
                  <div
                    key={job.id}
                    className="bg-white dark:bg-boxdark p-3 rounded shadow-sm border border-gray-100 dark:border-gray-600 hover:shadow-md transition-shadow"
                  >
                    <h3 className="font-semibold text-gray-800 dark:text-white mb-2 truncate">
                      {job.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                      {job.description || 'No description'}
                    </p>
                  </div>
                ))
              ) : (
                !isAddingType && (
                  <p className="text-center text-gray-400 italic py-4">
                    No pending jobs
                  </p>
                )
              )}
            </div>
          </div>
        )}

        {/* Outstanding Order View */}
        {activeTab === 'orders' && (
             <div className="flex flex-col h-[calc(100vh-400px)] min-h-[400px]">
                <div className="flex items-center justify-end mb-4 gap-2">
                    <div className="relative">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="appearance-none bg-white dark:bg-boxdark border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-white py-2 px-4 pr-8 rounded leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                        >
                            <option value="All">All Status ({statusCounts.All})</option>
                            <option value="INCOMPLETE">Incomplete ({statusCounts.INCOMPLETE})</option>
                            <option value="WAITING APPROVAL MR">Waiting Approval MR ({statusCounts['WAITING APPROVAL MR']})</option>
                            <option value="WAITING PR NUMBER">Waiting PR Number ({statusCounts['WAITING PR NUMBER']})</option>
                            <option value="WAITING APPROVAL PR">Waiting Approval PR ({statusCounts['WAITING APPROVAL PR']})</option>
                            <option value="WAITING RESERVATION">Waiting Reservation ({statusCounts['WAITING RESERVATION']})</option>
                            <option value="WAITING APPROVAL RESERVATION">Waiting Approval Reservation ({statusCounts['WAITING APPROVAL RESERVATION']})</option>
                            <option value="WAITING SUPPLY">Waiting Supply ({statusCounts['WAITING SUPPLY']})</option>
                            <option value="CLOSED">Closed ({statusCounts.CLOSED})</option>
                        </select>
                         <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-300">
                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                        </div>
                    </div>

                    <button
                        onClick={() => setShowOrderModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
                    >
                        <FaPlus size={12} /> New Order
                    </button>
                </div>
                <div className="ag-theme-quartz" style={{ height: '100%', width: '100%' }}>
                     <AgGridReact
                        rowData={filteredOrders}
                        columnDefs={orderColDefs}
                        defaultColDef={{ flex: 1, minWidth: 100 }}
                        pagination={true}
                        paginationPageSize={10}
                        onRowClicked={(event) => setSelectedOrder(event.data)}
                        rowClass="cursor-pointer transition-colors"
                        getRowStyle={(params) => {
                            if (params.data.item_count === 0) {
                                return { background: '#ffdfdfff' }; // weak red
                            }
                            return undefined;
                        }}
                     />
                </div>
             </div>
        )}
      </div>

      {/* Add Order Modal */}
      {showOrderModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4" onClick={() => setShowOrderModal(false)}>
               <div className="bg-white dark:bg-boxdark rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                   <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                        <h3 className="text-xl font-semibold text-black dark:text-white">Create New Order</h3>
                        <button onClick={() => setShowOrderModal(false)} className="text-gray-500 hover:text-gray-700">
                             <FaTimes size={20} />
                        </button>
                   </div>
                   <div className="p-4 flex-1 overflow-y-auto">
                        <OutstandingOrder onSuccess={() => {
                            setShowOrderModal(false);
                            fetchOrders();
                        }} />
                   </div>
               </div>
          </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-2 sm:p-4" onClick={() => setSelectedOrder(null)}>
               <div className="bg-white dark:bg-boxdark rounded-lg shadow-xl w-full max-w-5xl h-[95vh] sm:h-[85vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                   <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                        <h3 className="text-xl font-semibold text-black dark:text-white">Order Details</h3>
                        <button onClick={() => setSelectedOrder(null)} className="text-gray-500 hover:text-gray-700">
                             <FaTimes size={20} />
                        </button>
                   </div>
                   <div className="p-2 sm:p-4 flex-1 overflow-hidden">
                        <OrderDetail 
                            order={selectedOrder} 
                            manpowerList={manpowerList}
                            onClose={() => setSelectedOrder(null)}
                            onUpdate={() => {
                                fetchOrders();
                                // Keep modal open to show updated status? Or close?
                                // User flow suggests update -> refresh. Let's keep it open or close based on preference. 
                                // The Confirm dialog in OrderDetail calls onClose, so it will close.
                                // If we want to keep it open to show the new status in timeline, we should NOT close it there.
                                // But OrderDetail calls onClose() inside confirmStatusUpdate.
                                // Let's stick to closing for now as per OrderDetail implementation.
                            }}
                        />
                   </div>
               </div>
          </div>
      )}
    </div>
  );
};
export default BoardDetail;
