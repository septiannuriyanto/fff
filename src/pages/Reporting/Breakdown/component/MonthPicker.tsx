import React from 'react';

interface MonthPickerProps {
  value: string; // 'YYYY-MM'
  onChange: (month: string) => void;
  startYear?: number;
  endYear?: number;
  disabled?: boolean; // <-- tambahan
}

const MonthPicker: React.FC<MonthPickerProps> = ({
  value,
  onChange,
  startYear = new Date().getFullYear() - 5,
  endYear = new Date().getFullYear() + 5,
  disabled = false, // <-- default false
}) => {
  const [year, month] = value.split('-');

  const months = [
    { label: 'Jan', value: '01' },
    { label: 'Feb', value: '02' },
    { label: 'Mar', value: '03' },
    { label: 'Apr', value: '04' },
    { label: 'May', value: '05' },
    { label: 'Jun', value: '06' },
    { label: 'Jul', value: '07' },
    { label: 'Aug', value: '08' },
    { label: 'Sep', value: '09' },
    { label: 'Oct', value: '10' },
    { label: 'Nov', value: '11' },
    { label: 'Dec', value: '12' },
  ];

  return (
    <div className="flex gap-2">
      <select
        className="rounded border px-3 py-2"
        value={month}
        onChange={(e) => onChange(`${year}-${e.target.value}`)}
        disabled={disabled} // <-- pakai disabled
      >
        {months.map((m) => (
          <option key={m.value} value={m.value}>
            {m.label}
          </option>
        ))}
      </select>

      <select
        className="rounded border px-3 py-2"
        value={year}
        onChange={(e) => onChange(`${e.target.value}-${month}`)}
        disabled={disabled} // <-- pakai disabled
      >
        {Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i).map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </div>
  );
};

export default MonthPicker;
