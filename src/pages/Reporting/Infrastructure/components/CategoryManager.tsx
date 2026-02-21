import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../../db/SupabaseClient';
import { useTheme } from '../../../../contexts/ThemeContext';
import { FaTimes, FaSave, FaTrash, FaPlus, FaSpinner, FaEdit, FaTags } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { useAuth } from '../../../Authentication/AuthContext';

interface CategoryManagerProps {
  onClose: () => void;
}

interface Category {
  id: string;
  name: string;
}

const CategoryManager: React.FC<CategoryManagerProps> = ({ onClose }) => {
  const { activeTheme } = useTheme();
  const { currentUser } = useAuth();
  
  const modalRef = useRef<HTMLDivElement>(null);
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');

  const nameInputRef = useRef<HTMLInputElement>(null);

  // @ts-ignore
  const canModify = currentUser && (currentUser.position === 0 || currentUser.position === 1);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (showForm) {
      setTimeout(() => nameInputRef.current?.focus(), 150);
    }
  }, [showForm]);

  // Modal Close Logic
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    window.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      window.removeEventListener('keydown', handleEscape);
      window.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const fetchCategories = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('infra_locations_items_category')
      .select('*')
      .order('name');
    
    if (error) {
      toast.error(error.message);
    } else {
      setCategories(data || []);
    }
    setLoading(false);
  };

  const handleEdit = (cat: Category) => {
    setEditingId(cat.id);
    setName(cat.name);
    setShowForm(true);
  };

  const handleCreate = () => {
    setEditingId(null);
    setName('');
    setShowForm(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setShowForm(false);
  };

  const handleDelete = async (id: string) => {
    // Check if category is in use
    const { count } = await supabase
      .from('infra_locations_items')
      .select('id', { count: 'exact', head: true })
      .eq('infra_category_id', id);

    if (count && count > 0) {
      toast.error(`Cannot delete category: ${count} items are using it.`);
      return;
    }

    if (!confirm('Are you sure you want to delete this category?')) return;
    
    const toastId = toast.loading('Deleting...');
    const { error } = await supabase
      .from('infra_locations_items_category')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error(error.message, { id: toastId });
    } else {
      toast.success('Category deleted', { id: toastId });
      fetchCategories();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !canModify) return;

    setSaving(true);
    const toastId = toast.loading('Saving category...');

    try {
      if (editingId) {
        const { error } = await supabase
          .from('infra_locations_items_category')
          .update({ name: name.trim() })
          .eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('infra_locations_items_category')
          .insert({ name: name.trim() });
        if (error) throw error;
      }

      toast.success('Category saved!', { id: toastId });
      fetchCategories();
      resetForm();
    } catch (error: any) {
      toast.error(error.message, { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div ref={modalRef} 
           className="w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col bg-white/60 dark:bg-boxdark/60 backdrop-blur-2xl border border-white/50 dark:border-white/10"
           style={{ backgroundColor: activeTheme.container.color }}>
        
        <div className="flex justify-between items-center py-4 px-6 border-b border-white/50 dark:border-white/10">
          <h2 className="text-xl font-bold flex items-center gap-3 text-black dark:text-white">
             <div className="p-2 bg-purple-600 rounded-lg text-white">
               <FaTags size={16} />
             </div>
             Manage Categories
          </h2>
          <div className="flex items-center gap-2">
            {canModify && (
              <button
                onClick={() => showForm ? resetForm() : handleCreate()}
                className={`p-2 rounded-xl transition-all shadow-lg ${
                  showForm ? 'bg-red-500 text-white' : 'bg-purple-600 text-white'
                }`}
              >
                {showForm ? <FaTimes /> : <FaPlus />}
              </button>
            )}
            <button onClick={onClose} className="opacity-50 hover:opacity-100 transition-opacity p-2 text-black dark:text-white">
              <FaTimes size={20} />
            </button>
          </div>
        </div>

        {showForm && (
          <div className="p-6 bg-white/40 dark:bg-black/20 border-b border-white/50 dark:border-white/10">
            <form onSubmit={handleSubmit} className="flex gap-4">
              <input
                ref={nameInputRef}
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Category Name (e.g. Electrical)"
                required
                className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-black/40 py-2.5 px-4 text-sm font-bold outline-none focus:border-purple-500"
              />
              <button 
                type="submit"
                disabled={saving || !name.trim()}
                className="px-6 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold transition-all disabled:opacity-50"
              >
                {saving ? <FaSpinner className="animate-spin" /> : <FaSave />}
              </button>
            </form>
          </div>
        )}

        <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
          {loading ? (
             <div className="py-20 flex justify-center opacity-40"><FaSpinner className="animate-spin text-2xl" /></div>
          ) : categories.length === 0 ? (
             <div className="py-20 text-center opacity-30 text-sm font-bold uppercase tracking-widest">No categories found</div>
          ) : (
             <div className="space-y-3">
               {categories.map(cat => (
                 <div key={cat.id} className="flex items-center justify-between p-4 rounded-xl bg-white/40 dark:bg-slate-900/40 border border-white/10 group hover:border-purple-500/30 transition-all">
                    <span className="font-bold text-black dark:text-white uppercase tracking-tight">{cat.name}</span>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleEdit(cat)} className="p-2 rounded-lg bg-blue-500/10 text-blue-600 hover:bg-blue-500 hover:text-white transition-all">
                        <FaEdit size={14} />
                      </button>
                      <button onClick={() => handleDelete(cat.id)} className="p-2 rounded-lg bg-red-500/10 text-red-600 hover:bg-red-500 hover:text-white transition-all">
                        <FaTrash size={14} />
                      </button>
                    </div>
                 </div>
               ))}
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CategoryManager;
