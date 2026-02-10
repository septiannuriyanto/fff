// types.ts
export interface User {
  id: string;
  nrp: string;
  email: string | null;  // Adjust to match Supabase User
  role: string | null;
  position: number | null;
}

