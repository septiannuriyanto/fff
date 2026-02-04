import React, { ReactNode, useEffect, useState } from 'react';
import Header from '../components/Header/index';
import Sidebar from '../components/Sidebar/index';
import { useAuth } from '../pages/Authentication/AuthContext';
import getRole from '../functions/get.role';
import { useLocation } from 'react-router-dom';

const DefaultLayout: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { authToken, loading } = useAuth(); // Directly access `authToken` and `loading`
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const location = useLocation();
  const isLandingPage = location.pathname === '/';

  const [stateRole, setStateRole] = useState<string | null>();


  const fetchRole = async()=>{
    const nrp = localStorage.getItem('nrp');
    if(nrp){
      const role = await getRole({ nrp });
      console.log(role);
      
      setStateRole(role!);
    }
   
  }

  useEffect(() => {
    
    fetchRole();

  }, []);

  // Display a loading screen if the authentication state is still being determined
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <span>Loading...</span>
      </div>
    );
  }

  return (
    <div className="dark:bg-boxdark-2 dark:text-bodydark">
      {/* Page Wrapper */}
      <div className="flex h-full overflow-hidden">
        {/* Sidebar */}
        {authToken && stateRole && (
          <Sidebar
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
            role={stateRole}
          />
        )}

        {/* Content Area */}
        <div className="relative flex flex-1 flex-col overflow-y-auto overflow-x-hidden">
          {/* Header */}
          {authToken && (
            <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
          )}

          {/* Main Content */}
          <main>
            <div className={`mx-auto max-w-full ${isLandingPage ? '' : 'p-4 md:p-6 2xl:p-2'}`}>
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default DefaultLayout;
