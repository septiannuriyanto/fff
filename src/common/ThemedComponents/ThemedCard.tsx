import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface ThemedCardProps {
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
    hoverEffect?: boolean;
}

const ThemedCard: React.FC<ThemedCardProps> = ({
    children,
    className = '',
    onClick,
    hoverEffect = false
}) => {
    const { activeTheme } = useTheme();
    const card = activeTheme.card;
    const container = activeTheme.container;

    const blurMap: Record<string, string> = {
        none: 'none',
        sm: 'blur(4px)',
        md: 'blur(12px)',
        lg: 'blur(20px)',
        xl: 'blur(32px)',
    };

    const backdropBlurValue = blurMap[card.backdropBlur] || blurMap[container.backdropBlur] || 'none';

    return (
        <div
            onClick={onClick}
            className={`
        transition-all duration-300 
        ${onClick ? 'cursor-pointer' : ''} 
        ${hoverEffect ? 'hover:-translate-y-1 hover:shadow-2xl' : ''} 
        ${className}
      `}
            style={{
                backgroundColor: container.color,
                backdropFilter: backdropBlurValue,
                WebkitBackdropFilter: backdropBlurValue,
                borderRadius: card.borderRadius,
                borderWidth: card.borderWidth,
                borderColor: container.borderColor,
                boxShadow: card.shadow,
                color: container.textColor,
            }}
        >
            {children}
        </div>
    );
};

export default ThemedCard;
