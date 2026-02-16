import React, { useEffect, useState } from 'react';
import PanelContainer from '../../PanelContainer';
import { supabase } from '../../../db/SupabaseClient';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faEdit, 
  faTrash, 
  faPlus, 
  faCheck, 
  faTimes, 
  faMagnifyingGlass,
  faCircleCheck,
  faTriangleExclamation
} from '@fortawesome/free-solid-svg-icons';

interface Competency {
  id: number;
  competency_name: string;
  days_active: number | null;
  mandatory: boolean;
  active: boolean;
}

interface Position {
  id: number;
  incumbent: string;
}

const MasterCompetency = () => {
  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompetency, setEditingCompetency] = useState<Partial<Competency> | null>(null);
  const [selectedPositions, setSelectedPositions] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [compRes, posRes] = await Promise.all([
        supabase.from('competency').select('*').order('id', { ascending: true }),
        supabase.from('incumbent').select('id, incumbent').order('incumbent')
      ]);

      if (compRes.error) throw compRes.error;
      if (posRes.error) throw posRes.error;

      setCompetencies(compRes.data || []);
      setPositions(posRes.data || []);
    } catch (error: any) {
      toast.error('Failed to fetch data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingCompetency({
      competency_name: '',
      days_active: null,
      mandatory: false,
      active: true
    });
    setSelectedPositions([]);
    setIsModalOpen(true);
  };

  const handleEdit = async (comp: Competency) => {
    setEditingCompetency(comp);
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('competency_position')
        .select('position_id')
        .eq('competency_id', comp.id);
      
      if (error) throw error;
      setSelectedPositions(data?.map(p => p.position_id) || []);
      setIsModalOpen(true);
    } catch (error: any) {
      toast.error('Failed to fetch positions: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "This will remove the competency and all its position mappings!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
      try {
        const { error } = await supabase.from('competency').delete().eq('id', id);
        if (error) throw error;
        toast.success('Competency deleted');
        fetchData();
      } catch (error: any) {
        toast.error('Delete failed: ' + error.message);
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCompetency?.competency_name) {
      toast.error('Competency name is required');
      return;
    }

    setSaving(true);
    try {
      let competencyId = editingCompetency.id;

      if (competencyId) {
        // Update
        const { error } = await supabase
          .from('competency')
          .update({
            competency_name: editingCompetency.competency_name,
            days_active: editingCompetency.days_active,
            mandatory: editingCompetency.mandatory,
            active: editingCompetency.active
          })
          .eq('id', competencyId);
        if (error) throw error;
      } else {
        // Insert
        const { data, error } = await supabase
          .from('competency')
          .insert([{
            competency_name: editingCompetency.competency_name,
            days_active: editingCompetency.days_active,
            mandatory: editingCompetency.mandatory,
            active: editingCompetency.active
          }])
          .select();
        if (error) throw error;
        competencyId = data[0].id;
      }

      // Sync Positions (Delete then Insert)
      await supabase.from('competency_position').delete().eq('competency_id', competencyId);
      
      if (selectedPositions.length > 0) {
        const { error: posError } = await supabase
          .from('competency_position')
          .insert(selectedPositions.map(posId => ({
            competency_id: competencyId,
            position_id: posId
          })));
        if (posError) throw posError;
      }

      toast.success('Competency saved successfully');
      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error('Save failed: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const filteredCompetencies = competencies.filter(c => 
    c.competency_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <PanelContainer 
      title="Master Competency"
      actions={
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 bg-primary px-4 py-2 text-white rounded-md hover:bg-opacity-90 transition shadow-sm"
        >
          <FontAwesomeIcon icon={faPlus} />
          Add Competency
        </button>
      }
    >
      <div className="mb-6">
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-bodydark2">
            <FontAwesomeIcon icon={faMagnifyingGlass} />
          </span>
          <input
            type="text"
            placeholder="Search competency by name..."
            className="w-full rounded-lg border border-stroke bg-transparent py-2.5 pl-12 pr-4 outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 transition"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-stroke dark:border-strokedark">
        <table className="w-full table-auto">
          <thead>
            <tr className="bg-gray-2 text-left dark:bg-meta-4">
              <th className="px-6 py-4 font-semibold text-black dark:text-white uppercase text-xs tracking-wider w-20">ID</th>
              <th className="px-6 py-4 font-semibold text-black dark:text-white uppercase text-xs tracking-wider">Competency Name</th>
              <th className="px-6 py-4 font-semibold text-black dark:text-white text-center uppercase text-xs tracking-wider">Validity (Days)</th>
              <th className="px-6 py-4 font-semibold text-black dark:text-white text-center uppercase text-xs tracking-wider">Mandatory</th>
              <th className="px-6 py-4 font-semibold text-black dark:text-white text-center uppercase text-xs tracking-wider">Status</th>
              <th className="px-6 py-4 font-semibold text-black dark:text-white text-right uppercase text-xs tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stroke dark:divide-strokedark bg-white dark:bg-boxdark">
            {loading && competencies.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-slate-400">
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent shadow-sm"></div>
                    <span>Loading data...</span>
                  </div>
                </td>
              </tr>
            ) : filteredCompetencies.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-slate-400">
                  <FontAwesomeIcon icon={faMagnifyingGlass} className="mb-2 text-2xl border-b-2 border-slate-100" />
                  <p>No competency records found matching your search</p>
                </td>
              </tr>
            ) : (
              filteredCompetencies.map((comp) => (
                <tr key={comp.id} className="hover:bg-gray-50 dark:hover:bg-meta-4/20 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-500 text-xs font-mono">#{comp.id}</td>
                  <td className="px-6 py-4 font-medium text-black dark:text-white">{comp.competency_name}</td>
                  <td className="px-6 py-4 text-center text-slate-600 dark:text-slate-400 font-mono">{comp.days_active || 'Unlimited'}</td>
                  <td className="px-6 py-4 text-center">
                    {comp.mandatory ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-danger/10 px-3 py-1 text-xs font-bold text-danger border border-danger/20">
                        <FontAwesomeIcon icon={faTriangleExclamation} /> MANDATORY
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500 border border-slate-200">
                        OPTIONAL
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold border ${
                      comp.active 
                        ? 'bg-success/10 text-success border-success/20' 
                        : 'bg-warning/10 text-warning border-warning/20'
                    }`}>
                      <div className={`h-1.5 w-1.5 rounded-full ${comp.active ? 'bg-success' : 'bg-warning'}`}></div>
                      {comp.active ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => handleEdit(comp)}
                        className="p-2 hover:bg-primary/10 hover:text-primary rounded-lg transition-all"
                        title="Edit Competency"
                      >
                        <FontAwesomeIcon icon={faEdit} />
                      </button>
                      <button 
                        onClick={() => handleDelete(comp.id)}
                        className="p-2 hover:bg-danger/10 hover:text-danger rounded-lg transition-all"
                        title="Delete Competency"
                      >
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Backdrop & Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
            onClick={() => !saving && setIsModalOpen(false)}
          ></div>
          
          <div className="relative w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-boxdark max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-stroke dark:border-strokedark">
              <div>
                <h3 className="text-xl font-bold text-black dark:text-white">
                  {editingCompetency?.id ? 'Modify Competency' : 'Create Competency'}
                </h3>
                <p className="text-xs text-slate-500 mt-1">Define competency requirements and eligible positions</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-bodydark2 hover:bg-gray-100 dark:hover:bg-meta-4 rounded-full transition-colors"
                disabled={saving}
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSave} className="space-y-5 flex-1 overflow-y-auto pr-2 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-bold text-black dark:text-white">
                    Competency Name <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SIM BII Umum, K3 Listrik"
                    className="w-full rounded-xl border border-stroke bg-transparent py-3 px-5 outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 font-medium"
                    value={editingCompetency?.competency_name || ''}
                    onChange={(e) => setEditingCompetency({...editingCompetency, competency_name: e.target.value})}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-black dark:text-white">
                    Validity Period (Days)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      placeholder="e.g. 365"
                      className="w-full rounded-xl border border-stroke bg-transparent py-3 px-5 outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 font-mono"
                      value={editingCompetency?.days_active || ''}
                      onChange={(e) => setEditingCompetency({...editingCompetency, days_active: e.target.value ? parseInt(e.target.value) : null})}
                    />
                    <span className="absolute right-5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold uppercase">Days</span>
                  </div>
                </div>

                <div className="flex flex-col justify-center gap-3 bg-gray-50 dark:bg-meta-4/20 p-4 rounded-xl border border-stroke dark:border-strokedark">
                   <label className="flex items-center group cursor-pointer select-none">
                    <div className="relative">
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={editingCompetency?.mandatory || false}
                        onChange={() => setEditingCompetency({...editingCompetency, mandatory: !editingCompetency?.mandatory})}
                      />
                      <div className={`block h-6 w-11 rounded-full transition-colors ${editingCompetency?.mandatory ? 'bg-danger' : 'bg-slate-300 dark:bg-slate-600'}`}></div>
                      <div className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${editingCompetency?.mandatory ? 'translate-x-5' : ''}`}></div>
                    </div>
                    <div className="ml-3">
                        <span className="block text-sm font-bold text-black dark:text-white">Mandatory</span>
                        <span className="text-[10px] text-slate-500">Required for compliance</span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-meta-4/20 p-4 rounded-xl border border-stroke dark:border-strokedark">
                  <label className="flex items-center group cursor-pointer select-none">
                    <div className="relative">
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={editingCompetency?.active || false}
                        onChange={() => setEditingCompetency({...editingCompetency, active: !editingCompetency?.active})}
                      />
                      <div className={`block h-6 w-11 rounded-full transition-colors ${editingCompetency?.active ? 'bg-success' : 'bg-slate-300 dark:bg-slate-600'}`}></div>
                      <div className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${editingCompetency?.active ? 'translate-x-5' : ''}`}></div>
                    </div>
                    <div className="ml-3">
                        <span className="block text-sm font-bold text-black dark:text-white">Active Status</span>
                        <span className="text-[10px] text-slate-500">Show in active competency lists</span>
                    </div>
                  </label>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-bold text-black dark:text-white">
                    Required for Positions
                    </label>
                    <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">{selectedPositions.length} Selected</span>
                </div>
                <div className="border border-stroke dark:border-strokedark rounded-xl p-2 bg-white dark:bg-meta-4/10 overflow-hidden">
                    <div className="max-h-40 overflow-y-auto grid grid-cols-1 gap-1 pr-1 custom-scrollbar">
                        {positions.map((pos) => (
                            <label 
                                key={pos.id} 
                                className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors border ${
                                    selectedPositions.includes(pos.id) 
                                        ? 'bg-primary/5 border-primary/20 text-primary' 
                                        : 'hover:bg-slate-50 dark:hover:bg-slate-700/50 border-transparent text-slate-600 dark:text-slate-400'
                                }`}
                            >
                                <div className={`h-5 w-5 rounded border flex items-center justify-center transition-colors ${
                                    selectedPositions.includes(pos.id) ? 'bg-primary border-primary text-white' : 'border-slate-300 dark:border-slate-600 bg-transparent'
                                }`}>
                                    {selectedPositions.includes(pos.id) && <FontAwesomeIcon icon={faCheck} className="text-[10px]" />}
                                </div>
                                <input
                                    type="checkbox"
                                    className="hidden"
                                    checked={selectedPositions.includes(pos.id)}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setSelectedPositions([...selectedPositions, pos.id]);
                                        } else {
                                            setSelectedPositions(selectedPositions.filter(id => id !== pos.id));
                                        }
                                    }}
                                />
                                <span className="text-xs font-semibold">{pos.incumbent}</span>
                            </label>
                        ))}
                    </div>
                </div>
              </div>
            </form>

            {/* Modal Footer */}
            <div className="flex gap-4 pt-6 border-t border-stroke dark:border-strokedark mt-6">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="flex-1 rounded-xl border border-stroke py-3 px-5 font-bold hover:bg-gray-100 dark:hover:bg-meta-4 transition shadow-sm hover:shadow"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex-3 rounded-xl bg-primary py-3 px-10 font-bold text-white hover:bg-opacity-90 transition disabled:bg-opacity-50 shadow-lg shadow-primary/20"
              >
                {saving ? (
                    <div className="flex items-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                        <span>Processing...</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
                        <FontAwesomeIcon icon={faCircleCheck} />
                        <span>{editingCompetency?.id ? 'Update Competency' : 'Save Competency'}</span>
                    </div>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </PanelContainer>
  );
};

export default MasterCompetency;