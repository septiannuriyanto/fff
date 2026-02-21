import React from 'react';
import { FaCheckCircle, FaUser, FaMapMarkerAlt, FaCalendarDay } from 'react-icons/fa';

interface InspectionBriefProps {
  schedule: any;
  user: any;
  onConfirm: () => void;
  onBack: () => void;
}

const InspectionBrief: React.FC<InspectionBriefProps> = ({ schedule, user, onConfirm, onBack }) => {

  return (
    <div className="max-w-2xl mx-auto animate-fade-in-up">
       <div className="p-8 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md shadow-2xl">
          <h2 className="text-2xl font-bold mb-6 text-center border-b border-white/10 pb-4">Inspection Brief</h2>
          
          <div className="space-y-6 mb-8">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                    <FaMapMarkerAlt size={20} />
                </div>
                <div>
                    <label className="text-xs uppercase tracking-wider opacity-50 font-bold block">Location</label>
                    <div className="text-lg font-medium">{schedule.infra_locations?.name || schedule.location || 'Unknown'}</div>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400">
                    <FaCalendarDay size={20} />
                </div>
                <div>
                    <label className="text-xs uppercase tracking-wider opacity-50 font-bold block">Period</label>
                    <div className="text-lg font-medium">Period {schedule.period}</div>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <FaUser size={20} />
                </div>
                <div>
                    <label className="text-xs uppercase tracking-wider opacity-50 font-bold block">Inspector</label>
                    <div className="text-lg font-medium">{user.nrp} (You)</div>
                </div>
            </div>
          </div>

          <div className="flex gap-4">
            <button 
                onClick={onBack}
                className="flex-1 py-3 rounded-xl border border-white/20 hover:bg-white/5 transition-colors font-medium"
            >
                Cancel
            </button>
            <button 
                onClick={onConfirm}
                className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all shadow-lg hover:shadow-blue-500/40 flex items-center justify-center gap-2"
            >
                <FaCheckCircle /> Confirm & Start
            </button>
          </div>
       </div>
    </div>
  );
};

export default InspectionBrief;
