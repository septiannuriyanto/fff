import React from 'react';
import { useTheme, hexToRgba } from '../../contexts/ThemeContext';

interface ThemedGlassmorphismPanelProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  as?: keyof JSX.IntrinsicElements;
  [key: string]: any;
}

/**
 * Reusable glassmorphism panel that automatically applies
 * the active theme's popup glass styling (backdrop blur, inset glow, border, etc.)
 * 
 * Usage:
 * ```tsx
 * <ThemedGlassmorphismPanel className="absolute right-0 mt-4 w-62.5">
 *   {children}
 * </ThemedGlassmorphismPanel>
 * ```
 */
const ThemedGlassmorphismPanel = React.forwardRef<HTMLDivElement, ThemedGlassmorphismPanelProps>(
  ({ children, className = '', style = {}, as: Tag = 'div', ...rest }, ref) => {
    const { activeTheme } = useTheme();
    const popup = activeTheme.popup;

    const blurMap: Record<string, string> = {
      sm: 'blur(4px) saturate(110%)',
      md: 'blur(12px) saturate(120%)',
      lg: 'blur(20px) saturate(130%)',
      xl: 'blur(32px) saturate(140%)',
    };

    // When grayscale is enabled, we build backdrop-filter inline instead of using
    // the CSS class (which uses !important and can't be extended with grayscale)
    const useInlineBackdrop = popup.backdropGrayscale && popup.backdropBlur !== 'none';
    const glassBlurClass = (!useInlineBackdrop && popup.backdropBlur !== 'none')
      ? `glass-blur-${popup.backdropBlur}`
      : '';

    const backdropFilterValue = useInlineBackdrop
      ? `${blurMap[popup.backdropBlur] || ''} grayscale(80%) brightness(0.8)`
      : undefined;

    const glassStyle: React.CSSProperties = {
      backgroundColor: hexToRgba(popup.backgroundColor, popup.opacity),
      borderRadius: popup.borderRadius || undefined,
      borderColor: popup.borderColor || undefined,
      color: popup.textColor || undefined,
      boxShadow: popup.blurDepth
        ? `0 8px 32px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.5), inset 0 -1px 0 rgba(255, 255, 255, 0.1), inset 0 0 40px ${popup.blurDepth}px rgba(255, 255, 255, 0.2)`
        : undefined,
      overflow: popup.blurDepth ? 'hidden' as const : undefined,
      backdropFilter: backdropFilterValue,
      WebkitBackdropFilter: backdropFilterValue,
      ...style,
    };

    return (
      <div
        ref={ref}
        className={`glass-popup ${glassBlurClass} ${className} `}
        style={glassStyle}
        {...rest}
      >
        {children}
      </div>
    );
  }
);

ThemedGlassmorphismPanel.displayName = 'ThemedGlassmorphismPanel';

export default ThemedGlassmorphismPanel;