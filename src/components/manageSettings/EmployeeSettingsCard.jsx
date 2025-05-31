import React from 'react';
import PropTypes from 'prop-types';
import { formatDateForInput } from '../../utils/dateUtils';

const EmployeeSettingsCard = ({
  employee,
  employeeTypes = [],
  onNameChange,
  onColorChange,
  onCanScheduleChange,
  onEmployeeTypeChange,
  onEmployeeRateChange,
  onAddTimeOff,
  onTimeOffChange,
  onRemoveTimeOff,
  onDelete,
  showRates,
  errors = {},
  timeOffVisible,
  onToggleTimeOff,
}) => {
  return (
    <div className="bg-slate-700 p-4 rounded mb-4">
      <div className="flex flex-col gap-4">
        {/* Header with delete button */}
        <div className="flex justify-between items-center">
          <div className="flex gap-4 items-center flex-1">
            {/* Name Input */}
            <input
              type="text"
              value={employee.employee_name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="Employee Name"
              className={`bg-slate-600 text-slate-200 px-2 py-1 rounded flex-1 ${
                errors.name ? 'border border-red-500' : ''
              }`}
            />
            {/* Color Input */}
            <input
              type="color"
              value={employee.employee_color}
              onChange={(e) => onColorChange(e.target.value)}
              className="w-8 h-8 rounded cursor-pointer bg-transparent"
            />
          </div>
          <button
            onClick={onDelete}
            className="p-2 text-slate-400 hover:text-red-400"
          >
            <svg
              className="h-5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        {/* Employee Type and Rate */}
        <div className="flex gap-4">
          <div className="flex-1">
            <select
              value={employee.employee_type?.id || ''}
              onChange={(e) => {
                const selectedType = (employeeTypes || []).find(
                  (type) => type.id === e.target.value
                );
                onEmployeeTypeChange(selectedType || null);
              }}
              className="w-full bg-slate-600 text-slate-200 px-2 py-1 rounded"
            >
              <option value="">Select Type</option>
              {(employeeTypes || []).map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>
          {showRates && (
            <div className="flex-1">
              <input
                type="number"
                value={employee.employee_rate || ''}
                onChange={(e) => onEmployeeRateChange(e.target.value)}
                placeholder="Hourly Rate"
                className="w-full bg-slate-600 text-slate-200 px-2 py-1 rounded"
              />
            </div>
          )}
        </div>

        {/* Can Schedule Switch */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={employee.can_schedule}
            onChange={(e) => onCanScheduleChange(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-slate-200">Can Schedule</span>
        </div>

        {/* Time Off Section */}
        <div>
          <button
            type="button"
            onClick={onToggleTimeOff}
            className="text-sm text-slate-200 hover:text-slate-100 mb-2"
          >
            {timeOffVisible ? '▼' : '▶'} Time Off Periods
          </button>
          
          {timeOffVisible && (
            <div className="space-y-2">
              {employee.time_off.map((period, timeOffIndex) => (
                <div key={timeOffIndex} className="flex gap-2 items-center">
                  <input
                    type="date"
                    value={formatDateForInput(period.start)}
                    onChange={(e) =>
                      onTimeOffChange(timeOffIndex, "start", e.target.value)
                    }
                    className={`bg-slate-600 text-slate-200 px-2 py-1 rounded flex-1 ${
                      errors[`timeoff-${timeOffIndex}`] ? 'border border-red-500' : ''
                    }`}
                  />
                  <input
                    type="date"
                    value={formatDateForInput(period.end)}
                    onChange={(e) =>
                      onTimeOffChange(timeOffIndex, "end", e.target.value)
                    }
                    className={`bg-slate-600 text-slate-200 px-2 py-1 rounded flex-1 ${
                      errors[`timeoff-${timeOffIndex}`] ? 'border border-red-500' : ''
                    }`}
                  />
                  <button
                    onClick={() => onRemoveTimeOff(timeOffIndex)}
                    className="p-2 text-slate-400 hover:text-red-400"
                  >
                    <svg
                      className="h-5"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  </button>
                </div>
              ))}
              <button
                onClick={onAddTimeOff}
                className="w-full px-3 py-1 text-sm bg-slate-600 text-slate-200 hover:bg-slate-500"
              >
                Add Time Off Period
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

EmployeeSettingsCard.propTypes = {
  employee: PropTypes.shape({
    employee_name: PropTypes.string.isRequired,
    employee_color: PropTypes.string.isRequired,
    employee_type: PropTypes.shape({
      id: PropTypes.string,
      name: PropTypes.string,
    }),
    employee_rate: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    can_schedule: PropTypes.bool.isRequired,
    time_off: PropTypes.arrayOf(
      PropTypes.shape({
        start: PropTypes.string.isRequired,
        end: PropTypes.string.isRequired,
      })
    ).isRequired,
  }).isRequired,
  employeeTypes: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
    })
  ),
  onNameChange: PropTypes.func.isRequired,
  onColorChange: PropTypes.func.isRequired,
  onCanScheduleChange: PropTypes.func.isRequired,
  onEmployeeTypeChange: PropTypes.func.isRequired,
  onEmployeeRateChange: PropTypes.func.isRequired,
  onAddTimeOff: PropTypes.func.isRequired,
  onTimeOffChange: PropTypes.func.isRequired,
  onRemoveTimeOff: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  showRates: PropTypes.bool.isRequired,
  errors: PropTypes.object,
  timeOffVisible: PropTypes.bool.isRequired,
  onToggleTimeOff: PropTypes.func.isRequired,
};

export default EmployeeSettingsCard;