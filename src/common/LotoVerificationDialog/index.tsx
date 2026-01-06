import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../../db/SupabaseClient';
import { format } from 'date-fns';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  warehouseCode: string | null;
  date: Date | null;
  targetShift?: number | null;
}

interface UnitStatusItem {
  unit_code: string;
  status: 'green' | 'blue' | 'slate';
}

const LotoVerificationDialog: React.FC<Props> = ({ isOpen, onClose, warehouseCode, date, targetShift }) => {
  const [shift1Units, setShift1Units] = useState<UnitStatusItem[]>([]);
  const [shift2Units, setShift2Units] = useState<UnitStatusItem[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(false);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Fetch Data when open
  useEffect(() => {
    if (isOpen && warehouseCode && date) {
      fetchUnitStatuses();
    } else {
        // Reset when closed or invalid
        setShift1Units([]);
        setShift2Units([]);
    }
  }, [isOpen, warehouseCode, date]);

  const fetchUnitStatuses = async () => {
    if (!warehouseCode || !date) return;
    setLoadingUnits(true);

    try {
      // 1. Generate Session Codes
      // Format: yyMMdd + 00{shift} + warehouse
      const d = new Date(date);
      const yy = d.getFullYear().toString().slice(-2);
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');

      const prefix = `${yy}${mm}${dd}`;

      // User requested 3 zeros padding: yyMMdd + 000{shift} + warehouse
      const cleanWarehouse = warehouseCode.trim();
      const s1Code = `${prefix}0001${cleanWarehouse}`;
      const s2Code = `${prefix}0002${cleanWarehouse}`;
      
      const sessionCodes: string[] = [];
      if (!targetShift || targetShift === 1) sessionCodes.push(s1Code);
      if (!targetShift || targetShift === 2) sessionCodes.push(s2Code);

      // 2. Fetch Data
      const dateStr = format(date, 'yyyy-MM-dd');

      const [lotoRes, verifRes] = await Promise.all([
        // Loto Records: Strict on Session ID
        supabase
          .from('loto_records')
          .select('session_id, code_number')
          .in('session_id', sessionCodes),

        // Loto Verification: Broad on Warehouse + Date (Fallback if session_code is missing/mismatch)
        supabase
          .from('loto_verification')
          .select('session_code, cn_unit, shift')
          .eq('warehouse_code', cleanWarehouse)
          .eq('issued_date', dateStr)
      ]);

      if (lotoRes.error) throw lotoRes.error;
      if (verifRes.error) throw verifRes.error;

      // 3. Process Per Shift
      const processShift = (sessionCode: string, shiftNum: number): UnitStatusItem[] => {
        const records = lotoRes.data?.filter(r => r.session_id === sessionCode).map(r => r.code_number) || [];

        // Filter verification by SHIFT column (more reliable vs session_code string)
        const verifs = verifRes.data?.filter(r => r.shift === shiftNum).map(r => r.cn_unit) || [];

        const allUnits = new Set([...records, ...verifs]);
        const result: UnitStatusItem[] = [];

        allUnits.forEach(unit => {
          if (!unit) return;

          const inRecords = records.includes(unit);
          const inVerif = verifs.includes(unit);

          let status: 'green' | 'blue' | 'slate' = 'slate';
          if (inRecords && inVerif) status = 'green';
          else if (inRecords) status = 'blue';
          else if (inVerif) status = 'slate';

          result.push({ unit_code: unit, status });
        });

        // Sort: Green -> slate -> Blue, then Alphabetical
        const statusPriority = { green: 1, slate: 2, blue: 3 };

        return result.sort((a, b) => {
          const priorityA = statusPriority[a.status];
          const priorityB = statusPriority[b.status];

          if (priorityA !== priorityB) {
            return priorityA - priorityB;
          }
          return a.unit_code.localeCompare(b.unit_code);
        });
      };

      if (!targetShift || targetShift === 1) setShift1Units(processShift(s1Code, 1));
      if (!targetShift || targetShift === 2) setShift2Units(processShift(s2Code, 2));

    } catch (err) {
      console.error("Error fetching unit statuses:", err);
    } finally {
      setLoadingUnits(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-boxdark rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-strokedark flex justify-between items-center bg-slate-50 dark:bg-meta-4/30">
          <div>
            <h3 className="text-lg font-bold text-black dark:text-white">
              Unit Verification Status
            </h3>
            <p className="text-sm text-slate-500">
              {warehouseCode} • {date ? format(date, 'dd MMM yyyy') : '-'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 dark:hover:bg-meta-4 rounded-full transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {loadingUnits ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              {/* Shift 1 Section */}
              {(!targetShift || targetShift === 1) && (
              <div>
                <div className="flex justify-between items-center mb-2 border-b pb-1 dark:border-strokedark">
                  <h4 className="text-sm font-bold text-slate-600 dark:text-slate-300">
                    Shift 1 <span className="text-[10px] font-normal text-slate-400 ml-1">({warehouseCode && date ? `${format(date, 'yyMMdd')}0001${warehouseCode.trim()}` : ''})</span>
                  </h4>
                  <div className="flex gap-2 text-[10px] font-medium">
                    <span className="text-slate-500">Plan: {shift1Units.filter(u => u.status === 'green' || u.status === 'slate').length}</span>
                    <span className="text-blue-600">Actual: {shift1Units.filter(u => u.status === 'green' || u.status === 'blue').length}</span>
                    <span className="text-black dark:text-white font-bold">Total: {shift1Units.length}</span>
                  </div>
                </div>

                {shift1Units.length === 0 ? (
                  <div className="text-xs text-slate-400 italic">
                    No units recorded for session {warehouseCode && date ? `${format(date, 'yyMMdd')}0001${warehouseCode.trim()}` : ''}.
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
                    {shift1Units.map((item) => (
                      <div
                        key={item.unit_code}
                        className={`
                            flex items-center justify-center p-1.5 rounded border shadow-sm text-[10px] font-bold truncate
                            ${item.status === 'green' ? 'bg-green-100 border-green-200 text-green-800' : ''}
                            ${item.status === 'blue' ? 'bg-blue-100 border-blue-200 text-blue-800' : ''}
                            ${item.status === 'slate' ? 'bg-slate-100 border-slate-200 text-slate-500' : ''}
                        `}
                        title={item.unit_code}
                      >
                        {item.unit_code}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              )}

              {/* Shift 2 Section */}
              {(!targetShift || targetShift === 2) && (
              <div>
                <div className="flex justify-between items-center mb-2 border-b pb-1 dark:border-strokedark">
                  <h4 className="text-sm font-bold text-slate-600 dark:text-slate-300">
                    Shift 2 <span className="text-[10px] font-normal text-slate-400 ml-1">({warehouseCode && date ? `${format(date, 'yyMMdd')}0002${warehouseCode.trim()}` : ''})</span>
                  </h4>
                  <div className="flex gap-2 text-[10px] font-medium">
                    <span className="text-slate-500">Plan: {shift2Units.filter(u => u.status === 'green' || u.status === 'slate').length}</span>
                    <span className="text-blue-600">Actual: {shift2Units.filter(u => u.status === 'green' || u.status === 'blue').length}</span>
                    <span className="text-black dark:text-white font-bold">Total: {shift2Units.length}</span>
                  </div>
                </div>

                {shift2Units.length === 0 ? (
                  <div className="text-xs text-slate-400 italic">
                    No units recorded for session {warehouseCode && date ? `${format(date, 'yyMMdd')}0002${warehouseCode.trim()}` : ''}.
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
                    {shift2Units.map((item) => (
                      <div
                        key={item.unit_code}
                        className={`
                            flex items-center justify-center p-1.5 rounded border shadow-sm text-[10px] font-bold truncate
                            ${item.status === 'green' ? 'bg-green-100 border-green-200 text-green-800' : ''}
                            ${item.status === 'blue' ? 'bg-blue-100 border-blue-200 text-blue-800' : ''}
                            ${item.status === 'slate' ? 'bg-slate-100 border-slate-200 text-slate-500' : ''}
                        `}
                        title={item.unit_code}
                      >
                        {item.unit_code}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-strokedark bg-slate-50 dark:bg-meta-4/30 text-xs text-slate-500 flex justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-100 border border-green-200 rounded"></div>
              <span>Verified (Both)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-blue-100 border border-blue-200 rounded"></div>
              <span>Evidence Only</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-slate-100 border border-slate-200 rounded"></div>
              <span>List Only</span>
            </div>
          </div>
          <span className="font-bold">Grand Total: {shift1Units.length + shift2Units.length}</span>
        </div>
      </div>
    </div>
  );
};

export default LotoVerificationDialog;
