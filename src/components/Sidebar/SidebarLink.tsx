import React from "react";
import { NavLink } from "react-router-dom";
import { useTheme } from "../../contexts/ThemeContext";

interface SidebarLinkProps {
  to: string;
  label: string;
  mini?: boolean;
}

const SidebarLink: React.FC<SidebarLinkProps> = ({ to, label, mini }) => {
  const { appliedTheme, trialTheme } = useTheme();
  const theme = trialTheme || appliedTheme;

  return (
    <li>
      <NavLink
        to={to}
        style={({ isActive }) => ({
          color: isActive 
            ? theme.ui.primaryColor 
            : theme.sidebar.textColor,
          opacity: isActive ? 1 : 0.7,
        })}
        className={({ isActive }) =>
          `group relative flex items-center gap-2.5 rounded-md px-4 font-medium duration-300 ease-in-out hover:opacity-100 ${
            isActive ? "bg-white/5" : ""
          }`
        }
      >
        <span className={`transition-all duration-300 ${mini ? 'w-0 overflow-hidden opacity-0' : 'w-auto opacity-100 animate-in fade-in slide-in-from-left-2'}`}>
          {label}
        </span>
      </NavLink>
    </li>
  );
};

export default SidebarLink;
