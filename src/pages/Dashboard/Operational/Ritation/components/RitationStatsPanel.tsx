import React from 'react';
import { DatePicker } from 'rsuite';
import { formatNumberWithSeparator } from '../../../../../Utils/NumberUtility';

interface RitationStatsProps {
  panelTitle: string;
  ritationProgress: string;
  ritationQty: number;
  planQty: number;
  poDoc: string | undefined;
  onShowPoDoc?: () => void;
  onShowBaRequest?: () => void;
  selectedMonth: Date;
  onMonthChange: (date: Date | null) => void;
  isLoading?: boolean;
  titleLeft?: string;
  receiveProgress?: string;
}

const RitationStatsPanel: React.FC<RitationStatsProps> = ({
  ritationProgress,
  panelTitle,
  ritationQty,
  planQty,
  poDoc,
  onShowBaRequest,
  onShowPoDoc,
  selectedMonth,
  onMonthChange,
  isLoading
}) => {
  return (
    <div className="relative backdrop-blur-xl bg-white/40 dark:bg-black/40 rounded-2xl border border-white/30 dark:border-white/10 shadow-2xl p-6 transition-all duration-500 overflow-hidden group">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/20 dark:bg-black/20 backdrop-blur-sm transition-all">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 animate-pulse">Syncing MTD Stats...</span>
          </div>
        </div>
      )}

        <div className="relative z-10 flex flex-row flex-wrap xl:flex-nowrap items-stretch gap-3 xl:gap-4">
        {/* Section 1: Compact Title & Period */}
        <div className="flex flex-col justify-between py-1 min-w-[180px]">
          <h1 className="font-black text-gray-800 dark:text-white text-[10px] tracking-widest uppercase opacity-80 mb-1">
            {panelTitle}
          </h1>
          <div className="modern-month-picker bg-white/20 dark:bg-white/5 backdrop-blur-md rounded-lg border border-white/30 dark:border-white/10 transition-all hover:bg-white/30">
            <DatePicker 
              format="MMM yyyy"
              value={selectedMonth}
              onChange={onMonthChange}
              shouldDisableDate={(date) => {
                 const today = new Date();
                 const currentYear = today.getFullYear();
                 const minYear = currentYear - 3;
                 const year = date.getFullYear();
                 if (year < minYear || year > currentYear) return true;
                 if (year === currentYear && date.getMonth() > today.getMonth()) return true;
                 return false;
              }}
              cleanable={false}
              className="!w-full !bg-transparent"
              placeholder="Month"
              appearance="subtle"
              size="xs"
            />
          </div>
        </div>

        {/* Section 2: Fulfillment Progress Card (Integrated with Plan & Rec) */}
        <div className="flex-1 min-w-[320px] flex flex-col gap-2 px-4 py-2.5 rounded-2xl bg-blue-500/5 dark:bg-blue-500/10 backdrop-blur-xl border border-blue-500/20 shadow-lg relative overflow-hidden group">
          <div className="flex justify-between items-end relative z-10">
            <div className="flex flex-col">
              <span className="text-[9px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">Monthly Fulfillment</span>
              <div className="flex gap-3 mt-0.5">
                <div className="flex flex-col">
                  <span className="text-[7px] font-bold text-gray-400 uppercase">Plan</span>
                  <span className="text-xs font-black dark:text-white">{formatNumberWithSeparator(planQty)}<span className="text-[8px] ml-0.5 opacity-60">L</span></span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[7px] font-bold text-gray-400 uppercase text-blue-500">Rec</span>
                  <span className="text-xs font-black text-blue-600 dark:text-blue-400">{formatNumberWithSeparator(ritationQty)}<span className="text-[8px] ml-0.5 opacity-60">L</span></span>
                </div>
              </div>
            </div>
            <div className="flex items-baseline gap-0.5 pb-0.5">
              <span className="text-2xl font-black text-blue-600 dark:text-blue-400 tracking-tighter leading-none">
                {ritationProgress.replace('%', '')}
              </span>
              <span className="text-[10px] font-black text-blue-600/60">%</span>
            </div>
          </div>
          
          <div className="h-2 w-full bg-blue-500/10 dark:bg-black/20 rounded-full overflow-hidden border border-blue-500/20 p-[1px] relative">
            <div 
              className="h-full bg-gradient-to-r from-blue-400 via-blue-500 to-indigo-600 rounded-full transition-all duration-[1500ms] ease-out relative" 
              style={{ width: ritationProgress }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-[shimmer_3s_infinite]" />
            </div>
          </div>
        </div>


        {/* Section 4: Document Cards */}
        <div className="flex gap-2 align-center">
           {[
             { label: 'BA Plan Fuel', onClick: onShowBaRequest, sub: 'Monthly' },
             { label: 'PO Fuel Doc', onClick: onShowPoDoc, sub: poDoc || 'Pending' }
           ].map((doc, i) => (
             <button 
               key={i}
               onClick={doc.onClick}
               className="flex items-center gap-3 px-3 py-2 rounded-2xl bg-gray-500/5 dark:bg-white/5 backdrop-blur-md border border-white/20 dark:border-white/5 hover:bg-gray-500/10 dark:hover:bg-white/10 transition-all text-left min-w-[130px] group/doc shadow-lg"
             >
                <div className="w-7 h-7 rounded-lg bg-gray-400/10 flex items-center justify-center text-gray-500 dark:text-gray-400 group-hover/doc:scale-110 transition-transform">
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>
                <div className="flex flex-col gap-0.5">
                   <span className="text-[8px] font-black uppercase tracking-tighter text-gray-500 dark:text-gray-400 leading-none">{doc.label}</span>
                   <span className="text-[7px] font-bold text-gray-400 uppercase truncate w-[80px]">{doc.sub}</span>
                </div>
             </button>
           ))}
        </div>
      </div>
    </div>
  );
};

export default RitationStatsPanel;
