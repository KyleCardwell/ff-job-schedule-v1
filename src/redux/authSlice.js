import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  session: null,
  loading: true,
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setSession: (state, action) => {
      state.session = action.payload;
      state.loading = false;
    },
    clearSession: (state) => {
      state.session = null;
      state.loading = false;
    },
  },
});

export const { setSession, clearSession } = authSlice.actions;
export default authSlice.reducer; 