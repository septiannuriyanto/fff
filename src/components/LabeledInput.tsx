import React from 'react';

interface LabeledInputProps {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  autoFocus?: boolean;
  type?: string;
  placeholder?: string;
}

const LabeledInput: React.FC<LabeledInputProps> = ({
  label,
  value,
  onChange,
  required = false,
  autoFocus = false,
  type = 'text',
  placeholder = '',
}) => {
  return (
    <div className="mt-4 mb-8">
      <label className="text-gray-700 flex items-center">
        {label}
        {required && (
          <span className="ml-1 w-2.5 h-2.5 bg-red-500 rounded-full" />
        )}
      </label>
      <input
        placeholder={placeholder}
        autoFocus={autoFocus}
        value={value}
        type={type}
        onChange={onChange}
        className="w-full p-2 rounded border-[1.5px] border-stroke"
      />
    </div>
  );
};

export default LabeledInput;
