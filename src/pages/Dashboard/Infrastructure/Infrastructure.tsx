import React, { useState, useEffect} from 'react'
import PressurelessSummary from './PressurelessSummary'
import { supabase } from '../../../db/SupabaseClient'
import { Session } from '@supabase/supabase-js';
import FilterChange from './FilterChange';
import FuelTruckBacklog from './FuelTruckBacklog/FuelTruckBacklog';
import { 
  FaServer, 
  FaClipboardCheck, 
  FaTachometerAlt, 
  FaFilter,
  FaListUl,
  FaHistory,
  FaCalendarCheck,
  FaShieldAlt,
  FaTruckLoading,
  FaBroadcastTower,
  FaTools,
  FaCalendarAlt
} from 'react-icons/fa';

const Infrastructure = () => {
  const [session, setSession] = useState<Session | null>(null);
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
      } catch (error) {
        console.error('Error fetching session:', error);
      }
    };

    fetchSession();
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-title-md2 font-bold text-black dark:text-white w-full">
        Infrastructure Dashboard
      </h2>

      {/* Main Cluster Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        
        {/* 1. Asset Management Cluster */}
        <div className="backdrop-blur-2xl bg-white/60 dark:bg-boxdark/60 p-6 rounded-2xl shadow-xl border border-white/50 dark:border-white/10 relative overflow-hidden group/card hover:bg-white/70 dark:hover:bg-boxdark/70 hover:shadow-2xl hover:shadow-blue-500/40 transition-all duration-500">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none transition-transform duration-500 group-hover/card:scale-110">
            <FaServer size={120} />
          </div>

          <div className="flex items-center gap-4 mb-6 relative z-10">
            <div className="p-3 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-300 dark:shadow-none">
              <FaServer size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-black dark:text-white">
                Asset Management
              </h2>
              <p className="text-xs text-gray-500 font-medium">
                Infrastructure Tracking
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 relative z-10">
            {/* Dummy Item 1 */}
            <button className="w-full flex items-center justify-between p-3 bg-white/40 dark:bg-black/20 backdrop-blur-sm rounded-xl shadow-sm border border-white/40 dark:border-white/5 hover:bg-white/80 dark:hover:bg-black/40 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-500 transition-all duration-300 group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                  <FaListUl size={18} />
                </div>
                <div className="text-left">
                  <span className="block text-sm font-bold text-black dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    Asset List
                  </span>
                  <span className="block text-[10px] text-gray-400">Inventory & Status</span>
                </div>
              </div>
              <div className="px-2.5 py-1 rounded-md bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 text-xs font-bold border border-blue-200 dark:border-blue-800">
                124 Active
              </div>
            </button>

            {/* Dummy Item 2 */}
            <button className="w-full flex items-center justify-between p-3 bg-white/40 dark:bg-black/20 backdrop-blur-sm rounded-xl shadow-sm border border-white/40 dark:border-white/5 hover:bg-white/80 dark:hover:bg-black/40 hover:shadow-lg hover:border-indigo-300 dark:hover:border-indigo-500 transition-all duration-300 group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                  <FaHistory size={18} />
                </div>
                <div className="text-left">
                  <span className="block text-sm font-bold text-black dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    History
                  </span>
                  <span className="block text-[10px] text-gray-400">Maintenance Logs</span>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* 2. Inspection Cluster */}
        <div className="backdrop-blur-2xl bg-white/60 dark:bg-boxdark/60 p-6 rounded-2xl shadow-xl border border-white/50 dark:border-white/10 relative overflow-hidden group/card hover:bg-white/70 dark:hover:bg-boxdark/70 hover:shadow-2xl hover:shadow-orange-500/40 transition-all duration-500">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none transition-transform duration-500 group-hover/card:scale-110">
            <FaClipboardCheck size={120} />
          </div>

          <div className="flex items-center gap-4 mb-6 relative z-10">
            <div className="p-3 bg-orange-500 rounded-xl text-white shadow-lg shadow-orange-300 dark:shadow-none">
              <FaClipboardCheck size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-black dark:text-white">
                Inspection
              </h2>
              <p className="text-xs text-gray-500 font-medium">
                Quality & Safety
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 relative z-10">
            {/* Dummy Item 1 */}
            <button className="w-full flex items-center justify-between p-3 bg-white/40 dark:bg-black/20 backdrop-blur-sm rounded-xl shadow-sm border border-white/40 dark:border-white/5 hover:bg-white/80 dark:hover:bg-black/40 hover:shadow-lg hover:border-orange-300 dark:hover:border-orange-500 transition-all duration-300 group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-50 dark:bg-orange-900/50 flex items-center justify-center text-orange-600 dark:text-orange-400 group-hover:bg-orange-600 group-hover:text-white transition-all duration-300">
                  <FaCalendarCheck size={18} />
                </div>
                <div className="text-left">
                  <span className="block text-sm font-bold text-black dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                    Daily Check
                  </span>
                  <span className="block text-[10px] text-gray-400">Routine Audits</span>
                </div>
              </div>
              <div className="px-2.5 py-1 rounded-md bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400 text-[10px] font-bold border border-green-200 dark:border-green-800">
                100%
              </div>
            </button>

            {/* Dummy Item 2 */}
            <button className="w-full flex items-center justify-between p-3 bg-white/40 dark:bg-black/20 backdrop-blur-sm rounded-xl shadow-sm border border-white/40 dark:border-white/5 hover:bg-white/80 dark:hover:bg-black/40 hover:shadow-lg hover:border-red-300 dark:hover:border-red-500 transition-all duration-300 group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-50 dark:bg-red-900/50 flex items-center justify-center text-red-600 dark:text-red-400 group-hover:bg-red-600 group-hover:text-white transition-all duration-300">
                  <FaShieldAlt size={18} />
                </div>
                <div className="text-left">
                  <span className="block text-sm font-bold text-black dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                    Safety Records
                  </span>
                  <span className="block text-[10px] text-gray-400">Incident Tracking</span>
                </div>
              </div>
              <div className="px-2.5 py-1 rounded-md bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-400 text-[10px] font-bold border border-orange-200 dark:border-orange-800">
                2 Actions
              </div>
            </button>
          </div>
        </div>

        {/* 3. Pressureless Management Cluster */}
        <div className="backdrop-blur-2xl bg-white/60 dark:bg-boxdark/60 p-6 rounded-2xl shadow-xl border border-white/50 dark:border-white/10 relative overflow-hidden group/card hover:bg-white/70 dark:hover:bg-boxdark/70 hover:shadow-2xl hover:shadow-green-500/40 transition-all duration-500">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none transition-transform duration-500 group-hover/card:scale-110">
            <FaTachometerAlt size={120} />
          </div>

          <div className="flex items-center gap-4 mb-6 relative z-10">
            <div className="p-3 bg-green-500 rounded-xl text-white shadow-lg shadow-green-300 dark:shadow-none">
              <FaTachometerAlt size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-black dark:text-white">
                Pressureless
              </h2>
              <p className="text-xs text-gray-500 font-medium">
                Refueling Systems
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 relative z-10">
            {/* Dummy Item 1 */}
            <button className="w-full flex items-center justify-between p-3 bg-white/40 dark:bg-black/20 backdrop-blur-sm rounded-xl shadow-sm border border-white/40 dark:border-white/5 hover:bg-white/80 dark:hover:bg-black/40 hover:shadow-lg hover:border-green-300 dark:hover:border-green-500 transition-all duration-300 group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-50 dark:bg-green-900/50 flex items-center justify-center text-green-600 dark:text-green-400 group-hover:bg-green-600 group-hover:text-white transition-all duration-300">
                  <FaTruckLoading size={18} />
                </div>
                <div className="text-left">
                  <span className="block text-sm font-bold text-black dark:text-white group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                    Unit Summary
                  </span>
                  <span className="block text-[10px] text-gray-400">Installations</span>
                </div>
              </div>
              <div className="px-2.5 py-1 rounded-md bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400 text-xs font-bold border border-green-200 dark:border-green-800">
                89 Units
              </div>
            </button>

            {/* Dummy Item 2 */}
            <button className="w-full flex items-center justify-between p-3 bg-white/40 dark:bg-black/20 backdrop-blur-sm rounded-xl shadow-sm border border-white/40 dark:border-white/5 hover:bg-white/80 dark:hover:bg-black/40 hover:shadow-lg hover:border-emerald-300 dark:hover:border-emerald-500 transition-all duration-300 group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300">
                  <FaBroadcastTower size={18} />
                </div>
                <div className="text-left">
                  <span className="block text-sm font-bold text-black dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    Live Sensors
                  </span>
                  <span className="block text-[10px] text-gray-400">Telemetry Data</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-emerald-500/20">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Live</span>
              </div>
            </button>
          </div>
        </div>

        {/* 4. Filtration Cluster */}
        <div className="backdrop-blur-2xl bg-white/60 dark:bg-boxdark/60 p-6 rounded-2xl shadow-xl border border-white/50 dark:border-white/10 relative overflow-hidden group/card hover:bg-white/70 dark:hover:bg-boxdark/70 hover:shadow-2xl hover:shadow-rose-500/40 transition-all duration-500">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none transition-transform duration-500 group-hover/card:scale-110">
            <FaFilter size={120} />
          </div>

          <div className="flex items-center gap-4 mb-6 relative z-10">
            <div className="p-3 bg-rose-500 rounded-xl text-white shadow-lg shadow-rose-300 dark:shadow-none">
              <FaFilter size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-black dark:text-white">
                Filtration
              </h2>
              <p className="text-xs text-gray-500 font-medium">
                Particulate Control
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 relative z-10">
            {/* Dummy Item 1 */}
            <button className="w-full flex items-center justify-between p-3 bg-white/40 dark:bg-black/20 backdrop-blur-sm rounded-xl shadow-sm border border-white/40 dark:border-white/5 hover:bg-white/80 dark:hover:bg-black/40 hover:shadow-lg hover:border-rose-300 dark:hover:border-rose-500 transition-all duration-300 group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-rose-50 dark:bg-rose-900/50 flex items-center justify-center text-rose-600 dark:text-rose-400 group-hover:bg-rose-600 group-hover:text-white transition-all duration-300">
                  <FaTools size={18} />
                </div>
                <div className="text-left">
                  <span className="block text-sm font-bold text-black dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                    Filter Status
                  </span>
                  <span className="block text-[10px] text-gray-400">Current Health</span>
                </div>
              </div>
               <div className="px-2.5 py-1 rounded-md bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-400 text-[10px] font-bold border border-yellow-200 dark:border-yellow-800">
                Warning
              </div>
            </button>

            {/* Dummy Item 2 */}
            <button className="w-full flex items-center justify-between p-3 bg-white/40 dark:bg-black/20 backdrop-blur-sm rounded-xl shadow-sm border border-white/40 dark:border-white/5 hover:bg-white/80 dark:hover:bg-black/40 hover:shadow-lg hover:border-pink-300 dark:hover:border-pink-500 transition-all duration-300 group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-pink-50 dark:bg-pink-900/50 flex items-center justify-center text-pink-600 dark:text-pink-400 group-hover:bg-pink-600 group-hover:text-white transition-all duration-300">
                  <FaCalendarAlt size={18} />
                </div>
                <div className="text-left">
                  <span className="block text-sm font-bold text-black dark:text-white group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors">
                    Change Schedule
                  </span>
                  <span className="block text-[10px] text-gray-400">Upcoming Servicing</span>
                </div>
              </div>
            </button>
          </div>
        </div>

      </div>

      {/* Legacy/Existing Components below */}
      <div className="mt-8 flex flex-col gap-6">
        <FuelTruckBacklog/>
        <PressurelessSummary allowColumnsEdit={session == null}/>
        <FilterChange></FilterChange>
      </div>

    </div>
  )
}

export default Infrastructure
