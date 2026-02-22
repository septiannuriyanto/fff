import React, { useState, useEffect } from 'react';
import { FaCheckCircle, FaUser, FaMapMarkerAlt, FaCalendarDay, FaLayerGroup, FaListUl, FaSpinner } from 'react-icons/fa';
import { supabase } from '../../../../db/SupabaseClient';

interface InspectionBriefProps {
  schedule: any;
  user: any;
  onConfirm: () => void;
  onBack: () => void;
}

const InspectionBrief: React.FC<InspectionBriefProps> = ({ schedule, user, onConfirm, onBack }) => {
  const [populations, setPopulations] = useState<{ id: string, name: string }[]>([]);
  const [itemsCount, setItemsCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBriefData = async () => {
      const locationId = schedule.infra_locations?.id || schedule.location_id;
      if (!locationId) return;

      // 1. Fetch Populations
      const { data: popData } = await supabase
        .from('infra_population')
        .select('id, population_name')
        .eq('infra_locations_id', locationId)
        .eq('active', true)
        .order('queue_num');

      // 2. Fetch Base Items Count (Templates)
      const { data: itemsData, count } = await supabase
        .from('infra_locations_items')
        .select('id', { count: 'exact', head: true })
        .eq('infra_locations_id', locationId);

      if (popData) {
        setPopulations(popData.map(p => ({ id: p.id, name: p.population_name || 'Unnamed' })));
      }
      setItemsCount(count || 0);
      setLoading(false);
    };

    fetchBriefData();
  }, [schedule]);

  if (loading) {
     return (
        <div className="max-w-2xl mx-auto flex items-center justify-center p-20 opacity-50">
            <FaSpinner className="animate-spin text-2xl mr-3" /> 
            <span>Loading brief details...</span>
        </div>
     );
  }

  const totalChecks = populations.length * itemsCount;


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

            <div className="pt-4 border-t border-white/5">
                <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                        <FaLayerGroup size={20} />
                    </div>
                    <div className="flex-1">
                        <label className="text-xs uppercase tracking-wider opacity-50 font-bold block mb-2">Populations ({populations.length})</label>
                        <div className="flex flex-wrap gap-2">
                            {populations.map(p => (
                                <span key={p.id} className="px-3 py-1 rounded-full bg-white/10 border border-white/5 text-xs font-bold text-amber-200">
                                    {p.name}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                        <FaListUl size={20} />
                    </div>
                    <div>
                        <label className="text-xs uppercase tracking-wider opacity-50 font-bold block">Total Checks</label>
                        <div className="text-lg font-medium">
                            {totalChecks} Items <span className="text-xs opacity-50 ml-1">({itemsCount} per population)</span>
                        </div>
                    </div>
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
