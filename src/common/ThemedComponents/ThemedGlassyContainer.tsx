import React, { ReactNode } from 'react';
import { useTheme, hexToRgba } from '../../contexts/ThemeContext';

interface ThemedGlassyContainerProps {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  intensity?: 'low' | 'medium' | 'high';
}

const ThemedGlassyContainer: React.FC<ThemedGlassyContainerProps> = ({ 
  children, 
  className = '', 
  style = {},
  intensity = 'medium' 
}) => {
  const { activeTheme } = useTheme();
  const popup = activeTheme.popup;

  const blurMap = {
    low: 'blur(8px)',
    medium: 'blur(16px)',
    high: 'blur(24px)',
  };

  const opacityMap = {
    low: 0.3,
    medium: 0.5,
    high: 0.7,
  };

  const glassStyle: React.CSSProperties = {
    backgroundColor: hexToRgba(popup.backgroundColor, opacityMap[intensity]),
    backdropFilter: `${blurMap[intensity]} saturate(150%)`,
    WebkitBackdropFilter: `${blurMap[intensity]} saturate(150%)`,
    borderRadius: popup.borderRadius || '0.5rem',
    border: `1px solid ${popup.borderColor || 'rgba(255, 255, 255, 0.2)'}`,
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
    color: popup.textColor || undefined,
    ...style,
  };

  return (
    <div 
      className={`themed-glassy-container ${className}`}
      style={glassStyle}
    >
      {children}
    </div>
  );
};

export default ThemedGlassyContainer;
