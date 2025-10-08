import PropTypes from "prop-types";
import { useState, useRef, useMemo } from "react";
import { useSelector } from "react-redux";
import {
  useNavigate,
  useLocation,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import {
  headerButtonClass,
  headerButtonColor,
} from "../../assets/tailwindConstants";
import useFeatureToggles from "../../hooks/useFeatureToggles.js";
import { PATHS } from "../../utils/constants";
import CabinetStyleSettings from "../manageSettings/CabinetStyleSettings.jsx";
import CabinetTypeSettings from "../manageSettings/CabinetTypeSettings.jsx";
import EmployeeSettings from "../manageSettings/EmployeeSettings.jsx";
import HardwareSettings from "../manageSettings/HardwareSettings.jsx";
import HolidaySettings from "../manageSettings/HolidaySettings.jsx";
import ManageChartSettings from "../manageSettings/ManageChartSettings.jsx";
import MaterialsSettings from "../manageSettings/MaterialsSettings.jsx";
import ServiceSettings from "../manageSettings/ServiceSettings.jsx";
import TeamSettings from "../manageSettings/TeamSettings.jsx";

// Wrapper component to handle ref forwarding
const SettingsWrapper = ({ component: Component, componentRef, ...props }) => {
  return <Component ref={componentRef} {...props} />;
};

const AdminDashboard = () => {
  const [isSaving, setIsSaving] = useState(false);
  const activeComponentRef = useRef();
  const navigate = useNavigate();
  const location = useLocation();

  const { dayWidth, workday_hours: workdayHours } = useSelector(
    (state) => state.chartConfig
  );
  const { roleId, permissions } = useSelector((state) => state.auth);
  const featureToggles = useFeatureToggles();

  // Define all possible tabs
  const allTabs = [
    {
      id: "services",
      label: "Services",
      path: PATHS.MANAGE_SERVICES,
      component: ServiceSettings,
      props: {},
      requiresAdmin: true,
      maxWidthClass: "max-w-[720px]",
    },
    {
      id: "employees",
      label: "Employees",
      path: PATHS.MANAGE_EMPLOYEES,
      component: EmployeeSettings,
      props: { workdayHours, dayWidth },
      requiresAdmin: true,
      maxWidthClass: "max-w-[720px]",
    },
    {
      id: "team",
      label: "Team",
      path: PATHS.MANAGE_TEAM,
      component: TeamSettings,
      props: {},
      requiresAdmin: true,
      requiresPermission: "can_manage_teams",
      maxWidthClass: "max-w-[1000px]",
    },
    {
      id: "chart",
      label: "Chart",
      path: PATHS.MANAGE_CHART,
      component: ManageChartSettings,
      props: {},
      requiresAdmin: true,
      maxWidthClass: "max-w-[720px]",
    },
    {
      id: "holidays",
      label: "Holidays",
      path: PATHS.MANAGE_HOLIDAYS,
      component: HolidaySettings,
      props: { workdayHours, dayWidth },
      requiresAdmin: true,
      maxWidthClass: "max-w-[720px]",
    },
    {
      id: "cabinet-types",
      label: "Cabinet Types",
      path: PATHS.MANAGE_CABINET_TYPES,
      component: CabinetTypeSettings,
      props: {},
      requiresAdmin: true,
      requiresFeatureToggle: "enable_estimates",
      maxWidthClass: "max-w-[720px]",
    },
    {
      id: "cabinet-styles",
      label: "Cabinet Styles",
      path: PATHS.MANAGE_CABINET_STYLES,
      component: CabinetStyleSettings,
      props: {},
      requiresAdmin: true,
      requiresFeatureToggle: "enable_estimates",
      maxWidthClass: "max-w-[720px]",
    },
    {
      id: "materials",
      label: "Materials",
      path: PATHS.MANAGE_MATERIALS,
      component: MaterialsSettings,
      props: {},
      requiresAdmin: true,
      requiresFeatureToggle: "enable_estimates",
      maxWidthClass: "max-w-[1200px]",
    },
    {
      id: "hardware",
      label: "Hardware",
      path: PATHS.MANAGE_HARDWARE,
      component: HardwareSettings,
      props: {},
      requiresAdmin: true,
      requiresFeatureToggle: "enable_estimates",
      maxWidthClass: "max-w-[720px]",
    },
  ];

  // Filter tabs based on permissions and feature toggles
  const tabs = useMemo(() => {
    return allTabs.filter((tab) => {
      // 1. Check for feature toggle first
      if (
        tab.requiresFeatureToggle &&
        !featureToggles[tab.requiresFeatureToggle]
      ) {
        return false;
      }

      // 2. Check for admin-only tabs
      if (tab.requiresAdmin && roleId !== 1) {
        return false;
      }

      // 3. Check for specific permissions (for non-admins)
      if (
        roleId !== 1 &&
        tab.requiresPermission &&
        !permissions.includes(tab.requiresPermission)
      ) {
        return false;
      }

      // If all checks pass, show the tab
      return true;
    });
  }, [roleId, permissions, featureToggles]);

  const handleSave = async () => {
    if (!activeComponentRef.current?.handleSave) return;

    setIsSaving(true);
    try {
      await activeComponentRef.current.handleSave();
    } catch (error) {
      console.error("Error saving:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (activeComponentRef.current?.handleCancel) {
      activeComponentRef.current.handleCancel();
    }
  };

  const getCurrentTab = () => {
    const path = location.pathname;
    return tabs.find((tab) => path.includes(tab.id))?.id || "employees";
  };

  return (
    <div className="flex h-full bg-slate-800">
      {/* Sidebar Navigation */}
      <div className="w-64 flex-none bg-slate-900 border-t border-slate-200">
        <nav className="flex flex-col py-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              className={`
                py-3 px-4 text-sm font-medium text-left flex items-center space-x-2
                ${
                  getCurrentTab() === tab.id
                    ? "bg-slate-800 text-teal-200 border-l-2 border-teal-200"
                    : "text-slate-200 hover:bg-slate-700 hover:text-teal-400"
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header with Save/Cancel */}
        <div className="fixed right-0 top-0 h-[50px] z-30 flex print:hidden">
          <button
            className={`${headerButtonClass} ${headerButtonColor}`}
            onClick={handleCancel}
          >
            Cancel
          </button>
          <button
            className={`${headerButtonClass} ${headerButtonColor}`}
            onClick={handleSave}
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-auto">
          <div className="flex justify-center">
            <div
              className={`w-full ${
                tabs.find((tab) => tab.id === getCurrentTab())?.maxWidthClass ||
                "max-w-[720px]"
              }`}
            >
              <Routes>
                <Route
                  path="/"
                  element={<Navigate to={tabs[0]?.path || "/"} replace />}
                />
                {tabs.map(({ id, path, component, props }) => (
                  <Route
                    key={id}
                    path={path.replace("/manage", "")}
                    element={
                      <SettingsWrapper
                        component={component}
                        componentRef={activeComponentRef}
                        {...props}
                      />
                    }
                  />
                ))}
              </Routes>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

SettingsWrapper.propTypes = {
  component: PropTypes.elementType,
  componentRef: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.shape({ current: PropTypes.any }),
  ]),
};

export default AdminDashboard;
