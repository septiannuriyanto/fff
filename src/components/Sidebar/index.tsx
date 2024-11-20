import React, { useContext, useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import SidebarLinkGroup from './SidebarLinkGroup';
import LogoDark from '../../images/logo/logo-dark.svg';
import Logo from '../../images/logo/logo.svg';
import { supabase } from '../../db/SupabaseClient';
import { useDispatch } from 'react-redux'; // Import useDispatch from Redux
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../pages/Authentication/AuthContext';
import {
  TbDashboard,
  TbDatabase,
  TbDownload,
  TbLayoutGrid,
  TbList,
  TbReport,
  TbSearch,
  TbSortAZ,
  TbSortZA,
  TbUser,
  TbUserCheck,
} from 'react-icons/tb';
import SidebarGroup from './SidebarGroup';
import SidebarLink from './SidebarLink';
import SidebarButton from './SidebarButton';
import { ADMIN, ALL_ROLES, FUEL_ROLES, SUPERVISOR } from '../../store/roles';

interface SidebarProps {
  role?:string | null;
  sidebarOpen: boolean;
  setSidebarOpen: (arg: boolean) => void;
}

const Sidebar = ({ sidebarOpen, setSidebarOpen, role }: SidebarProps) => {
  const location = useLocation();
  const { pathname } = location;

  const trigger = useRef<any>(null);
  const sidebar = useRef<any>(null);

  const storedSidebarExpanded = localStorage.getItem('sidebar-expanded');
  const [sidebarExpanded, setSidebarExpanded] = useState(
    storedSidebarExpanded === null ? false : storedSidebarExpanded === 'true',
  );

  const [isShown, setIsShown] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { signOut } = useAuth();
  const { currentUser } = useAuth();

  // close on click outside
  useEffect(() => {

    const clickHandler = ({ target }: MouseEvent) => {
      if (!sidebar.current || !trigger.current) return;
      if (
        !sidebarOpen ||
        sidebar.current.contains(target) ||
        trigger.current.contains(target)
      )
        return;
      setSidebarOpen(false);
    };
    document.addEventListener('click', clickHandler);
    return () => document.removeEventListener('click', clickHandler);

    
    
  });

  useEffect(()=>{
    console.log(role);
  },[role])

  // close if the esc key is pressed
  useEffect(() => {
    const keyHandler = ({ keyCode }: KeyboardEvent) => {
      if (!sidebarOpen || keyCode !== 27) return;
      setSidebarOpen(false);
    };
    document.addEventListener('keydown', keyHandler);
    return () => document.removeEventListener('keydown', keyHandler);
  });

  useEffect(() => {
    localStorage.setItem('sidebar-expanded', sidebarExpanded.toString());
    if (sidebarExpanded) {
      document.querySelector('body')?.classList.add('sidebar-expanded');
    } else {
      document.querySelector('body')?.classList.remove('sidebar-expanded');
    }
  }, [sidebarExpanded]);

  const handleSignOut = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault(); // Prevent default behavior if the handler is used for a button

    if (!signOut) return;
    try {
      await signOut();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      window.location.href = '/auth/signin';
    }
  };

  return (
    <aside
      ref={sidebar}
      className={`sidebar-main ${isShown} absolute left-0 top-0 z-9999 flex h-screen w-65 flex-col overflow-y-hidden bg-white duration-300 ease-linear dark:bg-boxdark lg:static lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      {/* <!-- SIDEBAR HEADER --> */}
      <div className="flex items-center justify-between gap-2 px-6 py-5.5 lg:py-6.5">
        <NavLink to="/">
          <img src={Logo} alt="Logo" className="h-6 fill block dark:hidden" />
          <img
            src={LogoDark}
            alt="LogoDark"
            className="h-6 fill hidden dark:block"
          />
        </NavLink>

        <button
          ref={trigger}
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-controls="sidebar"
          aria-expanded={sidebarOpen}
          className="block lg:hidden"
        >
          <svg
            className="fill-current"
            width="20"
            height="18"
            viewBox="0 0 20 18"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M19 8.175H2.98748L9.36248 1.6875C9.69998 1.35 9.69998 0.825 9.36248 0.4875C9.02498 0.15 8.49998 0.15 8.16248 0.4875L0.399976 8.3625C0.0624756 8.7 0.0624756 9.225 0.399976 9.5625L8.16248 17.4375C8.31248 17.5875 8.53748 17.7 8.76248 17.7C8.98748 17.7 9.17498 17.625 9.36248 17.475C9.69998 17.1375 9.69998 16.6125 9.36248 16.275L3.02498 9.8625H19C19.45 9.8625 19.825 9.4875 19.825 9.0375C19.825 8.55 19.45 8.175 19 8.175Z"
              fill=""
            />
          </svg>
        </button>
      </div>
      {/* <!-- SIDEBAR HEADER --> */}

      <div className="no-scrollbar flex flex-col overflow-y-auto duration-300 ease-linear">
        {/* <!-- Sidebar Menu --> */}
        <nav className="mt-5 py-4 px-4 lg:mt-9 lg:px-6">
          {/* <!-- Menu Group --> */}
          <div>
            <h3 className="mb-4 ml-4 text-sm font-semibold text-bodydark3">
              {role}
            </h3>

            <ul className="mb-6 flex flex-col gap-1.5">
              {/* <!-- Menu Item Dashboard --> */}
              <SidebarGroup
                currentRole={role!}
                roles={ADMIN}
                title="Dashboard"
                icon={<TbDashboard />}
                pathname={pathname}
                basePath="/"
              >
                <SidebarLink to="/" label="Home" />
                <SidebarLink to="/fuelcons" label="Fuel Consumption" />
                <SidebarLink to="/stockmanagement" label="Stock Management" />
                <SidebarLink to="/operational" label="Operational" />
                <SidebarLink to="/infrastructure" label="Infrastructure" />
                <SidebarLink to="/manpower" label="Manpower" />
              </SidebarGroup>
              {/* <!-- Menu Item Dashboard --> */}

              {/* <!-- Menu Item Reporting Pages --> */}
              <SidebarGroup
              currentRole={role!}
              roles={FUEL_ROLES}
                title="Fuel Reporting"
                icon={<TbReport />}
                pathname={pathname}
                basePath="/reporting"
              >
                <SidebarLink to="/reporting/dailyreport" label="Daily Report" />
                <SidebarLink to="/reporting/logsheet" label="Logsheet" />
                <SidebarLink to="/reporting/stock" label="Stock" />
                <SidebarLink to="/reporting/ritation" label="Ritation" />
                <SidebarLink to="/reporting/tmr" label="TMR" />
                <SidebarLink
                  to="/reporting/pressureless"
                  label="Pressureless"
                />
                <SidebarLink to="/reporting/stocktaking" label="Stock Taking" />
                <SidebarLink
                  to="/reporting/ftbdrfu"
                  label="FT Breakdown - RFU"
                />
                <SidebarLink
                  to="/reporting/ftbacklogreq"
                  label="FT Backlog Request"
                />
              </SidebarGroup>
              {/* <!-- Menu Item Reporting Pages --> */}

              <SidebarGroup
              currentRole={role!}
              roles={SUPERVISOR}
                title="Master Data"
                icon={<TbDatabase />}
                pathname={pathname}
                basePath="/master"
              >
                <SidebarLink to="/master/manpower" label="Manpower" />
                <SidebarLink to="/master/equipment" label="Equipment" />
                <SidebarLink to="/master/fueltruck" label="Fuel Truck" />
                <SidebarLink to="/master/library" label="Component Library" />
              </SidebarGroup>

              {/* <!-- Menu Item Export --> */}

              <SidebarGroup
              currentRole={role!}
              roles={SUPERVISOR}
                title="Export"
                icon={<TbDownload />}
                pathname={pathname}
                basePath="/export"
              >
                <SidebarLink to="/export/bastfuel" label="BAST Fuel" />
                <SidebarLink to="/export/bastoli" label="BAST Oli" />
                <SidebarLink
                  to="/export/reconcilefuelowner"
                  label="BA Reconcile BC"
                />
              </SidebarGroup>
              {/* <!-- Menu Item Export --> */}

              {/* <!-- Menu Item Auth Pages --> */}
              <SidebarGroup
              currentRole={role!}
              roles={ALL_ROLES}
                title="Authentication"
                icon={<TbUserCheck />}
                pathname={pathname}
                basePath="/auth"
              >
                <SidebarLink to="/auth/registrationlist" label="Registrations" />
                <SidebarButton
                  label="Sign Out"
                  onClick={handleSignOut}
                ></SidebarButton>
              </SidebarGroup>

              {/* <!-- Menu Item Auth Pages --> */}
            </ul>
          </div>
        </nav>
        {/* <!-- Sidebar Menu --> */}
      </div>
    </aside>
  );
};

export default Sidebar;
