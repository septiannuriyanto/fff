import React from 'react';

interface ShiftDropdownProps {
  value: boolean;
  onChange: (value: boolean) => void;
}

const ShiftDropdown: React.FC<ShiftDropdownProps> = ({ value, onChange }) => {
  return (
    <div className="relative group w-full">
      <div className="flex items-center justify-between w-full h-[46px] rounded-xl border-[1.5px] border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-2 sm:px-4 font-black text-[11px] transition group-hover:border-sky-500 shadow-sm pointer-events-none">
        <span className="text-slate-700 dark:text-slate-200 whitespace-nowrap tracking-tight uppercase">
          <span className="hidden sm:inline">{value ? 'Shift 1 (Day)' : 'Shift 2 (Night)'}</span>
          <span className="inline sm:hidden">{value ? 'Shift 1' : 'Shift 2'}</span>
        </span>
        <svg
          className="text-sky-500 flex-shrink-0 ml-1"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M5.29289 8.29289C5.68342 7.90237 6.31658 7.90237 6.70711 8.29289L12 13.5858L17.2929 8.29289C17.6834 7.90237 18.3166 7.90237 18.7071 8.29289C19.0976 8.68342 19.0976 9.31658 18.7071 9.70711L12.7071 15.7071C12.3166 16.0976 11.6834 16.0976 11.2929 15.7071L5.29289 9.70711C4.90237 9.31658 4.90237 8.68342 5.29289 8.29289Z"
            fill="currentColor"
          ></path>
        </svg>
      </div>
      <select
        value={value ? 'true' : 'false'}
        onChange={(e) => {
          onChange(e.target.value === 'true');
        }}
        className="absolute inset-0 opacity-0 cursor-pointer z-10 appearance-none bg-transparent w-full h-full"
      >
        <option value="true">Shift 1 (Day)</option>
        <option value="false">Shift 2 (Night)</option>
      </select>
    </div>
  );
};

export default ShiftDropdown;
