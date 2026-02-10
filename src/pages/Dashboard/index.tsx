import { useState, useEffect } from 'react';
import DatePickerOne from '../../components/Forms/DatePicker/DatePickerOne';
import { formatDateToString } from '../../Utils/DateUtility';
import ReusableSwitcher from '../../components/Switchers/SwitcherFour';
import ATRDetail from './Dashboard/ATRDetail';
import RosterDetail from './Dashboard/RosterDetail';
import ContractDetail from './Dashboard/ContractDetail';
import UnitDetail from './Dashboard/UnitDetail';
import StockDetail from './Dashboard/StockDetail';
import ScheduleDetail from './Dashboard/ScheduleDetail';
import BoardDetail from './Dashboard/BoardDetail';
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
import { supabase } from '../../db/SupabaseClient';
import { getShift } from '../../Utils/TimeUtility';

const Dashboard = () => {
  const [date, setDate] = useState<Date | null>(new Date());
  const [shift, setShift] = useState(getShift() === 1);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState<JSX.Element | null>(null);
  const [modalTitle, setModalTitle] = useState('');
  const [rosterStatus, setRosterStatus] = useState({ ok: false, loading: true });
  const [atrStats, setAtrStats] = useState({ ratio: 0, loading: true });

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
      const month = now.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const firstDay = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const lastDayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

      // 1. Get all relevant manpower NRPs
      const { data: mpData } = await supabase
        .from('manpower')
        .select('nrp')
        .in('position', [2, 3, 4, 5])
        .eq('active', true);
      
      const mpNrps = mpData?.map(m => m.nrp) || [];
      
      if (mpNrps.length === 0) {
        setAtrStats({ ratio: 100, loading: false });
        return;
      }

      // 2. Get attendance records for this month
      const { data: attData, error: attError } = await supabase
        .from('attendance')
        .select('is_sick, is_leave, is_alpha, is_late, is_early_leave, is_present')
        .gte('work_date', firstDay)
        .lte('work_date', lastDayStr)
        .in('nrp', mpNrps);

      if (attError) throw attError;

      // 3. Logic for days to count:
      // If it's the current month, count until today. Otherwise count the whole month.
      const today = new Date();
      const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
      const daysToCount = isCurrentMonth ? today.getDate() : daysInMonth;

      const totalPlanned = mpNrps.length * daysToCount;
      
      // Deduct only specific statuses
      const deductions = attData?.filter(a => 
        a.is_sick || a.is_leave || a.is_alpha || a.is_late || a.is_early_leave
      ).length || 0;
      
      const ratio = totalPlanned > 0 ? ((totalPlanned - deductions) / totalPlanned) * 100 : 100;
      setAtrStats({ ratio: ratio, loading: false });
    } catch (err) {
      console.error('Error fetching ATR stats:', err);
      setAtrStats({ ratio: 0, loading: false });
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
    fetchRosterStatus();
    fetchATRStats();
  };

  useEffect(() => {
    fetchRosterStatus();
    fetchATRStats();
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
      <div className="border-b border-stroke bg-white dark:border-strokedark dark:bg-boxdark">
        <div className="p-4 md:p-6 pb-2">
          {/* ... existing dashboard content ... */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <h1 className="text-2xl font-bold text-black dark:text-white">
              Dashboard Overview
            </h1>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="w-full sm:w-auto">
                <DatePickerOne
                  enabled={true}
                  handleChange={handleDateChange}
                  setValue={date ? formatDateToString(new Date(date)) : ''}
                />
              </div>
              <div className="w-full sm:w-auto">
                 <ReusableSwitcher
                  textTrue="Shift 1"
                  textFalse="Shift 2"
                  value={shift}
                  onChange={() => {
                    setShift(!shift);
                  }}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {/* Manpower Cluster */}
            {/* Manpower Cluster */}
            <div className="backdrop-blur-2xl bg-white/60 dark:bg-boxdark/60 p-6 rounded-2xl shadow-xl border border-white/50 dark:border-white/10 col-span-1 md:col-span-2 xl:col-span-1 relative overflow-hidden group/card hover:bg-white/70 dark:hover:bg-boxdark/70 hover:shadow-2xl hover:shadow-blue-500/40 transition-all duration-500">
              {/* Decorative Background Element */}
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <FaUsers size={120} />
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
              className="backdrop-blur-2xl bg-white/60 dark:bg-boxdark/60 p-6 rounded-2xl shadow-xl border border-white/50 dark:border-white/10 relative overflow-hidden group/card hover:shadow-2xl hover:shadow-green-500/40 hover:bg-white/70 dark:hover:bg-boxdark/70 transition-all duration-500 cursor-pointer"
              onClick={() =>
                openModal('Unit Status', <UnitDetail date={date} />)
              }
            >
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none transition-transform duration-500 group-hover/card:scale-110">
                <FaTruck size={120} />
              </div>
              
              <div className="relative z-10 flex flex-col h-full justify-between">
                <div className="flex items-center gap-4 mb-4">
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
                
                <div className="mt-4">
                   <div className="flex items-center justify-between p-3 bg-white/60 dark:bg-black/20 rounded-xl backdrop-blur-sm border border-green-100 dark:border-green-800">
                      <div className="text-sm font-semibold text-gray-600 dark:text-gray-300">Total Units</div>
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">42</div>
                   </div>
                   <div className="mt-2 text-xs text-center text-green-600 dark:text-green-400 font-medium flex items-center justify-center gap-1">
                      View Details 
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                   </div>
                </div>
              </div>
            </div>

            {/* Stock Cluster */}
            <div
              className="backdrop-blur-2xl bg-white/60 dark:bg-boxdark/60 p-6 rounded-2xl shadow-xl border border-white/50 dark:border-white/10 relative overflow-hidden group/card hover:shadow-2xl hover:shadow-yellow-500/40 hover:bg-white/70 dark:hover:bg-boxdark/70 transition-all duration-500 cursor-pointer"
              onClick={() =>
                openModal(
                  'Stock Overview',
                  <StockDetail date={date} shift={shift} />,
                )
              }
            >
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none transition-transform duration-500 group-hover/card:scale-110">
                <FaLayerGroup size={120} />
              </div>

              <div className="relative z-10 flex flex-col h-full justify-between">
                <div className="flex items-center gap-4 mb-4">
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
                
                <div className="mt-4">
                   <div className="flex items-center justify-between p-3 bg-white/60 dark:bg-black/20 rounded-xl backdrop-blur-sm border border-yellow-100 dark:border-yellow-800">
                      <div className="text-sm font-semibold text-gray-600 dark:text-gray-300">Status</div>
                      <div className="px-2 py-0.5 rounded bg-green-100 text-green-700 text-xs font-bold">Safe</div>
                   </div>
                    <div className="mt-2 text-xs text-center text-yellow-600 dark:text-yellow-400 font-medium flex items-center justify-center gap-1">
                      View Inventory 
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                   </div>
                </div>
              </div>
            </div>

            {/* Schedule Cluster */}
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
          
          <div className="mt-6">
            <BoardDetail />
          </div>
        </div>
      </div>

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
