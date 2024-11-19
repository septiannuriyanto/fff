import React, { useState, ReactNode, useEffect } from "react";
import { NavLink } from "react-router-dom";

interface SidebarGroupProps {
  title: string;
  icon: ReactNode;
  pathname: string;
  basePath: string; // The base path to determine if the group is active (e.g., "/export")
  roles: string[]; // Array of roles allowed to view this group
  currentRole: string; // The current user's role
  children: ReactNode;
}

const SidebarGroup: React.FC<SidebarGroupProps> = ({
  title,
  icon,
  pathname,
  basePath,
  roles,
  currentRole,
  children,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Update `isExpanded` based on the current pathname
  useEffect(() => {
    if (pathname === basePath || pathname.includes(basePath)) {
      setIsExpanded(true);
    }
  }, [pathname, basePath]);

  const handleToggle = () => setIsExpanded((prev) => !prev);

  const isActive = pathname === basePath || pathname.includes(basePath);

  // Check if the current role is allowed to view this component
  if (!roles.includes(currentRole)) {
    return null; // Do not render the component if the role is not allowed
  }

  return (
    <>
      <NavLink
        to="#"
        className={`group relative flex items-center gap-2.5 rounded-sm py-2 px-4 font-medium text-bodydark2 duration-300 ease-in-out hover:bg-graydark dark:hover:bg-meta-4 ${
          isActive && "bg-graydark dark:bg-meta-4 text-white"
        }`}
        onClick={(e) => {
          e.preventDefault();
          handleToggle();
        }}
      >
        {icon}
        {title}
        <svg
          className={`absolute right-4 top-1/2 -translate-y-1/2 fill-current ${
            isExpanded && "rotate-180"
          }`}
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M4.41107 6.9107C4.73651 6.58527 5.26414 6.58527 5.58958 6.9107L10.0003 11.3214L14.4111 6.91071C14.7365 6.58527 15.2641 6.58527 15.5896 6.91071C15.915 7.23614 15.915 7.76378 15.5896 8.08922L10.5896 13.0892C10.2641 13.4147 9.73651 13.4147 9.41107 13.0892L4.41107 8.08922C4.08563 7.76378 4.08563 7.23614 4.41107 6.9107Z"
            fill=""
          />
        </svg>
      </NavLink>
      {/* Dropdown Menu */}
      <div
        className={`translate transform overflow-hidden ${
          !isExpanded && "hidden"
        }`}
      >
        <ul className="mt-4 mb-5.5 flex flex-col gap-2.5 pl-6">{children}</ul>
      </div>
    </>
  );
};

export default SidebarGroup;
