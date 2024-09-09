
import RefuelingAnomaly from './RefuelingAnomaly';
import React, { useState, useEffect} from 'react'
import { supabase } from '../../../db/SupabaseClient'
import { Session } from '@supabase/supabase-js'; // Import Session type
const Operational = () => {
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
      <div className="title">
        <h2 className="mb-2 text-title-sm font-bold text-black dark:text-white w-full">
          Operational Management
        </h2>
      </div>
      <div className="content-container">
        <RefuelingAnomaly allowColumnsEdit={session != null} />
      </div>
    </div>
  );
};

export default Operational;
