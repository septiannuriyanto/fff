import { useEffect, useState } from 'react';
import { supabase } from '../../../db/SupabaseClient';
import { formatDateForSupabase } from '../../../Utils/DateUtility';
import { formatNumberWithSeparator } from '../../../Utils/NumberUtility';
import { StockStatus } from '../../../types/StockStatus';

interface StockDetailProps {
  date: Date | null;
  shift: boolean;
}

const StockDetail = ({ date, shift }: StockDetailProps) => {
  const [stStatusData, setStStatusData] = useState<StockStatus[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchstoragewithstocktaking = async (date: Date, shift: any) => {
    setLoading(true);
    const { data, error } = await supabase.rpc(
      'fetch_storage_with_stock_taking',
      {
        p_date: formatDateForSupabase(date!),
        p_shift: shift,
      },
    );

    if (error) {
      console.error(error.message);
      setLoading(false);
      return [];
    }

    const mappedData: StockStatus[] = data.map((item: any) => ({
      working_shift: item.working_shift,
      warehouse_id: item.warehouse_id,
      unit_id: item.unit_id,
      height_cm: item.height_cm,
      qty_liter: item.qty_liter,
      pending_posting: item.pending_posting,
      pending_receive: item.pending_receive,
      soh_system: item.soh_system,
      max_capacity: item.max_capacity,
    }));

    setStStatusData(mappedData);
    setLoading(false);
  };

  useEffect(() => {
    if (date) {
      fetchstoragewithstocktaking(date, shift ? 1 : 2);
    }
  }, [date, shift]);

  const stockStatusMapper = (qty: number) => {
    if (qty > 80) {
      return (
        <span className="px-3 py-1 bg-green-200 rounded-xl text-green-800">
          {qty}%
        </span>
      );
    }
    if (qty > 60) {
      return (
        <span className="px-3 py-1 bg-yellow-200 rounded-xl text-orange-500">
          {qty}%
        </span>
      );
    }
    return (
      <span className="px-3 py-1 bg-red-200 rounded-xl text-red-800">
        {qty}%
      </span>
    );
  };

  return (
    <div className="stock__status col-span-1 h-full">
      <h1 className="text-lg font-bold pt-4">Stock Fuel</h1>
      <div className="overflow-x-auto overflow-y-scroll h-full">
        {loading ? (
          <div>Loading...</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 rounded-lg shadow-md">
            <thead className="bg-gray-100 dark:bg-gray-700 sticky top-0 bg-white dark:bg-boxdark">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-12">
                  No
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  WH
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Sonding
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Qty
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  %
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-300 bg-slate-50 dark:bg-slate-800 dark:divide-slate-700 text-black dark:text-white">
              {stStatusData.map((item, index) => (
                <tr key={index}>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {index + 1}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    {item.unit_id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    {item.height_cm}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    {formatNumberWithSeparator(
                      parseFloat((item.qty_liter | 0).toFixed(0)),
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    {stockStatusMapper(
                      Math.floor((item.qty_liter / item.max_capacity) * 100),
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

export default StockDetail;
