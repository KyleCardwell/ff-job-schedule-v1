import React from 'react';
import { NavLink } from 'react-router-dom';
import { FiCalendar, FiUsers, FiCheckSquare, FiSettings, FiLogOut } from 'react-icons/fi';
import { PATHS } from '../utils/constants';
import { supabase } from '../utils/supabase';
import { useDispatch } from 'react-redux';
import { clearAuth } from '../redux/authSlice';
import { useNavigate } from 'react-router-dom';

const Navigation = ({ isOpen, onClose }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const navItems = [
    { icon: FiUsers, label: 'Manage', path: PATHS.MANAGE },
    { icon: FiCalendar, label: 'Schedule', path: PATHS.HOME },
    { icon: FiCheckSquare, label: 'Completed', path: PATHS.COMPLETED },
    { icon: FiSettings, label: 'Settings', path: PATHS.SETTINGS },
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
        className={`fixed top-[50px] left-0 h-[calc(100vh-50px)] w-64 bg-white shadow-lg z-20 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
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
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-blue-600'
                }`
              }
            >
              <Icon className="w-5 h-5 mr-3" />
              {label}
            </NavLink>
          ))}
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-6 py-3 text-gray-600 hover:bg-gray-50 hover:text-blue-600 transition-colors"
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
