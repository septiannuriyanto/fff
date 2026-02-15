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
        .order('competency_name', { ascending: true })
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

        const uploadUrl = 'https://fff-worker.septian-nuryanto.workers.dev/upload/competency-document';
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
          : `https://fff-worker.septian-nuryanto.workers.dev/documents/competency/${uploadResult.key}`;
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
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div className="relative w-full max-w-sm">
          <input
            type="text"
            placeholder="Search competency..."
            className="w-full rounded-lg border border-stroke bg-transparent py-2 pl-4 pr-10 outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
           <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
            {searchTerm ? <button onClick={() => setSearchTerm('')}><FontAwesomeIcon icon={faTimes}/></button> : <FontAwesomeIcon icon={faMagnifyingGlass} />}
          </span>
        </div>
        
        {isSupervisor && (
          <button onClick={handleAssignClick} className="flex items-center gap-2 bg-primary px-4 py-2 text-white rounded-lg hover:bg-opacity-90 text-sm font-bold">
            <FontAwesomeIcon icon={faPlus} /> Assign New
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border border-stroke dark:border-strokedark bg-white dark:bg-boxdark">
        <table className="w-full table-auto">
          <thead>
            <tr className="bg-gray-2 text-left dark:bg-meta-4">
              <th className="px-4 py-3 font-semibold text-black dark:text-white text-xs uppercase">Competency</th>
              <th className="px-4 py-3 font-semibold text-black dark:text-white text-center text-xs uppercase">Obtained</th>
              <th className="px-4 py-3 font-semibold text-black dark:text-white text-center text-xs uppercase">Expired</th>
              <th className="px-4 py-3 font-semibold text-black dark:text-white text-center text-xs uppercase">Doc</th>
              <th className="px-4 py-3 font-semibold text-black dark:text-white text-center text-xs uppercase">Status</th>
              {isSupervisor && (
                <th className="px-4 py-3 font-semibold text-black dark:text-white text-center text-xs uppercase">Action</th>
              )}
            </tr>
          </thead>
          <tbody>
            {loading ? (
               <tr><td colSpan={isSupervisor ? 6 : 5} className="text-center py-8 text-slate-400">Loading...</td></tr>
            ) : data.length === 0 ? (
               <tr><td colSpan={isSupervisor ? 6 : 5} className="text-center py-8 text-slate-400">No competency records found.</td></tr>
            ) : (
              data.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-meta-4/20 text-sm border-t border-stroke dark:border-strokedark">
                  <td className="px-4 py-3 font-medium text-black dark:text-white">{item.competency_name}</td>
                  <td className="px-4 py-3 text-center">{item.obtained_date}</td>
                  <td className="px-4 py-3 text-center">{item.expired_date || '-'}</td>
                  <td className="px-4 py-3 text-center">
                    {item.document_url ? (
                      <button onClick={(e) => handleZoomUrl(e, item.document_url!, item.competency_name)} className="text-primary hover:underline text-xs font-bold">View</button>
                    ) : <span className="text-xs text-slate-300">N/A</span>}
                  </td>
                  <td className="px-4 py-3 text-center">{getStatusBadge(item.status)}</td>
                  
                  {isSupervisor && (
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => handleEditClick(item)} className="text-slate-400 hover:text-primary"><FontAwesomeIcon icon={faEdit}/></button>
                        <button onClick={() => handleDeleteClick(item)} className="text-slate-400 hover:text-danger"><FontAwesomeIcon icon={faTrash}/></button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

       {/* Pagination (Simplified) */}
       {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
           {[...Array(totalPages)].map((_, i) => (
             <button
                key={i}
                onClick={() => setCurrentPage(i + 1)}
                className={`w-8 h-8 rounded-full text-xs font-bold ${currentPage === i + 1 ? 'bg-primary text-white' : 'bg-gray-2 text-black dark:bg-meta-4 dark:text-white hover:bg-gray-300'}`}
             >
               {i + 1}
             </button>
           ))}
        </div>
      )}

      {/* Modal - Render only if open to save resources, but keep boolean check for logic */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-boxdark rounded-2xl w-full max-w-lg p-6 shadow-2xl animate-in zoom-in-95">
             <h3 className="text-lg font-bold text-black dark:text-white mb-4">{editingId ? 'Edit Competency' : 'Assign Competency'}</h3>
             <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold mb-1">Competency</label>
                  <select 
                    className="w-full rounded border-stroke bg-transparent py-2 px-3 outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4"
                    value={selectedCompId}
                    onChange={(e) => setSelectedCompId(Number(e.target.value))}
                  >
                    <option value="">Select...</option>
                    {competencies.map(c => <option key={c.id} value={c.id}>{c.competency_name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="block text-sm font-bold mb-1">Obtained</label>
                      <input type="date" className="w-full rounded border-stroke bg-transparent py-2 px-3 outline-none dark:border-strokedark dark:bg-meta-4" value={trainingDate} onChange={(e) => setTrainingDate(e.target.value)} />
                   </div>
                   <div>
                      <label className="block text-sm font-bold mb-1">Expired</label>
                      <input type="date" className="w-full rounded border-stroke bg-slate-100 py-2 px-3 outline-none dark:bg-slate-800 text-slate-500" value={expiredDate} disabled readOnly />
                   </div>
                </div>
                <div>
                   <label className="block text-sm font-bold mb-1">Document (PDF/Image)</label>
                   <input 
                     type="file" 
                     className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                     accept=".pdf,image/*"
                     onChange={(e) => e.target.files?.[0] && setSelectedFile(e.target.files[0])}
                   />
                   {previewUrl && (
                     <div className="mt-2 h-32 w-full rounded border border-dashed border-primary/50 flex items-center justify-center overflow-hidden bg-slate-50 relative group">
                        {selectedFile?.type === 'application/pdf' ? <FontAwesomeIcon icon={faFilePdf} className="text-3xl text-danger"/> : <img src={previewUrl} className="h-full object-contain"/>}
                        <button onClick={() => { setSelectedFile(null); setPreviewUrl(null); }} className="absolute bg-danger text-white rounded-full w-6 h-6 flex items-center justify-center top-1 right-1 shadow"><FontAwesomeIcon icon={faTimes} size="xs"/></button>
                     </div>
                   )}
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1">Note</label>
                  <textarea className="w-full rounded border-stroke bg-transparent py-2 px-3 outline-none dark:border-strokedark dark:bg-meta-4" rows={2} value={note} onChange={(e) => setNote(e.target.value)}></textarea>
                </div>
             </div>
             <div className="flex justify-end gap-2 mt-6">
               <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-black">Cancel</button>
               <button onClick={handleConfirmAssign} disabled={saving || !selectedCompId} className="px-4 py-2 text-sm font-bold bg-primary text-white rounded hover:bg-opacity-90 disabled:opacity-50">
                 {saving ? 'Saving...' : 'Save'}
               </button>
             </div>
          </div>
        </div>
      )}

      {/* Doc Viewer Modal */}
      {viewingDoc && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur">
           <div className="bg-white dark:bg-boxdark w-full max-w-4xl h-[80vh] rounded-lg shadow-2xl flex flex-col relative animate-in zoom-in-95">
              <div className="flex items-center justify-between p-4 border-b border-stroke dark:border-strokedark">
                <h3 className="font-bold">{viewingDoc.name}</h3>
                <button onClick={() => setViewingDoc(null)} className="text-slate-500 hover:text-black dark:text-slate-400 dark:hover:text-white"><FontAwesomeIcon icon={faTimes} size="lg"/></button>
              </div>
              <div className="flex-1 bg-slate-100 p-2 overflow-auto relative">
                 {viewingDoc.url?.toLowerCase().endsWith('.pdf') ? (
                    <embed src={viewingDoc.url} type="application/pdf" className="w-full h-full"/>
                 ) : (
                    <img src={viewingDoc.url} className="w-full h-full object-contain" />
                 )}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default ProfileCompetencyTab;
