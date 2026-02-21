import React from 'react';
import { FaPlusCircle, FaSpinner, FaClipboardList, FaTools, FaMapMarkerAlt, FaTags, FaUsers } from 'react-icons/fa';
import { useTheme } from '../../../../contexts/ThemeContext';

interface InspectionDashboardProps {
  user: any;
  hasOngoing: boolean;
  onNewInspection: () => void;
  onOngoingInspection: () => void;
  onBacklog: () => void;
  onCreateSchedule: () => void;
  onCreateLocation: () => void;
  onCreatePopulation: () => void;
  onCreateItems: () => void;
  onCreateCategory: () => void;
}

const InspectionDashboard: React.FC<InspectionDashboardProps> = ({ 
  user, 
  hasOngoing, 
  onNewInspection, 
  onOngoingInspection, 
  onBacklog,
  onCreateSchedule,
  onCreateLocation,
  onCreatePopulation,
  onCreateItems,
  onCreateCategory,
}) => {
  const { activeTheme } = useTheme();
  const isDark = activeTheme.baseTheme === 'dark';

  const cardClass = `
    relative overflow-hidden rounded-2xl p-6 transition-all duration-300
    border border-white/20 shadow-lg hover:shadow-xl hover:-translate-y-1
    flex flex-col items-center justify-center gap-4 text-center cursor-pointer
    group
  `;

  const bgStyle = (color: string) => ({
    background: isDark 
      ? `linear-gradient(135deg, ${color}20, ${color}05)` 
      : `linear-gradient(135deg, ${color}10, #ffffff)`,
    borderColor: isDark ? `${color}30` : `${color}20`,
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* New Inspection */}
      <button
        disabled={hasOngoing}
        onClick={onNewInspection}
        className={`${cardClass} ${hasOngoing ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
        style={bgStyle('#3b82f6')}
      >
        <div className={`p-4 rounded-full ${isDark ? 'bg-blue-500/20' : 'bg-blue-100'} text-blue-500 mb-2 group-hover:scale-110 transition-transform`}>
          <FaPlusCircle size={32} />
        </div>
        <h3 className="text-lg font-bold" style={{ color: activeTheme.container.textColor }}>New Inspection</h3>
        <p className="text-sm opacity-70">Start a new infrastructure inspection based on schedule.</p>
        {hasOngoing && <span className="text-xs text-red-500 font-semibold">Finish ongoing inspection first</span>}
      </button>

      {/* Ongoing Inspection */}
      <button
        disabled={!hasOngoing}
        onClick={onOngoingInspection}
        className={`${cardClass} ${!hasOngoing ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
        style={bgStyle('#f59e0b')}
      >
        <div className={`p-4 rounded-full ${isDark ? 'bg-amber-500/20' : 'bg-amber-100'} text-amber-500 mb-2 group-hover:scale-110 transition-transform`}>
          {hasOngoing ? <FaSpinner size={32} className="animate-spin" /> : <FaTools size={32} />}
        </div>
        <h3 className="text-lg font-bold" style={{ color: activeTheme.container.textColor }}>Ongoing Inspection</h3>
        <p className="text-sm opacity-70">Continue your draft inspection.</p>
      </button>

      {/* Backlogs */}
      <button
        onClick={onBacklog}
        className={cardClass}
        style={bgStyle('#ef4444')}
      >
        <div className={`p-4 rounded-full ${isDark ? 'bg-red-500/20' : 'bg-red-100'} text-red-500 mb-2 group-hover:scale-110 transition-transform`}>
           <FaClipboardList size={32} />
        </div>
        <h3 className="text-lg font-bold" style={{ color: activeTheme.container.textColor }}>Outstanding Backlogs</h3>
        <p className="text-sm opacity-70">View and resolve infrastructure issues.</p>
      </button>

      {/* Admin Actions (Position 0 only) */}
      {user.position === 0 && (
        <div className="col-span-1 md:col-span-3 mt-8 border-t border-white/10 pt-6">
            <h4 className="text-sm font-semibold mb-4 uppercase tracking-wider opacity-60">Admin Actions</h4>
            <div className="flex flex-wrap gap-3">
                <button 
                  onClick={onCreateLocation}
                  className="px-4 py-2 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 flex items-center gap-2 transition-colors text-sm font-bold"
                >
                  <FaMapMarkerAlt /> Manage Locations
                </button>
                <button 
                  onClick={onCreatePopulation}
                  className="px-4 py-2 rounded-lg bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20 flex items-center gap-2 transition-colors text-sm font-bold"
                >
                  <FaUsers /> Manage Populations
                </button>
                <button 
                  onClick={onCreateCategory}
                  className="px-4 py-2 rounded-lg bg-purple-500/10 text-purple-500 hover:bg-purple-500/20 flex items-center gap-2 transition-colors text-sm font-bold"
                >
                  <FaTags /> Manage Item Category
                </button>
                <button 
                  onClick={onCreateItems}
                  className="px-4 py-2 rounded-lg bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 flex items-center gap-2 transition-colors text-sm font-bold"
                >
                  <FaClipboardList /> Manage Inspection Items
                </button>
                <button 
                  onClick={onCreateSchedule}
                  className="px-4 py-2 rounded-lg bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 flex items-center gap-2 transition-colors text-sm font-bold"
                >
                  <FaClipboardList /> Manage Schedules
                </button>
            </div>
        </div>
      )}
    </div>
  );
};

export default InspectionDashboard;
