import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import ThemedGlassmorphismPanel from '../../common/ThemedComponents/ThemedGlassmorphismPanel';
import ClickOutside from '../ClickOutside';
import UserOne from '../../images/user/user-01.png';
import { supabase } from '../../db/SupabaseClient';
import ThemedThemingSheet from '../../common/ThemedComponents/ThemedThemingSheet';

const DropdownUser = () => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [themeSheetOpen, setThemeSheetOpen] = useState(false);
  const { activeTheme } = useTheme();
  const { popup } = activeTheme;
  const [nama, setNama] = useState('');
  const [position, setPosition] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');

  const dropdown = useRef<any>(null);

  const nrp = localStorage.getItem('nrp');

  const fetchImage = async() =>{
    const { data, error } = await supabase
    .from('manpower')
    .select('nama, position, photo_url, incumbent(incumbent)')
    .eq('nrp', nrp)
    .single();
    
    if (error) {
      console.error(error);
      return;
    }

    setNama(data?.nama || '');
    const incumbentData = data?.incumbent as any;
    const roleTitle = Array.isArray(incumbentData) 
      ? incumbentData[0]?.incumbent 
      : incumbentData?.incumbent;
      
    setPosition(roleTitle || '');
    setPhotoUrl(data?.photo_url || '');
  }

  useEffect(()=>{
    fetchImage();
  },[])

  const handleLogout = () => {
    localStorage.clear(); 
    window.location.href = '/auth/signin';
  };

  return (
    <ClickOutside onClick={() => setDropdownOpen(false)} className="relative">
      <Link
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="flex items-center gap-4"
        to="#"
      >
        <span className="hidden text-right lg:block">
          <span className="block text-xs font-medium text-black dark:text-white">
            {nama}
          </span>
          <span className="block text-xs">{position}</span>
        </span>

        <span className="h-12 w-12 rounded-full overflow-hidden">
          <img 
            src={photoUrl || UserOne} 
            alt="User"
            className="h-full w-full object-cover"
            onError={(e) => {
              e.currentTarget.src = UserOne; 
            }} 
          />
        </span>

        <svg
          className="hidden fill-current sm:block"
          width="12"
          height="8"
          viewBox="0 0 12 8"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M0.410765 0.910734C0.736202 0.585297 1.26384 0.585297 1.58928 0.910734L6.00002 5.32148L10.4108 0.910734C10.7362 0.585297 11.2638 0.585297 11.5893 0.910734C11.9147 1.23617 11.9147 1.76381 11.5893 2.08924L6.58928 7.08924C6.26384 7.41468 5.7362 7.41468 5.41077 7.08924L0.410765 2.08924C0.0853277 1.76381 0.0853277 1.23617 0.410765 0.910734Z"
            fill=""
          />
        </svg>
      </Link>

      {/* <!-- Dropdown Start --> */}
      {dropdownOpen && (
        <ThemedGlassmorphismPanel
          ref={dropdown}
          onBlur={() => setDropdownOpen(false)}
          className="absolute right-0 mt-4 flex w-62.5 flex-col rounded-sm"
        >
          <ul className="flex flex-col gap-5 border-b border-stroke px-6 py-7.5 dark:border-strokedark">
            <li>
              <Link
                to={`/profile/${nrp}`}
                className="flex items-center gap-3.5 text-sm font-medium duration-300 ease-in-out lg:text-base"
                style={{ color: popup.textColor || undefined }}
                onMouseEnter={(e) => (e.currentTarget.style.color = popup.textHoverColor || '')}
                onMouseLeave={(e) => (e.currentTarget.style.color = popup.textColor || '')}
              >
                <svg
                  className="fill-current"
                  width="22"
                  height="22"
                  viewBox="0 0 22 22"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M11 9.62499C8.42188 9.62499 6.35938 7.59687 6.35938 5.12187C6.35938 2.64687 8.42188 0.618744 11 0.618744C13.5781 0.618744 15.6406 2.64687 15.6406 5.12187C15.6406 7.59687 13.5781 9.62499 11 9.62499ZM11 2.16562C9.28125 2.16562 7.90625 3.50624 7.90625 5.12187C7.90625 6.73749 9.28125 8.07812 11 8.07812C12.7188 8.07812 14.0938 6.73749 14.0938 5.12187C14.0938 3.50624 12.7188 2.16562 11 2.16562Z"
                    fill=""
                  />
                  <path
                    d="M17.7719 21.4156H4.2281C3.5406 21.4156 2.9906 20.8656 2.9906 20.1781V17.0844C2.9906 13.7156 5.7406 10.9656 9.10935 10.9656H12.925C16.2937 10.9656 19.0437 13.7156 19.0437 17.0844V20.1781C19.0094 20.8312 18.4594 21.4156 17.7719 21.4156ZM4.53748 19.8687H17.4969V17.0844C17.4969 14.575 15.4344 12.5125 12.925 12.5125H9.07498C6.5656 12.5125 4.5031 14.575 4.5031 17.0844V19.8687H4.53748Z"
                    fill=""
                  />
                </svg>
                My Profile
              </Link>
            </li>
            <li>
              <button
                onClick={() => {
                  setThemeSheetOpen(true);
                  setDropdownOpen(false);
                }}
                className="flex items-center gap-3.5 text-sm font-medium duration-300 ease-in-out lg:text-base w-full overflow-hidden"
                style={{ color: popup.textColor || undefined }}
                onMouseEnter={(e) => (e.currentTarget.style.color = popup.textHoverColor || '')}
                onMouseLeave={(e) => (e.currentTarget.style.color = popup.textColor || '')}
              >
                <svg 
                  className="w-5.5 h-5.5 fill-current" 
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.75-.39-1.02-.23-.27-.38-.63-.38-1.03 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9s1.5.67 1.5 1.5S7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
                </svg>
                Appearance
              </button>
            </li>
          </ul>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3.5 px-6 py-4 text-sm font-medium duration-300 ease-in-out lg:text-base w-full"
            style={{ color: popup.textColor || undefined }}
            onMouseEnter={(e) => (e.currentTarget.style.color = popup.textHoverColor || '')}
            onMouseLeave={(e) => (e.currentTarget.style.color = popup.textColor || '')}
          >
            <svg
              className="fill-current"
              width="22"
              height="22"
              viewBox="0 0 22 22"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M15.5375 0.618744H11.6531C10.7594 0.618744 10.0031 1.37499 10.0031 2.26874V4.64062C10.0031 5.05312 10.3469 5.39687 10.7594 5.39687C11.1719 5.39687 11.55 5.05312 11.55 4.64062V2.23437C11.55 2.16562 11.5844 2.13124 11.6531 2.13124H15.5375C16.3625 2.13124 17.0156 2.78437 17.0156 3.60937V18.3562C17.0156 19.1812 16.3625 19.8344 15.5375 19.8344H11.6531C11.5844 19.8344 11.55 19.8 11.55 19.7312V17.3594C11.55 16.9469 11.2062 16.6031 10.7594 16.6031C10.3125 16.6031 10.0031 16.9469 10.0031 17.3594V19.7312C10.0031 20.625 10.7594 21.3812 11.6531 21.3812H15.5375C17.2219 21.3812 18.5625 20.0062 18.5625 18.3562V3.64374C18.5625 1.95937 17.1875 0.618744 15.5375 0.618744Z"
                fill=""
              />
              <path
                d="M6.05001 11.7563H12.2031C12.6156 11.7563 12.9594 11.4125 12.9594 11C12.9594 10.5875 12.6156 10.2438 12.2031 10.2438H6.08439L8.21564 8.07813C8.52501 7.76875 8.52501 7.2875 8.21564 6.97812C7.90626 6.66875 7.42501 6.66875 7.11564 6.97812L3.67814 10.4844C3.36876 10.7938 3.36876 11.275 3.67814 11.5844L7.11564 15.0906C7.25314 15.2281 7.45939 15.3312 7.66564 15.3312C7.87189 15.3312 8.04376 15.2625 8.21564 15.125C8.52501 14.8156 8.52501 14.3344 8.21564 14.025L6.05001 11.7563Z"
                fill=""
              />
            </svg>
            Log Out
          </button>
        </ThemedGlassmorphismPanel>
      )}
      {/* <!-- Dropdown End --> */}

      {themeSheetOpen && (
        <ThemedThemingSheet isOpen={themeSheetOpen} onClose={() => setThemeSheetOpen(false)} />
      )}
    </ClickOutside>
  );
};

export default DropdownUser;
