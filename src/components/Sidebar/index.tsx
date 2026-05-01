import React, { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import LogoIcon from '../../images/logo/logo-icon.svg';
import LogoIconDark from '../../images/logo/logo-icon-dark.svg';

import { useAuth } from '../../pages/Authentication/AuthContext';
import {
  TbBuilding,
  TbDashboard,
  TbDatabase,
  TbDownload,
  TbUserCheck,
  TbLayoutSidebarLeftCollapse,
  TbPinned,
  TbEye,
  TbGasStation,
  TbSettings,
  TbDroplet,
  TbTools,
  TbSkull
} from 'react-icons/tb';
import { FaRegHandshake } from 'react-icons/fa';
import SidebarGroup from './SidebarGroup';
import SidebarLink from './SidebarLink';
import SidebarButton from './SidebarButton';
import { ADMIN, ALL_ROLES, FUEL_PARTNER, FUEL_ROLES, OIL_ROLES, PLANT, SUPERVISOR, WASTE_MANAGEMENT } from '../../store/roles';
import ExclusiveWidget from '../../common/TrialWrapper/ExclusiveWidget';
import { useTheme, hexToRgba } from '../../contexts/ThemeContext';

interface SidebarProps {
  role?: string | null;
  sidebarOpen: boolean;
  setSidebarOpen: (arg: boolean) => void;
}

const Sidebar = ({ sidebarOpen, setSidebarOpen, role }: SidebarProps) => {
  const location = useLocation();
  const { pathname } = location;
  const storedSidebarConfig = localStorage.getItem('sidebar-config') as 'full' | 'mini' | 'auto' | null;
  const [sidebarConfig, setSidebarConfig] = useState<'full' | 'mini' | 'auto'>(
    storedSidebarConfig || 'full'
  );

  const trigger = useRef<any>(null);
  const sidebar = useRef<any>(null);

  const { signOut } = useAuth();

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

  useEffect(() => {
    console.log("Sidebar: Received role prop", { role, type: typeof role });
  }, [role])

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
    localStorage.setItem('sidebar-config', sidebarConfig);
    if (sidebarConfig === 'full') {
      document.querySelector('body')?.classList.add('sidebar-expanded');
    } else {
      document.querySelector('body')?.classList.remove('sidebar-expanded');
    }
  }, [sidebarConfig]);

  // asideWidth is now handled by CSS classes sidebar-main and sidebar-mini
  // but we still keep are-mini for some internal logic if needed
  const sidebarConfigClass = sidebarConfig === 'mini' ? 'sidebar-mini' : sidebarConfig === 'auto' ? 'sidebar-mini sidebar-mini-auto' : '';

  const handleSignOut = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault(); // Prevent default behavior if the handler is used for a button

    if (!signOut) return;
    try {
      await signOut();
    } catch (err) {
      console.error('Sign out error:', err);
    } finally {
      window.location.href = '/auth/signin';
    }
  };

  const { activeTheme } = useTheme();

  return (
    <aside
      ref={sidebar}
      className={`sidebar-main absolute left-0 top-0 z-[999] flex min-h-screen flex-col overflow-visible no-scrollbar shadow-xl duration-300 ease-linear lg:relative lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } ${activeTheme.sidebar.detached ? 'lg:m-4 lg:rounded-2xl border' : 'border-r'} ${activeTheme.sidebar.backdropBlur !== 'none' ? `glass-blur-${activeTheme.sidebar.backdropBlur}` : ''
        } premium-glow ${sidebarConfigClass}`}
      style={{
        backgroundColor: hexToRgba(activeTheme.sidebar.color, activeTheme.sidebar.opacity),
        color: activeTheme.sidebar.textColor,
        borderRadius: activeTheme.sidebar.borderRadius,
        border: activeTheme.sidebar.border !== 'none'
          ? `${activeTheme.sidebar.borderWidth} ${activeTheme.sidebar.border} ${hexToRgba(activeTheme.sidebar.borderColor, activeTheme.sidebar.borderOpacity)}`
          : 'none',
        // CSS Variables for premium-glow
        '--primary-color': activeTheme.ui.primaryColor,
        '--glow-color': hexToRgba(activeTheme.ui.primaryColor, 0.15),
      } as React.CSSProperties}
    >
      {/* <!-- SIDEBAR HEADER --> */}
      <div className="sidebar-header-container relative px-6 py-5.5 lg:py-6.5 flex flex-col lg:flex-row items-center gap-4 lg:gap-2">
        <div className="group/header relative inline-block">
          <NavLink to="/dashboard" className="flex items-center gap-3">
            <div className="relative mt-5 flex">
              <img src={LogoIcon} alt="LogoIcon" className="h-9 block dark:hidden transition-transform duration-300 group-hover/header:scale-110" />
              <img src={LogoIconDark} alt="LogoIconDark" className="h-9 hidden dark:block transition-transform duration-300 group-hover/header:scale-110" />
            </div>
          </NavLink>

          {/* Floating Mode Switcher Panel (Visible on Logo/Header Hover) */}
          <div className="absolute left-full top-0 pl-10 hidden group-hover/header:block animate-in fade-in slide-in-from-left-4 duration-200 z-[1000]">
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-4 w-52 flex flex-col gap-3 -ml-10">
              <div className="flex flex-col gap-1 pb-2 border-b border-slate-100 dark:border-slate-700">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sidebar Mode</span>
                <p className="text-[11px] text-slate-500 font-medium">Choose how the sidebar behaves</p>
              </div>

              <button
                onClick={(e) => { e.stopPropagation(); setSidebarConfig('full'); }}
                className={`flex items-center gap-3 p-2.5 rounded-xl transition-all ${sidebarConfig === 'full' ? 'bg-primary text-white shadow-lg' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${sidebarConfig === 'full' ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-700'}`}>
                  <TbPinned size={18} />
                </div>
                <div className="flex flex-col items-start leading-tight">
                  <span className="text-[13px] font-bold">Expanded</span>
                  <span className="text-[10px] opacity-70">Always visible</span>
                </div>
              </button>

              <button
                onClick={(e) => { e.stopPropagation(); setSidebarConfig('auto'); }}
                className={`flex items-center gap-3 p-2.5 rounded-xl transition-all ${sidebarConfig === 'auto' ? 'bg-primary text-white shadow-lg' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${sidebarConfig === 'auto' ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-700'}`}>
                  <TbEye size={18} />
                </div>
                <div className="flex flex-col items-start leading-tight">
                  <span className="text-[13px] font-bold">Auto Hover</span>
                  <span className="text-[10px] opacity-70">Expand on hover</span>
                </div>
              </button>

              <button
                onClick={(e) => { e.stopPropagation(); setSidebarConfig('mini'); }}
                className={`flex items-center gap-3 p-2.5 rounded-xl transition-all ${sidebarConfig === 'mini' ? 'bg-primary text-white shadow-lg' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${sidebarConfig === 'mini' ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-700'}`}>
                  <TbLayoutSidebarLeftCollapse size={18} />
                </div>
                <div className="flex flex-col items-start leading-tight">
                  <span className="text-[13px] font-bold">Mini Mode</span>
                  <span className="text-[10px] opacity-70">Classic thin bar</span>
                </div>
              </button>

              <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-2 px-2 text-[9px] text-slate-400 font-bold uppercase italic">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                  Active: {sidebarConfig}
                </div>
              </div>
            </div>
          </div>
        </div>

        <button
          ref={trigger}
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="block lg:hidden text-slate-400"
        >
          <svg className="fill-current" width="20" height="18" viewBox="0 0 20 18" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 8.175H2.98748L9.36248 1.6875C9.69998 1.35 9.69998 0.825 9.36248 0.4875C9.02498 0.15 8.49998 0.15 8.16248 0.4875L0.399976 8.3625C0.0624756 8.7 0.0624756 9.225 0.399976 9.5625L8.16248 17.4375C8.31248 17.5875 8.53748 17.7 8.76248 17.7C8.98748 17.7 9.17498 17.625 9.36248 17.475C9.69998 17.1375 9.69998 16.6125 9.36248 16.275L3.02498 9.8625H19C19.45 9.8625 19.825 9.4875 19.825 9.0375C19.825 8.55 19.45 8.175 19 8.175Z" fill="currentColor" />
          </svg>
        </button>
      </div>
      {/* <!-- SIDEBAR HEADER --> */}

      <div className="flex flex-col overflow-visible duration-300 ease-linear">
        {/* <!-- Sidebar Menu --> */}
        <nav className="mt-1 py-4">
          {/* <!-- Menu Group --> */}
          <div>
            <h3 className="sidebar-label mb-4 ml-4 text-sm font-semibold text-bodydark3 uppercase tracking-widest animate-in fade-in duration-300">
              {typeof role === 'object' ? 'Access Granted' : String(role || 'No Role')}
            </h3>

            <ul className="mb-6 flex flex-col gap-1.5">
              {/* <!-- Menu Item Dashboard --> */}
              <SidebarGroup
                currentRole={role!}
                roles={ADMIN}
                title="Dashboard"
                icon={<TbDashboard />}
                pathname={pathname}
                basePath="/dashboard"
                mini={sidebarConfig === 'mini'}
              >
                <SidebarLink to="/dashboard" label="Home" mini={sidebarConfig === 'mini'} />
                {/* <SidebarLink to="/fuelcons" label="Fuel Consumption" mini={sidebarConfig === 'mini'} /> */}
                <SidebarLink to="/trip" label="Trip Management" mini={sidebarConfig === 'mini'} />
                <SidebarLink to="/stock" label="Stock Management" mini={sidebarConfig === 'mini'} />
                <SidebarLink to="/operational" label="Operational" mini={sidebarConfig === 'mini'} />
                <SidebarLink to="/infrastructure" label="Infrastructure" mini={sidebarConfig === 'mini'} />
                <SidebarLink to="/manpower" label="Manpower" mini={sidebarConfig === 'mini'} />
                <SidebarLink to="/gardaloto" label="Garda Loto" mini={sidebarConfig === 'mini'} />
              </SidebarGroup>
              {/* <!-- Menu Item Dashboard --> */}

              {/* <!-- Menu Item Fuel Reporting Pages --> */}
              <SidebarGroup
                currentRole={role!}
                roles={FUEL_ROLES}
                title="Fuel Reporting"
                icon={<TbGasStation />}
                pathname={pathname}
                basePath="/reporting"
                mini={sidebarConfig === 'mini'}
              >
                <SidebarLink to="/reporting/dailyreport" label="Daily Report" mini={sidebarConfig === 'mini'} />
                <SidebarLink to="/reporting/adminreport" label="Admin Report" mini={sidebarConfig === 'mini'} />
                {/* <SidebarLink to="/reporting/logsheet" label="Logsheet" mini={sidebarConfig === 'mini'} /> */}
                <SidebarLink to="/reporting/stock" label="Stock" mini={sidebarConfig === 'mini'} />
                {/* <SidebarLink to="/reporting/ritation" label="Ritation" mini={sidebarConfig === 'mini'} /> */}
                {/* <SidebarLink to="/reporting/tmr" label="TMR" mini={sidebarConfig === 'mini'} /> */}
                <SidebarLink to="/reporting/pressureless" label="Pressureless" mini={sidebarConfig === 'mini'} />
                <SidebarLink to="/reporting/stocktaking" label="Stock Taking" mini={sidebarConfig === 'mini'} />
                <SidebarLink to="/reporting/ftbdrfu" label="FT Breakdown - RFU" mini={sidebarConfig === 'mini'} />
                <SidebarLink to="/reporting/gardaloto" label="Garda Loto" mini={sidebarConfig === 'mini'} />
                <SidebarLink to="/reporting/fuelusage" label="Fuel Usage Report" mini={sidebarConfig === 'mini'} />
              </SidebarGroup>


              {/* <!-- Menu Item Operational Reporting Pages --> */}
              <SidebarGroup
                currentRole={role!}
                roles={SUPERVISOR}
                title="Operational"
                icon={<TbSettings />}
                pathname={pathname}
                basePath="/operational"
                mini={sidebarConfig === 'mini'}
              >
                <SidebarLink to="/operational" label="Dashboard" mini={sidebarConfig === 'mini'} />
                <SidebarLink to="/operational/fleet" label="Fleet Mgmt" mini={sidebarConfig === 'mini'} />
                <SidebarLink to="/operational/delay" label="Delay Refueling" mini={sidebarConfig === 'mini'} />
                <SidebarLink to="/operational/distribution" label="Refueling Dist." mini={sidebarConfig === 'mini'} />
                <SidebarLink to="/operational/hm" label="HM" mini={sidebarConfig === 'mini'} />
                <SidebarLink to="/operational/issuing" label="issuing" mini={sidebarConfig === 'mini'} />
              </SidebarGroup>

              {/* <!-- Menu Item Partner Reporting --> */}
              <SidebarGroup
                currentRole={role!}
                roles={FUEL_PARTNER}
                title="Fuel Partner Menu"
                icon={<FaRegHandshake />}
                pathname={pathname}
                basePath="/partner/fuel"
                mini={sidebarConfig === 'mini'}
              >
                <SidebarLink to="/partner/fuel" label="Fuel Dashboard" mini={sidebarConfig === 'mini'} />
                <SidebarLink to="/partner/fuel/ritation" label="Fuel Ritation" mini={sidebarConfig === 'mini'} />
                <SidebarLink to="/partner/fuel/stock" label="Fuel Stock" mini={sidebarConfig === 'mini'} />
                <ExclusiveWidget allowedRoles={ADMIN}>
                  <SidebarLink to="/partner/fuel/additive" label="Fuel Additive" mini={sidebarConfig === 'mini'} />
                </ExclusiveWidget>
              </SidebarGroup>

              {/* <!-- Menu Item Oil Reporting Pages --> */}
              <SidebarGroup
                currentRole={role!}
                roles={OIL_ROLES}
                title="Oil Reporting"
                icon={<TbDroplet />}
                pathname={pathname}
                basePath="/oil"
                mini={sidebarConfig === 'mini'}
              >
                <SidebarLink to="/oil/storagemgmt" label="Stor. Mgmt" mini={sidebarConfig === 'mini'} />
                <SidebarLink to="/oil/dst" label="DST Oil" mini={sidebarConfig === 'mini'} />
                <SidebarLink to="/oil/dst-user" label="DST Oil (User)" mini={sidebarConfig === 'mini'} />
                <SidebarLink to="/oil/dstreport" label="DST Report" mini={sidebarConfig === 'mini'} />
                <SidebarLink to="/oil/historical" label="Historical Report" mini={sidebarConfig === 'mini'} />
                <SidebarLink to="/oil/flowmeter-mapping" label="Oil FM Mapping" mini={sidebarConfig === 'mini'} />
                <SidebarLink to="/oil/grease" label="Grease" mini={sidebarConfig === 'mini'} />
                <SidebarLink to="/oil/housekeeping" label="Housekeeping" mini={sidebarConfig === 'mini'} />
              </SidebarGroup>

              {/* <!-- Menu Item Waste Reporting Pages --> */}
              <SidebarGroup
                currentRole={role!}
                roles={WASTE_MANAGEMENT}
                title="Waste Reporting"
                icon={<TbSkull />}
                pathname={pathname}
                basePath="/waste"
                mini={sidebarConfig === 'mini'}
              >
                <SidebarLink to="/waste/battery-documentation" label="Battery Documentation" mini={sidebarConfig === 'mini'} />
              </SidebarGroup>

              {/* <!-- Menu Item Plant Reporting Pages --> */}
              <SidebarGroup
                currentRole={role!}
                roles={PLANT}
                title="Plant Menu"
                icon={<TbTools />}
                pathname={pathname}
                basePath="/plant"
                mini={sidebarConfig === 'mini'}
              >
                <SidebarLink to="/plant-dashboard" label="PLANT Dashboard" mini={sidebarConfig === 'mini'} />
                <SidebarLink to="/plant/filterchangedb" label="Filter Change DB" mini={sidebarConfig === 'mini'} />
                <SidebarLink to="/plant/filterchange" label="Filter Change" mini={sidebarConfig === 'mini'} />
                <SidebarLink to="/plant/bacleanliness" label="Cleanliness" mini={sidebarConfig === 'mini'} />
              </SidebarGroup>


              {/* <!-- Menu Item Reporting Pages --> */}
              <SidebarGroup
                currentRole={role!}
                roles={SUPERVISOR}
                title="Infrastructure"
                icon={<TbBuilding />}
                pathname={pathname}
                basePath="/infrastructure"
                mini={sidebarConfig === 'mini'}
              >
                <SidebarLink to="/infrastructure/ftbacklog" label="Backlog Monitoring" mini={sidebarConfig === 'mini'} />
                <SidebarLink to="/infrastructure/ftreadiness" label="FT Readiness" mini={sidebarConfig === 'mini'} />
                <SidebarLink to="/infrastructure/pressureless" label="Pressureless" mini={sidebarConfig === 'mini'} />
                <SidebarLink to="/infrastructure/filtration" label="Filtration" mini={sidebarConfig === 'mini'} />
                <SidebarLink to="/infrastructure/calibration" label="Calibration" mini={sidebarConfig === 'mini'} />
                <SidebarLink to="/infrastructure/inspection" label="Inspection" mini={sidebarConfig === 'mini'} />
              </SidebarGroup>
              {/* <!-- Menu Item Reporting Pages --> */}

              <SidebarGroup
                currentRole={role!}
                roles={SUPERVISOR}
                title="Master Data"
                icon={<TbDatabase />}
                pathname={pathname}
                basePath="/master"
                mini={sidebarConfig === 'mini'}
                align="bottom"
              >
                <SidebarLink to="/master/materials" label="Materials" mini={sidebarConfig === 'mini'} />
                <SidebarLink to="/master/manpower" label="Manpower" mini={sidebarConfig === 'mini'} />
                <SidebarLink to="/master/competency" label="Competency" mini={sidebarConfig === 'mini'} />
                <SidebarLink to="/master/equipment" label="Equipment" mini={sidebarConfig === 'mini'} />
                <SidebarLink to="/master/storage/fuel" label="Storage Fuel" mini={sidebarConfig === 'mini'} />
                <SidebarLink to="/master/library" label="Component Library" mini={sidebarConfig === 'mini'} />
                <SidebarLink to="/master/schedule/refueling" label="Refueling Schedule" mini={sidebarConfig === 'mini'} />
                <SidebarLink to="/master/mrp" label="MRP Database" mini={sidebarConfig === 'mini'} />
              </SidebarGroup>

              {/* <!-- Menu Item Export --> */}

              <SidebarGroup
                currentRole={role!}
                roles={SUPERVISOR}
                title="Export"
                icon={<TbDownload />}
                pathname={pathname}
                basePath="/export"
                mini={sidebarConfig === 'mini'}
                align="bottom"
              >
                <SidebarLink to="/export/bastfuel" label="BAST Fuel" mini={sidebarConfig === 'mini'} />
                <SidebarLink to="/export/bastoli" label="BAST Oli" mini={sidebarConfig === 'mini'} />
                <SidebarLink to="/export/reconcilefuelowner" label="BA Reconcile BC" mini={sidebarConfig === 'mini'} />
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
                mini={sidebarConfig === 'mini'}
                align="bottom"
              >
                <SidebarLink to="/auth/registrationlist" label="Registrations" mini={sidebarConfig === 'mini'} />
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
