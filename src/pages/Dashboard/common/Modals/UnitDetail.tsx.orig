import { useEffect, useState } from 'react';
import { supabase } from '../../../db/SupabaseClient';
import { formatDateForSupabase } from '../../../Utils/DateUtility';
import { FTStatus } from '../../../types/FTStatus';

interface UnitDetailProps {
  date: Date | null;
}

const UnitDetail = ({ date }: UnitDetailProps) => {
  const [ftStatusData, setFtStatusData] = useState<FTStatus[]>([]);
  const [loading, setLoading] = useState(true);

  const getFueltruckStatusByDateAndShift = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc(
      'getfueltruckstatusbydateandshift',
      {
        date: formatDateForSupabase(date!),
      },
    );

    if (error) {
      console.error(error.message);
      setLoading(false);
      return;
    }

    const mappedData: FTStatus[] = data.map((item: any) => ({
      unit_id: item.unit_id,
      downtime_start: new Date(item.downtime_start),
      downtime_end: item.downtime_end ? new Date(item.downtime_end) : null,
      pelapor_bd: item.pelapor_bd,
      pelapor_rfu: item.pelapor_rfu,
      activity: item.activity,
      description: item.description,
      status: item.status,
    }));

    setFtStatusData(mappedData);
    setLoading(false);
  };

  useEffect(() => {
    if (date) {
      getFueltruckStatusByDateAndShift();
    }
  }, [date]);

  const ftstatusMapper = (
    status: string,
    bd_start: Date,
    bd_end: Date | null,
    activity: string,
  ) => {
    if (status === 'STBY') {
      return (
        <span className="px-3 py-1 bg-slate-200 rounded-xl text-slate-800">
          {status}
        </span>
      );
    }

    if (status === 'RUNNING' && bd_end !== null) {
      return (
        <span className="px-3 py-1 bg-green-200 rounded-xl text-green-800">
          RFU
        </span>
      );
    }

    if (activity == 'SERVICE') {
      return (
        <span className="px-3 py-1 bg-yellow-200 rounded-xl text-orange-500">
          {activity}
        </span>
      );
    }

    return (
      <span className="px-3 py-1 bg-red-200 rounded-xl text-red-800">BD</span>
    );
  };

  return (
    <div className="fueltruck__status col-span-1 h-full">
      <h1 className="text-lg font-bold pt-4">Fueltruck Status</h1>

      <div className="overflow-x-auto overflow-y-auto max-h-full">
        {loading ? (
          <div>Loading...</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 rounded-lg shadow-md">
            <thead className="bg-white dark:bg-boxdark sticky top-0">
              <tr>
                <th className="px-3 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  No
                </th>
                <th className="px-2 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  FT Number
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-300 bg-slate-50 dark:bg-slate-800 dark:divide-slate-700 text-black dark:text-white">
              {ftStatusData.map((status, index) => (
                <tr key={index}>
                  <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {index + 1}
                  </td>
                  <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    {status.unit_id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {ftstatusMapper(
                      status.status,
                      status.downtime_start,
                      status.downtime_end!,
                      status.activity,
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default UnitDetail;
