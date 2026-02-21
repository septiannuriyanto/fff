import { User } from "./User";

export interface AuthContextType {
  currentUser?: User | null;
  authToken?: string | null;
  signIn: (email: string, password: string, nrp: string | null) => Promise<void>;
  signOut: () => Promise<void>;
  loading: boolean;
  preparing: boolean;
}
