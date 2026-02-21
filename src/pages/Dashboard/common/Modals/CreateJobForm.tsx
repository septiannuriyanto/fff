import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../../db/SupabaseClient';
import { FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';
import { useAuth } from '../../../Authentication/AuthContext';

interface Manpower {
  nrp: string;
  nama: string;
}

interface CreateJobFormProps {
    onSuccess?: () => void;
    jobType: 'scheduled' | 'pending';
}

const CreateJobForm = ({ onSuccess, jobType }: CreateJobFormProps) => {
  const [manpowerList, setManpowerList] = useState<Manpower[]>([]);
  
  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignee, setAssignee] = useState('');
  const [selectedAssigneeNrp, setSelectedAssigneeNrp] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'>('NORMAL');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // UI State
  const [showAssigneeSuggestions, setShowAssigneeSuggestions] = useState(false);
  const assigneeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchManpower();
    
    const handleClickOutside = (event: MouseEvent) => {
      if (assigneeRef.current && !assigneeRef.current.contains(event.target as Node)) {
        setShowAssigneeSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchManpower = async () => {
    const { data } = await supabase.from('manpower').select('nrp, nama').eq('active', true);
    if (data) setManpowerList(data);
  };

  const { currentUser } = useAuth();

  const handleCreateJob = async () => {
    if (!title.trim()) {
        alert('Please enter a job title.');
        return;
    }

    setIsSubmitting(true);
    
    // Robust NRP capture
    const creatorNrp = currentUser?.nrp || localStorage.getItem('nrp');
    console.log('Creating job with creator NRP:', creatorNrp);

    const { error } = await supabase
      .from('board_jobs')
      .insert([
        {
          title: title,
          description: description,
          assignee_id: selectedAssigneeNrp,
          due_date: dueDate || null,
          priority: priority,
          created_by: creatorNrp
        }
      ]);

    setIsSubmitting(false);

    if (error) {
      console.error('Error creating job:', error);
      alert('Failed to create job.');
    } else {
      if(onSuccess) onSuccess();
    }
  };

  const filteredAssignees = manpowerList.filter(mp => 
    mp.nama && mp.nama.toLowerCase().includes(assignee.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full space-y-4 p-1 text-slate-700 dark:text-slate-200">
      <div className="bg-white dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
        {/* Subtle Decorative Background */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -mr-12 -mt-12 group-hover:scale-110 transition-transform duration-700"></div>
        
        <div className="flex items-center gap-2.5 mb-6">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shadow-lg ${jobType === 'scheduled' ? 'bg-blue-600 shadow-blue-500/20' : 'bg-orange-600 shadow-orange-500/20'}`}>
                <FaExclamationCircle className="text-white text-base" />
            </div>
            <div>
                <h3 className="font-bold text-sm tracking-tight">Initialize {jobType.charAt(0).toUpperCase() + jobType.slice(1)} Job</h3>
                <p className="text-[9px] text-slate-400 font-medium uppercase tracking-widest mt-0.5">Define core parameters</p>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          <div className="md:col-span-2">
            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1.5 ml-1 tracking-wider">Job Title / Unit Focus</label>
            <input 
                type="text" 
                value={title}
                onChange={e => setTitle(e.target.value)}
                autoFocus
                placeholder="E.g. Engine Overhaul HD785-7 (Unit 701)"
                className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all font-medium text-xs"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1.5 ml-1 tracking-wider">Work Description</label>
            <textarea 
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Briefly describe the scope of work..."
                rows={2}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all font-medium text-xs resize-none"
            />
          </div>

          <div className="relative" ref={assigneeRef}>
            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1.5 ml-1 tracking-wider">Lead Assignee (GL/PIC)</label>
            <div className="relative">
                <input 
                    type="text" 
                    value={assignee}
                    onChange={(e) => {
                        setAssignee(e.target.value);
                        setShowAssigneeSuggestions(true);
                        if(!e.target.value) setSelectedAssigneeNrp(null);
                    }}
                    onFocus={() => setShowAssigneeSuggestions(true)}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all font-medium text-xs"
                    placeholder="Search Lead Personnel..."
                />
                {showAssigneeSuggestions && assignee && (
                    <div className="absolute z-50 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl max-h-48 overflow-y-auto mt-2 p-1.5 scrollbar-hide animate-in slide-in-from-top-2 duration-200">
                        {filteredAssignees.map(mp => (
                            <div 
                                key={mp.nrp} 
                                className="px-3 py-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer text-[13px] transition-all flex items-center justify-between group/item"
                                onClick={() => {
                                    setAssignee(mp.nama);
                                    setSelectedAssigneeNrp(mp.nrp);
                                    setShowAssigneeSuggestions(false);
                                }}
                            >
                                <div className="flex flex-col">
                                    <span className="font-bold text-slate-700 dark:text-slate-200">{mp.nama}</span>
                                    <span className="text-[9px] text-slate-400 uppercase tracking-tighter">NRP {mp.nrp}</span>
                                </div>
                                <div className="w-4 h-4 rounded-full border border-slate-200 dark:border-slate-700 flex items-center justify-center group-hover/item:border-blue-500 group-hover/item:text-blue-500 transition-colors">
                                    <FaCheckCircle className="text-[8px] opacity-0 group-hover/item:opacity-100" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
          </div>

          <div>
            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1.5 ml-1 tracking-wider">Target Date</label>
            <input 
                type="date" 
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all font-medium text-xs"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-2 ml-1 tracking-wider">Priority Level</label>
            <div className="flex gap-2 p-1.5 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                {(['LOW', 'NORMAL', 'HIGH', 'URGENT'] as const).map((p) => (
                    <button
                        key={p}
                        onClick={() => setPriority(p)}
                        className={`flex-1 py-2 rounded-xl text-[9px] font-extrabold uppercase tracking-widest transition-all duration-300
                            ${priority === p 
                                ? p === 'URGENT' ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 
                                  p === 'HIGH' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 
                                  p === 'LOW' ? 'bg-slate-400 text-white shadow-lg shadow-slate-400/20' :
                                  'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-white/5'}`}
                    >
                        {p}
                    </button>
                ))}
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-50 dark:border-slate-800 pt-6">
            <div className="flex items-center gap-2 text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                <FaCheckCircle className="text-emerald-500" />
                Database ready for synchronization
            </div>
            <button 
                onClick={handleCreateJob}
                disabled={isSubmitting}
                className={`w-full sm:w-auto px-10 py-3 rounded-xl font-bold text-[10px] tracking-widest uppercase transition-all flex items-center justify-center gap-2.5 active:scale-95 shadow-xl ${
                    jobType === 'scheduled' 
                    ? 'bg-blue-600 text-white shadow-blue-500/20 hover:bg-blue-700' 
                    : 'bg-orange-600 text-white shadow-orange-500/20 hover:bg-orange-700'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
                {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                    <>CREATE JOB RECORD <FaCheckCircle className="text-sm opacity-50" /></>
                )}
            </button>
        </div>
      </div>
    </div>
  );
};

export default CreateJobForm;
