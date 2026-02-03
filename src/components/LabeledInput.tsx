import React from 'react';

interface LabeledInputProps {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear?: () => void;
  required?: boolean;
  autoFocus?: boolean;
  type?: string;
  placeholder?: string;
  className?: string;
}

const LabeledInput: React.FC<LabeledInputProps> = ({
  label,
  value,
  onChange,
  onClear,
  required = false,
  autoFocus = false,
  type = 'text',
  placeholder = '',
  className = 'mb-4.5',
}) => {
  return (
    <div className={className}>
      <label className="mb-2.5 block text-black dark:text-white">
        {label}
        {required && (
          <span className="ml-1 w-2.5 h-2.5 bg-red-500 rounded-full" />
        )}
      </label>
      <div className="relative">
        <input
          placeholder={placeholder}
          autoFocus={autoFocus}
          value={value}
          type={type}
          onChange={onChange}
          className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 pr-10 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
        />
        {onClear && value && (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-bodydark2 hover:text-primary"
          >
            <svg
              className="fill-current"
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M11.2929 9L15.1464 5.14645C15.3417 4.95118 15.3417 4.6346 15.1464 4.43934C14.9512 4.24408 14.6346 4.24408 14.4393 4.43934L10.5858 8.29289L6.73223 4.43934C6.53697 4.24408 6.22039 4.24408 6.02513 4.43934C5.82987 4.6346 5.82987 4.95118 6.02513 5.14645L9.87868 9L6.02513 12.8536C5.82987 13.0488 5.82987 13.3654 6.02513 13.5607C6.22039 13.7559 6.53697 13.7559 6.73223 13.5607L10.5858 9.70711L14.4393 13.5607C14.6346 13.7559 14.9512 13.7559 15.1464 13.5607C15.3417 13.3654 15.3417 13.0488 15.1464 12.8536L11.2929 9Z"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

export default LabeledInput;
