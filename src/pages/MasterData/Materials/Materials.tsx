import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../db/SupabaseClient';
import { AgGridReact } from 'ag-grid-react';
import { ColDef } from 'ag-grid-community';
import { TbPlus, TbPackage, TbX } from 'react-icons/tb';
import { toast } from 'react-hot-toast';
import Loader from '../../../common/Loader/Loader';
import { useLocation } from 'react-router-dom';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

interface Material {
  id?: number;
  material_code: string;
  item_name: string;
  item_description: string;
  mnemonic: string;
  material_group: string;
  population: string;
  material_priority: number;
  stock_taking_order: number;
  colloquials: string;
  physical_url: string;
  created_at?: string;
}

const Materials: React.FC = () => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPanel, setShowPanel] = useState(false);
  const [mode, setMode] = useState<'add' | 'view' | 'edit'>('add');
  const [submitting, setSubmitting] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  
  const location = useLocation();
  const materialCodeRef = useRef<HTMLInputElement>(null);

  // Form State
  const [materialCode, setMaterialCode] = useState('');
  const [itemName, setItemName] = useState('');
  const [description, setDescription] = useState('');
  const [mnemonic, setMnemonic] = useState('');
  const [group, setGroup] = useState('');
  const [population, setPopulation] = useState('');
  const [priority, setPriority] = useState<number | ''>('');
  const [stockOrder, setStockOrder] = useState<number | ''>('');
  const [colloquials, setColloquials] = useState('');
  const [physicalUrl, setPhysicalUrl] = useState('');

  const fetchMaterials = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('materials')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Error fetching materials: ' + error.message);
    } else {
      setMaterials(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMaterials();
    
    // Check if the path is /master/materials/add
    if (location.pathname.endsWith('/add')) {
      resetForm();
      setMode('add');
      setShowPanel(true);
    }
  }, [location.pathname]);

  useEffect(() => {
    // Autofocus when panel opens in 'add' mode
    if (showPanel && mode === 'add') {
      setTimeout(() => {
        materialCodeRef.current?.focus();
      }, 300); // Wait for transition
    }
  }, [showPanel, mode]);

  const resetForm = () => {
    setMaterialCode('');
    setItemName('');
    setDescription('');
    setMnemonic('');
    setGroup('');
    setPopulation('');
    setPriority('');
    setStockOrder('');
    setColloquials('');
    setPhysicalUrl('');
    setSelectedMaterial(null);
  };

  const fillForm = (material: Material) => {
    setMaterialCode(material.material_code);
    setItemName(material.item_name || '');
    setDescription(material.item_description || '');
    setMnemonic(material.mnemonic || '');
    setGroup(material.material_group || '');
    setPopulation(material.population || '');
    setPriority(material.material_priority ?? '');
    setStockOrder(material.stock_taking_order ?? '');
    setColloquials(material.colloquials || '');
    setPhysicalUrl(material.physical_url || '');
  };

  const handleAddClick = () => {
    if (showPanel && mode === 'add') {
      setShowPanel(false);
    } else {
      resetForm();
      setMode('add');
      setShowPanel(true);
    }
  };

  const onRowClicked = (event: any) => {
    const material = event.data;
    setSelectedMaterial(material);
    fillForm(material);
    setMode('view');
    setShowPanel(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!materialCode) {
      toast.error('Material code is required');
      return;
    }

    setSubmitting(true);
    
    const materialData = {
      material_code: materialCode,
      item_name: itemName,
      item_description: description,
      mnemonic,
      material_group: group,
      population,
      material_priority: priority === '' ? null : priority,
      stock_taking_order: stockOrder === '' ? null : stockOrder,
      colloquials,
      physical_url: physicalUrl,
    };

    let error;
    if (mode === 'add') {
      const result = await supabase.from('materials').insert([materialData]);
      error = result.error;
    } else {
      const result = await supabase
        .from('materials')
        .update(materialData)
        .eq('id', selectedMaterial?.id);
      error = result.error;
    }

    setSubmitting(false);
    if (error) {
      toast.error(`Error ${mode === 'add' ? 'adding' : 'updating'} material: ` + error.message);
    } else {
      toast.success(`Material ${mode === 'add' ? 'added' : 'updated'} successfully`);
      if (mode === 'add') {
        resetForm();
        setShowPanel(false);
      } else {
        setMode('view');
      }
      fetchMaterials();
    }
  };

  const columnDefs: ColDef[] = [
    { field: 'material_code', headerName: 'Code', flex: 1, minWidth: 120, pinned: 'left' },
    { field: 'item_name', headerName: 'Name', flex: 2, minWidth: 200 },
    { field: 'mnemonic', headerName: 'Mnemonic', flex: 1, minWidth: 120 },
    { field: 'material_group', headerName: 'Group', flex: 1, minWidth: 120 },
    { field: 'population', headerName: 'Population', flex: 1, minWidth: 120 },
    { field: 'material_priority', headerName: 'Priority', width: 100 },
    { field: 'item_description', headerName: 'Description', flex: 2, minWidth: 250 },
  ];

  const defaultColDef = {
    sortable: true,
    filter: true,
    resizable: true,
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] space-y-4">
      {/* Header Panel */}
      <div className="bg-white dark:bg-boxdark rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-2xl text-primary">
              <TbPackage size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Materials</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Manage and track your materials inventory</p>
            </div>
          </div>
          
          <button
            onClick={handleAddClick}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all duration-300 transform active:scale-95 ${
              showPanel && mode === 'add'
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200' 
                : 'bg-primary text-white shadow-lg shadow-primary/20 hover:bg-opacity-90 hover:-translate-y-0.5'
            }`}
          >
            {showPanel && mode === 'add' ? <TbX size={20} /> : <TbPlus size={20} />}
            {showPanel && mode === 'add' ? 'Close' : 'Add Material'}
          </button>
        </div>
      </div>

      {/* Action Panel (Add / View / Edit) */}
      <div className={`transition-all duration-500 ease-in-out bg-white dark:bg-boxdark rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden ${
        showPanel ? 'max-h-[800px] opacity-100 p-6 mb-4 overflow-y-auto' : 'max-h-0 opacity-0 p-0 mb-0 border-none'
      }`}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            {mode === 'add' && 'Add New Material'}
            {mode === 'view' && 'Material Details'}
            {mode === 'edit' && 'Edit Material'}
            {mode !== 'add' && <span className="text-sm font-medium text-slate-400">#{selectedMaterial?.material_code}</span>}
          </h2>
          <div className="flex gap-2">
            {mode === 'view' && (
              <button
                onClick={() => setMode('edit')}
                className="px-4 py-2 bg-primary text-white rounded-lg font-bold hover:bg-opacity-90 transition-all text-sm"
              >
                Edit Material
              </button>
            )}
            <button
              onClick={() => setShowPanel(false)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
            >
              <TbX size={20} className="text-slate-500" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Row 1 */}
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Material Code*</label>
              <input
                ref={materialCodeRef}
                type="text"
                disabled={mode === 'view' || mode === 'edit'} // Code usually unique and fixed
                value={materialCode}
                onChange={(e) => setMaterialCode(e.target.value)}
                placeholder="Enter code..."
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 py-3 px-4 text-slate-800 dark:text-white outline-none focus:border-primary transition-all disabled:bg-slate-50 dark:disabled:bg-slate-900/50 disabled:text-slate-500"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Item Name</label>
              <input
                type="text"
                disabled={mode === 'view'}
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                placeholder="Enter item name..."
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 py-3 px-4 text-slate-800 dark:text-white outline-none focus:border-primary transition-all disabled:bg-slate-50 dark:disabled:bg-slate-900/50 disabled:text-slate-500"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Mnemonic</label>
              <input
                type="text"
                disabled={mode === 'view'}
                value={mnemonic}
                onChange={(e) => setMnemonic(e.target.value)}
                placeholder="Enter mnemonic..."
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 py-3 px-4 text-slate-800 dark:text-white outline-none focus:border-primary transition-all disabled:bg-slate-50 dark:disabled:bg-slate-900/50 disabled:text-slate-500"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Material Group</label>
              <input
                type="text"
                disabled={mode === 'view'}
                value={group}
                onChange={(e) => setGroup(e.target.value)}
                placeholder="Enter group..."
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 py-3 px-4 text-slate-800 dark:text-white outline-none focus:border-primary transition-all disabled:bg-slate-50 dark:disabled:bg-slate-900/50 disabled:text-slate-500"
              />
            </div>

            {/* Row 2 */}
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Population</label>
              <input
                type="text"
                disabled={mode === 'view'}
                value={population}
                onChange={(e) => setPopulation(e.target.value)}
                placeholder="Enter population..."
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 py-3 px-4 text-slate-800 dark:text-white outline-none focus:border-primary transition-all disabled:bg-slate-50 dark:disabled:bg-slate-900/50 disabled:text-slate-500"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Colloquials</label>
              <input
                type="text"
                disabled={mode === 'view'}
                value={colloquials}
                onChange={(e) => setColloquials(e.target.value)}
                placeholder="Enter colloquials..."
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 py-3 px-4 text-slate-800 dark:text-white outline-none focus:border-primary transition-all disabled:bg-slate-50 dark:disabled:bg-slate-900/50 disabled:text-slate-500"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Priority</label>
              <input
                type="number"
                disabled={mode === 'view'}
                value={priority}
                onChange={(e) => setPriority(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="0"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 py-3 px-4 text-slate-800 dark:text-white outline-none focus:border-primary transition-all disabled:bg-slate-50 dark:disabled:bg-slate-900/50 disabled:text-slate-500"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Stock Taking Order</label>
              <input
                type="number"
                disabled={mode === 'view'}
                value={stockOrder}
                onChange={(e) => setStockOrder(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="0"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 py-3 px-4 text-slate-800 dark:text-white outline-none focus:border-primary transition-all disabled:bg-slate-50 dark:disabled:bg-slate-900/50 disabled:text-slate-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
               <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Description</label>
               <textarea
                rows={2}
                disabled={mode === 'view'}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter description..."
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 py-3 px-4 text-slate-800 dark:text-white outline-none focus:border-primary transition-all disabled:bg-slate-50 dark:disabled:bg-slate-900/50 disabled:text-slate-500"
              />
            </div>
            <div>
               <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Physical URL</label>
               <input
                type="text"
                disabled={mode === 'view'}
                value={physicalUrl}
                onChange={(e) => setPhysicalUrl(e.target.value)}
                placeholder="https://..."
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 py-3 px-4 text-slate-800 dark:text-white outline-none focus:border-primary transition-all disabled:bg-slate-50 dark:disabled:bg-slate-900/50 disabled:text-slate-500"
              />
            </div>
          </div>
          
          <div className={`flex justify-end pt-4 gap-3 ${mode === 'view' ? 'hidden' : ''}`}>
             <button
              type="button"
              onClick={() => mode === 'add' ? setShowPanel(false) : setMode('view')}
              className="px-8 py-4 rounded-xl font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-all transform active:scale-95"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !materialCode}
              className={`px-10 py-4 rounded-xl font-bold text-white transition-all transform active:scale-95 ${
                submitting || !materialCode 
                  ? 'bg-slate-300 cursor-not-allowed shadow-none' 
                  : 'bg-primary shadow-lg shadow-primary/20 hover:bg-opacity-90 hover:-translate-y-1'
              }`}
            >
              {submitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Saving...
                </div>
              ) : mode === 'add' ? 'Save Material' : 'Update Material'}
            </button>
          </div>
        </form>
      </div>

      {/* Grid Container */}
      <div className="flex-1 bg-white dark:bg-boxdark rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden relative">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50 dark:bg-boxdark/50 backdrop-blur-sm">
            <Loader />
          </div>
        )}
        <div className="ag-theme-alpine dark:ag-theme-alpine-dark w-full h-full">
          <AgGridReact
            rowData={materials}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            animateRows={true}
            pagination={true}
            paginationPageSize={20}
            onRowClicked={onRowClicked}
            rowSelection="single"
          />
        </div>
      </div>
    </div>
  );
};


export default Materials;
