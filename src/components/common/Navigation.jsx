import React from "react";
import {
  FiCalendar,
  FiUsers,
  FiCheckSquare,
  FiLogOut,
  FiDollarSign,
} from "react-icons/fi";
import { useSelector , useDispatch } from "react-redux";
import { NavLink, useNavigate } from "react-router-dom";



import { headerButtonColor } from "../../assets/tailwindConstants";
import useFeatureToggles from "../../hooks/useFeatureToggles";
import { clearAuth } from "../../redux/authSlice";
import { PATHS } from "../../utils/constants";
import { supabase } from "../../utils/supabase";

const Navigation = ({ isOpen, onClose }) => {
  const { enable_estimates } = useFeatureToggles();
  const { roleId, permissions } = useSelector((state) => state.auth);
  const canAccessManage =
    roleId === 1 || (permissions && permissions.can_manage_teams);
  const canCreateEstimates =
    roleId === 1 || (permissions && permissions.can_create_estimates);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const navItems = [
    ...(canAccessManage
      ? [{ icon: FiUsers, label: "Manage", path: PATHS.MANAGE }]
      : []),
    ...(canCreateEstimates && enable_estimates
      ? [{ icon: FiDollarSign, label: "Estimates", path: PATHS.ESTIMATES }]
      : []),
    { icon: FiCalendar, label: "Schedule", path: PATHS.HOME },
    { icon: FiCheckSquare, label: "Completed", path: PATHS.COMPLETED },
  ];

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) throw error;

      dispatch(clearAuth());
      navigate("/");
    } catch (error) {
      console.error("Error signing out:", error.message);
    }
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar Navigation */}
      <div
        className={`fixed top-[50px] left-0 h-[calc(100vh-50px)] w-64 bg-slate-900 shadow-lg z-20 transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } border-t border-slate-200`}
      >
        <nav className="py-4 space-y-2">
          {navItems.map(({ icon: Icon, label, path }) => (
            <NavLink
              key={path}
              to={path}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center px-6 py-3 transition-colors ${
                  isActive
                    ? "bg-slate-400 text-slate-900"
                    : "text-slate-300 hover:bg-slate-600 hover:text-slate-900"
                }`
              }
            >
              <Icon className="w-5 h-5 mr-3" />
              {label}
            </NavLink>
          ))}
          <button
            onClick={handleLogout}
            className={`flex items-center w-full px-6 py-3 ${headerButtonColor} transition-colors`}
          >
            <FiLogOut className="w-5 h-5 mr-3" />
            Logout
          </button>
        </nav>
      </div>
    </>
  );
};

export default Navigation;
