import React from 'react';

type Manpower = {
  nrp: string;
  nama: string;
};

interface AlterStatusModalProps {
  unitId: string;
  currentStatus: string;
  manpower: Manpower[];
  selectedDate: string;
  selectedTime: string;
  selectedReporter: string;
  newStatus: string;
  onStatusChange: (status: string) => void;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
  onReporterChange: (reporter: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
}

const statusColors: Record<string, string> = {
  RFU: 'bg-green-500 text-white',
  BD: 'bg-red-500 text-white',
  PS: 'bg-yellow-500 text-black',
};

const AlterStatusModal: React.FC<AlterStatusModalProps> = ({
  unitId,
  currentStatus,
  manpower,
  selectedDate,
  selectedTime,
  selectedReporter,
  newStatus,
  onStatusChange,
  onDateChange,
  onTimeChange,
  onReporterChange,
  onCancel,
  onSubmit,
}) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white p-6 rounded-xl w-96 space-y-4">
        <h3 className="text-lg font-medium">Alter Status: {unitId}</h3>
        <div className="flex space-x-2">
          {['RFU', 'BD', 'PS'].map((s) => {
            const disabled = s === currentStatus;
            return (
              <button
                key={s}
                disabled={disabled}
                onClick={() => onStatusChange(s)}
                className={`px-3 py-1 rounded-full border ${
                  newStatus === s ? 'ring-2 ring-blue-500' : ''
                } ${disabled ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : statusColors[s]}`}
              >
                {s}
              </button>
            );
          })}
        </div>
        <div className="flex space-x-2">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => onDateChange(e.target.value)}
            className="border rounded p-1 w-1/2"
          />
          <input
            type="time"
            value={selectedTime}
            onChange={(e) => onTimeChange(e.target.value)}
            className="border rounded p-1 w-1/2"
          />
        </div>
        <select
          value={selectedReporter}
          onChange={(e) => onReporterChange(e.target.value)}
          className="border rounded p-1 w-full"
        >
          <option value="">Select Reporter</option>
          {manpower.map((mp) => (
            <option key={mp.nrp} value={mp.nrp}>
              {mp.nama}
            </option>
          ))}
        </select>
        <div className="flex justify-end space-x-2">
          <button
            onClick={onCancel}
            className="px-3 py-1 bg-gray-300 rounded"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            className="px-3 py-1 bg-blue-500 text-white rounded"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

export default AlterStatusModal;
