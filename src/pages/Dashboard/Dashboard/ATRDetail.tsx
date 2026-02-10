import { useState, useEffect, useMemo, Fragment } from 'react';
import { supabase } from '../../../db/SupabaseClient';
import ManpowerDetail from './ManpowerDetail';
import { FaChartBar, FaEdit, FaCalendarAlt } from 'react-icons/fa';
import { useAuth } from '../../Authentication/AuthContext';

interface ATRDetailProps {
  date: Date | null;
  shift: boolean;
  initialTab?: 'detail' | 'recording';
}

const ATRDetail = ({ date, shift, initialTab = 'detail' }: ATRDetailProps) => {
  const { currentUser } = useAuth();
  
  // Use explicit check to avoid Number(null) === 0 pitfall
  const canRecord = currentUser?.position !== null && currentUser?.position !== undefined && 
                    (Number(currentUser.position) === 0 || Number(currentUser.position) === 1);
  
  const [activeTab, setActiveTab] = useState<'detail' | 'recording'>(initialTab);
  const [manpower, setManpower] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState<{ note: string; x: number; y: number } | null>(null);
  const [prefillData, setPrefillData] = useState<{ manpower: any; date: Date } | null>(null);

  const currentYear = date ? date.getFullYear() : new Date().getFullYear();
  const currentMonth = date ? date.getMonth() : new Date().getMonth();

  // Create array of dates for the current month
  const monthDates = useMemo(() => {
    const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
    return Array.from({ length: lastDay }, (_, i) => i + 1);
  }, [currentYear, currentMonth]);

  useEffect(() => {
    if (activeTab === 'detail') {
      fetchMonthData();
    }
  }, [activeTab, currentYear, currentMonth, date]);

  const fetchMonthData = async () => {
    setLoading(true);
    try {
      // 1. Fetch relevant manpower with incumbent join
      const { data: mpData } = await supabase
        .from('manpower')
        .select('nrp, nama, position, incumbent!manpower_position_fkey ( incumbent )')
        .in('position', [2, 3, 4, 5])
        .eq('active', true)
        .order('position', { ascending: true });

      const mappedMp = (mpData || []).map((item: any) => ({
        ...item,
        incumbentDesc: item.incumbent?.incumbent || 'Unassigned'
      }));
      setManpower(mappedMp);

      // 2. Fetch monthly attendance
      const startDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
      const endDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      const { data: attData } = await supabase
        .from('attendance')
        .select('nrp, work_date, note, is_sick, is_leave, is_alpha, is_late, is_early_leave, is_present')
        .gte('work_date', startDate)
        .lte('work_date', endDate)
        .in('nrp', mappedMp.map(m => m.nrp));

      setAttendance(attData || []);
    } catch (error) {
      console.error('Error fetching month data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAtrForGroup = (nrps: string[]) => {
    const groupAtt = attendance.filter(a => nrps.includes(a.nrp));
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === currentYear && today.getMonth() === currentMonth;
    const daysToCount = isCurrentMonth ? today.getDate() : monthDates.length;
    
    const planned = nrps.length * daysToCount;
    // S, I, A, T, P are deductibles
    const deductions = groupAtt.filter(a => a.is_sick || a.is_leave || a.is_alpha || a.is_late || a.is_early_leave).length;
    
    return planned > 0 ? ((planned - deductions) / planned) * 100 : 100;
  };

  const groupedManpower = useMemo(() => {
    const groups: { [key: string]: any[] } = {};
    manpower.forEach(mp => {
      const g = mp.incumbentDesc;
      if (!groups[g]) groups[g] = [];
      groups[g].push(mp);
    });
    return groups;
  }, [manpower]);

  const handleGridDoubleClick = (mp: any, day: number) => {
    if (!canRecord) {
      import('sweetalert2').then(Swal => {
        Swal.default.fire({
          icon: 'error',
          title: 'Access Denied',
          text: 'You do not have permission to record attendance. (Position: ' + (currentUser?.position ?? 'N/A') + ')',
          toast: true,
          position: 'top-right',
          showConfirmButton: false,
          timer: 3000
        });
      });
      return;
    }
    const selectedDate = new Date(currentYear, currentMonth, day);
    setPrefillData({
      manpower: mp,
      date: selectedDate
    });
    setActiveTab('recording');
  };

  const stats = useMemo(() => {
    const allNrps = manpower.map(m => m.nrp);
    return {
      total: getAtrForGroup(allNrps),
      pos2: getAtrForGroup(manpower.filter(m => m.position === 2).map(m => m.nrp)),
      pos3: getAtrForGroup(manpower.filter(m => m.position === 3).map(m => m.nrp)),
      pos4: getAtrForGroup(manpower.filter(m => m.position === 4).map(m => m.nrp)),
      pos5: getAtrForGroup(manpower.filter(m => m.position === 5).map(m => m.nrp)),
    };
  }, [manpower, attendance, monthDates, currentYear, currentMonth]);

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Tab Header */}
      <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('detail')}
          className={`flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'detail' 
              ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' 
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <FaChartBar size={12} /> ATR DETAIL
        </button>
        {canRecord && (
          <button
            onClick={() => setActiveTab('recording')}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'recording' 
                ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <FaEdit size={12} /> ATR RECORDING
          </button>
        )}
      </div>

      <div className="flex-1 min-h-0">
        {activeTab === 'recording' ? (
          <ManpowerDetail 
            date={date} 
            shift={shift} 
            initialPrefill={prefillData}
            onClearPrefill={() => setPrefillData(null)}
          />
        ) : (
          <div className="flex flex-col h-full space-y-4 overflow-y-auto pr-2 scrollbar-hide">
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { label: 'GRAND TOTAL', value: stats.total, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
                { label: 'POS 2 (GL)', value: stats.pos2, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
                { label: 'POS 3 (FOREMAN)', value: stats.pos3, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
                { label: 'POS 4 (OPERATOR)', value: stats.pos4, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20' },
                { label: 'POS 5 (FUELMAN)', value: stats.pos5, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
              ].map((s, i) => (
                <div key={i} className={`${s.bg} p-4 rounded-2xl border border-white/50 dark:border-white/5 shadow-sm`}>
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1">{s.label}</p>
                  <p className={`text-2xl font-black ${s.color}`}>{s.value.toFixed(2)}%</p>
                </div>
              ))}
            </div>

            {/* Custom Tooltip */}
            {tooltip && (
              <div 
                className="fixed z-[100] px-3 py-2 bg-slate-900/90 backdrop-blur-md text-white text-[10px] rounded-lg shadow-xl border border-slate-700 pointer-events-none max-w-[200px] leading-relaxed animate-in fade-in zoom-in duration-200"
                style={{ 
                  left: tooltip.x + 15,
                  top: tooltip.y + 15,
                }}
              >
                <div className="font-bold border-b border-white/10 pb-1 mb-1 text-blue-300 uppercase tracking-tighter text-[9px]">Note Info</div>
                {tooltip.note}
              </div>
            )}

            {/* Monthly Grid */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col min-h-[500px] overflow-hidden">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3 bg-white dark:bg-slate-900 z-10">
                 <FaCalendarAlt className="text-blue-500" />
                 <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-widest">
                    Monthly Performance Grid - {new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(new Date(currentYear, currentMonth))}
                 </h4>
              </div>

              <div className="flex-1 overflow-auto scrollbar-hide rounded-b-2xl">
                {loading ? (
                   <div className="flex items-center justify-center p-20">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                   </div>
                ) : (
                  <table className="w-full text-left text-[10px] border-collapse min-w-max relative">
                    <thead className="sticky top-0 z-20 border-b border-slate-500 dark:border-slate-700">
                      <tr className="bg-slate-400 dark:bg-slate-800">
                        <th className="px-3 py-3 border-r border-slate-500 dark:border-slate-700 sticky left-0 z-30 bg-slate-400 dark:bg-slate-800 font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider">NAME / NRP</th>
                        {monthDates.map(d => (
                          <th key={d} className="px-1.5 py-3 text-center border-r border-slate-500 dark:border-slate-700 w-8 font-black text-slate-900 dark:text-slate-100 bg-slate-400 dark:bg-slate-800">{d}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {Object.entries(groupedManpower).map(([group, members]) => (
                        <Fragment key={group}>
                          <tr className="bg-slate-200 dark:bg-slate-800 border-y border-slate-300 dark:border-slate-700">
                            <td className="px-3 py-1.5 font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest text-[9px] sticky left-0 z-10 bg-slate-200 dark:bg-slate-800 border-r border-slate-300 dark:border-slate-700 shadow-sm">
                              {group}
                            </td>
                            <td colSpan={monthDates.length} className="bg-slate-200 dark:bg-slate-800"></td>
                          </tr>
                          {members.map(mp => (
                            <tr key={mp.nrp} className="border-b border-slate-200 dark:border-slate-700 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                              <td className="px-3 py-1.5 border-r border-slate-200 dark:border-slate-700 sticky left-0 z-10 bg-white dark:bg-slate-900 font-bold text-slate-700 dark:text-slate-200 leading-tight hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shadow-sm cursor-pointer">
                                <span>{mp.nama}</span>
                                <div className="text-[7px] text-slate-400 uppercase mt-0.5 font-medium">{mp.nrp} • POS {mp.position}</div>
                              </td>
                              {monthDates.map(d => {
                                const workDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                                const record = attendance.find(a => a.nrp === mp.nrp && a.work_date === workDate);
                                
                                let display = '-';
                                let color = 'text-slate-200 dark:text-slate-700';
                                let cellBg = 'hover:bg-slate-100 dark:hover:bg-slate-800/80';

                                if (record) {
                                  cellBg = 'bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-200 dark:hover:bg-amber-900/60';
                                  if (record.is_sick) { display = 'S'; color = 'text-yellow-600 font-bold'; }
                                  else if (record.is_leave) { display = 'I'; color = 'text-blue-600 font-bold'; }
                                  else if (record.is_alpha) { display = 'A'; color = 'text-red-600 font-bold'; }
                                  else if (record.is_late) { display = 'T'; color = 'text-orange-600 font-bold'; }
                                  else if (record.is_early_leave) { display = 'P'; color = 'text-teal-600 font-bold'; }
                                  else if (record.is_present) { display = '•'; color = 'text-green-600 font-black text-xs'; }
                                }

                                return (
                                  <td 
                                    key={d} 
                                    onMouseEnter={(e) => {
                                      if (record?.note) {
                                        setTooltip({ note: record.note, x: e.clientX, y: e.clientY });
                                      }
                                    }}
                                    onMouseMove={(e) => {
                                      if (record?.note) {
                                        setTooltip(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : null);
                                      }
                                    }}
                                    onMouseLeave={() => setTooltip(null)}
                                    onDoubleClick={() => handleGridDoubleClick(mp, d)}
                                    className={`px-1 py-1.5 text-center border-r border-slate-200 dark:border-slate-800 ${color} ${cellBg} w-8 transition-all cursor-pointer hover:ring-2 hover:ring-blue-500 hover:relative hover:z-10`}
                                  >
                                    {display}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex flex-wrap gap-4 text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                  <div className="flex items-center gap-1"><span className="text-green-600 text-xs">•</span> Present</div>
                  <div className="flex items-center gap-1"><span className="text-yellow-600">S</span> Sick</div>
                  <div className="flex items-center gap-1"><span className="text-blue-600">I</span> Leave</div>
                  <div className="flex items-center gap-1"><span className="text-red-600">A</span> Alpha</div>
                  <div className="flex items-center gap-1"><span className="text-orange-600">T</span> Late</div>
                  <div className="flex items-center gap-1"><span className="text-teal-600">P</span> Early Leave</div>
                  <div className="flex items-center gap-1"><span className="text-slate-200">-</span> No Record</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ATRDetail;
