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
import AccessoriesSettings from "../manageSettings/AccessoriesSettings.jsx";
import CabinetStyleSettings from "../manageSettings/CabinetStyleSettings.jsx";
import CabinetTypeSettings from "../manageSettings/CabinetTypeSettings.jsx";
import EmployeeSettings from "../manageSettings/EmployeeSettings.jsx";
import FinishSettings from "../manageSettings/FinishSettings.jsx";
import HardwareSettings from "../manageSettings/HardwareSettings.jsx";
import HolidaySettings from "../manageSettings/HolidaySettings.jsx";
import LengthsSettings from "../manageSettings/LengthsSettings.jsx";
import ManageChartSettings from "../manageSettings/ManageChartSettings.jsx";
import MaterialsSettings from "../manageSettings/MaterialsSettings.jsx";
import PartsListSettings from "../manageSettings/PartsListSettings.jsx";
import ServiceSettings from "../manageSettings/ServiceSettings.jsx";
import TeamEstimateDefaultsSettings from "../manageSettings/TeamEstimateDefaultsSettings.jsx";
import TeamSettings from "../manageSettings/TeamSettings.jsx";

// Wrapper component to handle ref forwarding
const SettingsWrapper = ({ component: Component, componentRef, ...props }) => {
  // Only pass ref if the component actually needs it (class components or forwardRef components)
  // For functional components without forwardRef, just pass props
  return componentRef ? <Component ref={componentRef} {...props} /> : <Component {...props} />;
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
      props: {maxWidthClass: "max-w-[720px]"},
      requiresAdmin: true,
    },
    {
      id: "employees",
      label: "Employees",
      path: PATHS.MANAGE_EMPLOYEES,
      component: EmployeeSettings,
      props: { workdayHours, dayWidth, maxWidthClass: "max-w-[720px]" },
      requiresAdmin: true,
    },
    {
      id: "team",
      label: "Team",
      path: PATHS.MANAGE_TEAM,
      component: TeamSettings,
      props: {maxWidthClass: "max-w-[1000px]"},
      requiresAdmin: true,
      requiresPermission: "can_manage_teams",
    },
    {
      id: "chart",
      label: "Chart",
      path: PATHS.MANAGE_CHART,
      component: ManageChartSettings,
      props: {maxWidthClass: "max-w-[720px]"},
      requiresAdmin: true,
    },
    {
      id: "holidays",
      label: "Holidays",
      path: PATHS.MANAGE_HOLIDAYS,
      component: HolidaySettings,
      props: { workdayHours, dayWidth, maxWidthClass: "max-w-[720px]" },
      requiresAdmin: true,
    },
    {
      id: "cabinet-types",
      label: "Cabinet Default Dimensions",
      path: PATHS.MANAGE_CABINET_TYPES,
      component: CabinetTypeSettings,
      props: {maxWidthClass: "max-w-[720px]"},
      requiresAdmin: true,
      requiresFeatureToggle: "enable_estimates",
    },
    {
      id: "cabinet-styles",
      label: "Cabinet Style Reveals",
      path: PATHS.MANAGE_CABINET_STYLES,
      component: CabinetStyleSettings,
      props: {maxWidthClass: "max-w-[720px]"},
      requiresAdmin: true,
      requiresFeatureToggle: "enable_estimates",
    },
    {
      id: "parts-list",
      label: "Parts Time",
      path: PATHS.MANAGE_PARTS_LIST,
      component: PartsListSettings,
      props: {maxWidthClass: "max-w-[1000px]"},
      requiresAdmin: true,
      requiresFeatureToggle: "enable_estimates",
    },
    {
      id: "materials",
      label: "Materials",
      path: PATHS.MANAGE_MATERIALS,
      component: MaterialsSettings,
      props: {maxWidthClass: "max-w-[1200px]"},
      requiresAdmin: true,
      requiresFeatureToggle: "enable_estimates",
    },
    {
      id: "finishes",
      label: "Finishes",
      path: PATHS.MANAGE_FINISHES,
      component: FinishSettings,
      props: {maxWidthClass: "max-w-[720px]"},
      requiresAdmin: true,
      requiresFeatureToggle: "enable_estimates",
    },
    {
      id: "hardware",
      label: "Hardware",
      path: PATHS.MANAGE_HARDWARE,
      component: HardwareSettings,
      props: {maxWidthClass: "max-w-[1080px]"},
      requiresAdmin: true,
      requiresFeatureToggle: "enable_estimates",
    },
    {
      id: "accessories",
      label: "Accessories",
      path: PATHS.MANAGE_ACCESSORIES,
      component: AccessoriesSettings,
      props: {maxWidthClass: "max-w-[1100px]"},
      requiresAdmin: true,
      requiresFeatureToggle: "enable_estimates",
    },
    {
      id: "lengths",
      label: "Lengths",
      path: PATHS.MANAGE_LENGTHS,
      component: LengthsSettings,
      props: {maxWidthClass: "max-w-[1100px]"},
      requiresAdmin: true,
      requiresFeatureToggle: "enable_estimates",
    },
    {
      id: "estimate-defaults",
      label: "Estimate Defaults",
      path: PATHS.MANAGE_TEAM_ESTIMATE_DEFAULTS,
      component: TeamEstimateDefaultsSettings,
      props: {maxWidthClass: "max-w-4xl"},
      requiresAdmin: true,
      requiresFeatureToggle: "enable_estimates",
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
              // className={`w-full ${
              //   tabs.find((tab) => tab.id === getCurrentTab())?.maxWidthClass ||
              //   "max-w-[720px]"
              // }`}
              className="w-full"
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
