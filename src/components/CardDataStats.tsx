import React, { ReactNode } from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface CardDataStatsProps {
  title: string;
  total: string;
  rate: string;
  levelUp?: boolean;
  levelDown?: boolean;
  levelUpBad?: boolean;
  levelDownGood?: boolean;
  children: ReactNode;
}

const CardDataStats: React.FC<CardDataStatsProps> = ({
  title,
  total,
  rate,
  levelUp,
  levelDown,
  levelUpBad,
  levelDownGood,
  children,
}) => {
  const { activeTheme } = useTheme();
  const theme = activeTheme;
  const isDark = theme.baseTheme === 'dark';
  const cardTheme = theme.card;

  return (
    <div 
      className="transition-all duration-300 py-6 px-7.5"
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
      <div className="flex h-11.5 w-11.5 items-center justify-center rounded-full bg-meta-2 dark:bg-meta-4">
        {children}
      </div>

      <div className="mt-4 flex items-end justify-between">
        <div>
          <h4 className="text-title-md font-bold" style={{ color: cardTheme.textColor }}>
            {total}
          </h4>
          <span className="text-sm font-medium" style={{ color: cardTheme.textColor, opacity: 0.8 }}>{title}</span>
        </div>

        <span
          className={`flex items-center gap-1 text-sm font-medium ${
            levelUp && 'text-meta-3'
          } ${levelDown && 'text-meta-5'} ${levelDownGood && 'text-meta-3'} ${levelUpBad && 'text-meta-1'}`}
        >
          {rate}

          {levelUp && (
            <svg
              className="fill-meta-3"
              width="10"
              height="11"
              viewBox="0 0 10 11"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M4.35716 2.47737L0.908974 5.82987L5.0443e-07 4.94612L5 0.0848689L10 4.94612L9.09103 5.82987L5.64284 2.47737L5.64284 10.0849L4.35716 10.0849L4.35716 2.47737Z"
                fill=""
              />
            </svg>
          )}
          {levelUpBad && (
            <svg
              className="fill-meta-1"
              width="10"
              height="11"
              viewBox="0 0 10 11"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M4.35716 2.47737L0.908974 5.82987L5.0443e-07 4.94612L5 0.0848689L10 4.94612L9.09103 5.82987L5.64284 2.47737L5.64284 10.0849L4.35716 10.0849L4.35716 2.47737Z"
                fill=""
              />
            </svg>
          )}
          {levelDown && (
            <svg
              className="fill-meta-5"
              width="10"
              height="11"
              viewBox="0 0 10 11"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M5.64284 7.69237L9.09102 4.33987L10 5.22362L5 10.0849L-8.98488e-07 5.22362L0.908973 4.33987L4.35716 7.69237L4.35716 0.0848701L5.64284 0.0848704L5.64284 7.69237Z"
                fill=""
              />
            </svg>
          )}
          {levelDownGood && (
            <svg
              className="fill-meta-3"
              width="10"
              height="11"
              viewBox="0 0 10 11"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M5.64284 7.69237L9.09102 4.33987L10 5.22362L5 10.0849L-8.98488e-07 5.22362L0.908973 4.33987L4.35716 7.69237L4.35716 0.0848701L5.64284 0.0848704L5.64284 7.69237Z"
                fill=""
              />
            </svg>
          )}
        </span>
      </div>
    </div>
  );
};

export default CardDataStats;
