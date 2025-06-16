import React, { forwardRef, useState, useImperativeHandle, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { supabase } from '../../utils/supabase';
import { fetchTeamMembers, fetchUserRoles } from '../../redux/actions/teamMembers';
import TeamMemberRow from './TeamMemberRow';

const TeamSettings = forwardRef((props, ref) => {
  const dispatch = useDispatch();
  const teamId = useSelector((state) => state.auth.teamId);
  const { teamMembers, userRoles, loading, error } = useSelector((state) => state.teamMembers);
  const [localTeamMembers, setLocalTeamMembers] = useState([]);
  const [originalTeamMembers, setOriginalTeamMembers] = useState([]); // Store original state

  // Get all possible permissions from the first role's permissions object
  const permissionTypes = userRoles?.[0]?.permissions 
    ? Object.keys(userRoles[0].permissions)
    : [];

  // Expose save and cancel methods to parent
  useImperativeHandle(ref, () => ({
    handleSave: async () => {
      try {
        const promises = localTeamMembers.map(member => {
          if (JSON.stringify(member.custom_permissions) !== JSON.stringify(
            originalTeamMembers.find(m => m.team_member_id === member.team_member_id)?.custom_permissions
          )) {
            return supabase
              .from('team_members')
              .update({ custom_permissions: member.custom_permissions })
              .eq('team_member_id', member.team_member_id);
          }
          return Promise.resolve();
        });

        await Promise.all(promises);
        fetchTeamMembers(dispatch, teamId); // Refresh the data
        setOriginalTeamMembers(localTeamMembers); // Update original state after successful save
      } catch (error) {
        console.error('Error saving permissions:', error);
      }
    },
    handleCancel: () => {
      // Reset to original state
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
      setOriginalTeamMembers(teamMembers); // Store original state
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
    const newRole = userRoles?.find(r => r.role_id === newRoleId);
    
    setLocalTeamMembers(members =>
      members.map(member =>
        member.team_member_id === memberId
          ? { 
              ...member, 
              role_id: newRoleId,
              // Clear custom_permissions so role's permissions take effect
              custom_permissions: {} 
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
      
      <div className="bg-slate-700 p-4 rounded-lg shadow">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-800">
              <tr>
                <th className="px-6 py-3 text-center text-xs font-medium text-slate-200 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-slate-200 uppercase tracking-wider">
                  Role
                </th>
                {permissionTypes.map(permission => (
                  <th 
                    key={permission}
                    className="px-6 py-3 text-center text-xs font-medium text-slate-200 uppercase tracking-wider"
                  >
                    {permission.replace("can_", "").replace(/_/g, ' ')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
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
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
});

export default TeamSettings;
