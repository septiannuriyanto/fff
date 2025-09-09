// /dst-oil/DraftsTable.tsx
import React from 'react';
import { LocalDraft } from './LocalDraft';

interface Props {
  drafts: LocalDraft[];
  onGetQtyAll: () => void;
  onSubmitAll: () => void;
  handleDeleteDraft: (key: string) => void;
}

const DraftsTable: React.FC<Props> = ({ drafts, handleDeleteDraft }) => {
  return (
   <div className="mt-6">
        <h3 className="font-semibold mb-2">Pending Local Drafts</h3>
        <div className="overflow-auto">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-2 text-left">No</th>
                <th className="p-2 text-left">Warehouse</th>
                <th className="p-2 text-left">Material</th>
                <th className="p-2 text-left">Tank</th>
                <th className="p-2 text-left">UOI</th>
                <th className="p-2 text-left">Input</th>
                <th className="p-2 text-left">Qty</th>
                <th className="p-2 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {drafts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-2 text-center text-gray-500">No pending drafts</td>
                </tr>
              ) : (
                drafts
                  .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                  .map((d, index) => (
                  <tr key={d.key} className="border-b">
                    <td className="p-2">{index+1}</td>
                    <td className="p-2">{d.warehouse_id}</td>
                    <td className="p-2">{d.material_code}{d.item_description ? ` - ${d.item_description}` : ''}</td>
                    <td className="p-2">{d.tank_number}</td>
                    <td className="p-2">{d.uoi}</td>
                    <td className="p-2">{d.input_value}</td>
                    <td className="p-2">{d.qty ?? '---'}</td>
                    <td className="p-2 text-center">
                      <button className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600" onClick={() => handleDeleteDraft(d.key)}>Delete</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
  );
};

export default DraftsTable;