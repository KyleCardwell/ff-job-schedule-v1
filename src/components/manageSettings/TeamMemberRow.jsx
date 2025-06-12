import React, { useState, useEffect } from 'react';

const TeamMemberRow = ({ member, userRoles, permissionTypes, onPermissionChange }) => {
  const [localPermissions, setLocalPermissions] = useState(member.custom_permissions || {});
  const role = userRoles?.find(r => r.role_id === member.role_id);

  // Update local permissions when member data changes
  useEffect(() => {
    setLocalPermissions(member.custom_permissions || {});
  }, [member.custom_permissions]);

  const handlePermissionChange = (permission) => {
    const currentValue = localPermissions[permission];
    const rolePermission = role?.permissions?.[permission];
    const newValue = currentValue === undefined ? !rolePermission : !currentValue;
    
    // If the new value matches the role's permission, remove the override
    if (newValue === rolePermission) {
      const { [permission]: removed, ...restPermissions } = localPermissions;
      setLocalPermissions(restPermissions);
      onPermissionChange(member.team_member_id, restPermissions);
    } else {
      // Otherwise, set the override
      const newPermissions = {
        ...localPermissions,
        [permission]: newValue
      };
      setLocalPermissions(newPermissions);
      onPermissionChange(member.team_member_id, newPermissions);
    }
  };

  return (
    <tr className="bg-slate-600 hover:bg-slate-500 text-slate-200 hover:text-slate-900">
      <td className="px-6 py-4 whitespace-nowrap text-center">
        {member.user_name}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-center">
        {role?.role_name.replace("_", " ") || 'Unknown'}
      </td>
      {permissionTypes.map(permission => {
        const rolePermission = role?.permissions?.[permission];
        const customPermission = localPermissions[permission];
        const effectivePermission = customPermission === undefined ? rolePermission : customPermission;
        
        return (
          <td key={`${member.team_member_id}-${permission}`} className="px-6 py-4 whitespace-nowrap text-center">
            <div className="relative h-12 flex items-center justify-center">
              <input
                type="checkbox"
                className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                checked={effectivePermission || false}
                onChange={() => handlePermissionChange(permission)}
              />
              {customPermission !== undefined && (
                <span className="text-xs absolute top-9">
                  (Override)
                </span>
              )}
            </div>
          </td>
        );
      })}
    </tr>
  );
};

export default TeamMemberRow;
