import { useEffect } from 'react';
import { useDispatch } from 'react-redux';

import { setSession, setUserTeam } from '../redux/authSlice';

const mockUser = {
  session: {
    user: {
      id: 'mock-user-id',
      email: 'test@example.com',
    },
    // Add other session properties if needed
  },
  teamId: 1,
  teamName: 'Mock Team',
  roleId: 1, // Admin role
  permissions: {
    can_edit_projects: true,
    can_delete: true,
    can_manage_teams: true,
    can_edit_schedule: true,
    can_edit_financials: true,
    can_view_profit_loss: true,
  },
  customPermissions: {},
};

const MockAuth = ({ children }) => {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(setSession(mockUser.session));
    dispatch(setUserTeam({
      teamId: mockUser.teamId,
      teamName: mockUser.teamName,
      roleId: mockUser.roleId,
      permissions: mockUser.permissions,
      customPermissions: mockUser.customPermissions,
    }));
  }, [dispatch]);

  return children;
};

export default MockAuth;
