import PropTypes from "prop-types";

import { formatDateForInput } from "../../utils/dateUtils";

const EmployeeSettingsCard = ({
  employee,
  services = [],
  onNameChange,
  onColorChange,
  onCanScheduleChange,
  onServiceChange,
  onEmployeeRateChange,
  onAddTimeOff,
  onTimeOffChange,
  onRemoveTimeOff,
  onMarkForDeletion,
  showRates,
  errors = {},
  timeOffVisible,
  onToggleTimeOff,
  defaultEmployee,
  inputRef,
}) => {
  return (
    <div
      className={`bg-slate-700 p-4 pb-8 rounded mb-4 border-b border-slate-500 flex gap-4 justify-between ${
        employee.markedForDeletion ? "opacity-50" : ""
      }`}
    >
      <div className="flex-1">
        <div className="flex flex-col gap-4">
          {/* Header with delete button */}
          <div>
            {Object.entries(errors).map(([field, error]) => {
              // For time off errors, include the index in the message
              if (field.startsWith("timeoff-")) {
                const index = parseInt(field.split("-")[1]) + 1;
                return (
                  <div key={field} className="text-red-500 text-sm">
                    {error}
                  </div>
                );
              }
              // For other fields, capitalize the field name
              return (
                <div key={field} className="text-red-500 text-sm">
                  {error}
                </div>
              );
            })}
          </div>
          <div className="flex justify-between items-center">
            <div className="flex gap-5 items-center flex-1">
              {/* Name Input */}
              <div className="flex gap-2 items-center flex-1">
                <label className="block text-sm font-medium text-slate-200">
                  Name
                </label>
                <input
                  type="text"
                  value={employee.employee_name}
                  onChange={(e) => onNameChange(e.target.value)}
                  placeholder="Employee Name"
                  className={`bg-slate-600 text-slate-200 px-2 py-1 rounded flex-1 ${
                    errors.name ? "border border-red-500" : ""
                  }`}
                  disabled={employee.markedForDeletion}
                  ref={inputRef}
                />
              </div>
              {/* Color Input */}
              <div className="flex gap-2 items-center">
                <label className="block text-sm font-medium text-slate-200">
                  Color
                </label>
                <input
                  type="color"
                  value={employee.employee_color}
                  onChange={(e) => onColorChange(e.target.value)}
                  className="w-16 h-8 rounded cursor-pointer bg-transparent"
                  disabled={employee.markedForDeletion}
                />
              </div>
              {/* Can Schedule Switch */}
              {!defaultEmployee && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={employee.can_schedule}
                    onChange={(e) => onCanScheduleChange(e.target.checked)}
                    className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    disabled={employee.markedForDeletion}
                  />
                  <span className="text-sm text-slate-200">Can Schedule</span>
                </div>
              )}
            </div>
          </div>
          {defaultEmployee && (
            <div className="text-sm text-slate-200">
              <p>
                This first employee is for unassigned tasks and cannot be
                deleted.
                <br />
                You may change the name and color.
              </p>
            </div>
          )}

          {/* Service and Rate */}
          {!defaultEmployee && (
            <div className="flex gap-4">
              <div className="flex-1 flex gap-2 items-center">
                <label className="block text-sm font-medium text-slate-200">
                  Service
                </label>
                <select
                  value={employee.team_service_id || ""}
                  onChange={(e) => onServiceChange(+e.target.value)}
                  className={`w-full bg-slate-600 text-slate-200 px-2 py-1.5 rounded ${
                    errors.team_service_id ? "border border-red-500" : ""
                  }`}
                  disabled={employee.markedForDeletion}
                >
                  <option value="">Select Service</option>
                  {services.map((service) => (
                    <option key={service.team_service_id} value={service.team_service_id}>
                      {service.service_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex-1 flex gap-2 items-center">
                <label className="block text-sm font-medium text-slate-200 text-nowrap">
                  Hourly Rate
                </label>
                {showRates ? (
                  <input
                    type="number"
                    value={employee.employee_rate || ""}
                    onChange={(e) => onEmployeeRateChange(e.target.value)}
                    placeholder="Hourly Rate"
                    className="w-full bg-slate-600 text-slate-200 px-2 py-1 rounded"
                    disabled={employee.markedForDeletion}
                  />
                ) : (
                  <div className="w-full h-full bg-slate-600 text-slate-200 px-2 py-1 rounded"></div>
                )}
              </div>
            </div>
          )}

          {/* Time Off Section */}
          {!defaultEmployee && (
            <div>
              <button
                type="button"
                onClick={onToggleTimeOff}
                className="text-sm text-slate-200 hover:text-slate-100 mb-2"
                disabled={employee.markedForDeletion}
              >
                {timeOffVisible ? "▼" : "▶"} Time Off Periods
              </button>

              {timeOffVisible && (
                <div className="space-y-2">
                  {employee.time_off.map((period, timeOffIndex) => (
                    <div
                      key={`${employee.employee_id}-timeoff-${timeOffIndex}`}
                      className="flex gap-2 items-center mb-2"
                    >
                      <label className="block text-sm font-medium text-slate-200">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={formatDateForInput(period.start)}
                        onChange={(e) =>
                          onTimeOffChange(timeOffIndex, "start", e.target.value)
                        }
                        className={`bg-slate-600 text-slate-200 px-2 py-1 rounded flex-1 ${
                          errors[`timeoff-${timeOffIndex}`]
                            ? "border border-red-500"
                            : ""
                        }`}
                        disabled={employee.markedForDeletion}
                      />
                      <label className="block text-sm font-medium text-slate-200">
                        End Date
                      </label>
                      <input
                        type="date"
                        value={formatDateForInput(period.end)}
                        onChange={(e) =>
                          onTimeOffChange(timeOffIndex, "end", e.target.value)
                        }
                        className={`bg-slate-600 text-slate-200 px-2 py-1 rounded flex-1 ${
                          errors[`timeoff-${timeOffIndex}`]
                            ? "border border-red-500"
                            : ""
                        }`}
                        disabled={employee.markedForDeletion}
                      />
                      <button
                        onClick={() => onRemoveTimeOff(timeOffIndex)}
                        className="p-2 text-slate-400 hover:text-red-400"
                        disabled={employee.markedForDeletion}
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
                    disabled={employee.markedForDeletion}
                  >
                    Add Time Off Period
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="min-w-[60px] border-l border-slate-500 h-auto">
        {!defaultEmployee && (
          <div className="flex items-center space-x-4 h-full">
            <button onClick={() => onMarkForDeletion()} className={`p-2`}>
              {employee.markedForDeletion ? (
                <span className="p-2 flex items-center font-bold text-teal-300 hover:bg-teal-300 hover:text-slate-700">
                  <svg
                    className="h-5 mr-1"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"></path>
                  </svg>
                  Restore
                </span>
              ) : (
                <div className="flex items-center hover:bg-red-400 p-2 text-slate-400 hover:text-slate-700">
                  <svg
                    className="h-7"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </div>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

EmployeeSettingsCard.propTypes = {
  employee: PropTypes.object.isRequired,
  services: PropTypes.array.isRequired,
  onNameChange: PropTypes.func.isRequired,
  onColorChange: PropTypes.func.isRequired,
  onCanScheduleChange: PropTypes.func.isRequired,
  onServiceChange: PropTypes.func.isRequired,
  onEmployeeRateChange: PropTypes.func.isRequired,
  onAddTimeOff: PropTypes.func.isRequired,
  onRemoveTimeOff: PropTypes.func.isRequired,
  onMarkForDeletion: PropTypes.func.isRequired,
  showRates: PropTypes.bool,
  errors: PropTypes.object,
  timeOffVisible: PropTypes.bool,
  onToggleTimeOff: PropTypes.func,
  defaultEmployee: PropTypes.bool,
  inputRef: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.shape({ current: PropTypes.instanceOf(Element) }),
  ]),
};

export default EmployeeSettingsCard;
