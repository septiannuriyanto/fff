import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../db/SupabaseClient';

const AddMaterialPage: React.FC = () => {
  const navigate = useNavigate();
  const [materialCode, setMaterialCode] = useState('');
  const [description, setDescription] = useState('');
  const [mnemonic, setMnemonic] = useState('');
  const [group, setGroup] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!materialCode) return alert('Material code required');
    setLoading(true);
    const { error } = await supabase.from('materials').insert([{
      material_code: materialCode,
      item_description: description,
      mnemonic,
      material_group: group,
    }]);
    setLoading(false);
    if (error) {
      alert('Error: ' + error.message);
    } else {
      alert('Material added successfully');
      navigate(-1); // kembali ke halaman sebelumnya
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4">Add New Material</h2>
      <div className="mb-2">
        <label className="block mb-1">Material Code*</label>
        <input className="border p-2 w-full rounded" value={materialCode} onChange={e => setMaterialCode(e.target.value)} />
      </div>
      <div className="mb-2">
        <label className="block mb-1">Description</label>
        <input className="border p-2 w-full rounded" value={description} onChange={e => setDescription(e.target.value)} />
      </div>
      <div className="mb-2">
        <label className="block mb-1">Mnemonic</label>
        <input className="border p-2 w-full rounded" value={mnemonic} onChange={e => setMnemonic(e.target.value)} />
      </div>
      <div className="mb-2">
        <label className="block mb-1">Material Group</label>
        <input className="border p-2 w-full rounded" value={group} onChange={e => setGroup(e.target.value)} />
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <button className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400" onClick={() => navigate(-1)}>Cancel</button>
        <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600" onClick={handleSubmit} disabled={loading}>
          {loading ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
};

export default AddMaterialPage;
