import React, { useMemo } from "react";
import { useSelector } from "react-redux";
import { selectSchedulableEmployees } from "../redux/selectors";

const EmployeeScheduleSpanLabels = ({
  leftColumnWidth,
  employeesScheduledHeight,
  spanBarHeight,
  rowHeight,
}) => {
  const allEmployees = useSelector(selectSchedulableEmployees);
  const employees = useMemo(() => allEmployees.slice(1), [allEmployees]);

  return (
    <div
      className={`flex bg-gray-200`}
      style={{
        height: `${employeesScheduledHeight}px`,
        width: `${leftColumnWidth}px`,
        paddingTop: `${spanBarHeight / 2}px`,
        paddingBottom: `${spanBarHeight / 2}px`,
        printColorAdjust: "exact",
        WebkitPrintColorAdjust: "exact",
        MozPrintColorAdjust: "exact",
      }}
    >
      <div className="flex flex-1 items-center justify-end pr-2 font-bold">
        Dates Scheduled
      </div>
      <div className="flex flex-col h-full w-1/6">
        {employees.map((employee) => (
          <div
            className="mx-2"
            key={employee.employee_id}
            style={{
              height: `${
                employee.scheduling_conflicts.length > 0
                  ? rowHeight - spanBarHeight
                  : spanBarHeight
              }px`,
              backgroundColor: employee.employee_color,
              printColorAdjust: "exact",
              WebkitPrintColorAdjust: "exact",
              MozPrintColorAdjust: "exact",
            }}
          ></div>
        ))}
      </div>
    </div>
  );
};

export default EmployeeScheduleSpanLabels;
