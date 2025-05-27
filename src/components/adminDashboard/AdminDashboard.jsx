import React, { useState } from 'react';
import { FiHome, FiUsers, FiCalendar, FiSettings, FiBarChart2 } from 'react-icons/fi';
import ProjectSearchFilter from '../ProjectSearchFilter';
import ManageChartSettings from '../manageSettings/ManageChartSettings';
import EmployeeSettings from '../manageSettings/EmployeeSettings';
import HolidaySettings from '../manageSettings/HolidaySettings';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('chart');

  const tabs = [
    { id: 'chart', label: 'Chart', component: ManageChartSettings },
    { id: 'employees', label: 'Employees', component: EmployeeSettings },
    { id: 'holidays', label: 'Holidays', component: HolidaySettings },
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || ManageChartSettings;

  return (
    <div className="flex bg-slate-800 h-full">
      {/* Main Content */}
      <div className="flex-1 h-full flex flex-col">
        <div className="px-8 flex-none">
          {/* Tab Navigation */}
          <div className="border-b border-slate-200">
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
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-auto px-8">
          <div className="mt-6 flex justify-center">
            <div className="w-full max-w-[720px]">
              <ActiveComponent />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;