import React, { useEffect, useState } from 'react';
import { FTBacklog } from './ftbacklog';
import BacklogAction from './BacklogAction';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRotateLeft, faRotateRight, faUpload } from '@fortawesome/free-solid-svg-icons';

interface BackLogTableProps {
  backlogs: FTBacklog[];
  filter: string;
}

const BacklogTable: React.FC<BackLogTableProps> = ({ backlogs, filter }) => {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [expandedImageId, setExpandedImageId] = useState<string | null>(null);
  const [rotationAngle, setRotationAngle] = useState<{ [key: string]: number }>({});
  const [stateBacklog, setStateBacklog] = useState<FTBacklog[]>([]);

  const handleEdit = async (id: string) => {
    console.log(id);
  };
  const handleApprove = async (id: string) => {
    console.log(id);
  };
  const handleShare = async (id: string) => {
    console.log(id);
  };
  const handleDelete = async (id: string) => {
    console.log(id);
  };

  const toggleEvidencePanel = (id: string) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  const handleImageClick = (id: string) => {
    setExpandedImageId(expandedImageId === id ? null : id);
    setRotationAngle((prev) => ({
      ...prev,
      [id]: 0,
    }));
  };

  const rotateLeft = (id: string) => {
    setRotationAngle((prev) => ({
      ...prev,
      [id]: (prev[id] || 0) - 90,
    }));
  };

  const rotateRight = (id: string) => {
    setRotationAngle((prev) => ({
      ...prev,
      [id]: (prev[id] || 0) + 90,
    }));
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
                <th scope="col" className="px-6 py-4">#</th>
                <th scope="col" className="px-6 py-4">Req ID</th>
                <th scope="col" className="px-6 py-4">Operator</th>
                <th scope="col" className="px-2 py-4">FT Number</th>
                <th scope="col" className="px-6 py-4">Request Date</th>
                <th scope="col" className="px-6 py-4">Evidence</th>
                <th scope="col" className="px-6 py-4 flex justify-start pl-8">Action</th>
              </tr>
            </thead>
            <tbody>
              {stateBacklog.map((row, index) => (
                <React.Fragment key={index}>
                  <tr
                    className={`border-b border-neutral-200 transition duration-500 ease-in-out dark:border-white/10 ${
                      row.isclosed ? 'bg-green-50 dark:bg-green-900' : 'hover:bg-neutral-100 dark:hover:bg-neutral-600'
                    }`}
                  >
                    <td className="whitespace-nowrap px-6 py-4 font-medium">{index + 1}</td>
                    <td className="whitespace-nowrap px-6 py-4 font-medium">{row.req_id}</td>
                    <td className="whitespace-nowrap px-6 py-4">{row.report_by}</td>
                    <td className="whitespace-nowrap px-2 py-4">{row.unit_id}</td>
                    <td className="whitespace-nowrap px-2 py-4">{row.created_at.toString()}</td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <button
                        onClick={() => toggleEvidencePanel(row.req_id)}
                        className="text-blue-500 hover:underline"
                      >
                        {expandedRow === row.req_id ? 'Hide' : 'View'}
                      </button>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <BacklogAction
                        data={row.req_id}
                        onEdit={() => handleEdit(row.req_id)}
                        onApprove={() => handleApprove(row.req_id)}
                        onDelete={() => handleDelete(row.req_id)}
                        onShare={() => {}}
                      />
                    </td>
                  </tr>
                  {/* Toggle evidence panel */}
                  {expandedRow === row.req_id && (
                    <tr>
                      <td colSpan={9} className="px-6 py-4">
                        <div className="overflow-hidden transition-max-height duration-500 ease-in-out max-h-[600px] bg-gray-100 dark:bg-gray-800 p-4 rounded">
                          <div className="flex justify-center space-x-4 relative">
                            {/* Loop over the images */}
                            {['evidence'].map((urlType, idx) => (
                              <div
                                key={idx}
                                className={`cursor-pointer transition-all duration-300 relative ${
                                  expandedImageId === `${row.req_id}-${urlType}`
                                    ? 'w-full h-auto max-w-full'
                                    : 'w-32 h-32'
                                }`}
                              >
                                <img
                                  src={row.image_url}
                                  alt={urlType}
                                  className={`rounded-md object-cover transition-all duration-300 ${
                                    expandedImageId === `${row.req_id}-${urlType}`
                                      ? 'scale-100'
                                      : 'scale-75'
                                  }`}
                                  onClick={() => handleImageClick(`${row.req_id}-${urlType}`)}
                                  style={{
                                    transform: `rotate(${rotationAngle[`${row.req_id}-${urlType}`] || 0}deg)`,
                                    transition: 'transform 0.5s',
                                  }}
                                />
                                {/* Rotation buttons */}
                                <div className="absolute top-0 right-0 flex flex-col space-y-2">
                                  <button
                                    className="bg-yellow-300 p-1 rounded-full"
                                    onClick={() => rotateLeft(`${row.req_id}-${urlType}`)}
                                  >
                                    <FontAwesomeIcon icon={faRotateLeft} />
                                  </button>
                                  <button
                                    className="bg-yellow-300 p-1 rounded-full"
                                    onClick={() => rotateRight(`${row.req_id}-${urlType}`)}
                                  >
                                    <FontAwesomeIcon icon={faRotateRight} />
                                  </button>
                                  <button
                                    className="bg-yellow-300 p-1 rounded-full"
                                    onClick={() => {}}
                                  >
                                    <FontAwesomeIcon icon={faUpload} />
                                  </button>
                                </div>
                              </div>
                            ))}
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
      </div>
    </div>
  );
};

export default BacklogTable;
