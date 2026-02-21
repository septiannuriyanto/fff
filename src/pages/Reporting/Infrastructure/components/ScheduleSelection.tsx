import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../../db/SupabaseClient';
import { FaArrowLeft, FaCalendarAlt, FaMapMarkerAlt, FaSpinner } from 'react-icons/fa';

interface Schedule {
  id: string;
  period: number;
  start_date: string;
  end_date: string;
  status: string;
  infra_locations: {
    name: string;
    area: string | null;
    banner_url: string | null;
  };
}

interface ScheduleSelectionProps {
  onSelect: (schedule: Schedule) => void;
  onBack: () => void;
}

const ScheduleSelection: React.FC<ScheduleSelectionProps> = ({ onSelect, onBack }) => {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Carousel State
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const fetchSchedules = async () => {
      setLoading(true);
      // Sort by start_date ASC as requested
      const { data, error } = await supabase
        .from('infra_schedules')
        .select('*, infra_locations(name, area, banner_url)')
        .order('start_date', { ascending: true });

      if (error) {
        setError(error.message);
      } else {
        setSchedules(data as unknown as Schedule[]);
      }
      setLoading(false);
    };

    fetchSchedules();
  }, []);

  // Handle Scroll to determine active index
  const handleScroll = () => {
    if (!scrollRef.current) return;
    const scrollLeft = scrollRef.current.scrollLeft;
    // Each item width is roughly 320px + gap
    const itemWidth = 320 + 24; 
    const index = Math.round(scrollLeft / itemWidth);
    if (index !== activeIndex && index >= 0 && index < schedules.length) {
       setActiveIndex(index);
    }
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className="w-full max-w-5xl mx-auto animate-fade-in-up py-4">
      <div className="flex items-center gap-4 mb-10 px-6">
        <button onClick={onBack} className="p-3 rounded-2xl border border-white/20 hover:bg-white/10 transition-all active:scale-95 text-black dark:text-white backdrop-blur-md">
          <FaArrowLeft />
        </button>
        <div>
          <h2 className="text-2xl font-black uppercase tracking-widest text-black dark:text-white">Inspection Timeline</h2>
          <div className="flex items-center gap-2 mt-1">
             <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></div>
             <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 text-black dark:text-white">Carousel sorted by start date chronologically</p>
          </div>
        </div>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-20 opacity-40 text-black dark:text-white">
          <FaSpinner className="animate-spin text-4xl mb-4" />
          <span className="text-[10px] font-black uppercase tracking-widest">Synchronizing Timeline...</span>
        </div>
      )}

      {error && (
        <div className="mx-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold uppercase tracking-widest flex items-center gap-3">
           <div className="w-2 h-2 rounded-full bg-red-500"></div>
           {error}
        </div>
      )}

      {!loading && !error && schedules.length === 0 && (
        <div className="py-20 text-center opacity-30 text-black dark:text-white">
          <FaCalendarAlt className="mx-auto text-5xl mb-4" />
          <p className="font-black uppercase tracking-widest">No Operational Schedules Found</p>
        </div>
      )}

      {/* Horizontal Carousel */}
      {!loading && schedules.length > 0 && (
        <div 
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex gap-6 overflow-x-auto pt-12 pb-16 px-[calc(50%-160px)] snap-x snap-mandatory no-scrollbar scroll-smooth"
        >
          {schedules.map((s, idx) => {
            const isActive = activeIndex === idx;
            const banner = s.infra_locations?.banner_url;
            
            // Date Range Logic
            const today = new Date().toISOString().split('T')[0];
            const isUpcoming = today < s.start_date;
            const isClosed = s.status === 'closed';
            const isOpen = s.status === 'open';

            // Ribbon & Vibe Logic
            let ribbonText = "";
            let ribbonClass = "";
            let vibeClass = ""; 
            let accentColor = "blue"; // fallback

            if (isUpcoming) {
              // Abu-abu vibes for upcoming
              vibeClass = "grayscale brightness-[0.7] opacity-60";
              accentColor = "slate";
              ribbonText = "UPCOMING";
              ribbonClass = "bg-slate-600 text-white shadow-slate-900/40";
            } else if (isClosed) {
              // Green vibes for closed
              vibeClass = "border-emerald-500/40 brightness-[0.9]";
              accentColor = "emerald";
              ribbonText = "COMPLETED";
              ribbonClass = "bg-emerald-600 text-white shadow-emerald-500/20";
            } else if (isOpen) {
              // Red vibes back to open as requested (red ribbon)
              vibeClass = "border-rose-500/40";
              accentColor = "rose";
              ribbonText = "PENDING";
              ribbonClass = "bg-rose-600 text-white shadow-rose-500/20";
            }

            return (
              <div
                key={s.id}
                onClick={() => onSelect(s)}
                className={`flex-shrink-0 w-[320px] h-[450px] rounded-3xl overflow-hidden snap-center cursor-pointer transition-all duration-500 relative border-4 ${
                   isActive 
                    ? `scale-110 shadow-[0_20px_50px_rgba(0,0,0,0.4)] z-10 ${
                        isUpcoming ? 'border-slate-500/50' : 
                        isClosed ? 'border-emerald-500' : 'border-rose-600'
                      }` 
                    : 'scale-90 opacity-40 border-transparent blur-[1px] hover:blur-0 hover:opacity-100'
                } ${vibeClass}`}
              >
                {/* Status Ribbon (Diagonal) */}
                {ribbonText && (
                  <div className="absolute top-0 right-0 z-50 overflow-hidden w-32 h-32 pointer-events-none">
                    <div className={`absolute top-6 -right-8 w-40 py-1.5 rotate-45 text-center text-[10px] font-black uppercase tracking-tighter shadow-lg translate-x-1 ${ribbonClass}`}>
                      {ribbonText}
                    </div>
                  </div>
                )}

                {/* Background Banner */}
                <div className="absolute inset-0 z-0 bg-slate-900">
                  {banner ? (
                    <img src={banner} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center opacity-20">
                      <FaMapMarkerAlt size={64} className="text-white" />
                    </div>
                  )}
                  {/* Vignette Gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"></div>
                  <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent"></div>
                </div>

                {/* Content Overlay */}
                <div className="absolute inset-0 z-10 p-6 flex flex-col justify-between text-white">
                   <div className="flex justify-between items-start">
                      <div className={`backdrop-blur-md border rounded-xl px-3 py-1.5 flex items-center gap-2 ${
                        isUpcoming ? 'bg-slate-600/20 border-white/20' : 
                        isClosed ? 'bg-emerald-600/20 border-emerald-400/30' : 'bg-rose-600/20 border-rose-400/30'
                      }`}>
                         <div className={`w-1.5 h-1.5 rounded-full ${
                           isUpcoming ? 'bg-slate-400 animate-pulse' : 
                           isClosed ? 'bg-emerald-400' : 'bg-rose-400'
                         }`}></div>
                         <span className="text-[10px] font-black uppercase tracking-widest">
                           {isUpcoming ? 'Upcoming' : isClosed ? 'Finished' : `Period ${s.period}`}
                         </span>
                      </div>
                      <div className={`p-2.5 rounded-xl shadow-xl transition-colors ${
                         isUpcoming ? 'bg-slate-700 shadow-slate-900/40' : 
                         isClosed ? 'bg-emerald-600 shadow-emerald-500/30' : 'bg-rose-600 shadow-rose-500/30'
                      }`}>
                         <FaCalendarAlt size={14} />
                      </div>
                   </div>

                   <div className="space-y-3">
                      <div className="space-y-1">
                        <h3 className="text-2xl font-black uppercase leading-tight tracking-tight drop-shadow-lg">
                           {s.infra_locations?.name}
                        </h3>
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-80 flex items-center gap-1.5">
                           <FaMapMarkerAlt size={10} className={`text-${accentColor}-400`} />
                           {s.infra_locations?.area || 'General Operation'}
                        </p>
                      </div>

                      <div className="pt-4 border-t border-white/10 flex flex-col gap-2">
                        <div className="flex justify-between items-center opacity-80">
                           <span className="text-[9px] font-black uppercase tracking-widest">Date Range</span>
                           <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                             isUpcoming ? 'bg-slate-500/20' : 
                             isClosed ? 'bg-emerald-500/20' : 'bg-rose-500/20'
                           }`}>
                              {formatDate(s.start_date)} – {formatDate(s.end_date)}
                           </span>
                        </div>
                      </div>

                      <div className={`mt-4 w-full py-3 rounded-xl font-black text-[10px] uppercase tracking-[0.3em] flex items-center justify-center gap-2 transition-all ${
                         isActive 
                          ? (isUpcoming ? 'bg-slate-800 text-slate-500' : 
                             isClosed ? 'bg-white text-emerald-700 shadow-xl shadow-emerald-500/20' : 'bg-white text-rose-700 shadow-xl shadow-rose-500/20') 
                          : 'bg-white/20 text-white backdrop-blur-md'
                      }`}>
                         {isUpcoming ? 'Inspection Locked' : isClosed ? 'History Data' : 'Start Inspection'}
                      </div>
                   </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {/* Scroll Indicator */}
      {!loading && schedules.length > 1 && (
        <div className="flex justify-center gap-2 mt-[-20px] relative z-20">
           {schedules.map((_, i) => (
             <div 
               key={i}
               className={`h-1.5 rounded-full transition-all duration-300 ${
                 activeIndex === i ? 'w-8 bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.5)]' : 'w-2 bg-slate-300 dark:bg-slate-700'
               }`}
             />
           ))}
        </div>
      )}
    </div>
  );
};

export default ScheduleSelection;
