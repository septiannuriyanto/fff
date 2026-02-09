import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../db/SupabaseClient';
import { 
    FaPlus, FaTimes, FaInbox, FaCalendarAlt, FaUser, 
    FaCheckCircle, FaTrash, FaStickyNote, FaTrafficLight 
} from 'react-icons/fa';

interface JobProgress {
    id: number;
    job_id: string;
    progress_description: string;
    pic: string;
    due_date: string | null;
    status: 'open' | 'closed';
    queue_num: number;
}

interface JobDetailProps {
    job: any;
    manpowerList: any[];
    onUpdate: () => void;
}

const JobDetail = ({ job, manpowerList, onUpdate }: JobDetailProps) => {
    const [items, setItems] = useState<JobProgress[]>([]);
    const [loading, setLoading] = useState(true);
    const [isClosing, setIsClosing] = useState(false);
    
    // Form state for new progress item
    const [showAddForm, setShowAddForm] = useState(false);
    const [newDesc, setNewDesc] = useState('');
    const [newPic, setNewPic] = useState(''); // Holds the display name
    const [selectedPicNrp, setSelectedPicNrp] = useState(''); // Holds the actual NRP
    const [newDueDate, setNewDueDate] = useState(new Date().toISOString().split('T')[0]);
    const [showPicSuggestions, setShowPicSuggestions] = useState(false);
    const picRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (picRef.current && !picRef.current.contains(event.target as Node)) {
                setShowPicSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        fetchProgress();
    }, [job.id]);

    const handleCloseJob = async () => {
        if (!confirm('Are you sure you want to CLOSE this job? This will mark the entire job as closed.')) return;
        
        setIsClosing(true);
        const { error } = await supabase
            .from('board_jobs')
            .update({ status: 'closed' })
            .eq('id', job.id);

        setIsClosing(false);
        if (error) {
            console.error('Error closing job:', error);
            alert('Failed to close job');
        } else {
            onUpdate();
        }
    };



    const fetchProgress = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('board_jobs_progress')
            .select('*')
            .eq('job_id', job.id)
            .order('queue_num', { ascending: true });

        if (error) {
            console.error('Error fetching job progress:', error);
        } else {
            setItems(data || []);
        }
        setLoading(false);
    };

    const handleAddItem = async () => {
        if (!newDesc.trim()) return;

        const nextQueue = items.length > 0 ? Math.max(...items.map(i => i.queue_num || 0)) + 1 : 1;

        const { error } = await supabase
            .from('board_jobs_progress')
            .insert([{
                job_id: job.id,
                progress_description: newDesc,
                pic: selectedPicNrp || newPic, // Use NRP if selected, fallback to text
                due_date: newDueDate || null,
                queue_num: nextQueue,
                status: 'open'
            }]);

        if (error) {
            console.error('Error adding progress item:', error);
            alert('Failed to add progress item');
        } else {
            setNewDesc('');
            setNewPic('');
            setSelectedPicNrp('');
            setNewDueDate(new Date().toISOString().split('T')[0]);
            setShowAddForm(false);
            fetchProgress();
            onUpdate();
        }
    };

    const toggleItemStatus = async (item: JobProgress) => {
        const newStatus = item.status === 'open' ? 'closed' : 'open';
        const { error } = await supabase
            .from('board_jobs_progress')
            .update({ status: newStatus })
            .eq('id', item.id);

        if (error) {
            console.error('Error updating status:', error);
        } else {
            fetchProgress();
            onUpdate();
        }
    };

    const deleteItem = async (itemId: number) => {
        if (!confirm('Are you sure you want to delete this item?')) return;

        const { error } = await supabase
            .from('board_jobs_progress')
            .delete()
            .eq('id', itemId);
        
        if (error) {
            console.error('Error deleting item:', error);
            alert('Failed to delete item');
        } else {
            fetchProgress();
            onUpdate();
        }
    };

    const getManpowerName = (nrp: string) => {
        const mp = manpowerList.find(m => m.nrp === nrp);
        return mp ? mp.nama : nrp;
    };

    // Calculate progress percentage
    const completedItems = items.filter(i => i.status === 'closed').length;
    const progressPercent = items.length > 0 ? Math.round((completedItems / items.length) * 100) : 0;

    return (
        <div className="flex flex-col h-full gap-6 relative bg-white dark:bg-slate-900 overflow-hidden">
            {loading ? (
                <div className="flex items-center justify-center h-full min-h-[400px]">
                    <div className="flex flex-col items-center gap-4">
                        <div className="h-16 w-16 animate-spin rounded-full border-4 border-solid border-blue-500 border-t-transparent"></div>
                        <p className="text-sm font-bold text-slate-600 dark:text-slate-400">Loading job details...</p>
                    </div>
                </div>
            ) : (
                <>
            {/* Elegant Modern Header Info */}
            <div className="flex flex-col gap-3 px-2">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                    <div className="md:col-span-4 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800 flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 mt-0.5">
                            <FaInbox size={14} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <span className="block text-[8px] text-slate-400 uppercase font-bold tracking-wider">Job Focus</span>
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 block break-words">{job.title}</span>
                        </div>
                    </div>
                    <div className="md:col-span-8 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800 flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5">
                            <FaStickyNote size={14} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <span className="block text-[8px] text-slate-400 uppercase font-bold tracking-wider">Work Scope / Description</span>
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 block leading-relaxed">{job.description || 'No additional work scope defined for this job.'}</span>
                        </div>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
                            <FaCalendarAlt size={14} />
                        </div>
                        <div>
                            <span className="block text-[8px] text-slate-400 uppercase font-bold tracking-wider">Target Date</span>
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 block">
                                {job.due_date ? new Date(job.due_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }) : 'NOT SET'}
                            </span>
                        </div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                            <FaUser size={14} />
                        </div>
                        <div className="truncate flex-1 min-w-0">
                            <span className="block text-[8px] text-slate-400 uppercase font-bold tracking-wider">Lead PIC</span>
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate block">{getManpowerName(job.assignee_id)}</span>
                        </div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                            <FaTrafficLight size={14} />
                        </div>
                        <div className="truncate">
                            <span className="block text-[8px] text-slate-400 uppercase font-bold tracking-wider">Priority</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase
                                ${job.priority === 'urgent' ? 'bg-red-100 text-red-600' : 
                                  job.priority === 'high' ? 'bg-orange-100 text-orange-600' : 
                                  job.priority === 'low' ? 'bg-slate-100 text-slate-500' :
                                  'bg-blue-100 text-blue-600'}`}>
                                {job.priority || 'normal'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Progress Bar Area */}
            <div className="px-2">
                <div className="flex justify-between items-end mb-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Overall Progress</span>
                    <span className="text-xs font-bold text-blue-600">{progressPercent}%</span>
                </div>
                <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-blue-600 transition-all duration-500 ease-out shadow-[0_0_10px_rgba(37,99,235,0.4)]"
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>
            </div>

            {/* Progress Updates Table Section */}
            <div className="flex-1 flex flex-col gap-4 px-2 min-h-0">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="flex flex-col">
                            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-widest flex items-center gap-2">
                                <FaStickyNote className="text-blue-500" size={14} />
                                Progress Reporting Log
                            </h4>
                            <p className="text-[10px] text-slate-400 font-medium uppercase mt-0.5 tracking-tighter">History of physical work updates for this job</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">

                        <button 
                            onClick={() => setShowAddForm(!showAddForm)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-500/20"
                        >
                            {showAddForm ? <FaTimes /> : <FaPlus />} {showAddForm ? 'CANCEL ENTRY' : 'REPORT PROGRESS'}
                        </button>
                        {job.status !== 'closed' && (
                            <button 
                                onClick={handleCloseJob}
                                disabled={isClosing}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-bold hover:bg-emerald-700 transition shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                            >
                                <FaCheckCircle /> {isClosing ? 'CLOSING...' : 'CLOSE JOB'}
                            </button>
                        )}
                    </div>
                </div>

                {showAddForm && (
                     <div className="bg-slate-50 dark:bg-slate-800/40 p-6 rounded-2xl border border-blue-100 dark:border-blue-900/40 animate-in fade-in slide-in-from-top-2">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                            <div className="md:col-span-1">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1">Report Date</label>
                                <input 
                                    type="date"
                                    className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 focus:border-blue-500 outline-none transition-all"
                                    value={newDueDate}
                                    onChange={e => setNewDueDate(e.target.value)}
                                />
                            </div>
                            <div className="md:col-span-1" ref={picRef}>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1">Field PIC</label>
                                <div className="relative">
                                    <input 
                                        type="text" 
                                        className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 focus:border-blue-500 outline-none transition-all"
                                        placeholder="Search Personnel..."
                                        value={newPic}
                                        onChange={(e) => {
                                            setNewPic(e.target.value);
                                            setShowPicSuggestions(true);
                                            if(!e.target.value) setSelectedPicNrp('');
                                        }}
                                        onFocus={() => setShowPicSuggestions(true)}
                                    />
                                    {showPicSuggestions && newPic && (
                                        <div className="absolute z-50 w-full mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl max-h-48 overflow-y-auto p-1.5 scrollbar-hide">
                                            {manpowerList
                                                .filter(m => m.nama?.toLowerCase().includes(newPic.toLowerCase()))
                                                .map(m => (
                                                    <div 
                                                        key={m.nrp} 
                                                        className="px-3 py-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer text-[12px] transition-all flex items-center justify-between group/pic"
                                                        onClick={() => {
                                                            setNewPic(m.nama);
                                                            setSelectedPicNrp(m.nrp);
                                                            setShowPicSuggestions(false);
                                                        }}
                                                    >
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-slate-700 dark:text-slate-200">{m.nama}</span>
                                                            <span className="text-[8px] text-slate-400 uppercase tracking-tighter">NRP {m.nrp}</span>
                                                        </div>
                                                        <FaCheckCircle className="text-[10px] text-blue-500 opacity-0 group-hover/pic:opacity-100" />
                                                    </div>
                                                ))}
                                            {manpowerList.filter(m => m.nama?.toLowerCase().includes(newPic.toLowerCase())).length === 0 && (
                                                <div className="p-4 text-center text-[10px] text-slate-400 uppercase font-bold tracking-widest">No results</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="md:col-span-3">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1">Work Description / Progress Detail</label>
                                <textarea 
                                    className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 focus:border-blue-500 outline-none transition-all resize-none"
                                    placeholder="Examples: Dismantling component X started, Reassembly reached 50%, etc."
                                    rows={2}
                                    value={newDesc}
                                    onChange={e => setNewDesc(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3">
                            <button 
                                onClick={() => setShowAddForm(false)}
                                className="px-6 py-2.5 text-slate-400 hover:text-slate-600 font-bold text-[10px] tracking-widest uppercase transition-all"
                            >
                                Discard
                            </button>
                            <button 
                                onClick={handleAddItem}
                                className="px-8 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-bold tracking-widest uppercase hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all active:scale-95"
                            >
                                SUBMIT REPORT
                            </button>
                        </div>
                     </div>
                )}

                <div className="flex-1 overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/50 shadow-sm flex flex-col">
                    <div className="overflow-y-auto flex-1 scrollbar-hide">
                        <table className="w-full text-left text-sm border-collapse min-w-[600px]">
                            <thead className="sticky top-0 z-10 bg-slate-50/80 dark:bg-slate-800/80 backdrop-blur-md">
                                <tr className="border-b border-slate-100 dark:border-slate-800">
                                    <th className="px-6 py-4 font-bold text-[10px] text-slate-400 uppercase tracking-widest w-12 text-center">No</th>
                                    <th className="px-6 py-4 font-bold text-[10px] text-slate-400 uppercase tracking-widest w-32">Date</th>
                                    <th className="px-6 py-4 font-bold text-[10px] text-slate-400 uppercase tracking-widest">Progress Description</th>
                                    <th className="px-6 py-4 font-bold text-[10px] text-slate-400 uppercase tracking-widest w-40">PIC</th>
                                    <th className="px-6 py-4 font-bold text-[10px] text-slate-400 uppercase tracking-widest text-center w-20">Status</th>
                                    <th className="px-6 py-4 font-bold text-[10px] text-slate-400 uppercase tracking-widest text-center w-20">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                                {loading ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fetching Logs...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : items.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-20 text-center">
                                            <div className="flex flex-col items-center justify-center text-slate-300 dark:text-slate-700">
                                                <FaStickyNote size={32} className="mb-4 opacity-10" />
                                                <p className="text-[11px] font-bold tracking-widest uppercase opacity-40">No progress reports found</p>
                                                <p className="text-[9px] text-slate-400 mt-1">Updates reported from the field will appear here</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    items.map((item, idx) => (
                                        <tr key={item.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all duration-200">
                                            <td className="px-6 py-4 text-center">
                                                <span className="text-[10px] font-bold text-slate-300 group-hover:text-blue-500 transition-colors">{(idx + 1).toString().padStart(2, '0')}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase">
                                                    {item.due_date ? new Date(item.due_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-xs font-medium text-slate-700 dark:text-slate-200 uppercase leading-relaxed">
                                                    {item.progress_description}
                                                </p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                                        <FaUser size={10} />
                                                    </div>
                                                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">{getManpowerName(item.pic)}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <button 
                                                    onClick={() => toggleItemStatus(item)}
                                                    className={`px-3 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-tighter transition-all
                                                        ${item.status === 'closed' 
                                                            ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' 
                                                            : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'}`}
                                                >
                                                    {item.status}
                                                </button>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <button 
                                                    onClick={() => deleteItem(item.id)}
                                                    className="p-2 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                                >
                                                    <FaTrash size={12} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
                </>
            )}
        </div>
    );
};

export default JobDetail;
