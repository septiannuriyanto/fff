
const DAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

interface Props {
  value: string[]; // array hari yang sudah dipilih ['Sen','Rab']
  onChange: (newValue: string[]) => void;
}

export default function DaySelector({ value, onChange }: Props) {
  const toggleDay = (day: string) => {
    if (value.includes(day)) {
      onChange(value.filter((d) => d !== day));
    } else {
      onChange([...value, day]);
    }
  };

  return (
    <div className="grid grid-cols-7 gap-2">
      {DAYS.map((day) => {
        const active = value.includes(day);
        return (
          <div
            key={day}
            onClick={() => toggleDay(day)}
            className={`cursor-pointer text-center py-2 rounded-lg transition-all duration-300 ${
              active
                ? 'bg-green-500 text-white shadow-lg scale-105'
                : 'bg-gray-200 text-gray-700 shadow-none'
            }`}
          >
            {day}
          </div>
        );
      })}
    </div>
  );
}
