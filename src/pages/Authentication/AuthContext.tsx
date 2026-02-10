import { createContext, PropsWithChildren, useContext, useEffect, useState } from "react";
import { User } from "../../types/User";
import { User as SupabaseUser } from "@supabase/supabase-js";
import { supabase } from "../../db/SupabaseClient";
import toast from "react-hot-toast";
import Loader from "../../common/Loader/Loader";
import { AuthContextType } from "../../types/authcontext";
import getRole from "../../functions/get.role";

// Create the AuthContext with default values
const AuthContext = createContext<AuthContextType | undefined>(undefined);

type AuthProviderProps = PropsWithChildren;

export default function AuthProvider({ children }: AuthProviderProps) {
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Helper to map Supabase user to local user type
  const mapSupabaseUserToLocalUser = (supabaseUser: SupabaseUser | null, nrp: string | null , role: string | null, position: number | null, dept: string | null): User | null => {
    if (!supabaseUser) return null;
    return {
      nrp: nrp!,
      id: supabaseUser.id,
      email: supabaseUser.email ?? null,
      role: role ?? null,
      position: position ?? null,
      dept: dept ?? null,
    };
  };

  // Fetch current session and user
  useEffect(() => {
    const getUser = async () => {
      try {
        setLoading(true); // Start loading
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error("Error fetching session:", error.message);
          throw error;
        }

        if (!data.session) {
          console.warn("Session is null. User is not authenticated.");
          setAuthToken(null);
          setCurrentUser(null);
          return;
        }

        const nrp = localStorage.getItem('nrp')
        if(!nrp){
          console.warn("AuthContext: NRP not found in localStorage");
          setAuthToken(data.session.access_token);
          setLoading(false);
          return;
        }
        const { role, position, dept } = await getRole({ nrp })

        setAuthToken(data.session.access_token);
        setCurrentUser(mapSupabaseUserToLocalUser(data.session.user, nrp, role, position, dept));
      } catch (err) {
        console.error("Unexpected error fetching session:", err);
        setAuthToken(null);
        setCurrentUser(null);
      } finally {
        setLoading(false); // End loading
      }
    };

    getUser();
  }, []);

  // Sign-in logic
  const signIn = async (email: string, password: string, nrp: string | null) => {
    try {
      // Sign in to Supabase authentication
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error(error.message);
        throw error;
      }

      const session = data.session;
      if (session) {
        setAuthToken(session.access_token);
      }

      if(!nrp){
        throw error;
      }

      const { role, position, dept } = await getRole({ nrp });
      localStorage.setItem('nrp', nrp!)
      setCurrentUser(mapSupabaseUserToLocalUser(data.user, nrp, role, position, dept));
      toast.success("Signed in successfully!");
    } catch (err) {
      console.error("Error during sign-in:", err);
      throw err;
    }
  };

  // Sign-out logic
  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Error during sign-out:", error.message);
        throw error;
      }
      setAuthToken(null);
      setCurrentUser(null);
      localStorage.removeItem('role')
      toast.success("Signed out successfully!");
    } catch (err) {
      console.error("Error during sign-out:", err);
      throw err;
    }
  };

  // Provide context values
  return (
    <AuthContext.Provider value={{ authToken, currentUser, signIn, signOut, loading }}>
      {loading ? (
        <Loader/>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}

// Hook to use authentication context
export function useAuth() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error("useAuth must be used inside of an AuthProvider");
  }

  return context;
}
