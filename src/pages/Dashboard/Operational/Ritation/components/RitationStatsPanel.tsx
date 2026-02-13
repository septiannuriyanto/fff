import React from 'react';
import { formatNumberWithSeparator } from '../../../../../Utils/NumberUtility';

interface RitationStatsProps {
  panelTitle: string;
  titleLeft: string;
  ritationProgress: string;
  receiveProgress: string;
  ritationQty: number;
  receivedQty:number;
  planQty: number;
  poDoc: string | undefined;
  onShowPoDoc?: () => void | undefined;
  onShowBaRequest?: () => void | undefined;
}

const RitationStatsPanel: React.FC<RitationStatsProps> = ({
  ritationProgress,
  receiveProgress,
  panelTitle,
  receivedQty,
  ritationQty,
  planQty,
  poDoc,
  onShowBaRequest,
  onShowPoDoc
}) => {
  return (
    <div className="backdrop-blur-md bg-white/40 dark:bg-black/20 rounded-xl border border-white/20 dark:border-white/5 shadow-lg p-4 transition-all duration-300">
      <h1 className="pb-2 font-bold text-gray-700 dark:text-gray-300 text-sm">{panelTitle}</h1>
      
      {/* Quick Access Links */}
      {/* Quick Access Links */}
      <div className="flex items-center gap-4 pb-2 text-[10px] font-bold">
        <button 
          onClick={onShowPoDoc}
          className="text-blue-600 hover:text-blue-700 dark:text-blue-400 underline decoration-blue-500/30 underline-offset-4 transition-all"
        >
          {poDoc || 'No PO Doc'}
        </button>
        <button 
          onClick={onShowBaRequest}
          className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 underline decoration-emerald-500/30 underline-offset-4 transition-all"
        >
          BA Request
        </button>
      </div>

      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Detailed Qty Stats */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center group">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Plan Qty</span>
              <span className="text-sm font-bold text-black dark:text-white tabular-nums">
                {formatNumberWithSeparator(planQty)}
              </span>
            </div>
            <div className="flex justify-between items-center group">
              <span className="text-xs font-medium text-blue-600/80">Reconcile Qty</span>
              <span className="text-sm font-bold text-blue-600 tabular-nums">
                {formatNumberWithSeparator(ritationQty)}
              </span>
            </div>
            <div className="flex justify-between items-center group">
              <span className="text-xs font-medium text-emerald-600/80">Received Qty</span>
              <span className="text-sm font-bold text-emerald-600 tabular-nums">
                {formatNumberWithSeparator(receivedQty)}
              </span>
            </div>
            {receivedQty - ritationQty < 0 && (
              <div className="flex justify-between items-center pt-1 border-t border-red-100 dark:border-red-900/30">
                <span className="text-xs font-bold text-red-600">Outs Receive</span>
                <span className="text-sm font-bold text-red-600 tabular-nums">
                  {formatNumberWithSeparator(receivedQty - ritationQty)}
                </span>
              </div>
            )}
          </div>

          {/* Progress Percentages */}
          <div className="flex flex-col gap-4">
             <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-blue-600">
                  <span>Ritation Progress</span>
                  <span>{ritationProgress}</span>
                </div>
                <div className="h-2 w-full bg-blue-100 dark:bg-blue-900/30 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 rounded-full transition-all duration-1000" 
                    style={{ width: ritationProgress }}
                  />
                </div>
             </div>
             
             <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-emerald-600">
                  <span>Receive Progress</span>
                  <span>{receiveProgress}</span>
                </div>
                <div className="h-2 w-full bg-emerald-100 dark:bg-emerald-900/30 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 rounded-full transition-all duration-1000" 
                    style={{ width: receiveProgress }}
                  />
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RitationStatsPanel;
