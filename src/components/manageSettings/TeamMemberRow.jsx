import React from "react";

const TeamMemberRow = ({
  member,
  userRoles,
  permissionTypes,
  onPermissionChange,
  onRoleChange,
}) => {
  const role = userRoles?.find((r) => r.role_id === +member.role_id);

  // Pre-compute permission states
  const permissionStates = permissionTypes.map(permission => {
    const rolePermission = role?.permissions?.[permission];
    const customPermission = member.custom_permissions[permission];
    const effectivePermission = customPermission === undefined ? rolePermission : customPermission;
    const isOverridden = customPermission !== undefined;

    return {
      permission,
      rolePermission,
      customPermission,
      effectivePermission,
      isOverridden
    };
  });

  const handleRoleChange = (event) => {
    onRoleChange(member.team_member_id, event.target.value);
  };

  const handlePermissionChange = (permission) => {
    const state = permissionStates.find(p => p.permission === permission);
    const newValue = !state.effectivePermission;

    // If the new value matches the role's permission, remove the override
    if (newValue === state.rolePermission) {
      const newPermissions = { ...member.custom_permissions };
      delete newPermissions[permission];
      onPermissionChange(member.team_member_id, newPermissions);
    } else {
      // Otherwise, set the override
      onPermissionChange(member.team_member_id, {
        ...member.custom_permissions,
        [permission]: newValue,
      });
    }
  };

  return (
    <div className="contents group">
      <div className="sticky left-0 z-10 bg-slate-600 group-hover:bg-slate-500 px-6 py-4 whitespace-nowrap text-center text-slate-200 group-hover:text-slate-900 flex items-center justify-center">
        {member.user_name}
      </div>
      <div className="sticky left-[150px] z-10 bg-slate-600 group-hover:bg-slate-500 px-6 py-4 whitespace-nowrap text-center text-slate-200 group-hover:text-slate-900 flex items-center justify-center">
        <select
          value={member.role_id || ""}
          onChange={handleRoleChange}
          className="w-full bg-slate-700 text-slate-200 border border-slate-500 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="" disabled>
            Select Role
          </option>
          {userRoles?.map((r) => (
            <option key={r.role_id} value={r.role_id}>
              {r.role_name.replace("_", " ")}
            </option>
          ))}
        </select>
      </div>
      {permissionStates.map(({ permission, effectivePermission, isOverridden }) => (
        <div
          key={`${member.team_member_id}-${permission}`}
          className="bg-slate-600 group-hover:bg-slate-500 px-6 py-4 whitespace-nowrap text-center text-slate-200 group-hover:text-slate-900 flex items-center justify-center"
        >
          <div className="relative h-12 flex items-center justify-center">
            <input
              type="checkbox"
              className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
              checked={effectivePermission || false}
              onChange={() => handlePermissionChange(permission)}
            />
            {isOverridden && (
              <span className="text-xs absolute top-9">(Override)</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default TeamMemberRow;
