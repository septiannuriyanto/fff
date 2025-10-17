import React, { useEffect, useState } from 'react';
import { Check, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getOilPriorityWeights,
  updateOilPriorityWeight,
  getBufferTargetsByWarehouse,
  updateBufferTarget,
  OilPriorityWeight,
  OilBufferTarget,
} from './oilSetupHelpers';

interface OilSetupPanelProps {
  warehouseId: string;
}

const OilSetupPanel: React.FC<OilSetupPanelProps> = ({ warehouseId }) => {
  const [priorityWeights, setPriorityWeights] = useState<OilPriorityWeight[]>([]);
  const [bufferTargets, setBufferTargets] = useState<OilBufferTarget[]>([]);
  const [loading, setLoading] = useState(false);

  // Local edit states
  const [editWeights, setEditWeights] = useState<Record<string, number>>({});
  const [editBuffers, setEditBuffers] = useState<Record<string, Partial<OilBufferTarget>>>({});

  useEffect(() => {
    fetchData();
  }, [warehouseId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [weights, buffers] = await Promise.all([
        getOilPriorityWeights(),
        getBufferTargetsByWarehouse(warehouseId),
      ]);
      setPriorityWeights(weights);
      setBufferTargets(buffers);
    } catch (err) {
      console.error(err);
      toast.error('Gagal memuat data konfigurasi');
    } finally {
      setLoading(false);
    }
  };

  const handleWeightInput = (code: string, value: number) => {
    setEditWeights((prev) => ({ ...prev, [code]: value }));
  };

  const handleBufferInput = (code: string, field: keyof OilBufferTarget, value: number | boolean) => {
    setEditBuffers((prev) => ({
      ...prev,
      [code]: { ...prev[code], [field]: value },
    }));
  };

  const saveWeight = async (code: string) => {
    const newWeight = editWeights[code];
    if (newWeight == null) return;

    try {
      await updateOilPriorityWeight(code, newWeight);
      toast.success('Bobot prioritas disimpan!');
      setEditWeights((prev) => {
        const updated = { ...prev };
        delete updated[code];
        return updated;
      });
      fetchData();
    } catch {
      toast.error('Gagal menyimpan bobot prioritas');
    }
  };

  const saveBuffer = async (code: string) => {
    const updatedFields = editBuffers[code];
    if (!updatedFields) return;

    try {
      await updateBufferTarget(warehouseId, code, updatedFields);
      toast.success('Buffer stock disimpan!');
      setEditBuffers((prev) => {
        const updated = { ...prev };
        delete updated[code];
        return updated;
      });
      fetchData();
    } catch {
      toast.error('Gagal menyimpan buffer stock');
    }
  };

  return (
    <div className="p-4 space-y-6">
      <h2 className="text-xl font-bold">⚙️ Oil Priority & Buffer Setup</h2>

      {loading && <p>Loading data...</p>}

      {!loading && (
        <>
          {/* PRIORITY WEIGHT */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow">
            <h3 className="font-semibold mb-2">📊 Priority Weights</h3>
            <table className="w-full text-sm">
              <thead>
  <tr className="border-b">
    <th className="text-left py-1">Material Code</th>
    <th className="text-left py-1">Description</th>
    <th className="text-left py-1 w-32">Weight</th>
    <th className="py-1 w-10 text-center">Save</th>
  </tr>
</thead>
              <tbody>
                {priorityWeights.map((p) => (
                  <tr key={p.material_code} className="border-b">
                    <td className="py-1">{p.material_code}</td>
                    <td className="py-1 text-gray-500">{p.item_description || '-'}</td>
                    <td className="py-1">
                      <input
                        type="number"
                        value={editWeights[p.material_code] ?? p.priority_weight}
                        onChange={(e) =>
                          handleWeightInput(p.material_code, Number(e.target.value))
                        }
                        className="w-20 border rounded px-1"
                      />
                    </td>
                    <td className="py-1 text-center">
                      {editWeights[p.material_code] !== undefined ? (
                        <button
                          onClick={() => saveWeight(p.material_code)}
                          className="p-1 text-green-600 hover:text-green-800"
                        >
                          <Save size={16} />
                        </button>
                      ) : (
                        <Check size={16} className="text-gray-400 mx-auto" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* BUFFER TARGET */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow">
            <h3 className="font-semibold mb-2">
              🏭 Buffer Targets (Warehouse {warehouseId})
            </h3>
            <table className="w-full text-sm">
              <thead>
  <tr className="border-b">
    <th className="text-left py-1">Material</th>
    <th className="text-left py-1">Description</th>
    <th className="text-center py-1">Target</th>
    <th className="text-center py-1">Reorder</th>
    <th className="text-center py-1">Max</th>
    <th className="text-center py-1">Active</th>
    <th className="py-1 text-center">Save</th>
  </tr>
</thead>
              <tbody>
                {bufferTargets.map((b) => {
                  const edit = editBuffers[b.material_code] || {};
                  return (
                    <tr key={b.material_code} className="border-b">
                      <td className="py-1">{b.material_code}</td>
                      <td className="py-1 text-gray-500">{b.item_description || '-'}</td>

                      <td className="py-1 text-center">
                        <input
                          type="number"
                          value={edit.target_buffer ?? b.target_buffer}
                          onChange={(e) =>
                            handleBufferInput(
                              b.material_code,
                              'target_buffer',
                              Number(e.target.value)
                            )
                          }
                          className="w-16 border rounded px-1"
                        />
                      </td>

                      <td className="py-1 text-center">
                        <input
                          type="number"
                          value={edit.reorder_point ?? b.reorder_point}
                          onChange={(e) =>
                            handleBufferInput(
                              b.material_code,
                              'reorder_point',
                              Number(e.target.value)
                            )
                          }
                          className="w-16 border rounded px-1"
                        />
                      </td>

                      <td className="py-1 text-center">
                        <input
                          type="number"
                          value={edit.max_buffer ?? b.max_buffer}
                          onChange={(e) =>
                            handleBufferInput(
                              b.material_code,
                              'max_buffer',
                              Number(e.target.value)
                            )
                          }
                          className="w-16 border rounded px-1"
                        />
                      </td>

                      <td className="py-1 text-center">
                        <input
                          type="checkbox"
                          checked={edit.active ?? b.active}
                          onChange={(e) =>
                            handleBufferInput(
                              b.material_code,
                              'active',
                              e.target.checked
                            )
                          }
                        />
                      </td>

                      <td className="py-1 text-center">
                        {editBuffers[b.material_code] ? (
                          <button
                            onClick={() => saveBuffer(b.material_code)}
                            className="p-1 text-green-600 hover:text-green-800"
                          >
                            <Save size={16} />
                          </button>
                        ) : (
                          <Check size={16} className="text-gray-400 mx-auto" />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default OilSetupPanel;
