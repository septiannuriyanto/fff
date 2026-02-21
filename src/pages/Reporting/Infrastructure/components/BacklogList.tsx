import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../../db/SupabaseClient';
import { useTheme } from '../../../../contexts/ThemeContext';
import { FaSearch, FaExclamationTriangle, FaCheckCircle, FaClock, FaSpinner, FaCamera, FaTimes, FaCheck } from 'react-icons/fa';
import toast from 'react-hot-toast';

interface Backlog {
  id: string;
  title: string;
  description: string;
  risk_score: number;
  status: string;
  created_at: string;
  due_date: string | null;
  infra_locations: { name: string } | null;
}

const BacklogList: React.FC = () => {
  const { activeTheme } = useTheme();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [backlogs, setBacklogs] = useState<Backlog[]>([]);
  const [loading, setLoading] = useState(true);

  // Closing Dialog
  const [closingBacklog, setClosingBacklog] = useState<Backlog | null>(null);
  const [closingFile, setClosingFile] = useState<File | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchBacklogs = async () => {
    setLoading(true);
    let query = supabase
      .from('infra_backlogs')
      .select('id, title, description, risk_score, status, created_at, due_date, infra_locations(name)')
      .order('created_at', { ascending: false });

    if (filter !== 'all') query = query.eq('status', filter);

    const { data, error } = await query;
    if (!error && data) setBacklogs(data as unknown as Backlog[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchBacklogs();
  }, [filter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':     return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'progress': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      case 'closed':   return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      default:         return 'text-gray-500 bg-gray-500/10';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':     return <FaExclamationTriangle />;
      case 'progress': return <FaClock />;
      case 'closed':   return <FaCheckCircle />;
      default:         return null;
    }
  };

  const filtered = backlogs.filter(b =>
    b.title?.toLowerCase().includes(search.toLowerCase()) ||
    b.description?.toLowerCase().includes(search.toLowerCase()) ||
    b.infra_locations?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const handleCloseClick = (item: Backlog) => {
    setClosingBacklog(item);
    setClosingFile(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setClosingFile(e.target.files[0]);
    }
  };

  const submitCloseBacklog = async () => {
    if (!closingBacklog || !closingFile) return;
    
    setIsClosing(true);
    const toastId = toast.loading('Uploading evidence and closing...');

    try {
      // 1. Upload Photo
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) throw new Error('Authentication failed');

      // Use backlog ID as "inspection ID" context for storage organization
      const uploadUrl = `${import.meta.env.VITE_WORKER_URL}/upload/infra-inspection`;
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'X-Inspection-Id': closingBacklog.id, 
          'X-Item-Id': 'closing_evidence',
          'Content-Type': closingFile.type
        },
        body: closingFile
      });

      if (!uploadResponse.ok) throw new Error('Upload failed');
      const result = await uploadResponse.json();
      const photoUrl = (result.url && result.url.startsWith('http'))
        ? result.url
        : `${import.meta.env.VITE_WORKER_URL}/images/infra-inspection/${result.key}`;

      // 2. Call RPC
      const { error: rpcError } = await supabase.rpc('rpc_close_backlog', {
        p_backlog: closingBacklog.id,
        p_photo: photoUrl
      });

      if (rpcError) throw rpcError;

      toast.success('Backlog closed!', { id: toastId });
      setClosingBacklog(null);
      fetchBacklogs();

    } catch (e: any) {
      console.error(e);
      toast.error(`Error: ${e.message}`, { id: toastId });
    } finally {
      setIsClosing(false);
    }
  };

  return (
    <div className="animate-fade-in-up">
      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-4 mb-6 justify-between">
        <div className="relative flex-1 max-w-md">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search backlogs…"
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-white/10 bg-black/5 dark:bg-black/20 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'open', 'progress', 'closed'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg border capitalize font-medium text-sm transition-all ${
                filter === f ? 'bg-blue-600 text-white border-blue-600' : 'border-white/10 hover:bg-white/5'
              }`}>
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-12 opacity-60"><FaSpinner className="animate-spin text-2xl" /></div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="py-12 text-center opacity-40">
          <FaCheckCircle className="mx-auto text-3xl mb-3" />
          <p>No backlogs found.</p>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map(item => (
          <div key={item.id}
            className="p-4 rounded-xl border border-white/10 flex flex-col md:flex-row md:items-center justify-between hover:bg-white/5 transition-colors group gap-4"
            style={{ backgroundColor: activeTheme.container.color }}>
            
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border shrink-0 ${getStatusColor(item.status)}`}>
                {getStatusIcon(item.status)}
              </div>
              <div>
                <h4 className="font-bold group-hover:text-blue-500 transition-colors">{item.title || item.description}</h4>
                <div className="flex items-center gap-3 text-sm opacity-60">
                  <span>{item.infra_locations?.name ?? '–'}</span>
                  <span>•</span>
                  <span>{new Date(item.created_at).toLocaleDateString('id-ID')}</span>
                  {item.due_date && new Date(item.due_date) < new Date() && item.status !== 'closed' && (
                    <span className="text-red-400 font-bold">OVERDUE</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="font-bold text-sm opacity-60">Risk {item.risk_score}</span>
              <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${getStatusColor(item.status)}`}>
                {item.status}
              </div>
              {item.status !== 'closed' && (
                <button 
                  onClick={(e) => { e.stopPropagation(); handleCloseClick(item); }}
                  className="px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-colors text-sm font-bold flex items-center gap-1"
                >
                  <FaCheck /> Close
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Close Dialog */}
      {closingBacklog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
           <div className="w-full max-w-md rounded-2xl shadow-2xl border border-white/10 overflow-hidden animate-fade-in-up"
               style={{ background: activeTheme.container.color }}>
            <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5">
              <h3 className="text-lg font-bold">Close Backlog</h3>
              <button onClick={() => setClosingBacklog(null)} className="opacity-50 hover:opacity-100"><FaTimes /></button>
            </div>
            
            <div className="p-6 space-y-4">
              <p className="text-sm opacity-70">
                To close <strong>{closingBacklog.title}</strong>, please upload visual evidence that the issue has been resolved.
              </p>

              <div 
                className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors ${
                  closingFile ? 'border-emerald-500 bg-emerald-500/5' : 'border-white/20 hover:border-blue-500 hover:bg-blue-500/5'
                }`}
                onClick={() => fileInputRef.current?.click()}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleFileChange} 
                />
                
                {closingFile ? (
                  <>
                    <FaCheckCircle className="text-3xl text-emerald-500" />
                    <div className="text-center">
                      <p className="font-bold text-emerald-500">{closingFile.name}</p>
                      <p className="text-xs opacity-50">Click to change</p>
                    </div>
                  </>
                ) : (
                  <>
                    <FaCamera className="text-3xl opacity-50" />
                    <div className="text-center opacity-60">
                      <p className="font-bold">Upload Evidence</p>
                      <p className="text-xs">Click to browse photo</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="p-5 border-t border-white/10 flex gap-3">
              <button 
                onClick={() => setClosingBacklog(null)}
                className="flex-1 py-3 rounded-xl border border-white/10 font-bold hover:bg-white/5"
              >
                Cancel
              </button>
              <button 
                onClick={submitCloseBacklog}
                disabled={!closingFile || isClosing}
                className={`flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 ${
                  !closingFile || isClosing 
                    ? 'bg-white/5 opacity-50 cursor-not-allowed' 
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                {isClosing ? <FaSpinner className="animate-spin" /> : <FaCheck />}
                Confirm Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BacklogList;
