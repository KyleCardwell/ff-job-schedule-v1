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
  rowHeight
}) => {
  const employeesScheduledRef = useRef(null);
  const { subTasksByEmployee } = useSelector((state) => state.taskData);
  const employees = useSelector((state) => state.builders.employees);
  const defaultEmployeeId = employees[0]?.employee_id;

  const employeeScheduleSpans = useMemo(() => {
    // Create base spans for all employees (except default)
    const spans = employees
      .filter(emp => emp.employee_id !== defaultEmployeeId)
      .reduce((acc, employee) => {
        acc[employee.employee_id] = {
          employeeId: employee.employee_id,
          color: employee.employee_color,
          xPosition: 0,
          width: 0,
          height: employee.scheduling_conflicts?.length > 0 
            ? rowHeight - spanBarHeight 
            : spanBarHeight,
        };
        return acc;
      }, {});

    // Add task data to spans if tasks exist
    Object.entries(subTasksByEmployee).forEach(([employee_id, tasks]) => {
      if (+employee_id === defaultEmployeeId || tasks.length === 0) return;

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
        ...spans[employee_id],
        xPosition: firstTaskXPosition,
        width: lastTaskXPosition + lastTask.subtask_width - firstTaskXPosition,
      };
    });

    // Convert to array and sort by employee order
    const spansArray = Object.values(spans).sort((a, b) => {
      const aIndex = employees.findIndex(emp => emp.employee_id === a.employeeId);
      const bIndex = employees.findIndex(emp => emp.employee_id === b.employeeId);
      return aIndex - bIndex;
    });

    // Calculate cumulative yPositions
    let currentY = spanBarHeight / 2; // Start after the unassigned row
    return spansArray.map(span => {
      const spanWithY = {
        ...span,
        yPosition: currentY
      };
      currentY += span.height;
      return spanWithY;
    });
  }, [subTasksByEmployee, chartStartDate, dayWidth, employees, spanBarHeight, rowHeight, defaultEmployeeId]);

  useEffect(() => {
    if (!employeesScheduledRef.current) return;

    const employeesScheduledSvg = d3.select(employeesScheduledRef.current);
    employeesScheduledSvg.selectAll("*").remove();

    // Add the background spans
    employeesScheduledSvg
      .selectAll("rect")
      .data(employeeScheduleSpans)
      .enter()
      .append("rect")
      .attr("x", (d) => d.xPosition)
      .attr("y", (d) => d.yPosition)
      .attr("width", (d) => d.width)
      .attr("height", (d) => d.height)
      .attr("fill", (d) => d.color || "#2d2d2d");
  }, [
    employeeScheduleSpans,
    dayWidth,
    leftColumnWidth,
    employees,
    subTasksByEmployee,
    employeesScheduledHeight,
    spanBarHeight,
  ]);

  return (
    <svg
      ref={employeesScheduledRef}
      width={numDays * dayWidth}
      height={employeesScheduledHeight}
    />
  );
};

export default EmployeeScheduleSpans;
