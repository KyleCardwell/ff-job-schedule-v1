import React from 'react';
import { useLocation } from 'react-router-dom';
import { PATHS } from '../utils/constants';
import { useSelector } from 'react-redux';

const Header = ({ onMenuClick, rightContent }) => {
  const location = useLocation();
  const { company_name} = useSelector((state) => state.chartConfig);
  
  // Map routes to page titles
  const getPageTitle = () => {
    switch (location.pathname) {
      case PATHS.HOME:
        return `${company_name} Schedule`;
      case PATHS.MANAGE:
        return 'Manage Settings';
      case PATHS.COMPLETED:
        return 'Completed Projects';
      default:
        return '';
    }
  };

  return (
    <header className="h-[50px] bg-white border-b border-gray-200 fixed top-0 left-0 right-0 z-30 flex items-center print:justify-center">
      {/* Left section with menu button */}
      <button
        onClick={onMenuClick}
        className="h-[50px] w-[50px] flex items-center justify-center hover:bg-gray-100 border-r border-gray-200 print:hidden"
        aria-label="Menu"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Title section */}
      <h1 className="ml-4 text-xl font-semibold text-gray-800">{getPageTitle()}</h1>

      {/* Right section for action buttons */}
      <div className="ml-auto flex items-center pr-4">
        {rightContent}
      </div>
    </header>
  );
};

export default Header;
