import React from "react";
import { useLocation } from "react-router-dom";
import { PATHS } from "../utils/constants";
import { useSelector } from "react-redux";
import { headerButtonColor } from "../assets/tailwindConstants";
import { FiMenu, FiX } from "react-icons/fi";

const Header = ({ onMenuClick, rightContent, isMenuOpen }) => {
  const location = useLocation();
  const { company_name } = useSelector((state) => state.chartConfig);

  // Map routes to page titles
  const getPageTitle = () => {
    switch (location.pathname) {
      case PATHS.HOME:
        return `${company_name} Schedule`;
      case PATHS.MANAGE:
        return "Manage Settings";
      case PATHS.COMPLETED:
        return "Completed Projects";
      case PATHS.ESTIMATES:
        return "Estimates";
      default:
        return "";
    }
  };

  return (
    <header className="h-[50px] bg-slate-900 print:bg-white fixed top-0 left-0 right-0 z-30 flex items-center print:justify-center">
      {/* Left section with menu button */}
      <button
        onClick={onMenuClick}
        className={`h-[50px] w-[50px] flex items-center justify-center ${headerButtonColor} border-r border-slate-200 print:hidden`}
        aria-label="Menu"
      >
        {isMenuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
      </button>

      {/* Title section */}
      <h1 className="ml-4 text-xl font-semibold text-slate-300 print:text-gray-800">
        {getPageTitle()}
      </h1>

      {/* Right section for action buttons */}
      <div className="ml-auto flex items-center pr-4">{rightContent}</div>
    </header>
  );
};

export default Header;
