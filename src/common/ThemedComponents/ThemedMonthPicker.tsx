import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { format, addMonths, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

interface ThemedMonthPickerProps {
    value: Date;
    onChange: (date: Date) => void;
    className?: string;
}

export const ThemedMonthPicker: React.FC<ThemedMonthPickerProps> = ({ value, onChange, className = '' }) => {
    const { activeTheme } = useTheme();
    const theme = activeTheme;
    const isDark = theme.baseTheme === 'dark';
    const cardTheme = theme.card;

    const handlePrev = () => onChange(subMonths(value, 1));
    const handleNext = () => onChange(addMonths(value, 1));

    const glassStyle: React.CSSProperties = {
        backgroundColor: isDark
            ? `rgba(255, 255, 255, 0.05)`
            : `rgba(0, 0, 0, 0.05)`,
        backdropFilter: 'blur(8px)',
        border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
        borderRadius: cardTheme.borderRadius || '12px',
        color: cardTheme.textColor,
    };

    return (
        <div className={`flex items-center gap-3 p-2 px-4 shadow-xl transition-all ${className}`} style={glassStyle}>
            <Calendar size={16} className="opacity-60" />
            <span className="text-xs font-bold uppercase tracking-widest opacity-80 min-w-[100px] text-center">
                {format(value, 'MMMM yyyy')}
            </span>

            <div className="flex items-center gap-1 ml-auto">
                <button
                    onClick={handlePrev}
                    className="p-1.5 rounded-lg hover:bg-white/10 transition-colors opacity-70 hover:opacity-100"
                >
                    <ChevronLeft size={16} />
                </button>
                <button
                    onClick={handleNext}
                    className="p-1.5 rounded-lg hover:bg-white/10 transition-colors opacity-70 hover:opacity-100"
                >
                    <ChevronRight size={16} />
                </button>
            </div>
        </div>
    );
};

export default ThemedMonthPicker;
