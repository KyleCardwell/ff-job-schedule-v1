// src/hooks/usePermissions.js
import { useSelector } from "react-redux";

export const usePermissions = () => {
  const roleId = useSelector((state) => state.auth.roleId);
  const permissions = useSelector((state) => state.auth.permissions);

  return {
    canEditProjects: roleId === 1 || permissions?.can_edit_projects,
    canViewProjects: true, // Everyone can view
    isAdmin: roleId === 1,
    canDelete: permissions?.can_delete,
    canManageTeams: permissions?.can_manage_teams,
    canEditSchedule: permissions?.can_edit_schedule,
    canEditFinancials: permissions?.can_edit_financials,
    canViewProfitLoss: permissions?.can_view_profit_loss,
    // Add more permission checks as needed
  };
};
