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
    <div className="flex bg-gray-100">
      {/* Sidebar */}
      {/* <div className="w-64 bg-white shadow-lg">
        <div className="p-4">
          <h2 className="text-xl font-semibold text-gray-800">Admin Panel</h2>
        </div>
        <nav className="mt-4">
          {[
            { icon: FiHome, label: 'Overview', id: 'overview' },
            { icon: FiUsers, label: 'Teams', id: 'teams' },
            { icon: FiCalendar, label: 'Schedule', id: 'schedule' },
            { icon: FiBarChart2, label: 'Analytics', id: 'analytics' },
            { icon: FiSettings, label: 'Settings', id: 'settings' },
          ].map(({ icon: Icon, label, id }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`w-full flex items-center px-4 py-3 text-gray-600 hover:bg-gray-50 hover:text-blue-600 ${
                activeTab === id ? 'bg-blue-50 text-blue-600' : ''
              }`}
            >
              <Icon className="w-5 h-5 mr-3" />
              {label}
            </button>
          ))}
        </nav>
      </div> */}

      {/* Main Content */}
      <div className="flex-1">
        <div className="p-8">
          {/* <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-bold text-gray-800">Dashboard Overview</h1>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              New Project
            </button>
          </div> */}

          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    py-4 px-1 border-b-2 font-medium text-sm
                    ${activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="mt-6">
            <ActiveComponent />
          </div>

          {/* Stats Grid
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[
              { title: 'Total Projects', value: '124', change: '+12%' },
              { title: 'Active Tasks', value: '45', change: '+5%' },
              { title: 'Completed', value: '79', change: '+8%' },
              { title: 'In Progress', value: '23', change: '-2%' },
            ].map(stat => (
              <div key={stat.title} className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="text-gray-500 text-sm">{stat.title}</h3>
                <div className="flex items-baseline mt-4">
                  <p className="text-2xl font-semibold text-gray-800">{stat.value}</p>
                  <span className={`ml-2 text-sm ${
                    stat.change.startsWith('+') ? 'text-green-500' : 'text-red-500'
                  }`}>
                    {stat.change}
                  </span>
                </div>
              </div>
            ))}
          </div> */}

          {/* Search and Filter Section */}
          {/* <div className="bg-white rounded-lg p-6 shadow-sm mb-8">
            <h2 className="text-lg font-semibold mb-4">Search Projects</h2>
            <ProjectSearchFilter />
          </div> */}

          {/* Recent Activity */}
          {/* <div className="bg-white rounded-lg p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
            <div className="space-y-4">
              <p className="text-gray-600">No recent activity to display</p>
            </div>
          </div> */}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;