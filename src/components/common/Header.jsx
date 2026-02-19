import PropTypes from "prop-types";
import { FiMenu, FiX } from "react-icons/fi";
import { useSelector } from "react-redux";
import { useLocation } from "react-router-dom";

import { headerButtonColor } from "../../assets/tailwindConstants";
import { PATHS } from "../../utils/constants";

const Header = ({ onMenuClick, rightContent, isMenuOpen }) => {
  const location = useLocation();
  const { company_name } = useSelector((state) => state.chartConfig);
  const currentEstimate = useSelector(
    (state) => state.estimates.currentEstimate,
  );

  // Map routes to page titles
  const getPageTitle = () => {
    const estimateProjectId = currentEstimate?.est_project_id
      ? String(currentEstimate.est_project_id)
      : null;
    const isEstimateDetailPath =
      estimateProjectId &&
      location.pathname.includes("/estimates") &&
      location.pathname.includes(estimateProjectId);
    const estimateTitleSuffix =
      isEstimateDetailPath && currentEstimate?.est_project_name
        ? ` - ${currentEstimate.est_project_name}`
        : "";

    if (location.pathname.includes("/preview")) {
      return `Estimate Preview${estimateTitleSuffix}`;
    }
    if (location.pathname.startsWith("/estimates")) {
      if (location.pathname.endsWith("/new")) {
        return `New Estimate${estimateTitleSuffix}`;
      }
      if (location.pathname.endsWith("/schedule")) {
        return `Estimate - Add to Schedule${estimateTitleSuffix}`;
      }
      if (isEstimateDetailPath) {
        return `Estimate${estimateTitleSuffix}`;
      }
      return "Estimates";
    }

    if (location.pathname.startsWith(PATHS.MANAGE)) {
      return "Manage Settings";
    }

    if (location.pathname.startsWith("/completed")) {
      return "Completed Projects";
    }

    switch (location.pathname) {
      case PATHS.HOME:
        return `${company_name} Schedule`;
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

Header.propTypes = {
  isMenuOpen: PropTypes.bool,
  onMenuClick: PropTypes.func,
  rightContent: PropTypes.node,
};

export default Header;
