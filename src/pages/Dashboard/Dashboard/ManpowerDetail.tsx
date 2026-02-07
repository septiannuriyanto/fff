import { useEffect, useState } from 'react';
import { supabase } from '../../../db/SupabaseClient';
import { formatDateForSupabase } from '../../../Utils/DateUtility';
import { ManpowerStatus } from '../../../types/ManpowerStatus';

interface ManpowerDetailProps {
  date: Date | null;
  shift: boolean;
}

const ManpowerDetail = ({ date, shift }: ManpowerDetailProps) => {
  const [mpStatus, setMpStatus] = useState<ManpowerStatus[]>([]);
  const [loading, setLoading] = useState(true);

  const getManpower = async (date: String, shift: boolean) => {
    setLoading(true);
    const { data, error } = await supabase.rpc('get_manpower_data', {
      p_date: date,
      p_subject: shift ? 'M' : 'S',
    });

    if (error) {
      console.log(error);
      setLoading(false);
      return;
    }
    const mappedData: ManpowerStatus[] = data.map((item: any) => ({
      nama: item.nama,
      position: item.position,
      subject: item.subject,
    }));

    setMpStatus(mappedData);
    setLoading(false);
  };

  useEffect(() => {
    if (date) {
      getManpower(formatDateForSupabase(date)!, shift);
    }
  }, [date, shift]);

  return (
    <div className="manpower__setting col-span-1 overflow-y-hidden h-full">
      <h1 className="text-lg font-bold pt-4">Manpower Setting</h1>

      <div className="overflow-x-auto h-full overflow-y-auto">
        {loading ? (
          <div>Loading...</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 rounded-lg shadow-md">
            <thead className="bg-white dark:bg-boxdark sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  No
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Nama
                </th>

                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300 bg-slate-50 dark:bg-slate-800 dark:divide-slate-700 text-black dark:text-white">
              {mpStatus.filter(
                (item) => item.subject !== 'C' && item.subject !== 'OFF',
              ).length > 0 ? (
                mpStatus
                  .filter(
                    (item) => item.subject !== 'C' && item.subject !== 'OFF',
                  )
                  .map((item, index) => (
                    <tr
                      key={index}
                      className={
                        item.position === 1
                          ? 'bg-blue-100 dark:bg-blue-900'
                          : item.position === 2
                          ? 'bg-green-100 dark:bg-green-900'
                          : item.position === 3
                          ? 'bg-yellow-100 dark:bg-yellow-800'
                          : item.position === 4
                          ? 'bg-purple-100 dark:bg-purple-800'
                          : 'bg-violet-200 dark:bg-violet-900'
                      }
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {item.nama}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {item.subject}
                      </td>
                    </tr>
                  ))
              ) : (
                <tr>
                  <td
                    colSpan={3}
                    className="text-center py-4 text-gray-500 dark:text-gray-300"
                  >
                    No Data
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default ManpowerDetail;
