import React, { forwardRef, useState, useImperativeHandle, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';

import { fetchTeamMembers, fetchUserRoles, updateTeamMembers } from '../../redux/actions/teamMembers';
import { supabase } from '../../utils/supabase';
import ErrorModal from '../common/ErrorModal.jsx';

import TeamMemberRow from './TeamMemberRow.jsx';


const TeamSettings = forwardRef((props, ref) => {
  const dispatch = useDispatch();
  const teamId = useSelector((state) => state.auth.teamId);
  const { teamMembers, userRoles, loading, error } = useSelector((state) => state.teamMembers);
  const [localTeamMembers, setLocalTeamMembers] = useState([]);
  const [originalTeamMembers, setOriginalTeamMembers] = useState([]); // Store original state
  const [adminError, setAdminError] = useState(null);

  // Get all possible permissions from the first role's permissions object
  const permissionTypes = userRoles?.[0]?.permissions 
    ? Object.keys(userRoles[0].permissions)
    : [];

  // Helper to check if a role has admin privileges and no overrides
  const isAdminRole = (roleId, customPermissions = {}) => {
    const role = userRoles?.find(r => r.role_id === Number(roleId));
    // Check if role has admin permission
    const hasAdminRole = role?.permissions?.can_manage_teams === true;
    // For admin roles, ensure there are NO custom permission overrides at all
    const hasNoOverrides = hasAdminRole ? Object.keys(customPermissions).length === 0 : true;
    return hasAdminRole && hasNoOverrides;
  };

  const handleAdminErrorClose = () => {
    setAdminError(null);
  };

  // Expose save and cancel methods to parent
  useImperativeHandle(ref, () => ({
    handleSave: async () => {
      try {
        // Check if save would remove all admins
        const hasAdmin = localTeamMembers.some(member => 
          isAdminRole(member.role_id, member.custom_permissions)
        );
        if (!hasAdmin) {
          setAdminError("Cannot save changes. At least one team member must have admin privileges with no permission overrides.");
          return;
        }

        // Find changed members
        const changedMembers = localTeamMembers.map(member => {
          const originalMember = originalTeamMembers.find(m => m.team_member_id === member.team_member_id);
          const permissionsChanged = JSON.stringify(member.custom_permissions) !== JSON.stringify(originalMember?.custom_permissions);
          const roleChanged = member.role_id !== originalMember?.role_id;

          if (permissionsChanged || roleChanged) {
            return {
              team_member_id: member.team_member_id,
              role_id: member.role_id,
              custom_permissions: member.custom_permissions
            };
          }
          return null;
        }).filter(Boolean);

        if (changedMembers.length > 0) {
          await updateTeamMembers(dispatch, changedMembers);
          await fetchTeamMembers(dispatch, teamId);
          setOriginalTeamMembers(localTeamMembers);
        }
      } catch (error) {
        console.error('Error saving team member changes:', error);
        setAdminError('Failed to save changes. Please try again.');
      }
    },
    handleCancel: () => {
      setLocalTeamMembers(originalTeamMembers);
    }
  }));

  // Load user roles on mount
  useEffect(() => {
    fetchUserRoles(dispatch);
  }, [dispatch]);

  // Load team members when we have a teamId
  useEffect(() => {
    if (teamId) {
      fetchTeamMembers(dispatch, teamId);
    }
  }, [dispatch, teamId]);

  // Update local state when team members or roles change
  useEffect(() => {
    if (teamMembers && userRoles) {
      setLocalTeamMembers(teamMembers);
      setOriginalTeamMembers(teamMembers);
    }
  }, [teamMembers, userRoles]);

  const handlePermissionChange = (memberId, newPermissions) => {
    setLocalTeamMembers(members =>
      members.map(member =>
        member.team_member_id === memberId
          ? { ...member, custom_permissions: newPermissions }
          : member
      )
    );
  };

  const handleRoleChange = (memberId, newRoleId) => {
    setLocalTeamMembers(members =>
      members.map(member =>
        member.team_member_id === memberId
          ? { 
              ...member, 
              role_id: newRoleId,
              custom_permissions: {} // Clear custom permissions when role changes
            }
          : member
      )
    );
  };

  if (loading) return <div className="p-4">Loading team members...</div>;
  if (error) return <div className="p-4 text-red-500">Error: {error}</div>;

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4 text-slate-200">Manage Team Members</h2>
      
      <div className="bg-slate-700 p-4 rounded-lg shadow relative">
        {/* Fade out effect - moved outside the scroll container */}
        <div className="absolute right-4 top-4 bottom-4 w-16 bg-gradient-to-l from-slate-700 to-transparent pointer-events-none z-30"></div>
        
        <div className="overflow-x-auto w-full">
          <div className="grid auto-cols-fr" style={{ 
            gridTemplateColumns: `150px 150px ${permissionTypes.map(() => '150px').join(' ')}`,
            width: 'fit-content',
            minWidth: '100%'
          }}>
            {/* Header */}
            <div className="contents">
              <div className="sticky left-0 z-20 bg-slate-800 px-6 py-3 text-center text-xs font-medium text-slate-200 uppercase tracking-wider">
                Name
              </div>
              <div className="sticky left-[150px] z-20 bg-slate-800 px-6 py-3 text-center text-xs font-medium text-slate-200 uppercase tracking-wider">
                Role
              </div>
              {permissionTypes.map(permission => (
                <div 
                  key={permission}
                  className="bg-slate-800 px-6 py-3 text-center text-xs font-medium text-slate-200 uppercase tracking-wider"
                >
                  {permission.replace("can_", "").replace(/_/g, ' ')}
                </div>
              ))}
            </div>

            {/* Rows */}
            {localTeamMembers?.map(member => (
              <TeamMemberRow
                key={member.team_member_id}
                member={member}
                userRoles={userRoles}
                permissionTypes={permissionTypes}
                onPermissionChange={handlePermissionChange}
                onRoleChange={handleRoleChange}
              />
            ))}
          </div>
        </div>
      </div>

      <ErrorModal 
        message={adminError} 
        onClose={handleAdminErrorClose}
      />
    </div>
  );
});

TeamSettings.displayName = 'TeamSettings';

export default TeamSettings;
