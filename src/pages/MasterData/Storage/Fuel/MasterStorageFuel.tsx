// components/MasterStorage/MasterStorage.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../../db/SupabaseClient';
import toast, { Toaster } from 'react-hot-toast';

import StorageModal from './StorageModal';
import StorageGridView from './StorageGridView';
import StorageOverviewView from './StorageOverviewView';
import { StorageData, ViewMode, StoragePhoto } from './components/storageData';
import { Grid, List } from 'lucide-react';
import { TbDetails } from 'react-icons/tb';

const GridIcon = () => <Grid className="h-5 w-5" />;
const ListIcon = () => <List className="h-5 w-5" />;
const OverviewIcon = () => <TbDetails className="h-5 w-5" />;

type StatusFilter = 'ALL' | 'RUNNING';
type TypeFilter = 'ALL' | 'FT' | 'PS';

const MasterStorageFuel: React.FC = () => {
  const [rowData, setRowData] = useState<StorageData[]>([]);
  const [photosData, setPhotosData] = useState<Record<string, StoragePhoto[]>>({});
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<StorageData | null>(null);
  const [currentView, setCurrentView] = useState<ViewMode>('grid');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('RUNNING');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL');

  // --- Fetch Photos untuk unit tertentu ---
  const fetchPhotos = useCallback(async (unitIds: string[]) => {
    if (unitIds.length === 0) {
      setPhotosData({});
      return;
    }

    try {
      const { data: photos, error } = await supabase
        .from('storage_photos')
        .select('*')
        .in('unit_id', unitIds);

      if (error) throw error;

      // Group photos by unit_id
      const grouped: Record<string, StoragePhoto[]> = {};
      unitIds.forEach(id => grouped[id] = []);
      photos?.forEach(photo => {
        if (grouped[photo.unit_id]) {
          grouped[photo.unit_id].push(photo);
        }
      });

      setPhotosData(grouped);
    } catch (err: any) {
      console.error('Failed to fetch photos:', err.message);
    }
  }, []);

  // --- Fetch SKO untuk unit tertentu ---
  const fetchSKO = useCallback(async (units: StorageData[]) => {
  const unitIds = units.map(u => u.unit_id).filter((id): id is string => id !== null);

  if (unitIds.length === 0) return units;

  try {
    const { data: skoData, error } = await supabase
      .from('sko')
      .select('*')
      .in('unit_id', unitIds)
      .order('issued_date', { ascending: false });

    if (error) throw error;

    // Ambil hanya SKO terbaru per unit_id
    const latestSKOByUnit: Record<string, any> = {};
    skoData?.forEach(sko => {
      if (!latestSKOByUnit[sko.unit_id]) {
        latestSKOByUnit[sko.unit_id] = sko; // ambil yang pertama (karena sudah sorted desc)
      }
    });

    // Merge SKO terbaru ke units
    const unitsWithLatestSKO = units.map(unit => ({
      ...unit,
      sko: latestSKOByUnit[unit.unit_id!] ? [latestSKOByUnit[unit.unit_id!]] : null,
    }));

    return unitsWithLatestSKO;
  } catch (err: any) {
    console.error('Failed to fetch SKO:', err.message);
    return units; // fallback tanpa SKO
  }
}, []);


  // --- Fetch Units ---
  const fetchUnits = useCallback(async () => {
    setLoading(true);
    try {
      let { data: unitsData, error: unitsError } = await supabase
        .from('storage')
        .select('*')
        .order('warehouse_id', { ascending: true });

      if (unitsError) throw unitsError;

      let units = unitsData || [];

      // Filter by type
      if (typeFilter !== 'ALL') units = units.filter(u => u.type === typeFilter);

      // Filter by status
      if (statusFilter === 'RUNNING') units = units.filter(u => u.status === 'RUNNING');

      // Fetch dan merge SKO data
      units = await fetchSKO(units);

      setRowData(units);

      // Fetch photos untuk units yang ada
      const unitIds = units.map(u => u.unit_id).filter((id): id is string => id !== null);
      await fetchPhotos(unitIds);
    } catch (err: any) {
      toast.error('Failed to fetch data: ' + err.message);
    }
    setLoading(false);
  }, [statusFilter, typeFilter, fetchPhotos, fetchSKO]);

  useEffect(() => {
    fetchUnits();
  }, [fetchUnits]);

  // --- Refresh photos saja (dipanggil setelah upload/delete photo) ---
  const handleRefreshPhotos = useCallback(async () => {
    const unitIds = rowData.map(u => u.unit_id).filter((id): id is string => id !== null);
    await fetchPhotos(unitIds);
  }, [rowData, fetchPhotos]);

  // --- CRUD ---
  const handleCreateOrUpdate = async (data: StorageData) => {
    const dataToInsertOrUpdate: Partial<StorageData> = { ...data };
    if (!dataToInsertOrUpdate.id) {
      delete dataToInsertOrUpdate.id;
      // Remove sko from insert since it's a separate table
      delete (dataToInsertOrUpdate as any).sko;
      
      const { error } = await supabase.from('storage').insert(dataToInsertOrUpdate);
      if (error) toast.error(`Creation failed: ${error.message}`);
      else {
        toast.success('New Storage Unit created!');
        fetchUnits();
        setIsModalOpen(false);
      }
    } else {
      const id = dataToInsertOrUpdate.id;
      delete dataToInsertOrUpdate.id;
      delete dataToInsertOrUpdate.warehouse_id;
      // Remove sko from update since it's a separate table
      delete (dataToInsertOrUpdate as any).sko;
      
      const { error } = await supabase
        .from('storage')
        .update(dataToInsertOrUpdate)
        .eq('id', id);
      if (error) toast.error(`Update failed: ${error.message}`);
      else {
        toast.success('Storage Unit updated!');
        fetchUnits();
        setIsModalOpen(false);
      }
    }
  };

  const handleDelete = useCallback(
    async (unit: StorageData) => {
      if (!window.confirm(`Delete unit ${unit.warehouse_id} - ${unit.unit_id}?`))
        return;
      const { error } = await supabase.from('storage').delete().eq('id', unit.id);
      if (error) toast.error(`Deletion failed: ${error.message}`);
      else {
        toast.success('Storage Unit deleted');
        fetchUnits();
      }
    },
    [fetchUnits]
  );

  const openEditModal = useCallback(
    (unit: StorageData) => {
      setEditingUnit(unit);
      setIsModalOpen(true);
    },
    []
  );

  const handleOpenCreateModal = () => {
    setEditingUnit(null);
    setIsModalOpen(true);
  };

  // --- Switchers ---
  const ViewSwitcher = () => (
    <div className="flex flex-wrap gap-2 border border-gray-300 rounded-lg p-1">
      {[
        { mode: 'grid', icon: <GridIcon /> },
        { mode: 'list', icon: <ListIcon /> },
        { mode: 'overview', icon: <OverviewIcon /> },
      ].map(({ mode, icon }) => (
        <button
          key={mode}
          onClick={() => setCurrentView(mode as ViewMode)}
          className={`p-2 transition-colors rounded-md ${
            currentView === mode
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-gray-500 hover:bg-gray-100'
          }`}
          title={`Switch to ${mode} view`}
        >
          {icon}
        </button>
      ))}
    </div>
  );

  const StatusFilterSwitcher = () => (
    <div className="flex flex-wrap gap-2 border border-gray-300 rounded-lg p-1">
      {[
        { mode: 'ALL', label: 'ALL' },
        { mode: 'RUNNING', label: 'RUNNING ONLY' },
      ].map(({ mode, label }) => (
        <button
          key={mode}
          onClick={() => setStatusFilter(mode as StatusFilter)}
          className={`px-3 py-1 transition-colors rounded-md ${
            statusFilter === mode
              ? 'bg-green-600 text-white shadow-md'
              : 'text-gray-500 hover:bg-gray-100'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );

  const TypeFilterSwitcher = () => (
    <div className="flex flex-wrap gap-2 border border-gray-300 rounded-lg p-1">
      {[
        { mode: 'ALL', label: 'ALL' },
        { mode: 'FT', label: 'FT' },
        { mode: 'PS', label: 'PS' },
      ].map(({ mode, label }) => (
        <button
          key={mode}
          onClick={() => setTypeFilter(mode as TypeFilter)}
          className={`px-3 py-1 transition-colors rounded-md ${
            typeFilter === mode
              ? 'bg-green-600 text-white shadow-md'
              : 'text-gray-500 hover:bg-gray-100'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );

  const renderView = () => {
    if (loading)
      return (
        <div className="text-center py-10 text-gray-500">Loading...</div>
      );
    return currentView === 'grid' ? (
      <StorageGridView
        rowData={rowData}
        onEdit={openEditModal}
        onDelete={handleDelete}
      />
    ) : (
      <StorageOverviewView
        rowData={rowData}
        photosData={photosData}
        viewMode={currentView}
        onEdit={openEditModal}
        onDelete={handleDelete}
        onRefreshPhotos={handleRefreshPhotos}
      />
    );
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <Toaster position="top-right" />
      <div className="bg-white shadow-xl rounded-lg p-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 border-b pb-4 gap-4">
          <h2 className="text-3xl font-extrabold text-gray-900">
            Master Storage Fuel
          </h2>
          <div className="flex flex-wrap gap-2 items-center">
            <ViewSwitcher />
            <StatusFilterSwitcher />
            <TypeFilterSwitcher />
            <button
              onClick={handleOpenCreateModal}
              className="px-6 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition-colors"
            >
              + Add New Unit
            </button>
          </div>
        </div>
        {renderView()}
      </div>

      <StorageModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleCreateOrUpdate}
        initialData={editingUnit}
      />
    </div>
  );
};

export default MasterStorageFuel;