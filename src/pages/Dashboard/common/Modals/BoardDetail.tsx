import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../../../db/SupabaseClient';
import { FaPlus, FaTimes, FaTrash } from 'react-icons/fa';
import { useAuth } from '../../../Authentication/AuthContext';
import OutstandingOrder from './OutstandingOrder';
import OrderDetail from './OrderDetail';
import JobDetail from './JobDetail';
import CreateJobForm from './CreateJobForm';
import ThemedGrid from '../../../../common/ThemedComponents/ThemedGrid';
import { ColDef } from 'ag-grid-community';



interface Job {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'progress' | 'closed';
  assignee_id: string | null;
  due_date: string | null;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' | null;
  created_by?: string;
  progress_count?: number;
  completed_count?: number;
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
  const [pendingJobs, setPendingJobs] = useState<Job[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [manpowerList, setManpowerList] = useState<Manpower[]>([]);
  
  // Tab State
  const [activeTab, setActiveTab] = useState<'pending' | 'orders'>('pending');
  const [statusFilter, setStatusFilter] = useState('All'); // New Status Filter

  // Modal States
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showJobModal, setShowJobModal] = useState(false);
  const [jobModalType, setJobModalType] = useState<'pending'>('pending');
  
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Context Menu States
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; order: Order } | null>(null);

  // Undo Delete State
  const [undoState, setUndoState] = useState<{ job: Job, timeoutId: NodeJS.Timeout } | null>(null);

  // Finalize Delete (Actual API Call)
  const executeDelete = async (jobId: string) => {
    const { error } = await supabase
      .from('board_jobs')
      .delete()
      .eq('id', jobId);

    if (error) {
      console.error('Error finalizing delete:', error);
      // Ideally, we would want to inform the user here, but the toast is gone.
    }
  };

  // Handle Delete Job (Delayed with Undo)
  const handleDeleteJob = (job: Job) => {
    // 1. If there's pending delete, finalize it immediately (for the previous item)
    if (undoState) {
        clearTimeout(undoState.timeoutId);
        executeDelete(undoState.job.id);
        // Remove the previous job from list as it is now finalized
        setPendingJobs(prev => prev.filter(j => j.id !== undoState.job.id));
    }

    // 2. Schedule actual delete and UI removal
    const timeoutId = setTimeout(() => {
        executeDelete(job.id);
        // Remove from list when timer expires
        setPendingJobs(prev => prev.filter(j => j.id !== job.id));
        if (selectedJob?.id === job.id) setSelectedJob(null);
        setUndoState(null);
    }, 5000);

    // 3. Set Undo State (Job remains visible in list)
    setUndoState({ job, timeoutId });
  };

  // Handle Undo Action
  const handleUndo = () => {
      if (!undoState) return;
      clearTimeout(undoState.timeoutId);
      
      // Job was never removed from list, so we just clear the undo state
      setUndoState(null);
  };

  // Job Column Definitions
  const jobColDefs = useMemo<ColDef[]>(() => [
    { field: 'title', headerName: 'Job Title', width: 200, flex: 0 },
    { field: 'description', headerName: 'Description', flex: 1, minWidth: 250 },
    { 
       field: 'assignee_id', 
       headerName: 'Assignee', 
       width: 150,
       valueGetter: (params) => {
           const mp = manpowerList.find(m => m.nrp === params.data.assignee_id);
           return mp ? mp.nama : params.data.assignee_id;
       }
    },
    { 
        field: 'priority', 
        headerName: 'Priority', 
        width: 100,
        cellRenderer: (params: any) => (
            <span className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase
                ${params.value?.toLowerCase() === 'urgent' ? 'bg-red-100 text-red-600' : 
                  params.value?.toLowerCase() === 'high' ? 'bg-orange-100 text-orange-600' : 
                  params.value?.toLowerCase() === 'low' ? 'bg-slate-100 text-slate-500' :
                  'bg-blue-100 text-blue-600'}`}>
                {params.value || 'NORMAL'}
            </span>
        )
    },
    {
        field: 'status',
        headerName: 'Status',
        width: 100,
        cellRenderer: (params: any) => (
            <span className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase
                ${params.value === 'closed' ? 'bg-emerald-100 text-emerald-600' : 
                  params.value === 'progress' ? 'bg-blue-100 text-blue-600' : 
                  'bg-slate-100 text-slate-500'}`}>
                {params.value || 'open'}
            </span>
        )
    },
    { 
        field: 'due_date', 
        headerName: 'Due Date', 
        width: 140,
        cellRenderer: (params: any) => {
            if (!params.value) return <span className="text-slate-400">-</span>;
            
            const dueDate = new Date(params.value);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const dDate = new Date(dueDate);
            dDate.setHours(0, 0, 0, 0);
            
            const isToday = dDate.getTime() === today.getTime();
            const isOverdue = dDate.getTime() < today.getTime();
            
            const dateStr = dueDate.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
            
            if (isOverdue) {
                return (
                    <div className="flex items-center gap-1.5">
                        <span className="text-red-600 dark:text-red-400 font-bold">{dateStr}</span>
                        <span className="text-[8px] bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded-full font-extrabold uppercase animate-pulse">Overdue</span>
                    </div>
                );
            }
            
            if (isToday) {
                return (
                    <div className="flex items-center gap-1.5">
                        <span className="text-amber-600 dark:text-amber-400 font-bold">{dateStr}</span>
                        <span className="text-[8px] bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-full font-extrabold uppercase">Today</span>
                    </div>
                );
            }
            
            return <span className="font-medium text-slate-500 dark:text-slate-400">{dateStr}</span>;
        }
    },
    {
        headerName: 'Progress',
        width: 130,
        cellRenderer: (params: any) => {
            const total = params.data.progress_count || 0;
            const closed = params.data.completed_count || 0;
            const percent = total > 0 ? Math.round((closed / total) * 100) : 0;
            
            // Glassmorphism-friendly dynamic colors
            const barStyles = 
                percent < 50 ? 'bg-gradient-to-r from-red-500/80 to-rose-400/80 shadow-[0_0_8px_rgba(244,63,94,0.3)]' : 
                percent < 80 ? 'bg-gradient-to-r from-amber-500/80 to-yellow-400/80 shadow-[0_0_8px_rgba(245,158,11,0.3)]' : 
                'bg-gradient-to-r from-emerald-500/80 to-teal-400/80 shadow-[0_0_8px_rgba(16,185,129,0.3)]';
            
            return (
                <div className="flex items-center gap-2 h-full">
                    <div className="flex-1 h-2 bg-slate-100/50 dark:bg-slate-800/40 rounded-full overflow-hidden border border-white/20 dark:border-white/5 backdrop-blur-[2px] relative group/progress">
                        <div 
                            className={`h-full ${barStyles} transition-all duration-700 ease-out relative`} 
                            style={{ width: `${percent}%` }}
                        >
                            {/* Inner glass highlight */}
                            <div className="absolute inset-0 bg-white/20 h-[1px] top-0" />
                        </div>
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 min-w-[30px]">{percent}%</span>
                </div>
            );
        }
    },
    {
        headerName: 'Action',
        width: 60,
        cellRenderer: (params: any) => {
            const { currentUser } = useAuth();
            const currentNrp = currentUser?.nrp || localStorage.getItem('nrp');
            const canEdit = currentNrp === params.data.created_by;
            
            if (!canEdit) return null;
            
            return (
                <div className="flex items-center justify-center h-full gap-2">
                    <button 
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            e.nativeEvent.stopImmediatePropagation();
                            handleDeleteJob(params.data);
                        }}
                        className="delete-job-btn p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Job"
                    >
                        <FaTrash size={14} />
                    </button>
                </div>
            );
        }
    }
  ], [manpowerList]);

  // Order Column Definitions
  const orderColDefs = useMemo<ColDef[]>(() => [
      { field: 'id', headerName: 'ID', width: 70, flex: 0, sort: 'asc' },
      { field: 'order_date', headerName: 'Date', width: 130, flex: 0, valueFormatter: (params) => params.value ? new Date(params.value).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-' },
      { 
        field: 'creator', 
        headerName: 'Created By', 
        width: 180,
        flex: 0,
        valueGetter: (params) => {
            const mp = manpowerList.find(m => m.nrp === params.data.creator);
            return mp ? mp.nama : params.data.creator;
        }
      }, 
      { 
        field: 'supply_to', 
        headerName: 'Supply To', 
        width: 180,
        flex: 0,
        valueGetter: (params) => {
            const mp = manpowerList.find(m => m.nrp === params.data.supply_to);
            return mp ? mp.nama : params.data.supply_to;
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
    const { data, error } = await supabase
      .from('board_jobs')
      .select(`
        *,
        board_jobs_progress (status)
      `)
      .order('due_date', { ascending: true });

    if (error) {
      console.error('Error fetching jobs:', error);
      return;
    }

    const pending: Job[] = [];

    data.forEach((job: any) => {
      const progressItems = job.board_jobs_progress || [];
      const mappedJob: Job = {
        ...job,
        progress_count: progressItems.length,
        completed_count: progressItems.filter((i: any) => i.status === 'closed').length
      };

      // Consolidate all non-closed jobs into the pending view
      if (job.status !== 'closed') {
        pending.push(mappedJob);
      }
    });

    setPendingJobs(pending);
  };

  const fetchOrders = async () => {
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
          const mappedOrders = data ? data.map((o: any) => ({
              ...o,
              item_count: o.orders_item ? o.orders_item[0].count : 0
          })) : [];
          setOrders(mappedOrders || []);
      }
  }

  useEffect(() => {
    fetchJobs();
    fetchManpower();
    fetchOrders();
  }, []);

  // Close context menu on click outside
  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [contextMenu]);

  // Prevent default browser context menu on the grid
  useEffect(() => {
    const gridElement = document.querySelector('.ag-theme-quartz');
    const preventContextMenu = (e: Event) => e.preventDefault();
    if (gridElement) {
      gridElement.addEventListener('contextmenu', preventContextMenu);
      return () => gridElement.removeEventListener('contextmenu', preventContextMenu);
    }
  }, []);

  // Global Escape key listener to close all modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedOrder(null);
        setSelectedJob(null);
        setShowOrderModal(false);
        setShowJobModal(false);
        setContextMenu(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleDeleteOrder = async (orderId: number) => {
    if (!confirm('Are you sure you want to delete this order?')) return;
    
    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', orderId);
    
    if (error) {
      console.error('Error deleting order:', error);
      alert('Failed to delete order');
    } else {
      // Immediately update UI
      setOrders(prev => prev.filter(o => o.id !== orderId));
      setContextMenu(null);
    }
  };



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

  return (
    <>
    <div className="flex flex-col h-full backdrop-blur-2xl bg-white/60 dark:bg-boxdark/60 p-6 rounded-2xl shadow-xl border border-white/50 dark:border-white/10 transition-all duration-500">
       <h2 className="text-xl font-bold mb-4 text-black dark:text-white uppercase tracking-widest">Board Overview</h2>
      
      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-700 mb-4 overflow-x-auto scrollbar-hide">
        <button
          className={`py-2 px-4 text-sm font-bold focus:outline-none flex items-center gap-2 transition-all uppercase tracking-wider ${
            activeTab === 'pending'
              ? 'text-orange-600 border-b-2 border-orange-600 dark:text-orange-400 dark:border-orange-400'
              : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
          onClick={() => setActiveTab('pending')}
        >
          Pending Jobs
          <span className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-200 text-[10px] px-2 py-0.5 rounded-full">
            {pendingJobs.length}
          </span>
        </button>
        <button
          className={`py-2 px-4 text-sm font-bold focus:outline-none flex items-center gap-2 transition-all uppercase tracking-wider ${
            activeTab === 'orders'
              ? 'text-green-600 border-b-2 border-green-600 dark:text-green-400 dark:border-green-400'
              : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
          onClick={() => setActiveTab('orders')}
        >
          Outstanding Order
          <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-200 text-[10px] px-2 py-0.5 rounded-full">
            {orders.length}
          </span>
        </button>
      </div>

      <div className="flex-1 overflow-hidden">


        {/* Pending Jobs View */}
        {activeTab === 'pending' && (
          <div className="flex flex-col h-[calc(100vh-400px)] min-h-[400px]">
             <div className="flex items-center justify-end mb-4">
              <button
                onClick={() => {
                  setJobModalType('pending');
                  setShowJobModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2.5 bg-orange-600 text-white rounded-xl font-bold text-xs tracking-widest hover:bg-orange-700 shadow-lg shadow-orange-500/20 transition-all active:scale-95"
              >
                <FaPlus size={10} /> ADD PENDING JOB
              </button>
            </div>

            <ThemedGrid
                gridClass="fff-grid-pending"
                rowData={pendingJobs}
                columnDefs={jobColDefs}
                defaultColDef={{ flex: 1, minWidth: 100 }}
                useGridFilter={true}
                pagination={true}
                paginationPageSize={10}
                onRowClicked={(event) => {
                  const target = event.event?.target as HTMLElement;
                  if (target?.closest('.delete-job-btn') || target?.closest('button')) return;
                  setSelectedJob(event.data);
                }}
                getRowClass={(params) => {
                  if (undoState && undoState.job.id === params.data.id) {
                      return 'animate-pulse bg-red-50 dark:bg-red-900/20 border-2 border-red-500 rounded-lg';
                  }
                  return 'cursor-pointer transition-colors';
                }}
            />
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
                            className="appearance-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 py-2 px-4 pr-10 rounded-xl font-bold text-xs tracking-wider outline-none focus:border-blue-500 shadow-sm"
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
                         <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                        </div>
                    </div>

                    <button
                        onClick={() => setShowOrderModal(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-xs tracking-widest hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
                    >
                        <FaPlus size={10} /> NEW ORDER
                    </button>
                </div>
                <ThemedGrid
                    gridClass="fff-grid-orders"
                    rowData={filteredOrders}
                    columnDefs={orderColDefs}
                    defaultColDef={{ flex: 1, minWidth: 100 }}
                    useGridFilter={true}
                    pagination={true}
                    paginationPageSize={10}
                    onRowClicked={(event) => {
                      const order = event.data;
                      // Show action menu for incomplete orders
                      if (order.item_count === 0) {
                        const mouseEvent = event.event as MouseEvent;
                        const target = mouseEvent?.target as HTMLElement;
                        const rect = target?.getBoundingClientRect();
                        setContextMenu({
                          x: rect ? rect.left + rect.width / 2 : mouseEvent?.clientX || 0,
                          y: rect ? rect.bottom + 5 : mouseEvent?.clientY || 0,
                          order: order
                        });
                      } else {
                        // Open modal for orders with items
                        setSelectedOrder(order);
                      }
                    }}
                    rowClass="cursor-pointer transition-colors"
                    getRowStyle={(params) => {
                        if (params.data.item_count === 0) {
                            return { background: 'rgba(239, 68, 68, 0.05)' }; // weak red
                        }
                        return undefined;
                    }}
                />
             </div>
        )}
      </div>

      </div>

      {/* New Order Modal */}
      {showOrderModal && (
          <div className="fixed inset-0 z-999999 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-300" onClick={() => setShowOrderModal(false)}>
               <div className="bg-white dark:bg-boxdark rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                   <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
                        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-widest flex items-center gap-3">
                            <span className="w-1.5 h-6 bg-emerald-500 rounded-full"></span>
                            Initialize New Order Request
                        </h3>
                        <button onClick={() => setShowOrderModal(false)} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all">
                             <FaTimes size={18} />
                        </button>
                   </div>
                   <div className="p-1 flex-1 overflow-y-auto">
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
          <div className="fixed inset-0 z-999999 flex items-center justify-center bg-black/40 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in duration-300" onClick={() => setSelectedOrder(null)}>
               <div className="bg-white dark:bg-boxdark rounded-2xl shadow-2xl w-full max-w-5xl h-[95vh] sm:h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                   <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
                        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-widest flex items-center gap-3">
                            <span className="w-1.5 h-6 bg-blue-500 rounded-full"></span>
                            Order Full Status Tracking
                        </h3>
                        <button onClick={() => setSelectedOrder(null)} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all">
                             <FaTimes size={18} />
                        </button>
                   </div>
                   <div className="p-4 flex-1 overflow-hidden">
                        <OrderDetail 
                            order={selectedOrder} 
                            manpowerList={manpowerList}
                            onClose={() => setSelectedOrder(null)}
                            onUpdate={() => {
                                fetchOrders();
                            }}
                        />
                   </div>
               </div>
          </div>
      )}

      {/* Job Detail Modal */}
      {selectedJob && (
          <div className="fixed inset-0 z-999999 flex items-center justify-center bg-black/40 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in duration-300" onClick={() => setSelectedJob(null)}>
               <div className="bg-white dark:bg-boxdark rounded-2xl shadow-2xl w-full max-w-4xl h-[95vh] sm:h-[90vh] flex flex-col overflow-y-auto animate-in zoom-in-95 duration-200 scrollbar-hide" onClick={e => e.stopPropagation()}>
                   <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
                        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-widest flex items-center gap-3">
                            <span className="w-1.5 h-6 bg-orange-500 rounded-full"></span>
                            Job Progress & Task Execution
                        </h3>
                        <button onClick={() => setSelectedJob(null)} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all">
                             <FaTimes size={18} />
                        </button>
                   </div>
                   <div className="p-4 flex-1">
                        <JobDetail 
                            job={selectedJob} 
                            manpowerList={manpowerList}
                            onUpdate={() => {
                                fetchJobs();
                            }}
                        />
                   </div>
               </div>
          </div>
      )}

      {/* New Job Modal */}
      {showJobModal && (
          <div className="fixed inset-0 z-999999 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-300" onClick={() => setShowJobModal(false)}>
               <div className="bg-white dark:bg-boxdark rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                   <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
                        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-widest flex items-center gap-3">
                            <span className="w-1.5 h-6 bg-blue-500 rounded-full"></span>
                            Initialize New Job Workflow
                        </h3>
                        <button onClick={() => setShowJobModal(false)} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all">
                             <FaTimes size={18} />
                        </button>
                   </div>
                   <div className="p-4 flex-1 overflow-y-auto">
                        <CreateJobForm 
                            jobType={jobModalType}
                            onSuccess={() => {
                                setShowJobModal(false);
                                fetchJobs();
                            }} 
                        />
                   </div>
               </div>
          </div>
      )}

      {/* Context Menu for Incomplete Orders */}
      {contextMenu && (
        <div 
          className="fixed z-[999999] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl py-2 min-w-[160px] animate-in fade-in zoom-in-95 duration-150"
          style={{ 
            left: `${contextMenu.x}px`, 
            top: `${contextMenu.y}px` 
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              setSelectedOrder(contextMenu.order);
              setContextMenu(null);
            }}
            className="w-full px-4 py-2.5 text-left text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex items-center gap-3"
          >
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            Process Order
          </button>
          <div className="h-px bg-slate-100 dark:bg-slate-700 my-1"></div>
          <button
            onClick={() => {
              handleDeleteOrder(contextMenu.order.id);
            }}
            className="w-full px-4 py-2.5 text-left text-sm font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-3"
          >
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            Delete Order
          </button>
        </div>
      )}

      {/* Undo Toast */}
      {undoState && (
        <UndoToast onUndo={handleUndo} />
      )}
    </>
  );
};

const UndoToast = ({ onUndo }: { onUndo: () => void }) => {
    const [seconds, setSeconds] = useState(5);

    useEffect(() => {
        if (seconds <= 0) return;
        const timer = setInterval(() => {
            setSeconds(prev => prev - 1);
        }, 1000);
        return () => clearInterval(timer);
    }, [seconds]);

    return (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-4 z-[999999] animate-in slide-in-from-bottom-5 duration-300 border border-slate-700">
            <div className="flex flex-col">
                <span className="font-bold text-sm">Job Deleted</span>
                <span className="text-xs text-slate-400">Permanently deleting in {seconds}s...</span>
            </div>
            <div className="h-8 w-px bg-slate-700 mx-2"></div>
            <button 
                onClick={onUndo}
                className="text-orange-500 hover:text-orange-400 font-extrabold text-sm tracking-wider transition-colors uppercase"
            >
                UNDO
            </button>
        </div>
    );
};

export default BoardDetail;
