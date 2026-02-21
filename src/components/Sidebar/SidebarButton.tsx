import React from "react";
import { useTheme } from "../../contexts/ThemeContext";

interface SidebarButtonProps {
  label: string;
  onClick: React.MouseEventHandler<HTMLButtonElement>;
  mini?: boolean;
}

const SidebarButton: React.FC<SidebarButtonProps> = ({ label, onClick, mini }) => {
  const { activeTheme } = useTheme();
  const theme = activeTheme;

  if (mini) return null;
  return (
    <li>
      <button 
        className="pl-4 hover:underline font-medium transition-colors" 
        style={{ color: theme.sidebar.textColor }}
        onClick={onClick}
      >
        {label}
      </button>
    </li>
  );
};

export default SidebarButton;
