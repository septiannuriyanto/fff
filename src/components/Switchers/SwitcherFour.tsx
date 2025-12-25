import React from 'react';

interface SwitcherProps {
  textTrue?: string;
  textFalse?: string;
  trueColor?: string;
  falseColor?: string;
  /** nilai on/off yang dikontrol parent */
  value?: boolean;
  /** dipanggil saat user toggle */
  onChange?: (enabled: boolean) => void;
}

const ReusableSwitcher: React.FC<SwitcherProps> = ({
  textTrue = 'On',
  textFalse = 'Off',
  trueColor = 'bg-blue-300',
  falseColor = 'bg-black',
  value,
  onChange,
}) => {
  const handleToggle = () => {
    if (onChange) onChange(!value);
  };

  return (
    <div className="flex items-center space-x-4">
      <label className="flex cursor-pointer select-none items-center">
        <div className="relative">
          <input
            type="checkbox"
            className="sr-only"
            checked={value}
            onChange={handleToggle}
          />
          <div
            className={`block h-8 w-14 rounded-full transition ${
              value ? trueColor : falseColor
            }`}
          />
          <div
            className={`absolute left-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white transition ${
              value && '!right-1 !translate-x-full'
            }`}
          />
        </div>
      </label>
      <span className="text-sm font-medium">
        {value ? textTrue : textFalse}
      </span>
    </div>
  );
};

export default ReusableSwitcher;
