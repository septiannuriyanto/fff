import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

export interface ThemedMetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  className?: string;
}

export const ThemedMetricCard: React.FC<ThemedMetricCardProps> = ({ title, value, unit = '', className = '' }) => {
  const { activeTheme } = useTheme();
  const theme = activeTheme;
  const isDark = theme.baseTheme === 'dark';
  const cardTheme = theme.card;

  return (
    <div 
      className={`p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg flex flex-col gap-1 ${className}`}
      style={{
        backgroundColor: isDark 
          ? `rgba(0, 0, 0, ${cardTheme.opacity})` 
          : `rgba(255, 255, 255, ${cardTheme.opacity})`,
        backdropFilter: cardTheme.backdropBlur !== 'none' 
          ? `blur(${cardTheme.backdropBlur === 'sm' ? '4px' : cardTheme.backdropBlur === 'md' ? '8px' : cardTheme.backdropBlur === 'lg' ? '12px' : cardTheme.backdropBlur === 'xl' ? '20px' : '0px'})` 
          : undefined,
        borderWidth: cardTheme.borderWidth,
        borderColor: cardTheme.borderColor,
        borderRadius: cardTheme.borderRadius,
        boxShadow: cardTheme.shadow,
        color: cardTheme.textColor,
      }}
    >
      <span className="text-[10px] font-bold opacity-70 uppercase tracking-widest" style={{ color: cardTheme.textColor }}>{title}</span>
      <div className="flex items-baseline gap-1">
        <span className="text-xl font-black tabular-nums group-hover:bg-clip-text group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-blue-500 group-hover:to-emerald-500 transition-all" style={{ color: cardTheme.textColor }}>{value}</span>
        {unit && <span className="text-[10px] font-medium opacity-70" style={{ color: cardTheme.textColor }}>{unit}</span>}
      </div>
    </div>
  );
};

export default ThemedMetricCard;
