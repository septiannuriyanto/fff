import React, { ReactNode } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface PanelContainerProps {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
  actions?: ReactNode;
}

const PanelContainer: React.FC<PanelContainerProps> = ({ children, className = '', style = {}, title, actions }) => {
  const { activeTheme } = useTheme();
  const theme = activeTheme;

  const isDark = theme.baseTheme === 'dark';
  // Use container theme for panels as requested
  // Fallback to card theme for border properties if container doesn't have them yet (it fits the user request for specific container props)
  // The user only provided color, textColor, opacity, backdropBlur, iconColor.
  // Border properties are likely expected to be consistent with cards or hidden. 
  // Let's check if we should keep card borders or remove them. 
  // PanelContainer usually implies the main container.
  // If user didn't specify border in container, we might want to default to none or inherit.
  // However, I'll use cardTheme for border properties to keep it safe unless user specified otherwise.
  const cardTheme = theme.card;
  const containerTheme = theme.container;

  const dynamicStyle: React.CSSProperties = {
    backgroundColor: isDark 
      ? containerTheme.color 
      : containerTheme.color,
    // Note: colorDark is already resolved to color in activeTheme
    
    backdropFilter: containerTheme.backdropBlur !== 'none' 
      ? `blur(${containerTheme.backdropBlur === 'sm' ? '4px' : containerTheme.backdropBlur === 'md' ? '8px' : containerTheme.backdropBlur === 'lg' ? '12px' : containerTheme.backdropBlur === 'xl' ? '20px' : '0px'})` 
      : undefined,
    
    // Use card theme for border/radius/shadow to maintain structural consistency for now, 
    // as container theme in system.json didn't specify borders.
    borderWidth: cardTheme.borderWidth,
    borderColor: containerTheme.borderColor,
    borderRadius: cardTheme.borderRadius,
    boxShadow: cardTheme.shadow,
    
    color: containerTheme.textColor,
    ...style,
  };

  return (
    <div 
      className={`px-4 transition-all duration-300 ${className}`} 
      style={dynamicStyle}
    >
      {(title || actions) && (
        <div 
          className="py-4 px-6.5 flex flex-col sm:flex-row justify-between mb-4"
          style={{ borderBottom: `1px solid ${containerTheme.borderColor}` }}
        >
          {title && (
            <h3 className="font-medium text-left" style={{ color: containerTheme.textColor }}>
              {title}
            </h3>
          )}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
};

export default PanelContainer;
