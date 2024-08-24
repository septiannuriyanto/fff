// types.ts
export interface User {
  id: string;
  email: string | null;  // Adjust to match Supabase User
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}
