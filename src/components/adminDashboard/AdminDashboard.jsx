import React, { useState, useRef, useEffect } from "react";
import { useSelector } from "react-redux";
import {
  FiHome,
  FiUsers,
  FiCalendar,
  FiSettings,
  FiBarChart2,
} from "react-icons/fi";
import ProjectSearchFilter from "../ProjectSearchFilter";
import ManageChartSettings from "../manageSettings/ManageChartSettings";
import EmployeeSettings from "../manageSettings/EmployeeSettings";
import HolidaySettings from "../manageSettings/HolidaySettings";
import {
  headerButtonClass,
  headerButtonColor,
  sectionButtonColor,
} from "../../assets/tailwindConstants";
import Holidays from "date-holidays";

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState("employees");
  const [isSaving, setIsSaving] = useState(false);
  const [holidayChecker, setHolidayChecker] = useState(null);
  const activeComponentRef = useRef();

  const workdayHours = useSelector((state) => state.chartConfig.workdayHours);
  const holidays = useSelector((state) => state.holidays);
  const dayWidth = useSelector((state) => state.chartConfig.dayWidth);
  const chartStartDate = useSelector((state) => state.chartData.chartStartDate);

  useEffect(() => {
    const hd = new Holidays("US");
    setHolidayChecker(hd);
  }, []);

  const tabs = [
    { id: "employees", label: "Employees", component: EmployeeSettings },
    { id: "chart", label: "Chart", component: ManageChartSettings },
    { id: "holidays", label: "Holidays", component: HolidaySettings },
  ];

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

  const ActiveComponent =
    tabs.find((tab) => tab.id === activeTab)?.component || ManageChartSettings;
  const extraProps =
    ActiveComponent === HolidaySettings || ActiveComponent === EmployeeSettings
      ? {
          workdayHours,
          holidayChecker,
          dayWidth,
          holidays,
        }
      : {};

  return (
    <div className="flex h-full bg-slate-800">
      {/* Sidebar Navigation */}
      <div className="w-48 flex-none bg-slate-900 border-t border-slate-200">
        <nav className="flex flex-col py-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                py-3 px-4 text-sm font-medium text-left flex items-center space-x-2
                ${
                  activeTab === tab.id
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
          <div className="fixed right-0 top-0 h-[50px] z-[100] flex print:hidden">
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
               {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-auto">
          <div className="flex justify-center">
            <div className="w-full max-w-[720px]">
              <ActiveComponent ref={activeComponentRef} {...extraProps} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
