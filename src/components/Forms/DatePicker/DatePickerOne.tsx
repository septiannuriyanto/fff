import moment from 'moment';
import React, { useRef } from 'react';

interface DatePickerOneProps {
  handleChange: (date: Date | null) => void;
  setValue: string;
  enabled: boolean;
  startDate?:  Date;
  endDate?: Date;
}

const DatePickerOne: React.FC<DatePickerOneProps> = ({ handleChange, setValue, enabled, startDate, endDate }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Parse input using multiple formats to be safe
  const dateValue = setValue ? moment(setValue, ['DD/MMM/YYYY', 'YYYY-MM-DD', 'MM/DD/YYYY']).format('YYYY-MM-DD') : '';
  const displayValue = setValue ? moment(setValue, ['DD/MMM/YYYY', 'YYYY-MM-DD', 'MM/DD/YYYY']).format('DD/MMM/YYYY').toUpperCase() : 'SELECT';

  const handleContainerClick = () => {
    if (inputRef.current) {
      if ('showPicker' in inputRef.current) {
        try {
          inputRef.current.showPicker();
        } catch (e) {
          inputRef.current.focus();
        }
      } else {
        inputRef.current.focus();
        inputRef.current.click();
      }
    }
  };

  return (
    <div 
      className="relative group w-full cursor-pointer"
      onClick={handleContainerClick}
    >
      <div className="flex items-center justify-between w-full h-[46px] rounded-xl border-[1.5px] border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-2 sm:px-4 font-black text-[10px] sm:text-[11px] transition group-hover:border-sky-500 shadow-sm pointer-events-none">
        <span className="text-slate-700 dark:text-slate-200 whitespace-nowrap tracking-tight uppercase">
          {displayValue}
        </span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 18 18"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="text-sky-500 flex-shrink-0 ml-1"
        >
          <path
            d="M15.7504 2.9812H14.2879V2.36245C14.2879 2.02495 14.0066 1.71558 13.641 1.71558C13.2754 1.71558 12.9941 1.99683 12.9941 2.36245V2.9812H4.97852V2.36245C4.97852 2.02495 4.69727 1.71558 4.33164 1.71558C3.96602 1.71558 3.68477 1.99683 3.68477 2.36245V2.9812H2.25039C1.29414 2.9812 0.478516 3.7687 0.478516 4.75308V14.5406C0.478516 15.4968 1.26602 16.3125 2.25039 16.3125H15.7504C16.7066 16.3125 17.5223 15.525 17.5223 14.5406V4.72495C17.5223 3.7687 16.7066 2.9812 15.7504 2.9812ZM1.77227 8.21245H4.16289V10.9968H1.77227V8.21245ZM5.42852 8.21245H8.38164V10.9968H5.42852V8.21245ZM8.38164 12.2625V15.0187H5.42852V12.2625H8.38164V12.2625ZM9.64727 12.2625H12.6004V15.0187H9.64727V12.2625ZM9.64727 10.9968V8.21245H12.6004V10.9968H9.64727ZM13.8379 8.21245H16.2285V10.9968H13.8379V8.21245ZM2.25039 4.24683H3.71289V4.83745C3.71289 5.17495 3.99414 5.48433 4.35977 5.48433C4.72539 5.48433 5.00664 5.20308 5.00664 4.83745V4.24683H13.0504V4.83745C13.0504 5.17495 13.3316 5.48433 13.6973 5.48433C14.0629 5.48433 14.3441 5.20308 14.3441 4.83745V4.24683H15.7504C16.0316 4.24683 16.2566 4.47183 16.2566 4.75308V6.94683H1.77227V4.75308C1.77227 4.47183 1.96914 4.24683 2.25039 4.24683ZM1.77227 14.5125V12.2343H4.16289V14.9906H2.25039C1.96914 15.0187 1.77227 14.7937 1.77227 14.5125ZM15.7504 15.0187H13.8379V12.2625H16.2285V14.5406C16.2566 14.7937 16.0316 15.0187 15.7504 15.0187Z"
            fill="currentColor"
          />
        </svg>
      </div>
      <input
        ref={inputRef}
        type="date"
        disabled={!enabled}
        value={dateValue}
        min={startDate ? moment(startDate).format('YYYY-MM-DD') : undefined}
        max={endDate ? moment(endDate).format('YYYY-MM-DD') : undefined}
        onChange={(e) => {
          if (e.target.value) {
            handleChange(new Date(e.target.value));
          } else {
            handleChange(null);
          }
        }}
        className="absolute inset-0 opacity-0 w-full h-full pointer-events-none"
      />
    </div>
  );
};

export default DatePickerOne;
