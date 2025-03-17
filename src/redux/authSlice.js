import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  session: null,
  loading: false,
  error: null,
  teamId: null,
  teamName: null,
  roleId: null,
  permissions: null
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setSession: (state, action) => {
      state.session = action.payload;
      state.loading = false;
      state.error = null;
    },
    setUserTeam: (state, action) => {
      state.teamId = action.payload.teamId;
      state.teamName = action.payload.teamName;
      state.roleId = action.payload.roleId;
      state.permissions = action.payload.permissions;
      state.error = null;
    },
    setError: (state, action) => {
      state.error = action.payload;
      state.loading = false;
    },
    clearAuth: (state) => {
      return { ...initialState, loading: false };
    }
  }
});

export const {
  setLoading,
  setSession,
  setUserTeam,
  setError,
  clearAuth
} = authSlice.actions;

export default authSlice.reducer;