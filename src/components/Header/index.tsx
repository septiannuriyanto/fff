import { Link } from 'react-router-dom';
import DropdownMessage from './DropdownMessage';
import DropdownNotification from './DropdownNotification';
import DropdownUser from './DropdownUser';
import LogoIcon from '../../images/logo/logo-icon.svg';
import LogoIconDark from '../../images/logo/logo-icon-dark.svg';
import DarkModeSwitcher from './DarkModeSwitcher';
import { useTheme } from '../../contexts/ThemeContext';
import { ThemedSearchBar } from '../../common/ThemedComponents/ThemedSearchBar';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

const Header = (props: {
  sidebarOpen: string | boolean | undefined;
  setSidebarOpen: (arg0: boolean) => void;
  sidebarDetached?: boolean;
}) => {

  const { activeTheme } = useTheme();
  const isDetached = activeTheme.header.detached === true;
  
  // Get sidebar config from localStorage to determine if mini or full
  const sidebarConfig = typeof window !== 'undefined' ? localStorage.getItem('sidebar-config') as 'full' | 'mini' | 'auto' | null : 'full';
  const isSidebarMini = sidebarConfig === 'mini';

  return (
    <header
      className={`sticky top-0 z-[998] flex w-full shadow-sm border-b border-slate-200/50 dark:border-slate-800/50 transition-all duration-700 ${isDetached ? 'lg:m-4 lg:rounded-2xl lg:border' : ''}`}
      style={{
        backgroundColor: activeTheme.header.color,
        opacity: activeTheme.header.opacity,
        backdropFilter: activeTheme.header.backdropBlur !== 'none'
          ? `blur(${activeTheme.header.backdropBlur === 'sm' ? '4px' : activeTheme.header.backdropBlur === 'md' ? '8px' : activeTheme.header.backdropBlur === 'lg' ? '12px' : activeTheme.header.backdropBlur === 'xl' ? '20px' : '0px'})`
          : undefined,
        color: activeTheme.header.textColor,
        borderColor: isDetached ? activeTheme.container.borderColor : undefined,
      }}
    >
      {/* 3-column flex: [mobile controls] [centered search] [right icons] */}
      <div className="flex flex-grow items-center px-4 py-3 md:px-6 gap-4">

        {/* LEFT — hamburger + logo (mobile / tablet only) */}
        <div className="flex items-center gap-2 sm:gap-4 lg:hidden flex-shrink-0">
          <button
            aria-controls="sidebar"
            onClick={(e) => {
              e.stopPropagation();
              props.setSidebarOpen(!props.sidebarOpen);
            }}
            className="block rounded-sm border border-stroke bg-white p-1.5 shadow-sm dark:border-strokedark dark:bg-boxdark"
          >
            <span className="relative block h-5.5 w-5.5 cursor-pointer">
              <span className="du-block absolute right-0 h-full w-full">
                <span className={`relative left-0 top-0 my-1 block h-0.5 w-0 rounded-sm bg-black delay-[0] duration-200 ease-in-out dark:bg-white ${!props.sidebarOpen && '!w-full delay-300'}`}></span>
                <span className={`relative left-0 top-0 my-1 block h-0.5 w-0 rounded-sm bg-black delay-150 duration-200 ease-in-out dark:bg-white ${!props.sidebarOpen && 'delay-400 !w-full'}`}></span>
                <span className={`relative left-0 top-0 my-1 block h-0.5 w-0 rounded-sm bg-black delay-200 duration-200 ease-in-out dark:bg-white ${!props.sidebarOpen && '!w-full delay-500'}`}></span>
              </span>
              <span className="absolute right-0 h-full w-full rotate-45">
                <span className={`absolute left-2.5 top-0 block h-full w-0.5 rounded-sm bg-black delay-300 duration-200 ease-in-out dark:bg-white ${!props.sidebarOpen && '!h-0 !delay-[0]'}`}></span>
                <span className={`delay-400 absolute left-0 top-2.5 block h-0.5 w-full rounded-sm bg-black duration-200 ease-in-out dark:bg-white ${!props.sidebarOpen && '!h-0 !delay-200'}`}></span>
              </span>
            </span>
          </button>

          <Link className="block flex-shrink-0 lg:hidden" to="/">
            <img src={LogoIcon} alt="Logo" className="h-8 block dark:hidden" />
            <img src={LogoIconDark} alt="Logo" className="h-8 hidden dark:block" />
          </Link>
        </div>

        {/* CENTER — search bar grows & sits centered */}
        <div className="flex flex-1 items-center justify-center lg:ml-40 ">
          <ThemedSearchBar />
        </div>

        {/* RIGHT — icons (dark mode, mobile search loupe, notifications, messages, user) */}
        <div className="flex items-center gap-3 2xsm:gap-4 flex-shrink-0">
          <ul className="flex items-center gap-2 2xsm:gap-4">
            <DarkModeSwitcher />

            {/* Mobile loupe: circle button matching notification style, hidden on sm+ */}
            <li className="sm:hidden">
              <button
                onClick={() => document.dispatchEvent(new CustomEvent('fff:open-search'))}
                className="relative flex h-8.5 w-8.5 items-center justify-center rounded-full border-[0.5px] border-stroke bg-gray hover:text-primary dark:border-strokedark dark:bg-meta-4 dark:text-white"
                aria-label="Search"
              >
                <MagnifyingGlassIcon className="w-4 h-4" />
              </button>
            </li>

            <DropdownNotification />
            <DropdownMessage />
          </ul>
          <DropdownUser />
        </div>

      </div>
    </header>
  );
};

export default Header;
