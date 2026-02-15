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
  faCheckCircle
} from '@fortawesome/free-solid-svg-icons';
import toast from 'react-hot-toast';

interface CompetencyStatus {
  nrp: string;
  nama: string;
  competency_name: string;
  obtained_date: string;
  expired_date: string | null;
  active: boolean;
  status: 'valid' | 'expired' | 'soon_expired';
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

const ManpowerCompetencyTab = () => {
  const [data, setData] = useState<CompetencyStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Assign Dialog State
  const [isModalOpen, setIsModalOpen] = useState(false);
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
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCompetencyStatus();
    fetchMasterData();
  }, []);

  const fetchCompetencyStatus = async () => {
    setLoading(true);
    try {
      const { data: statusData, error } = await supabase
        .from('v_competency_status')
        .select('*')
        .order('nama');

      if (error) throw error;
      setData(statusData || []);
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
    setStep(1);
    setSelectedCompId('');
    setSelectedNrp('');
    setNote('');
    setMpSearchTerm('');
    setShowSuggestions(false);
    setSelectedFile(null);
    setIsModalOpen(true);
  };

  const isStep1Valid = selectedCompId && selectedNrp && trainingDate && selectedFile;

  const handleNextStep = () => {
    if (!isStep1Valid) return toast.error('Please fill all required fields including document');
    setStep(2);
  };

  const handleConfirmAssign = async () => {
    setSaving(true);
    try {
      // Placeholder for file upload logic to get document_url
      const document_url = ''; 

      const payload = [{
        nrp: selectedNrp,
        competency_id: selectedCompId,
        training_date: trainingDate,
        expired_date: expiredDate || null,
        note: note,
        document_url: document_url 
      }];

      const { error } = await supabase
        .from('competency_history')
        .insert(payload);

      if (error) throw error;

      toast.success(`Successfully assigned competency to person`);
      setIsModalOpen(false);
      fetchCompetencyStatus();
    } catch (error: any) {
      toast.error('Assignment failed: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

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

  const filteredData = data.filter(item => 
    (item.nama?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (item.competency_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (item.nrp?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

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
            className="w-full rounded-lg border border-stroke bg-transparent py-2.5 pl-12 pr-4 outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 transition"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-2">
            <div className="flex items-center gap-1"><div className="h-2 w-2 rounded-full bg-success"></div> Valid</div>
            <div className="flex items-center gap-1"><div className="h-2 w-2 rounded-full bg-warning"></div> Expired Soon</div>
            <div className="flex items-center gap-1"><div className="h-2 w-2 rounded-full bg-danger"></div> Expired</div>
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

      <div className="overflow-x-auto rounded-lg border border-stroke dark:border-strokedark">
        <table className="w-full table-auto">
          <thead>
            <tr className="bg-gray-2 text-left dark:bg-meta-4">
              <th className="px-6 py-4 font-semibold text-black dark:text-white uppercase text-xs tracking-wider">Manpower</th>
              <th className="px-6 py-4 font-semibold text-black dark:text-white uppercase text-xs tracking-wider">Competency</th>
              <th className="px-6 py-4 font-semibold text-black dark:text-white text-center uppercase text-xs tracking-wider">Obtained</th>
              <th className="px-6 py-4 font-semibold text-black dark:text-white text-center uppercase text-xs tracking-wider">Expired</th>
              <th className="px-6 py-4 font-semibold text-black dark:text-white text-center uppercase text-xs tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stroke dark:divide-strokedark bg-white dark:bg-boxdark">
            {loading ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-slate-400">
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent shadow-sm"></div>
                    <span>Loading competency status...</span>
                  </div>
                </td>
              </tr>
            ) : filteredData.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-slate-400">
                  No records found.
                </td>
              </tr>
            ) : (
              filteredData.map((item, index) => (
                <tr key={`${item.nrp}-${item.competency_name}-${index}`} className="hover:bg-gray-50 dark:hover:bg-meta-4/20 transition-colors text-sm">
                  <td className="px-6 py-4">
                    <div className="font-bold text-black dark:text-white">{item.nama}</div>
                    <div className="text-[10px] text-slate-400 font-mono tracking-tighter">{item.nrp}</div>
                  </td>
                  <td className="px-6 py-4 font-semibold text-primary">{item.competency_name}</td>
                  <td className="px-6 py-4 text-center font-medium">{item.obtained_date}</td>
                  <td className="px-6 py-4 text-center font-medium">{item.expired_date || 'Unlimited'}</td>
                  <td className="px-6 py-4 text-center">
                    {getStatusBadge(item.status)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Assignment Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !saving && setIsModalOpen(false)}></div>
          
          <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-boxdark max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-stroke dark:border-strokedark">
              <div>
                <h3 className="text-xl font-bold text-black dark:text-white">
                  Assign Competency
                </h3>
                <p className="text-xs text-slate-500 mt-1">Record new training/competency for manpower</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-bodydark2 hover:bg-gray-100 dark:hover:bg-meta-4 rounded-full" disabled={saving}>
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>

            {step === 1 ? (
              <div className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-bold text-black dark:text-white italic">
                      1. Select Competency <span className="text-danger">*</span>
                    </label>
                    <select 
                      className="w-full rounded-xl border border-stroke bg-transparent py-3 px-5 outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 font-medium"
                      value={selectedCompId}
                      onChange={(e) => setSelectedCompId(Number(e.target.value))}
                    >
                      <option value="">-- Choose Competency --</option>
                      {competencies.map(c => <option key={c.id} value={c.id}>{c.competency_name}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold text-black dark:text-white flex items-center gap-2">
                      <FontAwesomeIcon icon={faCalendarAlt} className="text-primary" /> Obtained Date
                    </label>
                    <input 
                      type="date"
                      className="w-full rounded-xl border border-stroke bg-transparent py-3 px-5 outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4"
                      value={trainingDate}
                      onChange={(e) => setTrainingDate(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold text-black dark:text-white flex items-center gap-2">
                      <FontAwesomeIcon icon={faCalendarAlt} className="text-slate-400" /> Expired Date (Auto)
                    </label>
                    <input 
                      type="date"
                      className="w-full rounded-xl border border-stroke bg-slate-100 dark:bg-slate-800/50 py-3 px-5 outline-none cursor-not-allowed text-slate-500"
                      value={expiredDate}
                      readOnly
                      disabled
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-bold text-black dark:text-white italic">
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
                          className={`w-full rounded-xl border border-stroke bg-white dark:bg-meta-4 py-3 pl-12 pr-10 outline-none focus:border-primary transition-all shadow-sm
                            ${selectedNrp ? 'bg-primary/5 border-primary font-bold text-primary' : ''}
                          `}
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
                        <div className="absolute left-0 right-0 top-full mt-2 z-[99999] max-h-56 overflow-y-auto bg-white dark:bg-boxdark border border-stroke dark:border-slate-700 rounded-xl shadow-2xl custom-scrollbar animate-in fade-in slide-in-from-top-2 duration-150">
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
                                className="w-full flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-meta-4 border-b border-stroke dark:border-slate-800 last:border-0 transition-colors text-left"
                              >
                                <div className="flex flex-col">
                                  <span className="text-sm font-bold text-black dark:text-white uppercase">{m.nama}</span>
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
                    <label className="mb-2 block text-sm font-bold text-black dark:text-white italic">
                      3. Training Document (PDF/Image) <span className="text-danger">*</span>
                    </label>
                    <div 
                      className={`relative border-2 border-dashed rounded-xl p-8 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer
                        ${selectedFile ? 'border-success bg-success/5' : 'border-slate-300 hover:border-primary hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/20'}
                      `}
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
                        <>
                          <FontAwesomeIcon icon={faCheckCircle} className="text-success text-3xl" />
                          <div className="text-center">
                            <p className="text-sm font-bold text-black dark:text-white">{selectedFile.name}</p>
                            <p className="text-[10px] text-slate-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB • Click to change</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-bold text-black dark:text-white">Click or drag document here</p>
                            <p className="text-xs text-slate-500">PDF, PNG, or JPG (Max 5MB)</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-bold text-black dark:text-white flex items-center gap-2">
                      <FontAwesomeIcon icon={faStickyNote} className="text-slate-400" /> Note (Optional)
                    </label>
                    <textarea 
                      className="w-full rounded-xl border border-stroke bg-transparent py-3 px-5 outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4"
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
                <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6">
                  <h4 className="font-bold text-primary mb-4 flex items-center gap-2">
                    <FontAwesomeIcon icon={faCheckCircle} /> Assignment Summary
                  </h4>
                  <div className="grid grid-cols-2 gap-y-4 text-sm">
                    <div className="text-slate-500">Competency:</div>
                    <div className="font-bold text-black dark:text-white uppercase">{competencies.find(c => c.id === selectedCompId)?.competency_name}</div>
                    
                    <div className="text-slate-500">Obtained Date:</div>
                    <div className="font-bold">{trainingDate}</div>
                    
                    <div className="text-slate-500">Expired Date:</div>
                    <div className="font-bold">{expiredDate || 'Unlimited (Follows Master Default)'}</div>
                    
                    <div className="text-slate-500">Target Manpower:</div>
                    <div className="font-bold text-black dark:text-white">
                      {manpowerList.find(m => m.nrp === selectedNrp)?.nama} ({selectedNrp})
                    </div>
                    
                    <div className="text-slate-500">Document:</div>
                    <div className="font-bold truncate text-primary">{selectedFile?.name}</div>
                  </div>
                </div>
                
                <div className="bg-slate-50 dark:bg-slate-900/40 border border-stroke dark:border-slate-800 rounded-xl p-4">
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse"></div>
                      Selected Person:
                   </p>
                   <div className="flex items-center gap-4 bg-white dark:bg-boxdark p-3 rounded-lg border border-stroke dark:border-slate-800 shadow-sm">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {manpowerList.find(m => m.nrp === selectedNrp)?.nama?.charAt(0)}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-black dark:text-white uppercase">
                          {manpowerList.find(m => m.nrp === selectedNrp)?.nama}
                        </div>
                        <div className="text-xs text-slate-500 font-mono italic">NRPSID: {selectedNrp}</div>
                      </div>
                   </div>
                </div>
              </div>
            )}

            <div className="flex gap-4 pt-6 border-t border-stroke dark:border-strokedark mt-6">
              <button
                type="button"
                onClick={() => step === 1 ? setIsModalOpen(false) : setStep(1)}
                className="flex-1 rounded-xl border border-stroke py-3 px-5 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
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
    </div>
  );
};

export default ManpowerCompetencyTab;

