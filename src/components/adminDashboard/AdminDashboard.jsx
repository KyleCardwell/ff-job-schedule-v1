import React, { useState, useRef, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { FiHome, FiUsers, FiCalendar, FiSettings, FiBarChart2 } from 'react-icons/fi';
import ProjectSearchFilter from '../ProjectSearchFilter';
import ManageChartSettings from '../manageSettings/ManageChartSettings';
import EmployeeSettings from '../manageSettings/EmployeeSettings';
import HolidaySettings from '../manageSettings/HolidaySettings';
import { headerButtonClass, sectionButtonColor } from '../../assets/tailwindConstants';
import Holidays from 'date-holidays';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('chart');
  const [isSaving, setIsSaving] = useState(false);
  const [holidayChecker, setHolidayChecker] = useState(null);
  const activeComponentRef = useRef();

  const workdayHours = useSelector((state) => state.chartConfig.workdayHours);
  const holidays = useSelector((state) => state.holidays);
  const dayWidth = useSelector((state) => state.chartConfig.dayWidth);
  const chartStartDate = useSelector((state) => state.chartData.chartStartDate);

  useEffect(() => {
    const hd = new Holidays('US');
    setHolidayChecker(hd);
  }, []);

  const tabs = [
    { id: 'chart', label: 'Chart', component: ManageChartSettings },
    { id: 'employees', label: 'Employees', component: EmployeeSettings },
    { id: 'holidays', label: 'Holidays', component: HolidaySettings },
  ];

  const handleSave = async () => {
    if (!activeComponentRef.current?.handleSave) return;
    
    setIsSaving(true);
    try {
      await activeComponentRef.current.handleSave();
    } catch (error) {
      console.error('Error saving:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (activeComponentRef.current?.handleCancel) {
      activeComponentRef.current.handleCancel();
    }
  };

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || ManageChartSettings;
  const extraProps = (ActiveComponent === HolidaySettings || ActiveComponent === EmployeeSettings) ? {
    workdayHours,
    holidayChecker,
    dayWidth,
    holidays,
  } : {};

  return (
    <div className="flex items-center bg-slate-800 h-full">
      {/* Main Content */}
      <div className="flex-1 h-full flex flex-col max-w-[1000px] mx-auto">
        <div className="px-8 flex-none">
          {/* Tab Navigation with Save/Cancel Buttons */}
          <div className="border-b border-slate-200 flex justify-between items-center">
            <nav className="-mb-px flex space-x-8">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    py-4 px-1 border-b-2 font-medium text-sm
                    ${activeTab === tab.id
                      ? 'border-teal-200 text-teal-200'
                      : 'border-transparent text-slate-200 hover:text-teal-400 hover:border-teal-400'
                    }
                  `}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
            <div className="flex">
              <button
                onClick={handleCancel}
                className={`${headerButtonClass} ${sectionButtonColor}`}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className={`${headerButtonClass} ${sectionButtonColor} ${
                  isSaving
                    ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-auto px-8">
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