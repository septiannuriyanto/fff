import React from 'react';
import moment from 'moment';
import DatePickerOne from './Forms/DatePicker/DatePickerOne';

interface LabeledDateInputProps {
  label: string;
  value: Date | null;
  onChange: (date: Date | null) => void;
  required?: boolean;
  enabled?: boolean;
}

const LabeledDateInput: React.FC<LabeledDateInputProps> = ({
  label,
  value,
  onChange,
  required = false,
  enabled = true,
}) => {
  const formattedValue = value ? moment(value).format('DD/MMM/YYYY') : '';

  return (
    <div className="mt-4 mb-8">
      <label className="text-gray-700 flex items-center mb-1">
        {label}
        {required && <span className="ml-1 w-2.5 h-2.5 bg-red-500 rounded-full" />}
      </label>
      <DatePickerOne
        enabled={enabled}
        handleChange={onChange}
        setValue={formattedValue}
      />
    </div>
  );
};

export default LabeledDateInput;
