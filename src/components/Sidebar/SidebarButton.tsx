import React from "react";
import { useTheme } from "../../contexts/ThemeContext";

interface SidebarButtonProps {
  label: string;
  onClick: React.MouseEventHandler<HTMLButtonElement>;
}

const SidebarButton: React.FC<SidebarButtonProps> = ({ label, onClick }) => {
  const { activeTheme } = useTheme();
  const theme = activeTheme;

  return (
    <li>
      <button
        className="pl-4 hover:underline font-medium transition-colors flex items-center"
        style={{ color: theme.sidebar.textColor }}
        onClick={onClick}
      >
        <span className="sidebar-label">{label}</span>
      </button>
    </li>
  );
};

export default SidebarButton;
