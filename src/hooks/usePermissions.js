// src/hooks/usePermissions.js
import { useSelector } from "react-redux";

export const usePermissions = () => {
  const roleId = useSelector((state) => state.auth.roleId);
  const permissions = useSelector((state) => state.auth.permissions);

  return {
    canEditProjects: roleId === 1 || permissions?.can_edit_projects === true,
    canViewProjects: true, // Everyone can view
    isAdmin: roleId === 1,
    // Add more permission checks as needed
  };
};
