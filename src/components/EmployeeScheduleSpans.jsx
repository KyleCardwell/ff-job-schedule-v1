import React, { useRef, useEffect } from "react";
import * as d3 from "d3";

const EmployeeScheduleSpans = ({
  numDays,
  dayWidth,
  leftColumnWidth,
  employeePositions,
  employeesScheduledHeight,
}) => {
  const employeesScheduledRef = useRef(null);

  useEffect(() => {
    if (!employeesScheduledRef.current) return;

    const employeesScheduledSvg = d3.select(employeesScheduledRef.current);
    employeesScheduledSvg.selectAll("*").remove();

    // Add the background spans
    employeesScheduledSvg
      .selectAll("rect")
      .data(employeePositions)
      .enter()
      .append("rect")
      .attr("x", (d) => d.xPosition)
      .attr("y", (d) => d.yPosition)
      .attr("width", (d) => d.width)
      .attr("height", (d) => d.height)
      .attr("fill", (d) => d.color || "#2d2d2d");
  }, [employeePositions, dayWidth, leftColumnWidth]);

  return (
    <svg
      ref={employeesScheduledRef}
      width={numDays * dayWidth}
      height={employeesScheduledHeight}
    />
  );
};

export default EmployeeScheduleSpans;
