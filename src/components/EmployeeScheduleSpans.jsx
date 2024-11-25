import React, { useRef, useEffect, useMemo } from "react";
import { useSelector } from "react-redux";
import * as d3 from "d3";
import { calculateXPosition } from "../utils/helpers";
import { isEqual } from "lodash";
import { normalizeDate } from "../utils/dateUtils";

const EmployeeScheduleSpans = ({
  chartStartDate,
  numDays,
  dayWidth,
  leftColumnWidth,
  employeesScheduledHeight,
  spanBarHeight,
}) => {
  const employeesScheduledRef = useRef(null);
  const { subTasksByEmployee } = useSelector((state) => state.taskData);
  const employees = useSelector((state) => state.builders.employees);

  const employeeScheduleSpans = useMemo(() => {
    const spans = {};
    Object.entries(subTasksByEmployee).forEach(([employee_id, tasks]) => {
      if (tasks.length === 0) return;

      const firstTask = tasks[0];
      const lastTask = tasks[tasks.length - 1];

      const firstTaskXPosition = calculateXPosition(
        normalizeDate(firstTask.start_date),
        normalizeDate(chartStartDate),
        dayWidth
      );

      const lastTaskXPosition = calculateXPosition(
        normalizeDate(lastTask.start_date),
        normalizeDate(chartStartDate),
        dayWidth
      );

      spans[employee_id] = {
        color: employees.find((b) => b.employee_id === +employee_id)
          ?.employee_color,
        xPosition: firstTaskXPosition,
        width: lastTaskXPosition + lastTask.subtask_width - firstTaskXPosition,
      };
    });
    return spans;
  }, [subTasksByEmployee, chartStartDate, dayWidth, employees]);

  useEffect(() => {
    if (!employeesScheduledRef.current) return;

    const employeesScheduledSvg = d3.select(employeesScheduledRef.current);
    employeesScheduledSvg.selectAll("*").remove();

    employeesScheduledSvg
      .selectAll("rect")
      .data(Object.values(employeeScheduleSpans))
      .enter()
      .append("rect")
      .attr("x", (d) => d.xPosition)
      .attr("y", (d, i) => i * spanBarHeight + (spanBarHeight/2))
      .attr("width", (d) => d.width)
      .attr("height", 6)
      .attr("fill", (d) => d.color || "#2d2d2d");
  }, [
    employeeScheduleSpans,
    dayWidth,
    leftColumnWidth,
    employees,
    subTasksByEmployee,
    employeesScheduledHeight,
  ]);

  return (
    <svg
      ref={employeesScheduledRef}
      width={numDays * dayWidth}
      height={(employees.length + 1) * spanBarHeight}
    />
  );
};

export default EmployeeScheduleSpans;
