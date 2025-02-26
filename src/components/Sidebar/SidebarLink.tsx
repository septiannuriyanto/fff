import React from "react";
import { NavLink } from "react-router-dom";

interface SidebarLinkProps {
  to: string;
  label: string;
}

const SidebarLink: React.FC<SidebarLinkProps> = ({ to, label }) => {
  return (
    <li>
      <NavLink
        to={to}
        className={({ isActive }) =>
          "group relative flex items-center gap-2.5 rounded-md px-4 font-medium text-bodydark duration-300 ease-in-out hover:text-blue-300 " +
          (isActive && "!text-body")
        }
      >
        {label}
      </NavLink>
    </li>
  );
};

export default SidebarLink;
