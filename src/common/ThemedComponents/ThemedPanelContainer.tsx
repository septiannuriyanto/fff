import React, { ReactNode } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface ThemedPanelContainerProps {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  style?: React.CSSProperties;
  title?: string;
  actions?: ReactNode;
  breadcrumb?: ReactNode;
}

const ThemedPanelContainer: React.FC<ThemedPanelContainerProps> = ({ children, className = '', contentClassName = '', style = {}, title, actions, breadcrumb }) => {
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
          className="py-4 px-6.5 flex flex-col sm:flex-row justify-between mb-4 gap-4 sm:gap-0"
          style={{ borderBottom: `1px solid ${containerTheme.borderColor}` }}
        >
           <div className="flex flex-col gap-1">
             {title && (
               <h3 className="font-medium text-left text-title-md" style={{ color: containerTheme.textColor }}>
                 {title}
               </h3>
             )}
             {breadcrumb && <div>{breadcrumb}</div>}
           </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={`p-4 ${contentClassName}`}>
        {children}
      </div>
    </div>
  );
};

export default ThemedPanelContainer;
