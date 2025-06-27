import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { PATHS } from "../utils/constants";
import useFeatureToggles from "../hooks/useFeatureToggles";

const ProtectedRoute = ({ children }) => {
  const { roleId, permissions } = useSelector((state) => state.auth);
  const location = useLocation();
  const { enable_estimates } = useFeatureToggles();

  // Check if user has view profit/loss permission
  // PATHS.COMPLETED_PROJECT is "/completed/:projectId", so we check if the path starts with "/completed/"
  if (location.pathname.startsWith("/completed/")) {
    const canViewFinancials = roleId === 1 || permissions?.can_view_profit_loss;
    if (!canViewFinancials) {
      return <Navigate to={PATHS.COMPLETED} replace />;
    }
  }

  // Check if user has create estimates permission
  if (location.pathname.startsWith(PATHS.ESTIMATES)) {
    const canCreateEstimates =
      roleId === 1 || permissions?.can_create_estimates;
    if (!canCreateEstimates || !enable_estimates) {
      return <Navigate to={PATHS.HOME} replace />;
    }
  }

  // For manage routes, check specific permissions
  if (location.pathname.startsWith(PATHS.MANAGE)) {
    // Admin can access all routes
    if (roleId === 1) return children;

    // For base manage route or team management route
    if (
      location.pathname === PATHS.MANAGE ||
      location.pathname === PATHS.MANAGE_TEAM
    ) {
      return permissions?.can_manage_teams ? (
        children
      ) : (
        <Navigate to={PATHS.HOME} replace />
      );
    }

    // For other manage routes (employees, chart, holidays), only admin can access
    return <Navigate to={PATHS.HOME} replace />;
  }

  return children;
};

export default ProtectedRoute;
