import React, { useEffect, useState } from 'react';
import { supabase } from '../../../db/SupabaseClient';
import { Storage, Material, StorageSetup } from './components/storagetypes';
import StorageTable from './components/StorageTable';
import StorageMaterialSetupTable from './components/StorageMaterialSetupTable';
import AddMaterialModal from './components/AddMaterialModal';

const StorageManagement: React.FC = () => {
  const [storages, setStorages] = useState<Storage[]>([]);
  const [selectedStorage, setSelectedStorage] = useState<Storage | null>(null);
  const [storageSetup, setStorageSetup] = useState<StorageSetup[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState('');
  const [tankNumber, setTankNumber] = useState(1);

  const fetchStorages = async () => {
    const { data, error } = await supabase.from('storage_oil').select('*').order('warehouse_id', { ascending: true });
    if (error) console.error(error);
    else setStorages(data || []);
  };

  const fetchStorageSetup = async (warehouse_id: string) => {
    const { data, error } = await supabase.from('storage_oil_setup').select('*').eq('warehouse_id', warehouse_id);
    if (error) console.error(error);
    else setStorageSetup(data || []);
  };

  const fetchMaterials = async () => {
    const { data, error } = await supabase.from('materials').select('material_code, item_description, mnemonic, material_group').order('material_code', { ascending: true });
    if (error) console.error(error);
    else setMaterials(data || []);
  };

  useEffect(() => {
    fetchStorages();
    fetchMaterials();
  }, []);

  useEffect(() => {
    if (selectedStorage) fetchStorageSetup(selectedStorage.warehouse_id);
  }, [selectedStorage]);

  const handleAddMaterial = async () => {
  if (!selectedStorage || !selectedMaterial) return;

  // Cek duplicate di frontend
  const exists = storageSetup.some(
    (s) =>
      s.warehouse_id === selectedStorage.warehouse_id &&
      s.material_code === selectedMaterial &&
      s.tank_number === tankNumber
  );
  if (exists) {
    alert('Material + Tank already exists!');
    return;
  }

  const { error } = await supabase.from('storage_oil_setup').insert([
    {
      warehouse_id: selectedStorage.warehouse_id,
      material_code: selectedMaterial,
      tank_number: tankNumber,
    },
  ]);
  if (error) console.error(error);
  else {
    setShowAddModal(false);
    setSelectedMaterial('');
    setTankNumber(1);
    fetchStorageSetup(selectedStorage.warehouse_id);
  }
};


  const handleDeleteMaterial = async (id: number) => {
    if (!window.confirm('Are you sure to delete this record?')) return;
    const { error } = await supabase.from('storage_oil_setup').delete().eq('id', id);
    if (error) console.error(error);
    else if (selectedStorage) fetchStorageSetup(selectedStorage.warehouse_id);
  };

  return (
    <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark mb-6 p-4">
      <h2 className="mb-4 font-bold text-black dark:text-white sm:text-title-sm w-full">Storage Management</h2>
      <div className="flex gap-6">
        <StorageTable storages={storages} selectedStorage={selectedStorage} onSelect={setSelectedStorage} />
        <StorageMaterialSetupTable
          selectedStorage={selectedStorage}
          storageSetup={storageSetup}
          materials={materials}
          onDelete={handleDeleteMaterial}
          onAddClick={() => setShowAddModal(true)}
        />
        {showAddModal && (
          <AddMaterialModal
            warehouseId={selectedStorage?.warehouse_id || ''}
           storageSetup={storageSetup}
            materials={materials}
            selectedMaterial={selectedMaterial}
            setSelectedMaterial={setSelectedMaterial}
            tankNumber={tankNumber}
            setTankNumber={setTankNumber}
            onClose={() => setShowAddModal(false)}
            onSubmit={handleAddMaterial}
          />
        )}
      </div>
    </div>
  );
};

export default StorageManagement;
