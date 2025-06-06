import React from "react";
import PropTypes from "prop-types";
import { useSelector } from "react-redux";
import { selectSchedulableEmployees } from "../redux/selectors";

const BuilderLegend = ({ onEmployeeFilter, selectedEmployeeId }) => {
  const employees = useSelector(selectSchedulableEmployees);

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
            selectedEmployeeId === employee.employee_id ? 'ring-2 ring-blue-500 rounded px-1' : ''
          }`}
          onClick={() => onEmployeeFilter(selectedEmployeeId === employee.employee_id ? null : employee.employee_id)}
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
  selectedEmployeeId: PropTypes.string,
};

export default BuilderLegend;
