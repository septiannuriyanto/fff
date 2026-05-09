import React, { ReactNode } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface ThemedPanelContainerProps {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  headerClassName?: string;
  style?: React.CSSProperties;
  title?: string;
  actions?: ReactNode;
  breadcrumb?: ReactNode;
}

const ThemedPanelContainer: React.FC<ThemedPanelContainerProps> = ({ children, className = '', contentClassName = '', headerClassName = '', style = {}, title, actions, breadcrumb }) => {
  const { activeTheme } = useTheme();
  const theme = activeTheme;

  const isDark = theme.baseTheme === 'dark';

  const cardTheme = theme.card;
  const containerTheme = theme.container;

  const dynamicStyle: React.CSSProperties = {
    backgroundColor: containerTheme.color,

    backdropFilter: containerTheme.backdropBlur !== 'none'
      ? `blur(${containerTheme.backdropBlur === 'sm' ? '4px' : containerTheme.backdropBlur === 'md' ? '8px' : containerTheme.backdropBlur === 'lg' ? '12px' : containerTheme.backdropBlur === 'xl' ? '20px' : '0px'})`
      : undefined,

    borderWidth: cardTheme.borderWidth,
    borderColor: containerTheme.borderColor,
    borderRadius: cardTheme.borderRadius,
    boxShadow: cardTheme.shadow,

    color: containerTheme.textColor,
    ...style,
  };

  return (
    <div
      className={`transition-all duration-300 ${className}`}
      style={dynamicStyle}
    >
      {(title || actions || breadcrumb) && (
        <div
          className={`py-4 px-4 md:px-6 flex flex-row items-center justify-between gap-4 overflow-hidden ${headerClassName}`}
          style={{ borderBottom: `1px solid ${containerTheme.borderColor}` }}
        >
          <div className="flex flex-row items-center gap-3 min-w-0 flex-1">
            {title && (
              <>
                <div className="w-1.5 h-6 bg-sky-500 rounded-full flex-shrink-0"></div>
                <h3 className="font-black text-left text-lg md:text-xl uppercase tracking-tight truncate" style={{ color: containerTheme.textColor }}>
                  {title}
                </h3>
              </>
            )}
            {breadcrumb && <div className="truncate text-xs text-slate-400">{breadcrumb}</div>}
          </div>
          {actions && <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">{actions}</div>}
        </div>
      )}
      <div className={`p-4 md:p-6 ${contentClassName}`}>
        {children}
      </div>
    </div>
  );
};

export default ThemedPanelContainer;
