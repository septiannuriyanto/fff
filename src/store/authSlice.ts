// sessionSlice.js
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { User } from '../types/User';


interface AuthState {
  user: User | null; // Adjust type to match your User type
  session: string | null; // Adjust type to match the Supabase session
}

const initialState: AuthState = {
  user: null,
  session: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuthState: (state, action: PayloadAction<{ user: any; session: any }>) => {
      state.user = action.payload.user;
      state.session = action.payload.session;
    },
    clearAuthState: (state) => {
      state.user = null;
      state.session = null;
    },
  },
});

export const { setAuthState, clearAuthState } = authSlice.actions;
export default authSlice.reducer;
