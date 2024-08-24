// src/store/sessionSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AuthSession } from '@supabase/supabase-js';

interface SessionState {
  session: AuthSession | null;
}

const initialState: SessionState = {
  session: null,
};

const sessionSlice = createSlice({
  name: 'session',
  initialState,
  reducers: {
    setSession(state, action: PayloadAction<AuthSession | null>) {
      state.session = action.payload;
    },
    clearSession(state) {
      state.session = null;
    },
  },
});

export const { setSession, clearSession } = sessionSlice.actions;

export default sessionSlice.reducer;
