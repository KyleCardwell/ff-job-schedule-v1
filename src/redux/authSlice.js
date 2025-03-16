import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  session: null,
  loading: true,
  teamId: null,
  teamName: null,
  roleId: null,
  permissions: null,
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUserTeam: (state, action) => {
      state.teamId = action.payload.teamId;
      state.teamName = action.payload.teamName;
      state.roleId = action.payload.roleId;
      state.permissions = action.payload.permissions;
    },
    setSession: (state, action) => {
      state.session = action.payload;
      state.loading = false;
    },
    clearSession: (state) => {
      state.session = null;
      state.loading = false;
    },
    clearAuth: (state) => {
      state.user = null;
      state.teamId = null;
      state.teamName = null;
      state.roleId = null;
      state.permissions = null;
    }
  },
});

export const { setSession, clearSession, setUser, setUserTeam, clearAuth } = authSlice.actions;
export default authSlice.reducer; 