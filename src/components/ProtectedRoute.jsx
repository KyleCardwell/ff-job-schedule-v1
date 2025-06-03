import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { PATHS } from "../utils/constants";

const ProtectedRoute = ({ children }) => {
  const { roleId, permissions } = useSelector((state) => state.auth);
  const location = useLocation();

  // Check if user has view profit/loss permission
  // PATHS.COMPLETED_PROJECT is "/completed/:projectId", so we check if the path starts with "/completed/"
  if (location.pathname.startsWith("/completed/")) {
    const canViewFinancials = roleId === 1 || permissions?.can_view_profit_loss;
    if (!canViewFinancials) {
      return <Navigate to={PATHS.COMPLETED} replace />;
    }
  }

  // Check if user has manage permissions
  const canAccessManage = roleId === 1 || permissions?.can_manage_teams;
  if (!canAccessManage) {
    return <Navigate to={PATHS.HOME} replace />;
  }

  return children;
};

export default ProtectedRoute;
