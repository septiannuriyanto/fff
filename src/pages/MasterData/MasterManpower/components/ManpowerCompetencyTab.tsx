import { useEffect, useState } from 'react';
import { supabase } from '../../../../db/SupabaseClient';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faMagnifyingGlass, 
  faTriangleExclamation, 
  faCircleCheck, 
  faClock,
  faPlus,
  faTimes,
  faUserPlus,
  faCalendarAlt,
  faStickyNote,
  faCheckCircle,
  faFilePdf,
  faEye,
  faExpand,
  faEdit,
  faTrash,
  faChevronLeft,
  faChevronRight
} from '@fortawesome/free-solid-svg-icons';
import Swal from 'sweetalert2';
import toast from 'react-hot-toast';
import { useTheme } from '../../../../contexts/ThemeContext';

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

interface Manpower {
  nrp: string;
  nama: string;
}

interface ManpowerCompetencyTabProps {
  initialSearchTerm?: string;
}

const ManpowerCompetencyTab = ({ initialSearchTerm = '' }: ManpowerCompetencyTabProps) => {
  const { activeTheme } = useTheme();
  const isDark = activeTheme.baseTheme === 'dark';
  const containerBg = activeTheme.container.color;
  const containerText = activeTheme.container.textColor;
  const containerBorder = activeTheme.container.borderColor;
  const headerBg = isDark ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.03)';
  const rowHover = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.025)';

  const [data, setData] = useState<CompetencyStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [searchInput, setSearchInput] = useState(initialSearchTerm);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);

  // Assign Dialog State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [step, setStep] = useState(1); // 1: Setup, 2: Summary
  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [manpowerList, setManpowerList] = useState<Manpower[]>([]);
  
  const [selectedCompId, setSelectedCompId] = useState<number | ''>('');
  const [selectedNrp, setSelectedNrp] = useState<string>('');
  const [mpSearchTerm, setMpSearchTerm] = useState('');
  const [trainingDate, setTrainingDate] = useState(new Date().toISOString().split('T')[0]);
  const [expiredDate, setExpiredDate] = useState('');
  const [note, setNote] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [viewingDoc, setViewingDoc] = useState<{ url?: string; file?: File; name: string } | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // If props change, update state
    if (initialSearchTerm) {
      setSearchTerm(initialSearchTerm);
      setSearchInput(initialSearchTerm);
    }
  }, [initialSearchTerm]);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchTerm(searchInput);
    }, 500);

    return () => clearTimeout(handler);
  }, [searchInput]);

  useEffect(() => {
    fetchCompetencyStatus();
  }, [currentPage, pageSize, searchTerm]);

  useEffect(() => {
    fetchMasterData();
  }, []);

  const fetchCompetencyStatus = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('v_competency_status')
        .select('*', { count: 'exact' });

      if (searchTerm) {
        query = query.or(`nama.ilike.%${searchTerm}%,competency_name.ilike.%${searchTerm}%,nrp.ilike.%${searchTerm}%`);
      }

      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data: statusData, error, count } = await query
        .order('nama', { ascending: true })
        .range(from, to);

      if (error) throw error;
      
      // Flatten or ensure document_url is present from the join
      const mappedData = (statusData || []).map((item: any) => ({
        ...item,
        document_url: item.document_url || (item.competency_history?.document_url) || null
      }));

      setData(mappedData);
      setTotalCount(count || 0);
    } catch (error: any) {
      toast.error('Failed to fetch competency status: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchMasterData = async () => {
    try {
      const [compRes, mpRes] = await Promise.all([
        supabase.from('competency').select('id, competency_name, days_active').eq('active', true).order('competency_name'),
        supabase.from('manpower').select('nrp, nama').eq('active', true).order('nama')
      ]);
      setCompetencies(compRes.data || []);
      setManpowerList(mpRes.data || []);
    } catch (error: any) {
      console.error('Error fetching master data:', error);
    }
  };

  const handleAssignClick = () => {
    setEditingId(null);
    setStep(1);
    setSelectedCompId('');
    setSelectedNrp('');
    setNote('');
    setMpSearchTerm('');
    setShowSuggestions(false);
    setSelectedFile(null);
    setPreviewUrl(null);
    setViewingDoc(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (record: CompetencyStatus) => {
    setEditingId(record.id);
    setStep(1);
    setSelectedCompId(record.competency_id || '');
    setSelectedNrp(record.nrp);
    setTrainingDate(record.obtained_date);
    setExpiredDate(record.expired_date || '');
    setNote(record.note || '');
    setMpSearchTerm('');
    setShowSuggestions(false);
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
        
        // Remove from UI immediately without reloading
        setData(prev => prev.filter(row => row.nrp !== item.nrp || row.competency_id !== item.competency_id));
        setTotalCount(prev => Math.max(0, prev - 1));
      } catch (error: any) {
        toast.error('Delete failed: ' + error.message, { id: loadingToast });
      }
    }
  };

  const isStep1Valid = selectedCompId && selectedNrp && trainingDate;

  const handleNextStep = () => {
    if (!isStep1Valid) return toast.error('Please fill all required fields');
    setStep(2);
  };

  const handleConfirmAssign = async () => {
    setSaving(true);
    const loadingToast = toast.loading(editingId ? 'Updating competency...' : 'Saving competency history...');
    try {
      let document_url = previewUrl || '';

      if (selectedFile) {
        // 1. Get Session for JWT
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session) {
          throw new Error('Authentication failed. Please log in again.');
        }

        // 2. Upload to Worker
        const uploadUrl = `${import.meta.env.VITE_WORKER_URL}/upload/competency-document`;
        const uploadResponse = await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'X-Competency-Id': selectedCompId.toString(),
            'X-Nrp': selectedNrp,
            'X-File-Name': selectedFile.name,
            'Content-Type': selectedFile.type
          },
          body: selectedFile,
        });

        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text();
          throw new Error(`Upload failed: ${errorText}`);
        }

        const uploadResult = await uploadResponse.json();
        document_url = (uploadResult.url && uploadResult.url.startsWith('http'))
          ? uploadResult.url
          : `${import.meta.env.VITE_WORKER_URL}/documents/competency/${uploadResult.key}`;
      }

      const payload = {
        nrp: selectedNrp,
        competency_id: selectedCompId,
        training_date: trainingDate,
        expired_date: expiredDate || null,
        note: note,
        document_url: document_url 
      };

      if (editingId) {
        const { error } = await supabase
          .from('competency_history')
          .update(payload)
          .eq('id', editingId);
        if (error) throw error;
        toast.success(`Successfully updated competency`, { id: loadingToast });
      } else {
        const { error } = await supabase
          .from('competency_history')
          .insert([payload]);
        if (error) throw error;
        toast.success(`Successfully assigned competency`, { id: loadingToast });
      }

      setIsModalOpen(false);
      fetchCompetencyStatus();
    } catch (error: any) {
      toast.error((editingId ? 'Update failed: ' : 'Assignment failed: ') + error.message, { id: loadingToast });
    } finally {
      setSaving(false);
    }
  };

  // Handle file changes and generate preview
  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);
    
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [selectedFile]);

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
    } else {
      setExpiredDate('');
    }
  }, [selectedCompId, trainingDate, competencies]);

  const totalPages = Math.ceil(totalCount / pageSize);
  const startIndex = (currentPage - 1) * pageSize;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, pageSize]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'valid':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-xs font-bold text-success border border-success/20">
            <FontAwesomeIcon icon={faCircleCheck} /> VALID
          </span>
        );
      case 'soon_expired':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/10 px-3 py-1 text-xs font-bold text-warning border border-warning/20">
            <FontAwesomeIcon icon={faClock} /> SOON EXPIRED
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-danger/10 px-3 py-1 text-xs font-bold text-danger border border-danger/20">
            <FontAwesomeIcon icon={faTriangleExclamation} /> EXPIRED
          </span>
        );
      default:
        return null;
    }
  };

  const handleZoomFile = (e: React.MouseEvent, file: File) => {
    e.stopPropagation();
    setViewingDoc({ file, name: file.name });
  };

  const handleZoomUrl = (e: React.MouseEvent, url: string, name: string) => {
    e.stopPropagation();
    setViewingDoc({ url, name });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative w-full max-w-md">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-bodydark2">
            <FontAwesomeIcon icon={faMagnifyingGlass} />
          </span>
          <input
            type="text"
            placeholder="Search by name, NRP, or competency..."
            className="w-full rounded-lg border py-2.5 pl-12 pr-10 outline-none focus:border-primary transition"
            style={{ 
              backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'transparent',
              borderColor: containerBorder,
              color: containerText
            }}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-danger transition-colors p-1"
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-2">
            <div className="flex items-center gap-1"><div className="h-2 w-2 rounded-full bg-success"></div> Valid</div>
            <div className="flex items-center gap-1"><div className="h-2 w-2 rounded-full bg-warning"></div> Expired Soon</div>
            <div className="flex items-center gap-1"><div className="h-2 w-2 rounded-full bg-danger"></div> Expired</div>
          </div>
          
          <div className="flex items-center rounded-lg border px-3 py-2 text-sm font-medium" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#fff', borderColor: containerBorder }}>
            <span className="text-slate-400 mr-2">Show:</span>
            <select 
              className="bg-transparent outline-none cursor-pointer font-bold text-primary"
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
            >
              <option value={20} style={{ backgroundColor: containerBg, color: containerText }}>20</option>
              <option value={50} style={{ backgroundColor: containerBg, color: containerText }}>50</option>
              <option value={100} style={{ backgroundColor: containerBg, color: containerText }}>100</option>
            </select>
          </div>

          <button
            onClick={handleAssignClick}
            className="flex items-center gap-2 bg-primary px-4 py-2 text-white rounded-lg hover:bg-opacity-90 transition shadow-lg shadow-primary/20 text-sm font-bold"
          >
            <FontAwesomeIcon icon={faPlus} />
            Assign Competency
          </button>
        </div>
      </div>

      <div className="relative overflow-visible rounded-lg shadow-sm" style={{ backgroundColor: containerBg, border: `1px solid ${containerBorder}` }}>
        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 z-20 backdrop-blur-[2px] flex flex-col items-center justify-center transition-all duration-300" style={{ backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.3)' }}>
            <div className="flex flex-col items-center gap-2">
              <div className="h-10 w-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
              <p className="text-xs font-bold text-primary animate-pulse uppercase tracking-widest">Searching records...</p>
            </div>
          </div>
        )}

        <div className={`overflow-x-auto min-h-[350px] transition-all duration-300 ${loading ? 'opacity-50 grayscale-[0.2]' : 'opacity-100'}`}>
          <table className="w-full table-auto">
            <thead>
              <tr className="text-left" style={{ backgroundColor: headerBg }}>
                {['Manpower', 'Competency'].map(h => (
                  <th key={h} className="px-6 py-4 font-semibold uppercase text-xs tracking-wider" style={{ color: containerText }}>{h}</th>
                ))}
                {['Obtained', 'Expired', 'Doc', 'Status'].map(h => (
                  <th key={h} className="px-6 py-4 font-semibold text-center uppercase text-xs tracking-wider" style={{ color: containerText }}>{h}</th>
                ))}
                <th className="px-6 py-4 font-semibold text-center uppercase text-xs tracking-wider" style={{ color: containerText }}>Actions</th>
              </tr>
            </thead>
            <tbody style={{ backgroundColor: containerBg }}>
              {data.length === 0 && !loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    No records found.
                  </td>
                </tr>
              ) : (
                data.map((item, index) => (
                  <tr 
                    key={`${item.id}-${index}`} 
                    className="transition-colors text-sm"
                    style={{ borderBottom: `1px solid ${containerBorder}` }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = rowHover)}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <td className="px-6 py-4">
                      <div className="font-bold uppercase" style={{ color: containerText }}>{item.nama}</div>
                      <div className="text-[10px] text-slate-400 font-mono tracking-tighter">{item.nrp}</div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-primary">{item.competency_name}</td>
                    <td className="px-6 py-4 text-center font-medium" style={{ color: containerText }}>{item.obtained_date}</td>
                    <td className="px-6 py-4 text-center font-medium" style={{ color: containerText }}>{item.expired_date || 'Unlimited'}</td>
                    <td className="px-6 py-4 text-center">
                      {item.document_url ? (
                        <button
                          onClick={(e) => handleZoomUrl(e, item.document_url!, `${item.nama} - ${item.competency_name}`)}
                          className="font-bold text-primary hover:text-primary/70 transition-colors py-1 px-2 hover:bg-primary/5 rounded-md"
                        >
                          View
                        </button>
                      ) : (
                        <span className="text-slate-300 text-xs italic">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {getStatusBadge(item.status)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEditClick(item)}
                          className="p-2 text-slate-400 hover:text-primary transition-all duration-200"
                          title="Edit Record"
                        >
                          <FontAwesomeIcon icon={faEdit} className="text-base" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(item)}
                          className="p-2 text-slate-400 hover:text-danger transition-all duration-200"
                          title="Delete Record"
                        >
                          <FontAwesomeIcon icon={faTrash} className="text-base" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      <div 
        className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 rounded-lg shadow-sm"
        style={{ backgroundColor: containerBg, border: `1px solid ${containerBorder}` }}
      >
        <div className="text-sm font-medium" style={{ color: containerText, opacity: 0.6 }}>
          Showing <span className="font-bold" style={{ color: containerText }}>{startIndex + 1}</span> to <span className="font-bold" style={{ color: containerText }}>{Math.min(startIndex + pageSize, totalCount)}</span> of <span className="font-bold" style={{ color: containerText }}>{totalCount}</span> results
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2
              ${currentPage === 1 ? 'opacity-40 cursor-not-allowed' : 'hover:bg-primary hover:text-white hover:border-primary'}
            `}
            style={{ border: `1px solid ${containerBorder}`, color: containerText, backgroundColor: isDark && currentPage === 1 ? 'rgba(255,255,255,0.02)' : undefined }}
          >
            <FontAwesomeIcon icon={faChevronLeft} className="text-xs" /> Previous
          </button>
          
          <div className="flex items-center gap-1">
            {[...Array(totalPages)].map((_, i) => {
              const pageNum = i + 1;
              if (
                totalPages <= 5 ||
                pageNum === 1 ||
                pageNum === totalPages ||
                (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
              ) {
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`h-9 w-9 rounded-lg text-sm font-bold transition-all
                      ${currentPage === pageNum 
                        ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                        : 'hover:bg-primary/5'}
                    `}
                    style={{ 
                      border: currentPage === pageNum ? 'none' : `1px solid ${containerBorder}`,
                      color: currentPage === pageNum ? '#fff' : containerText,
                      backgroundColor: currentPage === pageNum ? undefined : isDark ? 'rgba(255,255,255,0.03)' : '#fff'
                    }}
                  >
                    {pageNum}
                  </button>
                );
              } else if (
                (pageNum === 2 && currentPage > 3) ||
                (pageNum === totalPages - 1 && currentPage < totalPages - 2)
              ) {
                return <span key={pageNum} className="px-1 text-slate-400">...</span>;
              }
              return null;
            })}
          </div>
          
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages || totalPages === 0}
            className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2
              ${currentPage === totalPages || totalPages === 0 ? 'opacity-40 cursor-not-allowed' : 'hover:bg-primary hover:text-white hover:border-primary'}
            `}
            style={{ border: `1px solid ${containerBorder}`, color: containerText, backgroundColor: isDark && (currentPage === totalPages || totalPages === 0) ? 'rgba(255,255,255,0.02)' : undefined }}
          >
            Next <FontAwesomeIcon icon={faChevronRight} className="text-xs" />
          </button>
        </div>
      </div>

      {/* Assignment Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !saving && setIsModalOpen(false)}></div>
          
          <div 
            className="relative w-full max-w-2xl rounded-2xl p-6 shadow-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
            style={{ backgroundColor: containerBg }}
          >
            <div className="flex items-center justify-between mb-6 pb-4" style={{ borderBottom: `1px solid ${containerBorder}` }}>
              <div>
                <h3 className="text-xl font-bold" style={{ color: containerText }}>
                  {editingId ? 'Edit Competency Record' : 'Assign Competency'}
                </h3>
                <p className="text-xs mt-1" style={{ color: containerText, opacity: 0.5 }}>
                  {editingId ? 'Modify existing competency details' : 'Record new training/competency for manpower'}
                </p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10" 
                style={{ color: containerText }}
                disabled={saving}
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>

            {step === 1 ? (
              <div className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-bold italic" style={{ color: containerText }}>
                      1. Select Competency <span className="text-danger">*</span>
                    </label>
                    <select 
                      className="w-full rounded-xl border py-3 px-5 outline-none focus:border-primary font-medium"
                      style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'transparent', borderColor: containerBorder, color: containerText }}
                      value={selectedCompId}
                      onChange={(e) => setSelectedCompId(Number(e.target.value))}
                    >
                      <option value="" style={{ backgroundColor: containerBg }}>-- Choose Competency --</option>
                      {competencies.map(c => <option key={c.id} value={c.id} style={{ backgroundColor: containerBg }}>{c.competency_name}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold flex items-center gap-2" style={{ color: containerText }}>
                      <FontAwesomeIcon icon={faCalendarAlt} className="text-primary" /> Obtained Date
                    </label>
                    <input 
                      type="date"
                      className="w-full rounded-xl border py-3 px-5 outline-none focus:border-primary"
                      style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'transparent', borderColor: containerBorder, color: containerText }}
                      value={trainingDate}
                      onChange={(e) => setTrainingDate(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold flex items-center gap-2" style={{ color: containerText }}>
                      <FontAwesomeIcon icon={faCalendarAlt} className="text-slate-400" /> Expired Date (Auto)
                    </label>
                    <input 
                      type="date"
                      className="w-full rounded-xl py-3 px-5 outline-none cursor-not-allowed opacity-60"
                      style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#f9fafb', border: `1px solid ${containerBorder}`, color: containerText }}
                      value={expiredDate}
                      readOnly
                      disabled
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-bold italic" style={{ color: containerText }}>
                      2. Select Manpower <span className="text-danger">*</span>
                    </label>
                    <div className="relative">
                      <div className="relative group">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                          <FontAwesomeIcon icon={faMagnifyingGlass} />
                        </span>
                        <input 
                          type="text"
                          placeholder="Search name or NRPSID..."
                          className={`w-full rounded-xl border py-3 pl-12 pr-10 outline-none focus:border-primary transition-all shadow-sm
                            ${selectedNrp ? 'font-bold text-primary' : ''}
                          `}
                          style={{ 
                            backgroundColor: selectedNrp ? 'rgba(59,90,246,0.05)' : isDark ? 'rgba(255,255,255,0.05)' : '#fff',
                            borderColor: selectedNrp ? 'var(--color-primary)' : containerBorder,
                            color: selectedNrp ? undefined : containerText
                          }}
                          value={selectedNrp && !showSuggestions 
                            ? manpowerList.find(m => m.nrp === selectedNrp)?.nama 
                            : mpSearchTerm
                          }
                          onChange={(e) => {
                            setMpSearchTerm(e.target.value);
                            setShowSuggestions(true);
                          }}
                          onFocus={() => setShowSuggestions(true)}
                        />
                        {(mpSearchTerm || selectedNrp) && (
                          <button 
                            type="button"
                            onClick={() => {
                              setSelectedNrp('');
                              setMpSearchTerm('');
                              setShowSuggestions(true);
                            }}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-danger transition-colors p-1"
                          >
                            <FontAwesomeIcon icon={faTimes} />
                          </button>
                        )}
                      </div>

                      {/* Suggestions Dropdown */}
                      {showSuggestions && mpSearchTerm.trim() !== '' && (
                        <div 
                          className="absolute left-0 right-0 top-full mt-2 z-[99999] max-h-56 overflow-y-auto border rounded-xl shadow-2xl custom-scrollbar animate-in fade-in slide-in-from-top-2 duration-150"
                          style={{ backgroundColor: containerBg, borderColor: containerBorder }}
                        >
                          {manpowerList
                            .filter(m => 
                              (m.nama?.toLowerCase() || '').includes(mpSearchTerm.toLowerCase()) || 
                              (m.nrp?.toLowerCase() || '').includes(mpSearchTerm.toLowerCase())
                            )
                            .map(m => (
                              <button
                                key={m.nrp}
                                type="button"
                                onClick={() => {
                                  setSelectedNrp(m.nrp);
                                  setMpSearchTerm('');
                                  setShowSuggestions(false);
                                }}
                                className="w-full flex items-center justify-between p-3 border-b last:border-0 transition-colors text-left"
                                style={{ borderBottomColor: containerBorder, backgroundColor: selectedNrp === m.nrp ? rowHover : 'transparent' }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = rowHover}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = selectedNrp === m.nrp ? rowHover : 'transparent'}
                              >
                                <div className="flex flex-col">
                                  <span className="text-sm font-bold uppercase" style={{ color: containerText }}>{m.nama}</span>
                                  <span className="text-[10px] text-slate-500 font-mono tracking-tighter italic">NRPSID: {m.nrp}</span>
                                </div>
                                {selectedNrp === m.nrp && (
                                  <FontAwesomeIcon icon={faCheckCircle} className="text-primary" />
                                )}
                              </button>
                            ))}
                          {manpowerList.filter(m => 
                            (m.nama?.toLowerCase() || '').includes(mpSearchTerm.toLowerCase()) || 
                            (m.nrp?.toLowerCase() || '').includes(mpSearchTerm.toLowerCase())
                          ).length === 0 && (
                            <div className="p-4 text-center text-xs text-slate-400 italic">No person found match "{mpSearchTerm}"</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-bold italic" style={{ color: containerText }}>
                      3. Training Document (PDF/Image) <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <div 
                      className={`relative border-2 border-dashed rounded-xl p-8 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer
                        ${selectedFile ? 'border-success bg-success/5' : 'hover:bg-primary/5'}
                      `}
                      style={{ 
                        borderColor: selectedFile ? undefined : containerBorder,
                        backgroundColor: selectedFile ? undefined : isDark ? 'rgba(255,255,255,0.02)' : 'transparent'
                      }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const file = e.dataTransfer.files[0];
                        if (file && (file.type === 'application/pdf' || file.type.startsWith('image/'))) {
                          setSelectedFile(file);
                        } else {
                          toast.error('Only PDF or Image files are allowed');
                        }
                      }}
                      onClick={() => document.getElementById('file-upload')?.click()}
                    >
                      <input 
                        id="file-upload" 
                        type="file" 
                        className="hidden" 
                        accept=".pdf,image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) setSelectedFile(file);
                        }}
                      />
                       {selectedFile ? (
                        <div className="flex flex-col items-center gap-4 w-full">
                          <div 
                            className="relative group/preview w-full max-w-xl h-80 md:h-96 rounded-2xl overflow-hidden border-2 shadow-2xl cursor-zoom-in flex items-center justify-center p-2"
                            style={{ backgroundColor: headerBg, borderColor: containerBorder }}
                            onClick={(e) => selectedFile && handleZoomFile(e, selectedFile)}
                          >
                            {selectedFile.type === 'application/pdf' ? (
                              <div className="w-full h-full pointer-events-none" style={{ backgroundColor: isDark ? 'rgba(0,0,0,0.1)' : '#fff' }}>
                                <embed 
                                  src={`${previewUrl}#toolbar=0&navpanes=0&scrollbar=0&view=Fit`} 
                                  type="application/pdf"
                                  className="w-full h-full rounded-xl"
                                />
                              </div>
                            ) : previewUrl ? (
                              <img src={previewUrl} alt="Preview" className="w-full h-full object-contain transition-transform duration-500 group-hover/preview:scale-105" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-success" style={{ backgroundColor: headerBg }}>
                                <FontAwesomeIcon icon={faCheckCircle} className="text-5xl" />
                              </div>
                            )}
                            
                            {/* Hover Overlay */}
                            <div className="absolute inset-0 bg-black/5 opacity-0 group-hover/preview:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                              <div className="bg-white/90 dark:bg-black/50 backdrop-blur-md px-4 py-2 rounded-full text-black dark:text-white shadow-lg transform translate-y-4 group-hover/preview:translate-y-0 transition-all flex items-center gap-2 font-bold text-sm">
                                <FontAwesomeIcon icon={faExpand} />
                                Click to Expand
                              </div>
                            </div>
                            
                            {/* Change Button Overlay */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedFile(null);
                              }}
                              className="absolute top-4 right-4 bg-danger text-white w-10 h-10 rounded-full shadow-lg flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-10"
                              title="Remove & Change"
                            >
                              <FontAwesomeIcon icon={faTimes} />
                            </button>
                          </div>
                          
                          <div className="text-center">
                            <p className="text-sm font-bold truncate max-w-[400px]" style={{ color: containerText }}>{selectedFile.name}</p>
                            <p className="text-xs text-slate-500 font-medium tracking-tight">
                              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • PDF/Image Document
                            </p>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="h-12 w-12 rounded-full flex items-center justify-center text-slate-400" style={{ backgroundColor: headerBg }}>
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-bold uppercase tracking-wide" style={{ color: containerText }}>Click or drag document here</p>
                            <p className="text-xs text-slate-500">PDF, PNG, or JPG (Max 5MB)</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-bold flex items-center gap-2" style={{ color: containerText }}>
                      <FontAwesomeIcon icon={faStickyNote} className="text-slate-400" /> Note (Optional)
                    </label>
                    <textarea 
                      className="w-full rounded-xl border py-3 px-5 outline-none focus:border-primary"
                      style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'transparent', borderColor: containerBorder, color: containerText }}
                      rows={2}
                      placeholder="Add any details about this training..."
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                    ></textarea>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 space-y-6">
                <div className="rounded-2xl p-6" style={{ backgroundColor: isDark ? 'rgba(59,90,246,0.1)' : 'rgba(59,90,246,0.05)', border: '1px solid rgba(59,90,246,0.2)' }}>
                  <h4 className="font-bold text-primary mb-4 flex items-center gap-2">
                    <FontAwesomeIcon icon={faCheckCircle} /> Assignment Summary
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                    <div className="md:col-span-2 space-y-4">
                      <div className="grid grid-cols-2 gap-y-4">
                        <div className="text-slate-500">Competency:</div>
                        <div className="font-bold uppercase" style={{ color: containerText }}>{competencies.find(c => c.id === selectedCompId)?.competency_name}</div>
                        
                        <div className="text-slate-500">Obtained Date:</div>
                        <div className="font-bold" style={{ color: containerText }}>{trainingDate}</div>
                        
                        <div className="text-slate-500">Expired Date:</div>
                        <div className="font-bold" style={{ color: containerText }}>{expiredDate || 'Unlimited (Follows Master Default)'}</div>
                        
                        <div className="text-slate-500">Target Manpower:</div>
                        <div className="font-bold uppercase" style={{ color: containerText }}>
                          {manpowerList.find(m => m.nrp === selectedNrp)?.nama} ({selectedNrp})
                        </div>
                        
                        {note && (
                          <>
                            <div className="text-slate-500">Note:</div>
                            <div className="font-medium italic" style={{ color: containerText, opacity: 0.7 }}>"{note}"</div>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-center justify-center gap-3">
                       {selectedFile ? (
                         <>
                           <div 
                             className="relative group/preview w-48 h-32 rounded-2xl overflow-hidden border-2 shadow-xl cursor-zoom-in flex items-center justify-center"
                             style={{ backgroundColor: headerBg, borderColor: containerBorder }}
                             onClick={(e) => selectedFile && handleZoomFile(e, selectedFile)}
                           >
                              {selectedFile.type === 'application/pdf' ? (
                                <div className="w-full h-full pointer-events-none" style={{ backgroundColor: isDark ? 'rgba(0,0,0,0.1)' : '#fff' }}>
                                  <embed 
                                    src={`${previewUrl}#toolbar=0&navpanes=0&scrollbar=0&view=Fit`} 
                                    type="application/pdf"
                                    className="w-full h-full"
                                  />
                                </div>
                              ) : previewUrl ? (
                                <img src={previewUrl} alt="Document" className="w-full h-full object-contain transition-transform duration-500 group-hover/preview:scale-110" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-success" style={{ backgroundColor: headerBg }}>
                                  <FontAwesomeIcon icon={faCheckCircle} className="text-2xl" />
                                </div>
                              )}
                              <div className="absolute inset-0 bg-black/10 opacity-0 group-hover/preview:opacity-100 transition-opacity flex items-center justify-center">
                                <div className="bg-white/90 dark:bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-bold text-black dark:text-white flex items-center gap-2 shadow-lg">
                                  <FontAwesomeIcon icon={faExpand} /> Preview
                                </div>
                              </div>
                           </div>
                           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Tap to View Full Document</p>
                         </>
                       ) : (
                          <div className="w-28 h-28 rounded-2xl flex flex-col items-center justify-center text-slate-400 border border-dashed" style={{ backgroundColor: headerBg, borderColor: containerBorder }}>
                            <FontAwesomeIcon icon={faTimes} className="text-xl mb-1 opacity-20" />
                            <span className="text-[9px] font-bold uppercase tracking-widest opacity-40">No Doc</span>
                          </div>
                       )}
                    </div>
                  </div>
                </div>
                
                <div className="rounded-xl p-4" style={{ backgroundColor: headerBg, border: `1px solid ${containerBorder}` }}>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse"></div>
                      Selected Person:
                   </p>
                   <div className="flex items-center gap-4 p-3 rounded-lg border shadow-sm" style={{ backgroundColor: containerBg, borderColor: containerBorder }}>
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {manpowerList.find(m => m.nrp === selectedNrp)?.nama?.charAt(0)}
                      </div>
                      <div>
                        <div className="text-sm font-bold uppercase" style={{ color: containerText }}>
                          {manpowerList.find(m => m.nrp === selectedNrp)?.nama}
                        </div>
                        <div className="text-xs text-slate-500 font-mono italic">NRPSID: {selectedNrp}</div>
                      </div>
                   </div>
                </div>
              </div>
            )}

            <div className="flex gap-4 pt-6 mt-6" style={{ borderTop: `1px solid ${containerBorder}` }}>
              <button
                type="button"
                onClick={() => step === 1 ? setIsModalOpen(false) : setStep(1)}
                className="flex-1 rounded-xl py-3 px-5 font-bold transition"
                style={{ 
                  backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#fff',
                  border: `1px solid ${containerBorder}`,
                  color: containerText
                }}
                disabled={saving}
              >
                {step === 1 ? 'Cancel' : 'Back'}
              </button>
              <button
                type="button"
                onClick={step === 1 ? handleNextStep : handleConfirmAssign}
                disabled={saving || (step === 1 && !isStep1Valid)}
                className={`flex-[2] rounded-xl py-3 px-10 font-bold text-white transition shadow-lg 
                  ${step === 1 && !isStep1Valid 
                    ? 'bg-slate-400 cursor-not-allowed' 
                    : 'bg-primary hover:bg-opacity-90 shadow-primary/20'}
                `}
              >
                {saving ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    <span>Processing...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <FontAwesomeIcon icon={step === 1 ? faUserPlus : faCircleCheck} />
                    <span>{step === 1 ? 'Review Assignment' : 'Confirm Assignment'}</span>
                  </div>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Zoom Modal */}
      {viewingDoc && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setViewingDoc(null)}></div>
          
          <div className="relative w-full max-w-4xl h-full max-h-[85vh] flex flex-col items-center justify-center">
            <button 
              onClick={() => setViewingDoc(null)}
              className="absolute -top-12 right-0 text-white hover:text-danger p-2 transition-colors flex items-center gap-2 group"
            >
              <span className="text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">Close Preview</span>
              <FontAwesomeIcon icon={faTimes} className="text-2xl" />
            </button>

            <div className="w-full h-full rounded-2xl overflow-hidden bg-white/5 border border-white/10 shadow-2xl flex items-center justify-center p-2">
              {viewingDoc.file?.type === 'application/pdf' || (viewingDoc.url?.toLowerCase().endsWith('.pdf')) ? (
                <div className="w-full h-full border-none rounded-xl overflow-hidden bg-white">
                   <iframe 
                      src={viewingDoc.file ? URL.createObjectURL(viewingDoc.file) : viewingDoc.url} 
                      className="w-full h-full border-none"
                      title="PDF Preview"
                   />
                </div>
              ) : (
                <img 
                  src={viewingDoc.file ? URL.createObjectURL(viewingDoc.file) : viewingDoc.url} 
                  alt="Document Full View" 
                  className="max-w-full max-h-full object-contain animate-in fade-in zoom-in-95 duration-300" 
                />
              )}
            </div>
            
            <div 
              className="mt-4 p-4 rounded-xl backdrop-blur-md border text-white flex items-center justify-between w-full max-w-xl"
              style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.1)' }}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/20 text-primary">
                  <FontAwesomeIcon icon={viewingDoc.file?.type === 'application/pdf' ? faFilePdf : faEye} />
                </div>
                <div>
                  <p className="text-xs font-bold truncate max-w-[300px]">{viewingDoc.name}</p>
                  <p className="text-[10px] text-slate-300 uppercase tracking-widest">
                    {viewingDoc.file ? viewingDoc.file.type : 'Remote Document'}
                  </p>
                </div>
              </div>
              {viewingDoc.file && (
                <p className="text-[10px] font-mono opacity-60">{(viewingDoc.file.size / 1024 / 1024).toFixed(2)} MB</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManpowerCompetencyTab;
