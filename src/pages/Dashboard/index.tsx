import { useState, useEffect } from 'react';
import DatePickerOne from '../../components/Forms/DatePicker/DatePickerOne';
import { formatDateToString } from '../../Utils/DateUtility';
import ReusableSwitcher from '../../components/Switchers/SwitcherFour';
import ManpowerDetail from './Dashboard/ManpowerDetail';
import UnitDetail from './Dashboard/UnitDetail';
import StockDetail from './Dashboard/StockDetail';
import ScheduleDetail from './Dashboard/ScheduleDetail';
import BoardDetail from './Dashboard/BoardDetail';
import {
  FaUsers,
  FaTruck,
  FaLayerGroup,
  FaCalendarAlt,
  FaGasPump,
  FaClipboardList,
  FaTools,
  FaFilter,
} from 'react-icons/fa';
import { getShift } from '../../Utils/TimeUtility';

const Dashboard = () => {
  const [date, setDate] = useState<Date | null>(new Date());
  const [shift, setShift] = useState(getShift() === 1);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState<JSX.Element | null>(null);
  const [modalTitle, setModalTitle] = useState('');

  const handleDateChange = (date: Date | null) => {
    setDate(date);
  };

  const openModal = (title: string, content: JSX.Element) => {
    setModalTitle(title);
    setModalContent(content);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalContent(null);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeModal();
      }
    };

    if (modalOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [modalOpen]);

  return (
    <>
      <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark mb-6">
        <div className="p-4 sm:p-6 pb-2">
          {/* ... existing dashboard content ... */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <h1 className="text-2xl font-bold text-black dark:text-white">
              Dashboard Overview
            </h1>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="w-full sm:w-auto">
                <DatePickerOne
                  enabled={true}
                  handleChange={handleDateChange}
                  setValue={date ? formatDateToString(new Date(date)) : ''}
                />
              </div>
              <div className="w-full sm:w-auto">
                 <ReusableSwitcher
                  textTrue="Shift 1"
                  textFalse="Shift 2"
                  value={shift}
                  onChange={() => {
                    setShift(!shift);
                  }}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {/* Manpower Cluster */}
            <div
              className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-blue-100 dark:border-blue-800 flex items-start gap-4"
              onClick={() =>
                openModal(
                  'Manpower Details',
                  <ManpowerDetail date={date} shift={shift} />,
                )
              }
            >
              <div className="p-3 bg-blue-500 rounded-full text-white">
                <FaUsers size={24} />
              </div>
              <div>
                <h2 className="text-xl font-semibold mb-1 text-black dark:text-white">
                  Manpower
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  View attendance & status
                </p>
              </div>
            </div>

            {/* Unit Cluster */}
            <div
              className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-green-100 dark:border-green-800 flex items-start gap-4"
              onClick={() =>
                openModal('Unit Status', <UnitDetail date={date} />)
              }
            >
              <div className="p-3 bg-green-500 rounded-full text-white">
                <FaTruck size={24} />
              </div>
              <div>
                <h2 className="text-xl font-semibold mb-1 text-black dark:text-white">
                  Unit
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Fuel Truck Status & BD
                </p>
              </div>
            </div>

            {/* Stock Cluster */}
            <div
              className="bg-yellow-50 dark:bg-yellow-900/20 p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-yellow-100 dark:border-yellow-800 flex items-start gap-4"
              onClick={() =>
                openModal(
                  'Stock Overview',
                  <StockDetail date={date} shift={shift} />,
                )
              }
            >
              <div className="p-3 bg-yellow-500 rounded-full text-white">
                <FaLayerGroup size={24} />
              </div>
              <div>
                <h2 className="text-xl font-semibold mb-1 text-black dark:text-white">
                  Stock
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Fuel inventory levels
                </p>
              </div>
            </div>

            {/* Schedule Cluster */}
            <div className="bg-purple-50 dark:bg-purple-900/20 p-6 rounded-lg shadow-sm border border-purple-100 dark:border-purple-800 col-span-1 md:col-span-2 xl:col-span-1">
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2 bg-purple-500 rounded-full text-white">
                  <FaCalendarAlt size={20} />
                </div>
                <h2 className="text-xl font-semibold text-black dark:text-white">
                  Schedule
                </h2>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  className="flex flex-col items-center justify-center p-3 bg-white dark:bg-boxdark rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  onClick={() =>
                    openModal(
                      'Refueling Schedule',
                      <ScheduleDetail type="refueling" />,
                    )
                  }
                >
                  <FaGasPump className="text-purple-500 mb-1" />
                  <span className="text-xs font-medium text-center">Refueling</span>
                </button>
                <button
                  className="flex flex-col items-center justify-center p-3 bg-white dark:bg-boxdark rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  onClick={() =>
                    openModal(
                      'Daily Check Schedule',
                      <ScheduleDetail type="dailycheck" />,
                    )
                  }
                >
                  <FaClipboardList className="text-purple-500 mb-1" />
                  <span className="text-xs font-medium text-center">Daily Check</span>
                </button>
                <button
                  className="flex flex-col items-center justify-center p-3 bg-white dark:bg-boxdark rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  onClick={() =>
                    openModal('Service Schedule', <ScheduleDetail type="service" />)
                  }
                >
                  <FaTools className="text-purple-500 mb-1" />
                  <span className="text-xs font-medium text-center">Service</span>
                </button>
                <button
                  className="flex flex-col items-center justify-center p-3 bg-white dark:bg-boxdark rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  onClick={() =>
                    openModal(
                      'Filter Change Schedule',
                      <ScheduleDetail type="filterchange" />,
                    )
                  }
                >
                  <FaFilter className="text-purple-500 mb-1" />
                  <span className="text-xs font-medium text-center">Ganti Filter</span>
                </button>
              </div>
            </div>

            {/* Board Cluster removed from here */}
          </div>
          
          <div className="mt-6">
            <BoardDetail />
          </div>
        </div>
      </div>

      {modalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
          onClick={closeModal}
        >
           {/* Modal Container */}
          <div 
            className="bg-white dark:bg-boxdark rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-semibold text-black dark:text-white">
                {modalTitle}
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  ></path>
                </svg>
              </button>
            </div>
            {/* Modal Content */}
            <div className="p-4 overflow-y-auto flex-1">
              {modalContent}
            </div>
             {/* Modal Footer (Optional) */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                 <button
                    onClick={closeModal}
                    className="px-4 py-2 bg-primary text-white rounded hover:bg-opacity-90"
                 >
                     Close
                 </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Dashboard;
