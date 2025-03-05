// EmployeeTypeAccordion.jsx
import React, { useMemo } from "react";

const EmployeeTypeAccordion = ({
  type,
  employees,
  typeData = { estimate: 0, actual_cost: 0, inputRows: [] },
  onAddRow,
  onInputChange,
  onBlur,
  isExpanded,
  onToggle
}) => {
  const availableEmployees = employees.filter(
    (e) => e.employee_type?.id === type.id
  );

  const actualHours = useMemo(() => 
    (typeData?.inputRows || []).reduce((sum, row) => sum + (row.hours || 0), 0),
    [typeData?.inputRows]
  );
  const estimatedHours = typeData?.estimate || 0;
  const difference = estimatedHours - actualHours;

  return (
    <div className="border border-gray-100 rounded-lg mb-4">
      <button
        onClick={() => onToggle(type.id)}
        className="w-full px-4 py-2 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors duration-150 ease-in-out rounded-lg"
      >
        <h4 className="text-sm font-medium text-gray-700">{type.name}</h4>
        <div className="flex items-center gap-4">
          <div className="text-sm space-x-4">
            <span className="text-gray-600">Est: <span className="font-medium">{estimatedHours} hrs</span></span>
            <span className="text-gray-600">Act: <span className="font-medium">{actualHours} hrs</span></span>
            <span className={`${difference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              Δ: <span className="font-medium">{difference.toFixed(1)} hrs</span>
            </span>
            <span className="text-gray-600">Cost: <span className="font-medium">${(typeData?.actual_cost || 0).toFixed(2)}</span></span>
          </div>
          <div className={`transform transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}>
            <svg className="w-4 h-4 text-gray-500" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
              <path d="M19 9l-7 7-7-7"></path>
            </svg>
          </div>
        </div>
      </button>

      <div className={`transition-all duration-200 ease-in-out overflow-hidden ${
        isExpanded ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
      }`}>
        <div className="p-4 space-y-2">
          {(typeData?.inputRows || []).map((row) => (
            <div key={row.id} className="grid grid-cols-2 gap-4 items-center bg-gray-50 p-4 rounded-lg">
              <select
                value={row.employee_id || ""}
                onChange={(e) => onInputChange(row.id, "employee_id", e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Employee</option>
                {availableEmployees
                  .sort((a, b) => a.employee_name.localeCompare(b.employee_name))
                  .map((employee) => (
                    <option key={employee.employee_id} value={employee.employee_id}>
                      {employee.employee_name}
                    </option>
                  ))}
              </select>
              <input
                type="number"
                value={row.hours === 0 ? "" : row.hours}
                onChange={(e) => onInputChange(row.id, "hours", e.target.value)}
                onBlur={onBlur}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Hours"
              />
            </div>
          ))}
          <button
            onClick={() => onAddRow(type.id)}
            className="w-full py-2 px-4 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors duration-150 ease-in-out"
          >
            Add Row
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmployeeTypeAccordion;
