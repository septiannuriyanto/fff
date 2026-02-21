import React, { ReactNode } from 'react';
import Header from '../components/Header/index';
import Sidebar from '../components/Sidebar/index';
import { useAuth } from '../pages/Authentication/AuthContext';
import { useLocation } from 'react-router-dom';
import Loader from '../common/Loader/Loader';
import { useTheme } from '../contexts/ThemeContext';
import UndoToast from '../common/UndoToast/UndoToast';

const DefaultLayout: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { authToken, currentUser, loading, preparing } = useAuth();
  const { activeTheme, showUndoToast, undoThemeChange, clearUndo } = useTheme();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const location = useLocation();
  const isLandingPage = location.pathname === '/';

  // Display a loading screen if:
  // 1. Initial auth state is still being determined (loading)
  // 2. We are performing a post-login preparation (preparing)
  // 3. We have an authToken but the currentUser is not yet available (safety check)
  if (loading || preparing || (authToken && !currentUser && !isLandingPage)) {
    return <Loader />;
  }

  // Determine active theme (priority: trial > applied)
  // Active theme is now resolved by context including dark mode mappings
  const activeBackground = activeTheme.background.type === 'gradient' 
    ? activeTheme.background.gradient 
    : activeTheme.background.color;

  // Sync dark mode based on theme base
  React.useEffect(() => {
    if (activeTheme.baseTheme === 'dark') {
      window.document.body.classList.add('dark');
    } else {
      window.document.body.classList.remove('dark');
    }
  }, [activeTheme.baseTheme]);

  return (
    <div 
      className="dark:bg-boxdark-2 dark:text-bodydark min-h-screen w-full transition-all duration-700 ease-in-out"
      style={!activeTheme.background.useSystem ? { background: activeBackground, backgroundSize: 'cover' } : {}}
    >
      {/* Undo Toast for Theme Changes */}
      {showUndoToast && (
        <UndoToast 
          message="Theme Applied" 
          onUndo={undoThemeChange} 
          onExpire={clearUndo} 
        />
      )}

      {/* Page Wrapper */}
      <div className="flex h-full overflow-visible">
        {/* Sidebar */}
        {authToken && currentUser?.role && !isLandingPage && (
          <Sidebar
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
            role={currentUser.role}
          />
        )}

        {/* Content Area */}
        <div className="relative flex flex-1 flex-col overflow-y-auto">
          {/* Header */}
          {authToken && !isLandingPage && (
            <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
          )}

          {/* Main Content */}
          <main className="w-full p-4 md:p-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};

export default DefaultLayout;
