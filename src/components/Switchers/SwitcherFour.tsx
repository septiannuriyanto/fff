import React, { useState } from 'react';

interface SwitcherProps {
  textTrue?: string;
  textFalse?: string;
  trueColor?: string;
  falseColor?: string;
  onChange?: (enabled: boolean) => void;
}

const ReusableSwitcher: React.FC<SwitcherProps> = ({
  textTrue = 'On',
  textFalse = 'Off',
  trueColor = 'bg-blue-300',
  falseColor = 'bg-black',
  onChange,
}) => {
  const [enabled, setEnabled] = useState<boolean>(true);

  const handleToggle = () => {
    const newState = !enabled;
    setEnabled(newState);
    if (onChange) {
      onChange(newState);
    }
  };

  return (
    <div className="flex items-center space-x-4">
      <label
        htmlFor="toggle"
        className="flex cursor-pointer select-none items-center"
      >
        <div className="relative">
          <input
            type="checkbox"
            id="toggle"
            className="sr-only"
            checked={enabled}
            onChange={handleToggle}
          />
          <div
            className={`block h-8 w-14 rounded-full transition ${
              enabled ? trueColor : falseColor
            }`}
          ></div>
          <div
            className={`absolute left-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white transition ${
              enabled && '!right-1 !translate-x-full'
            }`}
          ></div>
        </div>
      </label>
      <span className="text-sm font-medium">
        {enabled ? textTrue : textFalse}
      </span>
    </div>
  );
};

export default ReusableSwitcher;
