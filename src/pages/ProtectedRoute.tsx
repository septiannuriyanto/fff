import { useEffect, useState, ReactNode } from 'react';
import { Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../db/SupabaseClient'; // Adjust the import path as necessary
import Loader from '../common/Loader'
import { Session } from '@supabase/supabase-js'; // Import Session type

interface ProtectedRouteProps {
  element: ReactNode;
}

const ProtectedRoute = ({ element }: ProtectedRouteProps) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const location = useLocation();

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
      } catch (error) {
        console.error('Error fetching session:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, []);

  if (loading) return <Loader />;

  return session ? (
    <>{element}</>
  ) : (
    <Navigate to="/auth/signin" state={{ from: location }} />
  );
};

export default ProtectedRoute;