import React, { useRef, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface NumericInputProps {
    label: string;
    value: string | number;
    onChange: (raw: string) => void;
    required?: boolean;
    placeholder?: string;
    className?: string;
    id?: string;
}

const formatDots = (val: string | number) => {
    if (val === undefined || val === null || val === "") return "";
    const numStr = val.toString().replace(/\D/g, "");
    return numStr.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

const parseDots = (val: string) => {
    return val.replace(/\./g, "");
};

const ThemedNumericInput: React.FC<NumericInputProps> = ({
    label,
    value,
    onChange,
    required = false,
    placeholder = '',
    className = 'mb-4.5',
    id,
}) => {
    const { activeTheme } = useTheme();
    const inputRef = useRef<HTMLInputElement>(null);
    const cursorRef = useRef<number | null>(null);

    const formattedValue = formatDots(value);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const input = e.target;
        const valueBeforeChange = input.value;
        const cursorBefore = input.selectionStart || 0;

        // Count dots BEFORE cursor before parsing
        const dotsBeforeCursor = (valueBeforeChange.substring(0, cursorBefore).match(/\./g) || []).length;

        const raw = parseDots(valueBeforeChange);

        if (raw === "" || /^\d*$/.test(raw)) {
            // Store relative cursor (digits only)
            cursorRef.current = cursorBefore - dotsBeforeCursor;
            onChange(raw);
        }
    };

    useEffect(() => {
        if (inputRef.current && cursorRef.current !== null) {
            const input = inputRef.current;
            const currentVal = input.value;

            // Calculate how many dots are needed before the target relative cursor
            let digitsSeen = 0;
            let i = 0;

            while (i < currentVal.length && digitsSeen < cursorRef.current) {
                if (currentVal[i] !== '.') {
                    digitsSeen++;
                }
                i++;
            }

            // Adjust i to include trailing dots if digitsSeen reached cursorRef.current
            while (i < currentVal.length && currentVal[i] === '.') {
                i++;
            }

            input.setSelectionRange(i, i);
            cursorRef.current = null;
        }
    }, [formattedValue]);

    return (
        <div className={className}>
            <label className="mb-2.5 block" style={{ color: activeTheme.input.textColor }}>
                {label}
                {required && (
                    <span className="ml-1 w-2.5 h-2.5 bg-red-500 rounded-full" />
                )}
            </label>
            <div className="relative">
                <input
                    ref={inputRef}
                    id={id}
                    type="text"
                    inputMode="numeric"
                    placeholder={placeholder}
                    value={formattedValue}
                    onChange={handleInputChange}
                    style={{
                        backgroundColor: activeTheme.input.color,
                        color: activeTheme.input.textColor,
                        borderColor: activeTheme.input.borderColor,
                        borderWidth: activeTheme.input.borderWidth,
                        borderRadius: activeTheme.input.borderRadius,
                        boxShadow: activeTheme.input.shadow,
                        opacity: activeTheme.input.opacity,
                        backdropFilter: activeTheme.input.backdropBlur !== 'none'
                            ? `blur(${activeTheme.input.backdropBlur === 'sm' ? '4px' : activeTheme.input.backdropBlur === 'md' ? '8px' : activeTheme.input.backdropBlur === 'lg' ? '12px' : activeTheme.input.backdropBlur === 'xl' ? '20px' : '0px'})`
                            : undefined,
                    }}
                    className="w-full outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:focus:border-primary px-5 py-3"
                />
            </div>
        </div>
    );
};

export default ThemedNumericInput;
