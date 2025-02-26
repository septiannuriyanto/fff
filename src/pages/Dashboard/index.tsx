import { useEffect, useState } from 'react';
import DatePickerOne from '../../components/Forms/DatePicker/DatePickerOne';
import {
  formatDateForSupabase,
  formatDateToString,
} from '../../Utils/DateUtility';
import { useAuth } from '../Authentication/AuthContext';
import ReusableSwitcher from '../../components/Switchers/SwitcherFour';
import { supabase } from '../../db/SupabaseClient';
import { formatNumberWithSeparator } from '../../Utils/NumberUtility';
import { useNavigate } from 'react-router-dom';

interface FTStatus {
  unit_id: string;
  status: string;
  downtime_start: Date;
  downtime_end?: Date | null;
  pelapor_bd: string;
  pelapor_rfu: string;
  activity: string;
  description: string;
  backlog_open_count: number;
}

interface StockStatus {
  working_shift: number;
  warehouse_id: string;
  unit_id: string;
  height_cm: number;
  qty_liter: number;
  pending_posting: number | null;
  pending_receive: number | null;
  soh_system: number;
  max_capacity: number;
}

interface ManpowerStatus {
  nama: string;
  position: number;
  subject: string;
}

const Dashboard = () => {
  const [date, setDate] = useState<Date | null>(new Date());
  const [mpStatus, setMpStatus] = useState<ManpowerStatus[]>([]);
  const [ftStatusData, setFtStatusData] = useState<FTStatus[]>([]);
  const [stStatusData, setStStatusData] = useState<StockStatus[]>([]);
  const [shift, setShift] = useState(true);
  const handleDateChange = async (date: Date | null) => {
    setDate(date);
  };

  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const fetchstoragewithstocktaking = async (date: Date, shift: any) => {
    const { data, error } = await supabase.rpc(
      'fetch_storage_with_stock_taking',
      {
        p_date: formatDateForSupabase(date!),
        p_shift: shift,
      },
    );

    if (error) {
      console.error(error.message);
      return [];
    }

    console.log(data);
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
  };

  const getFueltruckStatusByDateAndShift = async () => {
    const { data, error } = await supabase.rpc(
      'getfueltruckstatusbydateandshift',
      {
        date: formatDateForSupabase(date!),
      },
    );

    if (error) {
      console.error(error.message);
      return;
    }

    console.log(data);

    // Assuming the data returned is an array of records from the function
    const mappedData: FTStatus[] = data.map((item: any) => ({
      unit_id: item.unit_id,
      downtime_start: new Date(item.downtime_start), // Assuming downtime_start is always a valid date
      downtime_end: item.downtime_end ? new Date(item.downtime_end) : null, // Check if downtime_end is not null or undefined
      pelapor_bd: item.pelapor_bd,
      pelapor_rfu: item.pelapor_rfu,
      activity: item.activity,
      description: item.description,
      status: item.status,
      backlog_open_count: item.backlog_open_count,
    }));

    setFtStatusData(mappedData);
  };

  const getManpower = async (date: String, shift: boolean) => {
    const { data, error } = await supabase.rpc('get_manpower_data', {
      p_date: date,
      p_subject: shift ? 'M' : 'S',
    });

    if (error) {
      console.log(error);
      return;
    }
    console.log(data);
    const mappedData: ManpowerStatus[] = data.map((item: any) => ({
      nama: item.nama,
      position: item.position,
      subject: item.subject,
    }));

    setMpStatus(mappedData);
  };

  useEffect(() => {
    getManpower(formatDateForSupabase(date!)!, shift);
  }, [date, shift]);

  useEffect(() => {
    getFueltruckStatusByDateAndShift();
  }, []);

  useEffect(() => {
    fetchstoragewithstocktaking(date!, shift ? 1 : 2);
  }, [date, shift]);

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
    <>
      <div className=" rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark mb-6">
        <div className="flex flex-wrap items-center">
          <div className="w-full border-stroke dark:border-strokedark xl:border-l-2 h-full">
            <div className="w-full p-4 sm:p-12.5 xl:p-5">
              <h1 className="text-lg font-bold pb-4">Dashboard</h1>

              <div className="main-content  w-full flex ">
                <div className="date__picker bg-white dark:bg-boxdark flex gap-2 w-full ">
                  <DatePickerOne
                    enabled={true}
                    handleChange={handleDateChange}
                    setValue={date ? formatDateToString(new Date(date)) : ''}
                  />
                  <div className="shift__switcher flex flex-row items-center gap-2 w-1/2 justify-center md:justify-start flex-wrap">
                    <ReusableSwitcher
                      textTrue="Shift 1"
                      textFalse="Shift 2"
                      onChange={() => {
                        setShift(!shift);
                        console.log(shift);
                      }}
                    />
                  </div>
                </div>
              </div>
              <div className="content__container grid grid-cols-1 md:grid-cols-1 gap-4 h-full">
                <div className="manpower__setting col-span-1  overflow-y-hidden">
                  <h1 className="text-lg font-bold pt-4">Manpower Setting</h1>

                  <div className="overflow-x-auto h-full overflow-y-auto">
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
                          (item) =>
                            item.subject !== 'C' && item.subject !== 'OFF',
                        ).length > 0 ? (
                          mpStatus
                            .filter(
                              (item) =>
                                item.subject !== 'C' && item.subject !== 'OFF',
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
                              colSpan={3} // Adjust the number based on your table's total columns
                              className="text-center py-4 text-gray-500 dark:text-gray-300"
                            >
                              No Data
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="fueltruck__status col-span-1 h-full">
                  <h1 className="text-lg font-bold pt-4">Fueltruck Status</h1>

                  {/* Apply overflow-x-auto and overflow-y-auto to the container */}
                  <div className="overflow-x-auto overflow-y-auto max-h-full">
                    {' '}
                    {/* Set max-h-full to allow vertical scroll */}
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
                          <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Backlog
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-300 bg-slate-50 dark:bg-slate-800 dark:divide-slate-700 text-black dark:text-white ">
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
                            <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                              {status.backlog_open_count === 0 ? (
                                status.backlog_open_count
                              ) : (
                                <button
                                  onClick={() =>
                                    navigate(
                                      `/infrastructure/ftbacklog/${encodeURIComponent(
                                        status.unit_id,
                                      )}`,
                                    )
                                  }
                                >
                                  <p className="font-bold text-red-700 underline">
                                    {status.backlog_open_count}
                                  </p>
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="stock__status col-span-1  ">
                  <h1 className="text-lg font-bold pt-4">Stock Fuel</h1>
                  <div className="overflow-x-auto  overflow-y-scroll h-full">
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
                                Math.floor(
                                  (item.qty_liter / item.max_capacity) * 100,
                                ),
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;
