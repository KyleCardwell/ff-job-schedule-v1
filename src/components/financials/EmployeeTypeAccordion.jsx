import PropTypes from "prop-types";
import { useMemo } from "react";

import { usePermissions } from "../../hooks/usePermissions";

const EmployeeTypeAccordion = ({
  service,
  employees,
  serviceData = { estimate: 0, actual_cost: 0, inputRows: [] },
  onAddRow,
  onInputChange,
  onBlur,
  isExpanded,
  onToggle,
  onDeleteRow
}) => {
  const { canViewProfitLoss } = usePermissions();

  const availableEmployees = useMemo(() => [
    { employee_id: 'fixed_amount', employee_name: 'Fixed Amount', is_fixed_amount: true },
    ...employees.filter(e => e.team_service_id === service.team_service_id)
  ], [employees, service.team_service_id]);

  const actualHours = useMemo(() => 
    (serviceData?.inputRows || []).reduce((sum, row) => {
      if (row.employee_id === 'fixed_amount') return sum;
      const hoursValue = row.hours?.decimal ?? row.hours ?? 0;
      return sum + hoursValue;
    }, 0),
    [serviceData?.inputRows]
  );
  const estimatedHours = serviceData?.estimate || 0;
  const difference = estimatedHours - actualHours;

  return (
    <div className="border border-gray-100 rounded-lg mb-4">
      <button
        onClick={() => onToggle(service.team_service_id)}
        className="w-full px-4 py-2 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors duration-150 ease-in-out rounded-lg"
      >
        <h4 className="text-sm font-medium text-gray-700 capitalize">{service.service_name}</h4>
        <div className="flex items-center gap-4">
          <div className="text-sm space-x-4">
            <span className="text-gray-600">Est: <span className="font-medium">{estimatedHours.toFixed(2)} hrs</span></span>
            <span className="text-gray-600">Act: <span className="font-medium">{actualHours.toFixed(2)} hrs</span></span>
            <span className={`${difference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              Δ: <span className="font-medium">{difference.toFixed(2)} hrs</span>
            </span>
            {canViewProfitLoss && (
              <span className="text-gray-600">Cost: <span className="font-medium">${(serviceData?.actual_cost || 0).toFixed(2)}</span></span>
            )}
          </div>
          <div className={`transform transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}>
            <svg className="w-4 h-4 text-gray-500" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
              <path d="M19 9l-7 7-7-7"></path>
            </svg>
          </div>
        </div>
      </button>

      <div className={`transition-all duration-200 ease-in-out overflow-hidden ${isExpanded ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"}`}>
        <div className="p-4 space-y-2">
          {(serviceData?.inputRows || []).map((row) => (
            <div key={row.id} className="grid grid-cols-[1fr,1fr,auto] gap-4 items-center bg-gray-50 p-4 rounded-lg">
              <select
                value={row.employee_id}
                onChange={(e) => onInputChange(row.id, "employee_id", e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select...</option>
                {availableEmployees.map((employee) => (
                  <option key={employee.employee_id} value={employee.employee_id}>
                    {employee.employee_name}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={row.hours?.display || (typeof row.hours === 'object' ? '' : row.hours) || ''}
                onChange={(e) => onInputChange(row.id, "hours", e.target.value)}
                onBlur={onBlur}
                disabled={!row.employee_id}
                className={`px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  !row.employee_id ? 'bg-gray-100 cursor-not-allowed' : ''
                }`}
                placeholder={!row.employee_id 
                  ? "Select employee first" 
                  : row.employee_id === 'fixed_amount' 
                    ? "Amount" 
                    : "Hours (HH:MM or decimal)"}
                pattern="^(\d*\.?\d*)|(\d{1,2}:\d{0,2})$"
              />
              <button
                onClick={() => onDeleteRow(row.id)}
                className="p-2 text-red-600 hover:text-red-800 focus:outline-none"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
          <button
            onClick={() => onAddRow(service.team_service_id)}
            className="w-full py-2 px-4 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors duration-150 ease-in-out"
          >
            Add Row
          </button>
        </div>
      </div>
    </div>
  );
};

EmployeeTypeAccordion.propTypes = {
  service: PropTypes.object.isRequired,
  employees: PropTypes.array.isRequired,
  serviceData: PropTypes.object.isRequired,
  onAddRow: PropTypes.func.isRequired,
  onInputChange: PropTypes.func.isRequired,
  onBlur: PropTypes.func.isRequired,
  isExpanded: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
  onDeleteRow: PropTypes.func.isRequired,
};

export default EmployeeTypeAccordion;
