import React, { useEffect, useState } from "react";
import { Eye, Edit, Trash2, Plus } from "lucide-react";
import { supabase } from "../../../db/SupabaseClient";

interface Mrp {
  id: number;
  created_at: string;
  material_code: string | null;
  type: string | null;
  placement: string | null;
  component: string | null;
  inventory_request_number: number | null;
  attachment_url: string | null;
  min: number | null;
  max: number | null;
  date_proposal: string | null;
}

const MaterialRequirementPlanning: React.FC = () => {
  const [rows, setRows] = useState<Mrp[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRow, setSelectedRow] = useState<Mrp | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [editingRow, setEditingRow] = useState<Mrp | null>(null);
  const [form, setForm] = useState<Partial<Mrp>>({});

  useEffect(() => {
    fetchRows();
  }, []);

  async function fetchRows() {
    setLoading(true);
    const { data, error } = await supabase.from("mrp").select("*").order("id", { ascending: false });
    if (!error && data) setRows(data as Mrp[]);
    setLoading(false);
  }

  function openModal(record?: Mrp) {
    if (record) {
      setEditingRow(record);
      setForm(record);
    } else {
      setEditingRow(null);
      setForm({});
    }
    setShowModal(true);
  }

  async function handleSave() {
    if (editingRow) {
      await supabase.from("mrp").update(form).eq("id", editingRow.id);
    } else {
      await supabase.from("mrp").insert(form);
    }
    setShowModal(false);
    fetchRows();
  }

  async function handleDelete(id: number) {
    if (!confirm("Hapus record ini?")) return;
    await supabase.from("mrp").delete().eq("id", id);
    fetchRows();
  }

  return (
    <>
      <div className=" rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark mb-6">
        <div className="flex flex-wrap items-center">
          <div className="w-full border-stroke dark:border-strokedark xl:border-l-2">
            <div className="w-full p-4 sm:p-12.5 xl:p-5">
                 <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Pengajuan MRP</h2>
        <button
          onClick={() => openModal()}
          className="border border-gray-300 px-4 py-2 rounded flex items-center gap-2 hover:bg-gray-100"
        >
          <Plus size={18} /> Tambah Record
        </button>
      </div>
  
              <div className="main-content  w-full">
                <div className="p-4">


      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-3 py-2">ID</th>
                <th className="border px-3 py-2">Material Code</th>
                <th className="border px-3 py-2">Type</th>
                <th className="border px-3 py-2">Placement</th>
                <th className="border px-3 py-2">Component</th>
                <th className="border px-3 py-2">Inventory Req</th>
                <th className="border px-3 py-2">Min</th>
                <th className="border px-3 py-2">Max</th>
                <th className="border px-3 py-2">Date Proposal</th>
                <th className="border px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <React.Fragment key={r.id}>
                  <tr className="hover:bg-gray-50">
                    <td className="border px-3 py-2">{r.id}</td>
                    <td className="border px-3 py-2">{r.material_code}</td>
                    <td className="border px-3 py-2">{r.type}</td>
                    <td className="border px-3 py-2">{r.placement}</td>
                    <td className="border px-3 py-2">{r.component}</td>
                    <td className="border px-3 py-2">{r.inventory_request_number}</td>
                    <td className="border px-3 py-2">{r.min}</td>
                    <td className="border px-3 py-2">{r.max}</td>
                    <td className="border px-3 py-2">{r.date_proposal}</td>
                    <td className="border px-3 py-2">
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            setSelectedRow(selectedRow?.id === r.id ? null : r)
                          }
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => openModal(r)}
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(r.id)}
                          className="p-1 hover:bg-gray-100 rounded text-red-500"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {selectedRow?.id === r.id && (
                    <tr>
                      <td colSpan={10} className="border bg-gray-50 p-4">
                        <h4 className="font-semibold mb-2">Detail Barang</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1 text-sm">
                            <p><b>Material Code:</b> {r.material_code}</p>
                            <p><b>Type:</b> {r.type}</p>
                            <p><b>Placement:</b> {r.placement}</p>
                            <p><b>Component:</b> {r.component}</p>
                            <p><b>Inventory Req:</b> {r.inventory_request_number}</p>
                            <p><b>Min:</b> {r.min}</p>
                            <p><b>Max:</b> {r.max}</p>
                            <p><b>Date Proposal:</b> {r.date_proposal}</p>
                          </div>
                          <div>
                            {r.attachment_url ? (
                              <img
                                src={r.attachment_url}
                                alt="Attachment"
                                className="max-h-60 object-contain rounded"
                              />
                            ) : (
                              <p className="italic text-gray-500">Tidak ada foto</p>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow w-full max-w-lg">
            <h3 className="text-lg font-semibold mb-4">
              {editingRow ? "Edit Record" : "Tambah Record"}
            </h3>
            <div className="space-y-2">
              <input
                placeholder="Material Code"
                className="border px-3 py-2 rounded w-full"
                value={form.material_code ?? ""}
                onChange={(e) => setForm({ ...form, material_code: e.target.value })}
              />
              <input
                placeholder="Type"
                className="border px-3 py-2 rounded w-full"
                value={form.type ?? ""}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              />
              <input
                placeholder="Placement"
                className="border px-3 py-2 rounded w-full"
                value={form.placement ?? ""}
                onChange={(e) => setForm({ ...form, placement: e.target.value })}
              />
              <input
                placeholder="Component"
                className="border px-3 py-2 rounded w-full"
                value={form.component ?? ""}
                onChange={(e) => setForm({ ...form, component: e.target.value })}
              />
              <input
                type="number"
                placeholder="Inventory Request Number"
                className="border px-3 py-2 rounded w-full"
                value={form.inventory_request_number ?? ""}
                onChange={(e) =>
                  setForm({ ...form, inventory_request_number: parseInt(e.target.value) })
                }
              />
              <input
                placeholder="Attachment URL"
                className="border px-3 py-2 rounded w-full"
                value={form.attachment_url ?? ""}
                onChange={(e) => setForm({ ...form, attachment_url: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  className="border px-3 py-2 rounded w-full"
                  value={form.min ?? ""}
                  onChange={(e) => setForm({ ...form, min: parseInt(e.target.value) })}
                />
                <input
                  type="number"
                  placeholder="Max"
                  className="border px-3 py-2 rounded w-full"
                  value={form.max ?? ""}
                  onChange={(e) => setForm({ ...form, max: parseInt(e.target.value) })}
                />
              </div>
              <input
                type="date"
                className="border px-3 py-2 rounded w-full"
                value={form.date_proposal ?? ""}
                onChange={(e) => setForm({ ...form, date_proposal: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border rounded hover:bg-gray-100"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );

};

export default MaterialRequirementPlanning;
