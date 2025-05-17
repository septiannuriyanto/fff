import React from 'react';

interface Option {
  value: string;
  label: string;
}

interface LabeledComboBoxProps {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: Option[];
  required?: boolean;
}

const LabeledComboBox: React.FC<LabeledComboBoxProps> = ({
  label,
  value,
  onChange,
  options,
  required = false,
}) => {
  return (
    <div className="mt-4 mb-6">
      <label className="text-gray-700 flex items-center mb-1">
        {label}
        {required && (
          <span className="ml-1 w-2.5 h-2.5 bg-red-500 rounded-full"></span>
        )}
      </label>
      <select
        value={value}
        onChange={onChange}
        className="w-full p-2 rounded border-[1.5px] border-stroke bg-white text-gray-800"
      >
        <option value="">-- Pilih {label} --</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default LabeledComboBox;
