import React, { useEffect, useState } from 'react';
import { FTBacklog } from './ftbacklog';
import BacklogAction from './BacklogAction';
import { supabase } from '../../../../../db/SupabaseClient';
import { formatDateForSupabase } from '../../../../../Utils/DateUtility';
import { useAuth } from '../../../../Authentication/AuthContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInfoCircle } from '@fortawesome/free-solid-svg-icons';

interface BackLogTableProps {
  backlogs: FTBacklog[];
  filter: string;
}

const BacklogTable: React.FC<BackLogTableProps> = ({ backlogs, filter }) => {
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [stateBacklog, setStateBacklog] = useState<FTBacklog[]>([]);
  const [selectedBacklog, setSelectedBacklog] = useState<FTBacklog | null>(null);

  const { currentUser } = useAuth();

  const handleApprove = async (id: string) => {
    console.log(id);
    const isConfirmed = window.confirm(
      'Are you sure you want to approve this item?',
    );
    if (isConfirmed) {
      const { error } = await supabase
        .from('unit_maintenance')
        .update({
          closed_date: formatDateForSupabase(new Date()),
          closed_by: currentUser?.nrp,
        })
        .eq('req_id', id);

      if (error) {
        alert(error.message);
        return;
      }

      alert('Backlog is completed!');
      window.location.reload();
    }
  };

  useEffect(() => {
    if (filter === '' || filter === 'all') {
      setStateBacklog(backlogs);
      return;
    }

    const filteredBacklogs = backlogs.filter((item) => {
      return item.unit_id.toString() === filter;
    });

    setStateBacklog(filteredBacklogs);
  }, [filter, backlogs]);

  const showBacklogStatus = (backlog: FTBacklog) => {
    setSelectedBacklog(backlog);
  };

  const closeModal = () => {
    setSelectedBacklog(null);
  };

  return (
    <div className="overflow-x-auto sm:-mx-6 lg:-mx-8">
      <div className="inline-block min-w-full py-2 sm:px-6 lg:px-8">
        <div className="overflow-hidden">
          <table className="min-w-full text-left text-sm font-light text-surface dark:text-white">
            <thead className="border-b border-neutral-200 font-medium dark:border-white/10">
              <tr>
                <th scope="col" className="px-6 py-4">#</th>
                <th scope="col" className="px-6 py-4">Evidence</th>
                <th scope="col" className="px-6 py-4">Description</th>
                <th scope="col" className="px-6 py-4">Pelapor</th>
                <th scope="col" className="px-2 py-4 text-center">FT Number</th>
                <th scope="col" className="px-6 py-4 text-center">Request Date</th>
                <th scope="col" className="px-6 py-4 text-center">Status</th>
                <th scope="col" className="px-6 py-4 flex text-center">Action</th>
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
                    <td className="px-6 py-4 font-medium text-center align-middle">
                      {index + 1}
                    </td>

                    <td className="px-6 py-4 text-center align-middle">
                      <img
                        src={row.image_url}
                        className="w-12 h-12 rounded-md cursor-pointer"
                        onClick={() => setSelectedImage(row.image_url)}
                        alt="Evidence"
                      />
                    </td>

                    <td className="px-6 py-4 font-medium text-left align-middle">
                      {row.description}
                    </td>

                    <td className="px-6 py-4 text-left align-middle">
                      {row.report_by}
                    </td>

                    <td className="px-6 py-4 text-center align-middle">
                      {row.unit_id}
                    </td>

                    <td className="px-6 py-4 text-center align-middle">
                      {row.created_at.toString()}
                    </td>

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

                    <td className="px-6 py-4 text-center align-middle">
                      {row.closed_date ? (
                        <button onClick={() => showBacklogStatus(row)}>
                          <FontAwesomeIcon icon={faInfoCircle} width={20} height={20} />
                        </button>
                      ) : (
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
          </table>
        </div>
      </div>

      {/* Modal for Backlog Details */}
      {selectedBacklog && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg w-96">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Backlog Details
            </h2>
            <div className="space-y-2">
              <p><strong>Description:</strong> {selectedBacklog.description}</p>
              <p><strong>Request Date:</strong> {selectedBacklog.created_at.toString()}</p>
              <p><strong>Closed Date:</strong> {selectedBacklog.closed_date?.toString()}</p>
              <p><strong>Closed By:</strong> {selectedBacklog.closed_by}</p>
            </div>
            <button
              onClick={closeModal}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Modal for Enlarged Image */}
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
    </div>
  );
};

export default BacklogTable;
