import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  session: null,
  loading: false,
  error: null,
  teamId: null,
  teamName: null,
  teamMemberId: null,
  userName: null,
  roleId: null,
  permissions: null,
};

const authSlice = createSlice({
  name: "auth",
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
      state.teamMemberId = action.payload.teamMemberId;
      state.userName = action.payload.userName;
      state.roleId = action.payload.roleId;
      state.permissions = {
        ...action.payload.permissions,
        ...action.payload.customPermissions,
      };
      state.error = null;
    },
    setUserProfile: (state, action) => {
      state.userName = action.payload.userName;
    },
    setError: (state, action) => {
      state.error = action.payload;
      state.loading = false;
    },
    clearAuth: () => {
      return { ...initialState, loading: false };
    },
  },
});

export const {
  setLoading,
  setSession,
  setUserTeam,
  setUserProfile,
  setError,
  clearAuth,
} =
  authSlice.actions;

export default authSlice.reducer;
