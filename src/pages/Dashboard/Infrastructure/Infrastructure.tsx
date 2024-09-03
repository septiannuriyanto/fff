import React, { useState, useEffect} from 'react'
import PressurelessSummary from './PressurelessSummary'
import { supabase } from '../../../db/SupabaseClient'
import { useSelector } from 'react-redux';
import { RootState } from '../../../store'; // Adjust import based on your store setup
import { Session } from '@supabase/supabase-js'; // Import Session type
import FilterChange from './FilterChange';


const Infrastructure = () => {
  const [session, setSession] = useState<Session | null>(null);
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
      } catch (error) {
        console.error('Error fetching session:', error);
      }
    };

    fetchSession();
  }, []);
  return (
    <div>
      <h2 className="mb-2 text-title-sm font-bold text-black dark:text-white w-full">
                Infrastructure Management
              </h2>
      <PressurelessSummary allowColumnsEdit={session==null}/>
      <FilterChange></FilterChange>
    </div>
  )
}

export default Infrastructure
