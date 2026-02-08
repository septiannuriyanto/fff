import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../../db/SupabaseClient';
import { FaPlus, FaTimes } from 'react-icons/fa';
import OutstandingOrder from './OutstandingOrder';
import OrderDetail from './OrderDetail';
import JobDetail from './JobDetail';
import CreateJobForm from './CreateJobForm';
import { AgGridReact } from 'ag-grid-react'; // React Data Grid Component
import "ag-grid-community/styles/ag-grid.css"; // Mandatory CSS required by the grid
import "ag-grid-community/styles/ag-theme-quartz.css"; // Optional Theme applied to the grid

// Custom CSS for AG Grid pagination responsive
const agGridMobileStyle = `
  @media (max-width: 600px) {
    .ag-theme-quartz .ag-paging-panel {
      font-size: 12px;
      padding: 4px 2px;
      flex-wrap: wrap;
      gap: 4px;
      display: flex !important;
      justify-content: center !important;
      align-items: center !important;
      width: 100% !important;
      text-align: center !important;
    }
    .ag-theme-quartz .ag-paging-page-size, 
    .ag-theme-quartz .ag-paging-row-summary-panel {
      display: none !important;
    }
    .ag-theme-quartz .ag-paging-button {
      min-width: 24px;
      height: 24px;
      font-size: 12px;
      padding: 0 4px;
    }
  }
`;

import { ColDef } from 'ag-grid-community';

interface Job {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'progress' | 'closed';
  assignee_id: string | null;
  due_date: string | null;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' | null;
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
  // Inject custom style for AG Grid mobile pagination
  useEffect(() => {
    if (typeof window !== 'undefined') {
      let styleTag = document.getElementById('agGridMobileStyle');
      if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = 'agGridMobileStyle';
        styleTag.innerHTML = agGridMobileStyle;
        document.head.appendChild(styleTag);
      }
    }
  }, []);
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

  // Job Column Definitions
  const jobColDefs = useMemo<ColDef[]>(() => [
    { field: 'title', headerName: 'Job Title', width: 200, flex: 0 },
    { field: 'description', headerName: 'Description', flex: 1, minWidth: 250 },
    { 
       field: 'assignee_id', 
       headerName: 'Assignee', 
       width: 150,
       valueFormatter: (params) => {
           const mp = manpowerList.find(m => m.nrp === params.value);
           return mp ? mp.nama : params.value;
       }
    },
    { 
        field: 'priority', 
        headerName: 'Priority', 
        width: 100,
        cellRenderer: (params: any) => (
            <span className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase
                ${params.value === 'urgent' ? 'bg-red-100 text-red-600' : 
                  params.value === 'high' ? 'bg-orange-100 text-orange-600' : 
                  params.value === 'low' ? 'bg-slate-100 text-slate-500' :
                  'bg-blue-100 text-blue-600'}`}>
                {params.value || 'normal'}
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
        width: 120,
        valueFormatter: (params) => params.value ? new Date(params.value).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }) : '-'
    },
    {
        headerName: 'Progress',
        width: 130,
        cellRenderer: (params: any) => {
            const total = params.data.progress_count || 0;
            const closed = params.data.completed_count || 0;
            const percent = total > 0 ? Math.round((closed / total) * 100) : 0;
            return (
                <div className="flex items-center gap-2 h-full">
                    <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 transition-all" style={{ width: `${percent}%` }} />
                    </div>
                    <span className="text-[10px] font-bold text-gray-500">{percent}%</span>
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

  const handleDeleteOrder = async (orderId: number) => {
    if (!confirm('Are you sure you want to delete this order? This action cannot be undone.')) {
      return;
    }

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
    <div className="flex flex-col h-full bg-white dark:bg-boxdark rounded-lg shadow-default border border-stroke dark:border-strokedark p-4">
       <h2 className="text-xl font-bold mb-4 text-black dark:text-white uppercase tracking-widest">Board Overview</h2>
      
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4 overflow-x-auto scrollbar-hide">
        <button
          className={`py-2 px-4 text-sm font-bold focus:outline-none flex items-center gap-2 transition-all uppercase tracking-wider ${
            activeTab === 'pending'
              ? 'text-orange-600 border-b-2 border-orange-600 dark:text-orange-400 dark:border-orange-400'
              : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
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
              : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
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

            <div className="flex-1 overflow-hidden bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-1">
              <div className="ag-theme-quartz" style={{ height: '100%', width: '100%' }}>
                  <AgGridReact
                      rowData={pendingJobs}
                      columnDefs={jobColDefs}
                      defaultColDef={{ flex: 1, minWidth: 100 }}
                      pagination={true}
                      paginationPageSize={10}
                      onRowClicked={(event) => setSelectedJob(event.data)}
                      rowClass="cursor-pointer transition-colors"
                  />
              </div>
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
                <div className="flex-1 overflow-hidden bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-1">
                    <div className="ag-theme-quartz" style={{ height: '100%', width: '100%' }}>
                        <AgGridReact
                            rowData={filteredOrders}
                            columnDefs={orderColDefs}
                            defaultColDef={{ flex: 1, minWidth: 100 }}
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
                </div>
             </div>
        )}
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
               <div className="bg-white dark:bg-boxdark rounded-2xl shadow-2xl w-full max-w-5xl h-[95vh] sm:h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                   <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
                        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-widest flex items-center gap-3">
                            <span className="w-1.5 h-6 bg-orange-500 rounded-full"></span>
                            Job Progress & Task Execution
                        </h3>
                        <button onClick={() => setSelectedJob(null)} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all">
                             <FaTimes size={18} />
                        </button>
                   </div>
                   <div className="p-4 flex-1 overflow-hidden">
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
    </div>
  );
};

export default BoardDetail;
