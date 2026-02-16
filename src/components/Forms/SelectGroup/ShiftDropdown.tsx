import React from 'react';

interface ShiftDropdownProps {
  value: boolean;
  onChange: (value: boolean) => void;
}

const ShiftDropdown: React.FC<ShiftDropdownProps> = ({ value, onChange }) => {
  return (
    <div className="relative z-[20] bg-transparent dark:bg-form-input">
      <select
        value={value ? 'true' : 'false'}
        onChange={(e) => {
          onChange(e.target.value === 'true');
        }}
        className={`relative z-[20] w-full appearance-none rounded border-[1.5px] border-stroke bg-transparent py-3 pl-5 pr-12 outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary`} // Matches DatePickerOne styling but with extra right padding for chevron
      >
        <option value="true" className="text-body dark:text-bodydark">
          Shift 1 (Day)
        </option>
        <option value="false" className="text-body dark:text-bodydark">
          Shift 2 (Night)
        </option>
      </select>
      <span className="absolute top-1/2 right-4 z-[30] -translate-y-1/2 ml-2">
        <svg
          className="fill-current"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g opacity="0.8">
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M5.29289 8.29289C5.68342 7.90237 6.31658 7.90237 6.70711 8.29289L12 13.5858L17.2929 8.29289C17.6834 7.90237 18.3166 7.90237 18.7071 8.29289C19.0976 8.68342 19.0976 9.31658 18.7071 9.70711L12.7071 15.7071C12.3166 16.0976 11.6834 16.0976 11.2929 15.7071L5.29289 9.70711C4.90237 9.31658 4.90237 8.68342 5.29289 8.29289Z"
              fill=""
            ></path>
          </g>
        </svg>
      </span>
    </div>
  );
};

export default ShiftDropdown;
