import PropTypes from "prop-types";
import React from "react";
import { useSelector } from "react-redux";

import { selectSchedulableEmployees } from "../redux/selectors";

const BuilderLegend = ({ onEmployeeFilter, selectedEmployeeIds = [] }) => {
  const employees = useSelector(selectSchedulableEmployees);

  const handleEmployeeClick = (employeeId) => {
    if (selectedEmployeeIds.includes(employeeId)) {
      // Remove if already selected
      onEmployeeFilter(selectedEmployeeIds.filter(id => id !== employeeId));
    } else {
      // Add to selection
      const newSelection = [...selectedEmployeeIds, employeeId];
      // If all employees are now selected, clear the selection
      if (newSelection.length === employees.length) {
        onEmployeeFilter([]);
      } else {
        onEmployeeFilter(newSelection);
      }
    }
  };

  return (
    <div
      className="flex flex-wrap justify-start text-sm"
      style={{
        printColorAdjust: "exact",
        WebkitPrintColorAdjust: "exact",
        MozPrintColorAdjust: "exact",
      }}
    >
      {employees.map((employee) => (
        <div
          key={employee.employee_id}
          className={`flex items-center mt-[5px] mr-5 cursor-pointer hover:opacity-80 ${
            selectedEmployeeIds.includes(employee.employee_id) ? 'ring-2 ring-blue-500 rounded px-1' : ''
          }`}
          onClick={() => handleEmployeeClick(employee.employee_id)}
        >
          <div
            className="w-[15px] h-[15px] mr-[5px] border border-black"
            style={{
              backgroundColor: employee.employee_color,
              printColorAdjust: "exact",
              WebkitPrintColorAdjust: "exact",
              MozPrintColorAdjust: "exact",
            }}
          ></div>
          <span>{employee.employee_name}</span>
        </div>
      ))}
    </div>
  );
};

BuilderLegend.propTypes = {
  onEmployeeFilter: PropTypes.func.isRequired,
  selectedEmployeeIds: PropTypes.arrayOf(PropTypes.number).isRequired,
};

export default BuilderLegend;
