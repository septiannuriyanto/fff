import React from "react";

interface SidebarButtonProps {
  label: string;
  onClick: React.MouseEventHandler<HTMLButtonElement>;
  mini?: boolean;
}

const SidebarButton: React.FC<SidebarButtonProps> = ({ label, onClick, mini }) => {
  if (mini) return null;
  return (
    <li>
      <button className="pl-4 hover:underline font-medium text-bodydark" onClick={onClick}>{label}</button>
    </li>
  );
};

export default SidebarButton;
