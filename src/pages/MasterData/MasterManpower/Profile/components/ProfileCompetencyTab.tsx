import { useEffect, useState } from 'react';
import { supabase } from '../../../../../db/SupabaseClient';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faMagnifyingGlass, 
  faTriangleExclamation, 
  faCircleCheck, 
  faClock,
  faPlus,
  faTimes,
  faFilePdf,
  faEdit,
  faTrash,
} from '@fortawesome/free-solid-svg-icons';
import Swal from 'sweetalert2';
import toast from 'react-hot-toast';
import { useAuth } from '../../../../Authentication/AuthContext';
import { SUPERVISOR } from '../../../../../store/roles';

interface CompetencyStatus {
  id: number;
  nrp: string;
  nama: string;
  competency_name: string;
  competency_id: number;
  obtained_date: string;
  expired_date: string | null;
  active: boolean;
  document_url: string | null;
  status: 'valid' | 'expired' | 'soon_expired';
  note?: string;
}

interface Competency {
  id: number;
  competency_name: string;
  days_active: number;
}

interface ProfileCompetencyTabProps {
  nrp: string;
}

const ProfileCompetencyTab = ({ nrp }: ProfileCompetencyTabProps) => {
  const { currentUser } = useAuth();
  const isSupervisor = currentUser && currentUser.role && SUPERVISOR.includes(currentUser.role);

  const [data, setData] = useState<CompetencyStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [totalCount, setTotalCount] = useState(0);

  // Assign Dialog State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [competencies, setCompetencies] = useState<Competency[]>([]);
  
  const [selectedCompId, setSelectedCompId] = useState<number | ''>('');
  const [trainingDate, setTrainingDate] = useState(new Date().toISOString().split('T')[0]);
  const [expiredDate, setExpiredDate] = useState('');
  const [note, setNote] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [viewingDoc, setViewingDoc] = useState<{ url?: string; file?: File; name: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCompetencyStatus();
  }, [currentPage, pageSize, searchTerm, nrp]);

  useEffect(() => {
    fetchMasterData();
  }, []);

  const fetchCompetencyStatus = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('v_competency_status')
        .select('*', { count: 'exact' })
        .eq('nrp', nrp); // Filter by NRP

      if (searchTerm) {
        query = query.ilike('competency_name', `%${searchTerm}%`);
      }

      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data: statusData, error, count } = await query
        .order('competency_id', { ascending: true })
        .range(from, to);

      if (error) throw error;
      
      const mappedData = (statusData || []).map((item: any) => ({
        ...item,
        document_url: item.document_url || (item.competency_history?.document_url) || null
      }));

      setData(mappedData);
      setTotalCount(count || 0);
    } catch (error: any) {
      toast.error('Failed to fetch competency: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchMasterData = async () => {
    try {
      const { data } = await supabase.from('competency').select('id, competency_name, days_active').eq('active', true).order('competency_name');
      setCompetencies(data || []);
    } catch (error: any) {
      console.error('Error fetching master data:', error);
    }
  };

  const handleAssignClick = () => {
    setEditingId(null);
    setSelectedCompId('');
    setNote('');
    setSelectedFile(null);
    setPreviewUrl(null);
    setViewingDoc(null);
    setTrainingDate(new Date().toISOString().split('T')[0]);
    setIsModalOpen(true);
  };

  const handleEditClick = (record: CompetencyStatus) => {
    setEditingId(record.id);
    setSelectedCompId(record.competency_id || '');
    setTrainingDate(record.obtained_date);
    setExpiredDate(record.expired_date || '');
    setNote(record.note || '');
    setSelectedFile(null);
    setPreviewUrl(record.document_url || null);
    setViewingDoc(null);
    setIsModalOpen(true);
  };

  const handleDeleteClick = async (item: CompetencyStatus) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
      const loadingToast = toast.loading('Deleting record...');
      try {
        const { error } = await supabase.rpc('delete_competency_data', {
          p_nrp: item.nrp,
          p_competency_id: item.competency_id
        });

        if (error) throw error;
        toast.success('Record deleted successfully', { id: loadingToast });
        
        setData(prev => prev.filter(row => row.competency_id !== item.competency_id));
        setTotalCount(prev => Math.max(0, prev - 1));
      } catch (error: any) {
        toast.error('Delete failed: ' + error.message, { id: loadingToast });
      }
    }
  };

  const handleConfirmAssign = async () => {
    if (!selectedCompId || !trainingDate) return toast.error('Please fill required fields');

    setSaving(true);
    const loadingToast = toast.loading(editingId ? 'Updating competency...' : 'Saving competency...');
    try {
      let document_url = previewUrl || '';

      if (selectedFile) {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session) throw new Error('Authentication failed');

        const uploadUrl = `${import.meta.env.VITE_WORKER_URL}/upload/competency-document`;
        const uploadResponse = await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'X-Competency-Id': selectedCompId.toString(),
            'X-Nrp': nrp,
            'X-File-Name': selectedFile.name,
            'Content-Type': selectedFile.type
          },
          body: selectedFile,
        });

        if (!uploadResponse.ok) throw new Error(await uploadResponse.text());
        const uploadResult = await uploadResponse.json();
        document_url = (uploadResult.url && uploadResult.url.startsWith('http'))
          ? uploadResult.url
          : `${import.meta.env.VITE_WORKER_URL}/documents/competency/${uploadResult.key}`;
      }

      const payload = {
        nrp: nrp,
        competency_id: selectedCompId,
        training_date: trainingDate,
        expired_date: expiredDate || null,
        note: note,
        document_url: document_url 
      };

      if (editingId) {
        const { error } = await supabase.from('competency_history').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('competency_history').insert([payload]);
        if (error) throw error;
      }

      toast.success(editingId ? 'Competency updated' : 'Competency assigned', { id: loadingToast });
      setIsModalOpen(false);
      fetchCompetencyStatus();
    } catch (error: any) {
      toast.error('Operation failed: ' + error.message, { id: loadingToast });
    } finally {
      setSaving(false);
    }
  };

  // Handle file preview
  useEffect(() => {
    if (!selectedFile) return;
    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);

  // Calculate Expiry
  useEffect(() => {
    if (selectedCompId && trainingDate) {
      const comp = competencies.find(c => c.id === selectedCompId);
      if (comp && comp.days_active && comp.days_active > 0) {
        const date = new Date(trainingDate);
        date.setDate(date.getDate() + comp.days_active);
        setExpiredDate(date.toISOString().split('T')[0]);
      } else {
        setExpiredDate('');
      }
    }
  }, [selectedCompId, trainingDate, competencies]);

  const totalPages = Math.ceil(totalCount / pageSize);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'valid': return <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-1 text-xs font-bold text-success border border-success/20"><FontAwesomeIcon icon={faCircleCheck} /> VALID</span>;
      case 'soon_expired': return <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-1 text-xs font-bold text-warning border border-warning/20"><FontAwesomeIcon icon={faClock} /> SOON EXPIRED</span>;
      case 'expired': return <span className="inline-flex items-center gap-1 rounded-full bg-danger/10 px-2 py-1 text-xs font-bold text-danger border border-danger/20"><FontAwesomeIcon icon={faTriangleExclamation} /> EXPIRED</span>;
      default: return null;
    }
  };

  const handleZoomUrl = (e: React.MouseEvent, url: string, name: string) => {
    e.stopPropagation();
    setViewingDoc({ url, name });
  };

  return (
    <div className="space-y-4">
      {/* Search and Action Bar - Glassmorphism */}
      <div className="flex flex-col md:flex-row justify-between gap-4 p-2 rounded-2xl bg-white/20 dark:bg-black/20 backdrop-blur-md border border-white/10 dark:border-white/5">
        <div className="relative w-full max-w-sm">
          <input
            type="text"
            placeholder="Search competency..."
            className="w-full rounded-xl border border-white/20 bg-white/40 dark:bg-black/40 py-2 pl-4 pr-10 outline-none focus:border-primary text-black dark:text-white placeholder-slate-500 backdrop-blur-sm transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
           <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
            {searchTerm ? <button onClick={() => setSearchTerm('')}><FontAwesomeIcon icon={faTimes}/></button> : <FontAwesomeIcon icon={faMagnifyingGlass} />}
          </span>
        </div>
        
        {isSupervisor && (
          <button onClick={handleAssignClick} className="flex items-center gap-2 bg-primary/80 backdrop-blur-sm hover:bg-primary px-4 py-2 text-white rounded-xl shadow-lg hover:shadow-primary/30 transition-all text-sm font-bold">
            <FontAwesomeIcon icon={faPlus} /> Assign New
          </button>
        )}
      </div>

      {/* Table Container - Glassmorphism */}
      <div className="overflow-hidden rounded-3xl border border-white/20 bg-white/20 dark:bg-black/20 backdrop-blur-xl shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full table-auto">
            <thead>
              <tr className="bg-white/40 dark:bg-black/40 text-left border-b border-white/10 text-slate-700 dark:text-slate-200">
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider w-20">ID</th>
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Competency</th>
                <th className="px-4 py-4 font-bold text-center text-xs uppercase tracking-wider">Obtained</th>
                <th className="px-4 py-4 font-bold text-center text-xs uppercase tracking-wider">Expired</th>
                <th className="px-4 py-4 font-bold text-center text-xs uppercase tracking-wider">Doc</th>
                <th className="px-4 py-4 font-bold text-center text-xs uppercase tracking-wider">Status</th>
                {isSupervisor && (
                  <th className="px-4 py-4 font-bold text-center text-xs uppercase tracking-wider">Action</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {loading ? (
                 <tr><td colSpan={isSupervisor ? 7 : 6} className="text-center py-12 text-slate-500 font-medium animate-pulse">Loading data...</td></tr>
              ) : data.length === 0 ? (
                 <tr><td colSpan={isSupervisor ? 7 : 6} className="text-center py-12 text-slate-500 font-medium">No competency records found.</td></tr>
              ) : (
                data.map((item, idx) => (
                  <tr key={idx} className="hover:bg-white/30 dark:hover:bg-white/5 transition-colors duration-200 text-sm group">
                    <td className="px-6 py-4 font-bold text-slate-500 text-xs font-mono">#{item.competency_id}</td>
                    <td className="px-6 py-4 font-semibold text-black dark:text-white">{item.competency_name}</td>
                    <td className="px-4 py-4 text-center text-slate-700 dark:text-slate-300">{item.obtained_date}</td>
                    <td className="px-4 py-4 text-center text-slate-700 dark:text-slate-300">{item.expired_date || '-'}</td>
                    <td className="px-4 py-4 text-center">
                      {item.document_url ? (
                        <button onClick={(e) => handleZoomUrl(e, item.document_url!, item.competency_name)} className="px-3 py-1 rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all text-xs font-bold">View</button>
                      ) : <span className="text-xs text-slate-400 italic">N/A</span>}
                    </td>
                    <td className="px-4 py-4 text-center">{getStatusBadge(item.status)}</td>
                    
                    {isSupervisor && (
                      <td className="px-4 py-4 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex justify-center gap-3">
                          <button onClick={() => handleEditClick(item)} className="text-slate-400 hover:text-primary transition-colors"><FontAwesomeIcon icon={faEdit} size="lg"/></button>
                          <button onClick={() => handleDeleteClick(item)} className="text-slate-400 hover:text-danger transition-colors"><FontAwesomeIcon icon={faTrash} size="lg"/></button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

       {/* Pagination - Glassmorphism */}
       {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
           {[...Array(totalPages)].map((_, i) => (
             <button
                key={i}
                onClick={() => setCurrentPage(i + 1)}
                className={`w-10 h-10 rounded-full text-xs font-bold shadow-lg transition-all transform hover:scale-110 ${currentPage === i + 1 ? 'bg-primary text-white scale-110' : 'bg-white/40 dark:bg-black/40 text-black dark:text-white hover:bg-white/60 backdrop-blur-sm'}`}
             >
               {i + 1}
             </button>
           ))}
        </div>
      )}

      {/* Modal - Use existing modal structure but enhanced with glassmorphism */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white/90 dark:bg-boxdark/90 backdrop-blur-xl rounded-2xl w-full max-w-lg p-8 shadow-2xl border border-white/20 animate-in zoom-in-95 ring-1 ring-white/20">
             <h3 className="text-xl font-bold text-black dark:text-white mb-6 border-b border-white/10 pb-4">{editingId ? 'Edit Competency' : 'Assign Competency'}</h3>
             <div className="space-y-5">
                <div>
                  <label className="block text-sm font-bold mb-2 text-slate-700 dark:text-slate-300">Competency</label>
                  <select 
                    className="w-full rounded-xl border border-stroke bg-white/50 py-3 px-4 outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4/50 focus:ring-2 focus:ring-primary/20 transition-all"
                    value={selectedCompId}
                    onChange={(e) => setSelectedCompId(Number(e.target.value))}
                  >
                    <option value="">Select competency...</option>
                    {competencies.map(c => <option key={c.id} value={c.id}>{c.competency_name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-5">
                   <div>
                      <label className="block text-sm font-bold mb-2 text-slate-700 dark:text-slate-300">Obtained</label>
                      <input type="date" className="w-full rounded-xl border border-stroke bg-white/50 py-3 px-4 outline-none dark:border-strokedark dark:bg-meta-4/50 focus:ring-2 focus:ring-primary/20 transition-all" value={trainingDate} onChange={(e) => setTrainingDate(e.target.value)} />
                   </div>
                   <div>
                      <label className="block text-sm font-bold mb-2 text-slate-700 dark:text-slate-300">Expired</label>
                      <input type="date" className="w-full rounded-xl border border-stroke bg-slate-100/50 py-3 px-4 outline-none dark:bg-slate-800/50 text-slate-500 cursor-not-allowed" value={expiredDate} disabled readOnly />
                   </div>
                </div>
                <div>
                   <label className="block text-sm font-bold mb-2 text-slate-700 dark:text-slate-300">Document</label>
                   <div className="relative">
                     <input 
                       type="file" 
                       className="w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-5 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                       accept=".pdf,image/*"
                       onChange={(e) => e.target.files?.[0] && setSelectedFile(e.target.files[0])}
                     />
                   </div>
                   {previewUrl && (
                     <div className="mt-3 h-32 w-full rounded-xl border-2 border-dashed border-primary/30 flex items-center justify-center overflow-hidden bg-slate-50/50 relative group">
                        {selectedFile?.type === 'application/pdf' ? <FontAwesomeIcon icon={faFilePdf} className="text-4xl text-danger drop-shadow-md"/> : <img src={previewUrl} className="h-full object-contain drop-shadow-md"/>}
                        <button onClick={() => { setSelectedFile(null); setPreviewUrl(null); }} className="absolute bg-white text-danger rounded-full w-8 h-8 flex items-center justify-center top-2 right-2 shadow-lg hover:scale-110 transition-transform"><FontAwesomeIcon icon={faTimes}/></button>
                     </div>
                   )}
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2 text-slate-700 dark:text-slate-300">Note</label>
                  <textarea className="w-full rounded-xl border border-stroke bg-white/50 py-3 px-4 outline-none dark:border-strokedark dark:bg-meta-4/50 focus:ring-2 focus:ring-primary/20 transition-all" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note..."></textarea>
                </div>
             </div>
             <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-white/10">
               <button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-slate-500 hover:text-black dark:hover:text-white transition-colors">Cancel</button>
               <button onClick={handleConfirmAssign} disabled={saving || !selectedCompId} className="px-6 py-2.5 text-sm font-bold bg-primary text-white rounded-xl hover:bg-primary/90 disabled:opacity-50 shadow-lg hover:shadow-primary/30 transition-all transform hover:translate-y-[-1px]">
                 {saving ? 'Saving...' : 'Save Record'}
               </button>
             </div>
          </div>
        </div>
      )}

      {/* Doc Viewer Modal */}
      {viewingDoc && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
           <div className="bg-white/95 dark:bg-boxdark/95 w-full max-w-4xl h-[85vh] rounded-2xl shadow-2xl flex flex-col relative animate-in zoom-in-95 border border-white/20">
              <div className="flex items-center justify-between p-5 border-b border-stroke dark:border-strokedark">
                <h3 className="font-bold text-lg">{viewingDoc.name}</h3>
                <button onClick={() => setViewingDoc(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-meta-4 dark:hover:bg-gray-700 transition-colors"><FontAwesomeIcon icon={faTimes}/></button>
              </div>
              <div className="flex-1 bg-slate-100/50 p-4 overflow-auto relative rounded-b-2xl">
                 {viewingDoc.url?.toLowerCase().endsWith('.pdf') ? (
                    <embed src={viewingDoc.url} type="application/pdf" className="w-full h-full rounded-lg shadow-inner"/>
                 ) : (
                    <img src={viewingDoc.url} className="w-full h-full object-contain rounded-lg shadow-md" />
                 )}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default ProfileCompetencyTab;
