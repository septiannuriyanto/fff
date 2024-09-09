import React, { useEffect, useState, ReactNode } from 'react';
import Header from '../components/Header/index';
import Sidebar from '../components/Sidebar/index';
import { supabase } from '../db/SupabaseClient';
import { Session } from '@supabase/supabase-js'; // Import Session type

const DefaultLayout: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);

    useEffect(() => {
        // Function to fetch the session
        const fetchSession = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                setSession(session);
                console.log('Session:', session);
            } catch (error) {
                console.error('Error fetching session:', error);
            }
        };

        fetchSession();
    }, []); // Empty dependency array ensures this runs once on mount

    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="dark:bg-boxdark-2 dark:text-bodydark">
            {/* Page Wrapper Start */}
            <div className="flex h-screen overflow-hidden">
                {/* Sidebar */}
                {session && <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />}
                
                {/* Content Area */}
                <div className="relative flex flex-1 flex-col overflow-y-auto overflow-x-hidden">
                    {/* Header */}
                    {session && <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />}
                    
                    {/* Main Content */}
                    <main>
                        <div className="mx-auto max-w-full p-4 md:p-6 2xl:p-2">
                            {children}
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
};

export default DefaultLayout;
