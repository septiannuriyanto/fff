import React, { useEffect, useState } from 'react';
import { FTBacklog } from './ftbacklog';
import BacklogAction from './BacklogAction';
import { supabase } from '../../../../../db/SupabaseClient';
import { formatDateForSupabase } from '../../../../../Utils/DateUtility';

interface BackLogTableProps {
  backlogs: FTBacklog[];
  filter: string;
}

const BacklogTable: React.FC<BackLogTableProps> = ({ backlogs, filter }) => {
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [stateBacklog, setStateBacklog] = useState<FTBacklog[]>([]);

  const handleApprove = async (id: string) => {
    console.log(id);
    const isConfirmed = window.confirm(
      'Are you sure you want to approve this item?',
    );
    if (isConfirmed) {
      const {error } = await supabase
        .from('unit_maintenance')
        .update({
          closed_date: formatDateForSupabase(new Date()),
          closed_by: 'PLANT_USER',
        })
        .eq('req_id', id);

    if(error){
      alert(error.message);
      return;
    }

      alert('Backlog is completed!');
      window.location.reload();
    }
  };

  useEffect(() => {
    // If filter is empty or "All", show all backlogs
    if (filter === '' || filter === 'all') {
      setStateBacklog(backlogs);
      return;
    }

    // Assuming filter is a unit_id, but it's a string. Make sure both filter and unit_id are of the same type.
    const filteredBacklogs = backlogs.filter((item) => {
      return item.unit_id.toString() === filter; // Ensure both are strings
    });

    // Update the state with the filtered backlogs
    setStateBacklog(filteredBacklogs);
  }, [filter, backlogs]); // Run the effect when 'filter' or 'backlogs' changes

  return (
    <div className="overflow-x-auto sm:-mx-6 lg:-mx-8">
      <div className="inline-block min-w-full py-2 sm:px-6 lg:px-8">
        <div className="overflow-hidden">
          <table className="min-w-full text-left text-sm font-light text-surface dark:text-white">
            <thead className="border-b border-neutral-200 font-medium dark:border-white/10">
              <tr>
                <th scope="col" className="px-6 py-4">
                  #
                </th>
                <th scope="col" className="px-6 py-4">
                  Evidence
                </th>

                <th scope="col" className="px-6 py-4">
                  Description
                </th>
                <th scope="col" className="px-6 py-4">
                  Pelapor
                </th>
                <th scope="col" className="px-2 py-4 text-center">
                  FT Number
                </th>
                <th scope="col" className="px-6 py-4 text-center">
                  Request Date
                </th>
                <th scope="col" className="px-6 py-4 text-center">
                  Status
                </th>

                <th scope="col" className="px-6 py-4 flex text-center ">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {stateBacklog.map((row, index) => (
                <React.Fragment key={index}>
                  <tr
                    className={`border-b border-neutral-200 transition duration-500 ease-in-out dark:border-white/10 ${
                      row.closed_date
                        ? 'bg-green-50 dark:bg-green-900'
                        : 'hover:bg-neutral-100 dark:hover:bg-neutral-600'
                    }`}
                  >
                    {/* Index Column */}
                    <td className="px-6 py-4 font-medium text-center align-middle">
                      {index + 1}
                    </td>

                    {/* Image Column */}
                    <td className="px-6 py-4 text-center align-middle">
                      <img
                        src={row.image_url}
                        className="w-12 h-12 rounded-md cursor-pointer"
                        onClick={() => setSelectedImage(row.image_url)}
                        alt="Evidence"
                      />
                    </td>

                    {/* Request ID Column */}
                    <td className="px-6 py-4 font-medium text-left align-middle">
                      {row.description}
                    </td>

                    {/* Reported By Column */}
                    <td className="px-6 py-4 text-left align-middle">
                      {row.report_by}
                    </td>

                    {/* Unit ID Column */}
                    <td className="px-6 py-4 text-center align-middle">
                      {row.unit_id}
                    </td>

                    {/* Created At Column */}
                    <td className="px-6 py-4 text-center align-middle">
                      {row.created_at.toString()}
                    </td>

                    {/* Status Column */}
                    <td className="px-6 py-4 text-center align-middle">
                      {row.closed_date ? (
                        <span className="px-3 py-1 bg-green-200 rounded-xl text-green-800">
                          CLOSED
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-red-200 rounded-xl text-red-800">
                          OPEN
                        </span>
                      )}
                    </td>

                    {/* Actions Column */}
                    <td className="px-6 py-4 text-center align-middle">
                      {!row.closed_date && (
                        <BacklogAction
                          data={row.req_id}
                          onApprove={() => handleApprove(row.req_id)}
                        />
                      )}
                    </td>
                  </tr>
                </React.Fragment>
              ))}
            </tbody>

            {/* Modal for enlarged image */}
            {selectedImage && (
              <div
                className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50"
                onClick={() => setSelectedImage('')}
              >
                <div className="relative bg-white p-4 rounded-lg shadow-lg">
                  <button
                    className="absolute top-2 right-2 bg-gray-300 rounded-full px-2 py-1 text-sm"
                    onClick={() => setSelectedImage('')}
                  >
                    ✕
                  </button>
                  <img
                    src={selectedImage}
                    className="max-w-full max-h-[80vh] rounded-lg"
                    alt="Expanded"
                  />
                </div>
              </div>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};

export default BacklogTable;
