import React, { useState, ReactNode, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { useTheme } from "../../contexts/ThemeContext";
import ThemedGlassmorphismPanel from '../../common/ThemedComponents/ThemedGlassmorphismPanel';

interface SidebarGroupProps {
  title: string;
  icon: ReactNode;
  pathname: string;
  basePath: string; // The base path to determine if the group is active (e.g., "/export")
  roles: string[]; // Array of roles allowed to view this group
  currentRole: string; // The current user's role
  children: ReactNode;
  mini?: boolean;
}

const SidebarGroup: React.FC<SidebarGroupProps> = ({
  title,
  icon,
  pathname,
  basePath,
  roles,
  currentRole,
  children,
  mini
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { appliedTheme, trialTheme } = useTheme();
  const theme = trialTheme || appliedTheme;

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
    <div className="relative group/group flex flex-col">
      <NavLink
        to="#"
        style={{
          color: isActive ? theme.ui.primaryColor : theme.sidebar.textColor,
          backgroundColor: isActive ? 'rgba(255,255,255, 0.05)' : 'transparent',
        }}
        className={`group relative flex items-center ${mini ? 'justify-center h-12 w-12 mx-auto mb-1' : 'gap-2.5 px-4 py-2'} rounded-xl font-medium duration-300 ease-in-out hover:bg-white/5 transition-all outline-none focus:outline-none`}
        onClick={(e) => {
          e.preventDefault();
          if(!mini) handleToggle();
        }}
      >
        <span className={mini ? 'text-2xl' : ''}>{icon}</span>
        {!mini && <span className="animate-in fade-in slide-in-from-left-2 duration-300 whitespace-nowrap">{title}</span>}
        {!mini && (
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
        )}
      </NavLink>

      {/* Mini Mode Hover Overlay */}
      {mini && (
          <div className="absolute left-full top-0 pl-10 hidden group-hover/group:block animate-in fade-in slide-in-from-left-4 duration-300 z-[10000]">
              <ThemedGlassmorphismPanel 
                className="rounded-2xl shadow-2xl p-4 w-56 flex flex-col gap-2 ring-1 ring-black/5 dark:ring-white/10 -ml-10"
              >
                  <div className="pb-2 mb-2 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
                       <span className="p-2 bg-primary/10 text-primary rounded-lg text-lg">
                           {icon}
                       </span>
                       <span className="font-extrabold text-sm uppercase tracking-tight truncate" style={{ color: theme.popup.textColor || undefined }}>
                           {title}
                       </span>
                  </div>
                  <ul className="flex flex-col gap-1">
                      {/* We need to pass mini=false to children in overlay so labels are shown */}
                      {React.Children.map(children, (child) => {
                          if (React.isValidElement(child)) {
                              // Type assertion for SidebarLink/Button props
                              return React.cloneElement(child as React.ReactElement<any>, { mini: false });
                          }
                          return child;
                      })}
                  </ul>
              </ThemedGlassmorphismPanel>
          </div>
      )}

      {/* Standard Dropdown Menu (Full Mode) */}
      {!mini && (
        <div
            className={`translate transform overflow-hidden transition-all duration-300 ${
            !isExpanded && "hidden"
            }`}
        >
            <ul className="mt-2 mb-4 flex flex-col gap-1.5 pl-6">{children}</ul>
        </div>
      )}
    </div>
  );
};

export default SidebarGroup;
