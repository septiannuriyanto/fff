import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DatePickerOne from '../../components/Forms/DatePicker/DatePickerOne';
import { formatDateToString } from '../../Utils/DateUtility';
import ShiftDropdown from '../../components/Forms/SelectGroup/ShiftDropdown';
import ThemedPanelContainer from '../../common/ThemedComponents/ThemedPanelContainer';
import ATRDetail from './common/Modals/ATRDetail';
import RosterDetail from './common/Modals/RosterDetail';
import ContractDetail from './common/Modals/ContractDetail';
import UnitDetail from './common/Modals/UnitDetail';
import StockDetail from './common/Modals/StockDetail';
import ScheduleDetail from './common/Modals/ScheduleDetail';
import BoardDetail from './common/Modals/BoardDetail';
import {
  FaUsers,
  FaTruck,
  FaLayerGroup,
  FaCalendarAlt,
  FaGasPump,
  FaClipboardList,
  FaTools,
  FaFilter,
  FaIdCard,
  FaCalendarCheck,
  FaFileContract,
} from 'react-icons/fa';
import ExcavatorIcon from '../../images/icon/excavator-colored.svg';
import DumpTruckIcon from '../../images/icon/dumptruck-colored.svg';
import BulldozerIcon from '../../images/icon/bulldozer-colored.svg';
import { supabase } from '../../db/SupabaseClient';
import { getShift } from '../../Utils/TimeUtility';
import ReactApexChart from 'react-apexcharts';

const Dashboard = () => {
  const navigate = useNavigate();
  const [date, setDate] = useState<Date | null>(new Date());
  const [shift, setShift] = useState(getShift() === 1);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState<JSX.Element | null>(null);
  const [modalTitle, setModalTitle] = useState('');
  const [rosterStatus, setRosterStatus] = useState({ ok: false, loading: true });
  const [atrStats, setAtrStats] = useState({ ratio: 0, loading: true });
  /* Unit Counts State */
  const [unitCounts, setUnitCounts] = useState({
    total: 0,
    loader: 0,
    hauler: 0,
    support: 0,
    loading: true
  });
  const [stockStats, setStockStats] = useState({
    total_stock: 0,
    total_space: 0,
    fuel_ito: 0,
    mtd_usage: 0,
    achievement_percentage: 0,
    usage_series: [],
    total_ritasi: 0,
    today_ritasi: 0,
    ritasi_series: [],
    loading: true
  });

  const fetchTotalUnits = async () => {
    try {
      setUnitCounts(prev => ({ ...prev, loading: true }));
      
      const { data, error } = await supabase.rpc('get_unit_counts');

      if (error) throw error;

      // Type assertion for the RPC response
      const counts = data as {
        total: number;
        loader: number;
        hauler: number;
        support: number;
      };

      setUnitCounts({
        total: counts.total || 0,
        loader: counts.loader || 0,
        hauler: counts.hauler || 0,
        support: counts.support || 0,
        loading: false
      });
    } catch (err) {
      console.error('Error fetching total units:', err);
      setUnitCounts(prev => ({ ...prev, loading: false }));
    }
  };

  const fetchRosterStatus = async () => {
    try {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;

      const { data, error } = await supabase
        .from('rosters')
        .select('type')
        .eq('year', currentYear)
        .eq('month', currentMonth);

      if (error) throw error;

      const hasOperator = data?.some((r: any) => r.type === 'operator');
      const hasFuelman = data?.some((r: any) => r.type === 'fuelman');
      
      setRosterStatus({ ok: hasOperator && hasFuelman, loading: false });
    } catch (err) {
      console.error('Error fetching roster status:', err);
      setRosterStatus({ ok: false, loading: false });
    }
  };

  const fetchATRStats = async () => {
    try {
      setAtrStats(prev => ({ ...prev, loading: true }));
      const now = date || new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1; // RPC expects 1-based month
      
      const { data, error } = await supabase.rpc('calculate_atr', {
        target_year: year,
        target_month: month,
        target_day: null // null means auto-detect if current month
      });

      if (error) throw error;

      const ratio = data?.ratio || 100;
      setAtrStats({ ratio: ratio, loading: false });
    } catch (err) {
      console.error('Error fetching ATR stats:', err);
      setAtrStats({ ratio: 0, loading: false });
    }
  };

  const fetchStockStats = async () => {
    try {
      setStockStats(prev => ({ ...prev, loading: true }));
      const { data, error } = await supabase.rpc('get_dashboard_stock_stats');

      if (error) throw error;

      setStockStats({
        total_stock: data.total_stock || 0,
        total_space: data.total_space || 0,
        fuel_ito: data.fuel_ito || 0,
        mtd_usage: data.mtd_usage || 0,
        achievement_percentage: data.achievement_percentage || 0,
        usage_series: data.usage_series || [],
        total_ritasi: data.total_ritasi || 0,
        today_ritasi: data.today_ritasi || 0,
        ritasi_series: data.ritasi_series || [],
        loading: false
      });
    } catch (err) {
      console.error('Error fetching stock stats:', err);
      setStockStats(prev => ({ ...prev, loading: false }));
    }
  };

  const handleDateChange = (date: Date | null) => {
    setDate(date);
  };

  const openModal = (title: string, content: JSX.Element) => {
    setModalTitle(title);
    setModalContent(content);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalContent(null);
    
    // Optimized Reload Logic
    if (modalTitle.includes('Roster')) {
        fetchRosterStatus();
    } else if (modalTitle.includes('Attendance') || modalTitle.includes('Compliance')) {
        fetchATRStats();
    } else if (modalTitle.includes('Stock') || modalTitle.includes('Refueling') || modalTitle.includes('Ritasi')) {
        fetchStockStats();
    } else if (modalTitle.includes('Unit') || modalTitle.includes('Readiness')) {
        // fetchTotalUnits(); // Verify if needed, currently not fetched on close
    }
  };

  useEffect(() => {
    fetchRosterStatus();
    fetchATRStats();
    fetchTotalUnits();
    fetchStockStats();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeModal();
      }
    };

    if (modalOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [modalOpen]);

  return (
    <>
    
          {/* ... existing dashboard content ... */}
          <ThemedPanelContainer
            title="Dashboard Overview"
            className=""
            actions={
              <div className="flex flex-row gap-2 w-full sm:w-auto">
                <div className="flex-1 sm:w-auto">
                  <DatePickerOne
                    enabled={true}
                    handleChange={handleDateChange}
                    setValue={date ? formatDateToString(new Date(date)) : ''}
                  />
                </div>
                <div className="flex-1 sm:w-auto">
                  <ShiftDropdown
                    value={shift}
                    onChange={setShift}
                  />
                </div>
              </div>
            }
          >

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {/* Manpower Cluster */}
            <div className="backdrop-blur-2xl bg-white/60 dark:bg-boxdark/60 p-6 rounded-2xl shadow-xl border border-white/50 dark:border-white/10 col-span-1 md:col-span-2 xl:col-span-1 relative overflow-hidden group/card hover:bg-white/70 dark:hover:bg-boxdark/70 hover:shadow-2xl hover:shadow-blue-500/40 transition-all duration-500">
              {/* Decorative Background Element */}
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <FaUsers size={120} />
              </div>

              {/* LIVE Indicator */}
              <div className="absolute top-6 right-6 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 z-20">
                <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-[8px] font-black text-green-600 dark:text-green-400 uppercase tracking-widest">Live</span>
              </div>

              <div className="flex items-center gap-4 mb-6 relative z-10">
                <div className="p-3 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-300 dark:shadow-none">
                  <FaUsers size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-black dark:text-white">
                    Manpower
                  </h2>
                  <p className="text-xs text-gray-500 font-medium">
                    Human Capital Management
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 relative z-10">
                {/* Attendance Item */}
                <button
                  className="w-full flex items-center justify-between p-3 bg-white/40 dark:bg-black/20 backdrop-blur-sm rounded-xl shadow-sm border border-white/40 dark:border-white/5 hover:bg-white/80 dark:hover:bg-black/40 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-500 transition-all duration-300 group"
                  onClick={() =>
                    openModal(
                      'Attendance Management',
                      <ATRDetail date={date} shift={shift} initialTab="detail" />,
                    )
                  }
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                      <FaUsers size={18} />
                    </div>
                    <div className="text-left">
                      <span className="block text-sm font-bold text-black dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        Attendance
                      </span>
                      <span className="block text-[10px] text-gray-400">
                        Daily Tracking
                      </span>
                    </div>
                  </div>
                  {atrStats.loading ? (
                    <div className="w-8 h-4 animate-pulse bg-gray-200 dark:bg-gray-700 rounded"></div>
                  ) : (
                    <div className="px-2.5 py-1 rounded-md bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400 text-xs font-bold border border-green-200 dark:border-green-800">
                      {atrStats.ratio.toFixed(2)}%
                    </div>
                  )}
                </button>

                {/* Roster Item */}
                <button
                  className="w-full flex items-center justify-between p-3 bg-white/40 dark:bg-black/20 backdrop-blur-sm rounded-xl shadow-sm border border-white/40 dark:border-white/5 hover:bg-white/80 dark:hover:bg-black/40 hover:shadow-lg hover:border-orange-300 dark:hover:border-orange-500 transition-all duration-300 group"
                  onClick={() => openModal('Roster Details', <RosterDetail />)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-orange-50 dark:bg-orange-900/50 flex items-center justify-center text-orange-600 dark:text-orange-400 group-hover:bg-orange-600 group-hover:text-white transition-all duration-300">
                      <FaCalendarCheck size={18} />
                    </div>
                    <div className="text-left">
                      <span className="block text-sm font-bold text-black dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                        Roster
                      </span>
                      <span className="block text-[10px] text-gray-400">
                        Shift & Schedule
                      </span>
                    </div>
                  </div>
                {rosterStatus.loading ? (
                  <div className="w-8 h-4 animate-pulse bg-gray-200 dark:bg-gray-700 rounded"></div>
                ) : (
                  <div className={`px-2.5 py-1 rounded-md text-xs font-bold border transition-colors ${
                    rosterStatus.ok 
                      ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800' 
                      : 'bg-red-50 dark:bg-red-900/30 text-red-500 dark:text-red-400 border-red-100 dark:border-red-900/50'
                  }`}>
                    {rosterStatus.ok ? 'OK' : 'NOK'}
                  </div>
                )}
                </button>

                {/* Compliance Item (formerly ATR) */}
                <button
                  className="w-full flex items-center justify-between p-3 bg-white/40 dark:bg-black/20 backdrop-blur-sm rounded-xl shadow-sm border border-white/40 dark:border-white/5 hover:bg-white/80 dark:hover:bg-black/40 hover:shadow-lg hover:border-indigo-300 dark:hover:border-indigo-500 transition-all duration-300 group"
                  onClick={() => openModal('Compliance Details', <ATRDetail date={date} shift={shift} />)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                      <FaIdCard size={18} />
                    </div>
                    <div className="text-left">
                      <span className="block text-sm font-bold text-black dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        Compliance
                      </span>
                      <span className="block text-[10px] text-gray-400">
                        Authority to Report
                      </span>
                    </div>
                  </div>
                  {atrStats.loading ? (
                    <div className="w-8 h-4 animate-pulse bg-gray-200 dark:bg-gray-700 rounded"></div>
                  ) : (
                    <div className="px-2.5 py-1 rounded-md bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400 text-xs font-bold border border-green-200 dark:border-green-800">
                      {atrStats.ratio.toFixed(2)}%
                    </div>
                  )}
                </button>

                {/* Contract Item */}
                <button
                  className="w-full flex items-center justify-between p-3 bg-white/40 dark:bg-black/20 backdrop-blur-sm rounded-xl shadow-sm border border-white/40 dark:border-white/5 hover:bg-white/80 dark:hover:bg-black/40 hover:shadow-lg hover:border-purple-300 dark:hover:border-purple-500 transition-all duration-300 group"
                  onClick={() =>
                    openModal('Contract Details', <ContractDetail />)
                  }
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-900/50 flex items-center justify-center text-purple-600 dark:text-purple-400 group-hover:bg-purple-600 group-hover:text-white transition-all duration-300">
                      <FaFileContract size={18} />
                    </div>
                    <div className="text-left">
                      <span className="block text-sm font-bold text-black dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                        Contract
                      </span>
                      <span className="block text-[10px] text-gray-400">
                        Legal & Employment
                      </span>
                    </div>
                  </div>
                  <div className="px-2.5 py-1 rounded-md bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-400 text-xs font-bold border border-purple-200 dark:border-purple-800">
                    Active
                  </div>
                </button>
              </div>
            </div>

            {/* Unit Cluster */}
            <div
              className="backdrop-blur-2xl bg-white/60 dark:bg-boxdark/60 p-6 rounded-2xl shadow-xl border border-white/50 dark:border-white/10 relative overflow-hidden group/card hover:shadow-2xl hover:shadow-green-500/40 hover:bg-white/70 dark:hover:bg-boxdark/70 transition-all duration-500"
            >
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none transition-transform duration-500 group-hover/card:scale-110">
                <FaTruck size={120} />
              </div>

              {/* LIVE Indicator */}
              <div className="absolute top-6 right-6 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 z-20">
                <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-[8px] font-black text-green-600 dark:text-green-400 uppercase tracking-widest">Live</span>
              </div>
              
              <div className="relative z-10 flex flex-col h-full gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-500 rounded-xl text-white shadow-lg shadow-green-200 dark:shadow-none">
                    <FaTruck size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-black dark:text-white">
                      Unit
                    </h2>
                    <p className="text-xs text-gray-500 font-medium">
                      Fleet Management
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-col gap-3">
                   {/* FT Readiness Graph */}
                   <div 
                      className="p-3 bg-white/60 dark:bg-black/20 rounded-xl backdrop-blur-sm border border-green-100 dark:border-green-800 cursor-pointer hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                      onClick={() => openModal('FT Readiness', <UnitDetail date={date} />)}
                    >
                      <div className="flex justify-between items-end mb-2">
                        <div>
                          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">FT Readiness MTD</div>
                          <div className="text-lg font-bold text-green-600 dark:text-green-400">85%</div>
                        </div>
                        <div className="text-[10px] text-green-500 font-medium">+2.5%</div>
                      </div>
                      <div className="h-10 w-full overflow-hidden">
                         <ReactApexChart
                            options={{
                              chart: {
                                type: 'line',
                                sparkline: { enabled: true },
                                toolbar: { show: false },
                                zoom: { enabled: false },
                                height: 40,
                                parentHeightOffset: 0
                              },
                              stroke: {
                                curve: 'smooth',
                                width: 2,
                                colors: ['#10B981'] // Green-500
                              },
                              tooltip: {
                                enabled: false
                              },
                              title: {
                                text: undefined
                              },
                              grid: {
                                padding: {
                                  top: 5,
                                  bottom: 5,
                                  left: 0,
                                  right: 0
                                }
                              },
                              fill: {
                                opacity: 0.3
                              }
                            }}
                            series={[{
                              name: 'Readiness',
                              data: [65, 75, 70, 80, 82, 85, 85]
                            }]}
                            type="line"
                            height={40}
                            width="100%"
                         />
                      </div>
                   </div>

                   <div 
                      className="flex items-center justify-between p-3 bg-white/60 dark:bg-black/20 rounded-xl backdrop-blur-sm border border-green-100 dark:border-green-800 cursor-pointer hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                      onClick={() => openModal('Total Units', <UnitDetail date={date} />)}
                   >
                      <div className="text-sm font-semibold text-gray-600 dark:text-gray-300">Total Units</div>
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {unitCounts.loading ? '...' : unitCounts.total}
                      </div>
                   </div>

                   {/* Unit Key Metrics */}
                   <div className="grid grid-cols-3 gap-2">
                      <div 
                        className="flex flex-col items-center justify-center p-2 bg-white/60 dark:bg-black/20 rounded-xl backdrop-blur-sm border border-green-100 dark:border-green-800 cursor-pointer hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                        onClick={() => openModal('Loader Units', <UnitDetail date={date} />)}
                      >
                          <div className="mb-1">
                              <img src={ExcavatorIcon} alt="Loader" className="w-8 h-8" />
                          </div>
                          <div className="text-lg font-bold text-gray-800 dark:text-white leading-none">
                            {unitCounts.loading ? '-' : unitCounts.loader}
                          </div>
                          <div className="text-[9px] font-medium text-gray-500 dark:text-gray-400 mt-1">Loader</div>
                      </div>
                      <div 
                        className="flex flex-col items-center justify-center p-2 bg-white/60 dark:bg-black/20 rounded-xl backdrop-blur-sm border border-green-100 dark:border-green-800 cursor-pointer hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                        onClick={() => openModal('Hauler Units', <UnitDetail date={date} />)}
                      >
                          <div className="mb-1">
                              <img src={DumpTruckIcon} alt="Hauler" className="w-8 h-8" />
                          </div>
                          <div className="text-lg font-bold text-gray-800 dark:text-white leading-none">
                             {unitCounts.loading ? '-' : unitCounts.hauler}
                          </div>
                          <div className="text-[9px] font-medium text-gray-500 dark:text-gray-400 mt-1">Hauler</div>
                      </div>
                      <div 
                        className="flex flex-col items-center justify-center p-2 bg-white/60 dark:bg-black/20 rounded-xl backdrop-blur-sm border border-green-100 dark:border-green-800 cursor-pointer hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                        onClick={() => openModal('Support Units', <UnitDetail date={date} />)}
                      >
                          <div className="mb-1">
                              <img src={BulldozerIcon} alt="Support" className="w-8 h-8" />
                          </div>
                          <div className="text-lg font-bold text-gray-800 dark:text-white leading-none">
                             {unitCounts.loading ? '-' : unitCounts.support}
                          </div>
                          <div className="text-[9px] font-medium text-gray-500 dark:text-gray-400 mt-1">Support</div>
                      </div>
                   </div>
                </div>
              </div>
            </div>

            {/* Stock Cluster */}
            <div
              className="backdrop-blur-2xl bg-white/60 dark:bg-boxdark/60 p-6 rounded-2xl shadow-xl border border-white/50 dark:border-white/10 relative overflow-hidden group/card hover:shadow-2xl hover:shadow-yellow-500/40 hover:bg-white/70 dark:hover:bg-boxdark/70 transition-all duration-500"
            >
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none transition-transform duration-500 group-hover/card:scale-110">
                <FaLayerGroup size={120} />
              </div>

              {/* LIVE Indicator */}
              <div className="absolute top-6 right-6 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 z-20">
                <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-[8px] font-black text-green-600 dark:text-green-400 uppercase tracking-widest">Live</span>
              </div>

              <div className="relative z-10 flex flex-col h-full gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-yellow-500 rounded-xl text-white shadow-lg shadow-yellow-200 dark:shadow-none">
                    <FaLayerGroup size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-black dark:text-white">
                      Stock
                    </h2>
                    <p className="text-xs text-gray-500 font-medium">
                      Fuel Inventory
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-col gap-3">
                   {/* Total Stock vs Space Gauge */}
                   <div 
                      className="p-3 bg-white/60 dark:bg-black/20 rounded-xl backdrop-blur-sm border border-yellow-100 dark:border-yellow-800 cursor-pointer hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-colors"
                      onClick={() => openModal('Total Stock', <StockDetail date={date} shift={shift} />)}
                   >
                      <div className="flex justify-between items-end mb-2">
                        <div className="text-xs font-semibold text-gray-600 dark:text-gray-300">Total Stock vs Space</div>
                        <div className="text-sm font-bold text-yellow-600 dark:text-yellow-400">
                          {stockStats.loading ? '...' : (stockStats.total_space > 0 ? Math.round((stockStats.total_stock / stockStats.total_space) * 100) : 0)}%
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                        <div 
                          className="bg-yellow-500 h-2.5 rounded-full transition-all duration-1000" 
                          style={{ width: `${stockStats.loading ? 0 : (stockStats.total_space > 0 ? (stockStats.total_stock / stockStats.total_space) * 100 : 0)}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between mt-1 text-[10px] text-gray-500">
                        <span>Used: {stockStats.loading ? '...' : stockStats.total_stock.toLocaleString('id-ID')} L</span>
                        <span>Cap: {stockStats.loading ? '...' : stockStats.total_space.toLocaleString('id-ID')} L</span>
                      </div>
                   </div>

                   {/* Fuel ITO Item */}
                   <div 
                      className="flex items-center justify-between p-3 bg-white/60 dark:bg-black/20 rounded-xl backdrop-blur-sm border border-yellow-100 dark:border-yellow-800 cursor-pointer hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-colors group"
                      onClick={() => navigate('/stock')}
                   >
                      <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 group-hover:text-yellow-600 transition-colors">Fuel ITO</div>
                      <div className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                        {stockStats.loading ? '...' : stockStats.fuel_ito.toFixed(1)} <span className="text-[10px] font-medium text-gray-400 ml-1">Days</span>
                      </div>
                   </div>

                   {/* Usage Graph */}
                   <div 
                      className="p-3 bg-white/60 dark:bg-black/20 rounded-xl backdrop-blur-sm border border-yellow-100 dark:border-yellow-800 cursor-pointer hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-colors"
                      onClick={() => openModal('Stock Usage', <StockDetail date={date} shift={shift} />)}
                    >
                      <div className="flex justify-between items-end mb-2">
                        <div>
                          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">Usage MTD</div>
                          <div className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                            {stockStats.loading ? '...' : stockStats.mtd_usage.toLocaleString('id-ID')} L
                          </div>
                        </div>
                        <div className={`text-[10px] font-bold ${stockStats.achievement_percentage > 100 ? 'text-red-500' : 'text-green-500'} flex flex-col items-end`}>
                          <span>{stockStats.loading ? '...' : `${stockStats.achievement_percentage.toFixed(1)}% vs plan`}</span>
                          <span className="text-[9px] text-gray-400 font-medium mt-0.5">
                            Avg of {stockStats.loading ? '...' : (stockStats.mtd_usage / new Date().getDate()).toLocaleString('id-ID', { maximumFractionDigits: 0 })} L/Day
                          </span>
                        </div>
                      </div>
                      <div className="h-10 w-full overflow-hidden">
                         <ReactApexChart
                            options={{
                              chart: { type: 'line', sparkline: { enabled: true }, toolbar: { show: false }, zoom: { enabled: false }, height: 40, parentHeightOffset: 0 },
                              stroke: { curve: 'smooth', width: 2, colors: ['#EAB308'] }, // Yellow-500
                              tooltip: { enabled: false },
                              title: { text: undefined },
                              grid: { padding: { top: 5, bottom: 5, left: 0, right: 0 } },
                              fill: { opacity: 0.3 }
                            }}
                            series={[{ name: 'Usage', data: stockStats.loading ? [] : stockStats.usage_series }]}
                            type="line"
                            height={40}
                            width="100%"
                         />
                      </div>
                   </div>

                   {/* Ritasi Graph */}
                   <div 
                      className="p-3 bg-white/60 dark:bg-black/20 rounded-xl backdrop-blur-sm border border-yellow-100 dark:border-yellow-800 cursor-pointer hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-colors group"
                      onClick={() => navigate('/trip')}
                    >
                      <div className="flex justify-between items-end mb-2">
                        <div>
                          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 group-hover:text-yellow-600 transition-colors">Ritasi MTD</div>
                          <div className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                            {stockStats.loading ? '...' : stockStats.total_ritasi}
                          </div>
                        </div>
                        <div className="text-[10px] text-green-500 font-bold">
                          {stockStats.loading ? '...' : `+${stockStats.today_ritasi} trips today`}
                        </div>
                      </div>
                      <div className="h-10 w-full overflow-hidden">
                         <ReactApexChart
                            options={{
                              chart: { type: 'bar', sparkline: { enabled: true }, toolbar: { show: false }, zoom: { enabled: false }, height: 40, parentHeightOffset: 0 },
                              plotOptions: { bar: { borderRadius: 2, columnWidth: '60%' } },
                              colors: ['#EAB308'],
                              tooltip: { enabled: false },
                              title: { text: undefined },
                              grid: { padding: { top: 5, bottom: 5, left: 0, right: 0 } },
                            }}
                            series={[{ name: 'Ritasi', data: stockStats.loading ? [] : stockStats.ritasi_series }]}
                            type="bar"
                            height={40}
                            width="100%"
                         />
                      </div>
                   </div>
                </div>
              </div>
            </div>

            {/* Schedule Cluster */}
            <div className="backdrop-blur-2xl bg-white/60 dark:bg-boxdark/60 p-6 rounded-2xl shadow-xl border border-white/50 dark:border-white/10 col-span-1 md:col-span-2 xl:col-span-1 relative overflow-hidden group/card hover:bg-white/70 dark:hover:bg-boxdark/70 hover:shadow-2xl hover:shadow-purple-500/40 transition-all duration-500">
              {/* Decorative Background Element */}
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <FaCalendarAlt size={120} />
              </div>

              <div className="flex items-center gap-4 mb-6 relative z-10">
                <div className="p-3 bg-purple-600 rounded-xl text-white shadow-lg shadow-purple-300 dark:shadow-none">
                  <FaCalendarAlt size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-black dark:text-white">
                    Schedule
                  </h2>
                   <p className="text-xs text-gray-500 font-medium">
                    Operations Planner
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 relative z-10">
                {/* Refueling Item */}
                <button
                  className="w-full flex items-center justify-between p-3 bg-white/40 dark:bg-black/20 backdrop-blur-sm rounded-xl shadow-sm border border-white/40 dark:border-white/5 hover:bg-white/80 dark:hover:bg-black/40 hover:shadow-lg hover:border-pink-300 dark:hover:border-pink-500 transition-all duration-300 group"
                  onClick={() =>
                    openModal(
                      'Refueling Schedule',
                      <ScheduleDetail type="refueling" />,
                    )
                  }
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-pink-50 dark:bg-pink-900/50 flex items-center justify-center text-pink-600 dark:text-pink-400 group-hover:bg-pink-600 group-hover:text-white transition-all duration-300">
                      <FaGasPump size={18} />
                    </div>
                    <div className="text-left">
                      <span className="block text-sm font-bold text-black dark:text-white group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors">
                        Refueling
                      </span>
                      <span className="block text-[10px] text-gray-400">
                        Daily Intake
                      </span>
                    </div>
                  </div>
                  <div className="px-2.5 py-1 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[10px] font-bold border border-gray-200 dark:border-gray-600">
                    Daily
                  </div>
                </button>

                {/* Daily Check Item */}
                <button
                  className="w-full flex items-center justify-between p-3 bg-white/40 dark:bg-black/20 backdrop-blur-sm rounded-xl shadow-sm border border-white/40 dark:border-white/5 hover:bg-white/80 dark:hover:bg-black/40 hover:shadow-lg hover:border-purple-300 dark:hover:border-purple-500 transition-all duration-300 group"
                  onClick={() =>
                    openModal(
                      'Daily Check Schedule',
                      <ScheduleDetail type="dailycheck" />,
                    )
                  }
                >
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-900/50 flex items-center justify-center text-purple-600 dark:text-purple-400 group-hover:bg-purple-600 group-hover:text-white transition-all duration-300">
                      <FaClipboardList size={18} />
                    </div>
                    <div className="text-left">
                      <span className="block text-sm font-bold text-black dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                        Daily Check
                      </span>
                      <span className="block text-[10px] text-gray-400">
                        Safety Inspection
                      </span>
                    </div>
                  </div>
                  <div className="px-2.5 py-1 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[10px] font-bold border border-gray-200 dark:border-gray-600">
                    Daily
                  </div>
                </button>

                {/* Service Item */}
                <button
                  className="w-full flex items-center justify-between p-3 bg-white/40 dark:bg-black/20 backdrop-blur-sm rounded-xl shadow-sm border border-white/40 dark:border-white/5 hover:bg-white/80 dark:hover:bg-black/40 hover:shadow-lg hover:border-indigo-300 dark:hover:border-indigo-500 transition-all duration-300 group"
                  onClick={() =>
                    openModal('Service Schedule', <ScheduleDetail type="service" />)
                  }
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                      <FaTools size={18} />
                    </div>
                    <div className="text-left">
                      <span className="block text-sm font-bold text-black dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        Service
                      </span>
                      <span className="block text-[10px] text-gray-400">
                        Maintenance
                      </span>
                    </div>
                  </div>
                  <div className="px-2.5 py-1 rounded-md bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-400 text-[10px] font-bold border border-orange-200 dark:border-orange-800">
                    Pending
                  </div>
                </button>

                {/* Filter Change Item */}
                <button
                  className="w-full flex items-center justify-between p-3 bg-white/40 dark:bg-black/20 backdrop-blur-sm rounded-xl shadow-sm border border-white/40 dark:border-white/5 hover:bg-white/80 dark:hover:bg-black/40 hover:shadow-lg hover:border-green-300 dark:hover:border-green-500 transition-all duration-300 group"
                  onClick={() =>
                    openModal(
                      'Filter Change Schedule',
                      <ScheduleDetail type="filterchange" />,
                    )
                  }
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-red-50 dark:bg-red-900/50 flex items-center justify-center text-red-600 dark:text-red-400 group-hover:bg-red-600 group-hover:text-white transition-all duration-300">
                      <FaFilter size={18} />
                    </div>
                    <div className="text-left">
                      <span className="block text-sm font-bold text-black dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                        Filter Change
                      </span>
                      <span className="block text-[10px] text-gray-400">
                        Replacement
                      </span>
                    </div>
                  </div>
                  <div className="px-2.5 py-1 rounded-md bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400 text-[10px] font-bold border border-green-200 dark:border-green-800">
                    Done
                  </div>
                </button>
              </div>
            </div>

            {/* Board Cluster has been moved down */}
          </div>
          
            <div className="my-6">
              <BoardDetail />
            </div>
          </ThemedPanelContainer>
      

      {modalOpen && (
        <div 
          className="fixed inset-0 z-999999 flex items-center justify-center bg-black bg-opacity-50 p-4"
          onClick={closeModal}
        >
           {/* Modal Container */}
          <div 
            className="bg-white dark:bg-boxdark rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-semibold text-black dark:text-white">
                {modalTitle}
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  ></path>
                </svg>
              </button>
            </div>
            {/* Modal Content */}
            <div className="p-4 overflow-y-auto flex-1">
              {modalContent}
            </div>
             {/* Modal Footer (Optional) */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                 <button
                    onClick={closeModal}
                    className="px-4 py-2 bg-primary text-white rounded hover:bg-opacity-90"
                 >
                     Close
                 </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Dashboard;
