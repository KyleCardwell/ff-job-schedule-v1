import React, { useEffect, useRef, useState, useMemo } from "react";
import { useSelector } from "react-redux";
import ChartActionButtons from "./ChartActionButtons";
import {
  addDays,
  differenceInCalendarDays,
  format,
  startOfWeek,
  subDays,
} from "date-fns";
import { GridLoader } from "react-spinners";
import { normalizeDate } from "../utils/dateUtils";
import * as d3 from "d3";
import Holidays from "date-holidays";
import { isHoliday } from "../utils/helpers";
import BuilderLegend from "./BuilderLegend";
import BuilderModal from "./BuilderModal";
import JobModalChartData from "./JobModalChartData";
import HolidayModal from "./HolidayModal";
import TaskGroups from "./TaskGroups";
import { eachDayOfInterval, parseISO } from "date-fns";
import ErrorToast from "./ErrorToast";
import ChartSettingsModal from "./ChartSettingsModal";

export const ChartContainer = () => {
  const holidays = useSelector((state) => state.holidays.holidays);
  const { chartData } = useSelector((state) => state.chartData);
  const databaseLoading = useSelector((state) => state.projects.loading);

  const builders = useSelector((state) => state.builders.employees);
  const { tasks, subTasksByEmployee } = useSelector((state) => state.taskData);

  const { activeRoomsData, lastJobsIndex, earliestStartDate, latestStartDate } =
    useMemo(() => {
      let currentJobId = null;
      let jobsIndex = -1;
      let earliestStartDate = new Date(8640000000000000); // Initialize with max date
      let latestStartDate = new Date(-8640000000000000); // Initialize with min date

      const activeRooms = chartData
        .filter((room) => room.task_active)
        .map((room) => {
          if (room.project_id !== currentJobId) {
            currentJobId = room.project_id;
            jobsIndex++;
          }

          const roomStartDate = parseISO(normalizeDate(room.start_date));
          const roomEndDate = parseISO(normalizeDate(room.end_date));
          if (roomStartDate < earliestStartDate) {
            earliestStartDate = roomStartDate;
          }
          if (roomEndDate > latestStartDate) {
            latestStartDate = roomEndDate;
          }

          return {
            ...room,
            jobsIndex: jobsIndex,
          };
        });

      return {
        activeRoomsData: activeRooms,
        lastJobsIndex: jobsIndex,
        earliestStartDate:
          earliestStartDate === new Date(8640000000000000)
            ? null
            : earliestStartDate,
        latestStartDate:
          latestStartDate === new Date(-8640000000000000)
            ? null
            : latestStartDate,
      };
    }, [chartData]);

  const chartRef = useRef(null);
  const headerRef = useRef(null); // For the fixed header
  const leftColumnRef = useRef(null); // For the fixed left column
  const leftColumnHeaderRef = useRef(null); // For the fixed left column
  const scrollableRef = useRef(null);
  const leftScrollableRef = useRef(null);
  const timeOffSvgRef = useRef(null);

  const [holidayChecker, setHolidayChecker] = useState(null);
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [isBuilderModalOpen, setIsBuilderModalOpen] = useState(false);
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [clickedTask, setClickedTask] = useState(null);
  const [databaseError, setDatabaseError] = useState(null);

  const [isLoading, setIsLoading] = useState(false);

  const daysBeforeStart = 15;
  const daysAfterEnd = 15;
  const dayWidth = 30;
  const workdayHours = 8;
  const rowHeight = 25;
  const barMargin = 3;
  const headerTextGap = 5;
  const headerHeight = 43;
  const leftColumnWidth = 280;
  const employeeColorWidth = 5;
  const chartHeight = activeRoomsData.reduce(
    (total, room) => total + room.heightAdjust * rowHeight,
    0
  );

  const timeOffByBuilder = useMemo(() => {
    return builders.reduce((acc, builder) => {
      acc[builder.employee_id] = builder.time_off.flatMap((period) =>
        eachDayOfInterval({
          start: normalizeDate(new Date(period.start)),
          end: normalizeDate(new Date(period.end)),
        }).map((day) => normalizeDate(day))
      );
      return acc;
    }, {});
  }, [builders]);

  const chartStartDate = useMemo(() => {
    return subDays(earliestStartDate, daysBeforeStart);
  }, [earliestStartDate, daysBeforeStart]);

  const numDays = useMemo(() => {
    return (
      differenceInCalendarDays(latestStartDate, earliestStartDate) +
      daysBeforeStart +
      daysAfterEnd
    );
  }, [earliestStartDate, latestStartDate, daysBeforeStart, daysAfterEnd]);

  const saveJob = () => {
    setIsJobModalOpen(false);
    setSelectedJob(null);
  };

  const scrollToMonday = (date) => {
    const normalizedDate = normalizeDate(date);
    const mondayOfThisWeek = startOfWeek(parseISO(normalizedDate), {
      weekStartsOn: 1,
    }); // 1 represents Monday
    const diffDays = differenceInCalendarDays(
      mondayOfThisWeek,
      parseISO(normalizeDate(chartStartDate))
    );
    const scrollPosition = diffDays * dayWidth;

    // Update the selector to use the ref for the scrollable div
    const scrollableDiv = scrollableRef.current;

    setTimeout(() => {
      if (scrollableDiv) {
        scrollableDiv.scrollTo({
          left: scrollPosition,
          behavior: "smooth",
        });
      }
    }, 50);
  };

  // Function to handle auto-scrolling when dragging near edges
  const handleAutoScroll = (event) => {
    const container = scrollableRef.current;
    const scrollSpeed = 20; // Speed of the auto-scroll
    const buffer = 50; // Distance from edge to trigger scroll

    const { left, right, top, bottom } = container.getBoundingClientRect();
    const { clientX, clientY } = event.sourceEvent;

    // Horizontal auto-scroll
    if (clientX < left + buffer + leftColumnWidth) {
      container.scrollLeft -= scrollSpeed; // Scroll left
    } else if (clientX > right - buffer) {
      container.scrollLeft += scrollSpeed; // Scroll right
    }

    // Vertical auto-scroll
    if (clientY < top + buffer) {
      container.scrollTop -= scrollSpeed; // Scroll up
    } else if (clientY > bottom - buffer) {
      container.scrollTop += scrollSpeed; // Scroll down
    }
  };

  const handleDatabaseError = (error) => {
    setDatabaseError("Failed to update the database. Please try again.");
    console.error("Database error:", error);
  };

  useEffect(() => {
    const hd = new Holidays();
    hd.init("US"); // Initialize with US holidays. Change as needed.
    setHolidayChecker(hd);
  }, []);

  useEffect(() => {
    const chartSvg = d3.select(chartRef.current);
    chartSvg.selectAll("*").remove(); // Clear previous SVG content

    const leftColumnSvg = d3.select(leftColumnRef.current);
    leftColumnSvg.selectAll("*").remove();

    const leftHeaderSvg = d3.select(leftColumnHeaderRef.current);
    leftHeaderSvg.selectAll("*").remove();

    const headerSvg = d3.select(headerRef.current);
    headerSvg.selectAll("*").remove();

    const timeOffSvg = d3.select(timeOffSvgRef.current);
    timeOffSvg.selectAll("*").remove();

    const weekendColor = "#b9c0c9"; // Darker color for weekends
    const alternateRowColors = ["#f9f9f9", "#e5e7eb"]; // Alternating colors for rows
    const alternateAttentionColors = ["#faf16e", "#f3e520"];
    const strokeColor = "#aab1ba"; // stroke color

    const chartWidth = numDays * dayWidth;

    // Create an array of dates for the column headers
    const dates = Array.from({ length: numDays }, (_, i) => {
      const date = addDays(parseISO(normalizeDate(chartStartDate)), i);
      return date;
    });
    chartSvg.attr("width", chartWidth).attr("height", chartHeight);

    leftHeaderSvg.attr("width", leftColumnWidth).attr("height", headerHeight);

    // Add background rectangle first
    leftHeaderSvg
      .append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", leftColumnWidth)
      .attr("height", headerHeight)
      .attr("fill", "#e5e7eb"); // This is the Tailwind gray-200 color

    // Add the left column header with titles
    leftHeaderSvg.append("g").each(function () {
      const leftHeaderGroup = d3.select(this);

      // Job Number header
      leftHeaderGroup
        .append("text")
        .attr("x", 10) // Adjust x for alignment
        .attr("y", rowHeight / 2 + 6)
        .text("#")
        .attr("fill", "#000")
        .attr("font-weight", "bold")
        .attr("dominant-baseline", "middle");

      // Job Name header
      leftHeaderGroup
        .append("text")
        .attr("x", 50) // Adjust x for alignment
        .attr("y", rowHeight / 2 + 6)
        .text("Job")
        .attr("fill", "#000")
        .attr("font-weight", "bold")
        .attr("dominant-baseline", "middle");

      // Room Name header
      leftHeaderGroup
        .append("text")
        .attr("x", 130) // Adjust x for alignment
        .attr("y", rowHeight / 2 + 6)
        .text("Room")
        .attr("fill", "#000")
        .attr("font-weight", "bold")
        .attr("dominant-baseline", "middle");
    });

    headerSvg.attr("width", numDays * dayWidth).attr("height", headerHeight);

    // Add column headers with both date and day of the week
    headerSvg
      .selectAll(".header")
      .data(dates)
      .enter()
      .append("g")
      .attr("class", "header")
      .style("cursor", "pointer")
      .each(function (d, i) {
        // Group for each header
        const group = d3.select(this);

        const isWeekend = d.getUTCDay() === 0 || d.getUTCDay() === 6;
        const isHolidayDate = isHoliday(
          normalizeDate(d),
          holidayChecker,
          holidays
        );

        // Append a rectangle for weekends
        if (isWeekend || isHolidayDate) {
          group
            .append("rect")
            .attr("x", i * dayWidth)
            .attr("y", 0)
            .attr("width", dayWidth)
            .attr("height", headerHeight) // Adjust to cover the header
            .attr("fill", isHolidayDate ? "lightblue" : weekendColor); // Light blue for holidays, grey for weekends
        }
        // Month
        group
          .append("text")
          .attr("x", i * dayWidth + headerTextGap)
          .attr("y", 10)
          .text(d3.timeFormat("%b")(d))
          .attr("fill", "#000")
          .attr("font-size", "11px")
          .attr("font-weight", "bold")
          .attr("text-anchor", "left");

        // Date number
        group
          .append("text")
          .attr("x", i * dayWidth + headerTextGap)
          .attr("y", 25)
          .text(d3.timeFormat("%d")(d))
          .attr("fill", "#000")
          .attr("font-size", "14px")
          .attr("font-weight", "bold")
          .attr("text-anchor", "left");

        // Day of the week
        group
          .append("text")
          .attr("x", i * dayWidth + headerTextGap)
          .attr("y", 37) // Adjust vertical position for day of the week
          .text(d3.timeFormat("%a")(d))
          .attr("fill", "#000")
          .attr("font-size", "9px")
          .attr("font-weight", "bold")
          .attr("text-anchor", "left");

        // Add double-click event to the group
        group.on("dblclick", () => {
          scrollToMonday(d);
        });
      });

    headerSvg
      .selectAll(".vertical-line")
      .data(dates)
      .enter()
      .append("line")
      .attr("x1", (d, i) => i * dayWidth)
      .attr("x2", (d, i) => i * dayWidth)
      .attr("y1", 0)
      .attr("y2", chartHeight)
      .attr("stroke", strokeColor)
      .attr("stroke-width", 1);

    leftColumnSvg.attr("width", leftColumnWidth).attr("height", chartHeight);

    leftColumnSvg.on("dblclick", (event) => {
      const [x, y] = d3.pointer(event);
      const rowIndex = Math.floor(y / rowHeight); // Calculate which row was clicked based on y-coordinate
      const room = activeRoomsData[rowIndex]; // Get the room data based on the row index

      if (room) {
        const job = tasks.filter((task) => task.project_id === room.project_id); // Find the job associated with the room
        setSelectedJob(job);
        setClickedTask(room);
        setIsJobModalOpen(true);
      }
    });

    // Background rows
    leftColumnSvg
      .selectAll(".row-background")
      .data(activeRoomsData)
      .enter()
      .append("rect")
      .attr("x", 0)
      .attr("y", (d, i) => i * rowHeight)
      .attr("width", leftColumnWidth)
      .attr("height", (d) => d.heightAdjust * rowHeight)
      .attr("fill", (d) => {
        if (d.needs_attention) {
          return d.jobsIndex % 2 === 0
            ? alternateAttentionColors[0]
            : alternateAttentionColors[1];
        }

        return d.jobsIndex % 2 === 0
          ? alternateRowColors[0]
          : alternateRowColors[1];
      }); // Alternate colors

    // Add right border with employee color
    leftColumnSvg
      .selectAll(".row-border")
      .data(activeRoomsData)
      .enter()
      .append("rect")
      .attr("class", "row-border")
      .attr("x", leftColumnWidth - employeeColorWidth)
      .attr("y", (d, i) => i * rowHeight)
      .attr("width", employeeColorWidth) // 4px wide border
      .attr("height", rowHeight)
      .attr("fill", (d) => {
        const employee = builders.find((b) => b.employee_id === d.employee_id);
        return employee?.employee_color || "#000000";
      });

    const textGroups = leftColumnSvg
      .selectAll(".job-text-group")
      .data(activeRoomsData)
      .enter()
      .append("g")
      .attr("class", "job-text-group")
      .attr("transform", (d, i) => `translate(0, ${i * rowHeight})`)
      .attr("font-size", "12px")
      .attr("cursor", "pointer");

    textGroups.each(function (d) {
      const group = d3.select(this);

      const jobNumberText = group
        .append("text")
        .attr("class", "job-number")
        .attr("x", 10)
        .attr("y", (d.heightAdjust * rowHeight) / 2)
        .text(d.heightAdjust !== 0 ? d.task_number : "")
        .attr("fill", "#000")
        .attr("dominant-baseline", "middle");

      const jobNameText = group
        .append("text")
        .attr("class", "job-name")
        .attr("x", 50)
        .attr("y", (d.heightAdjust * rowHeight) / 2)
        .text(d.heightAdjust !== 0 ? d.project_name : "")
        .attr("fill", "#000")
        .attr("dominant-baseline", "middle");

      const taskNameText = group
        .append("text")
        .attr("class", "room-name")
        .attr("x", 130)
        .attr("y", (d.heightAdjust * rowHeight) / 2)
        .text(d.heightAdjust !== 0 ? d.task_name : "")
        .attr("fill", "#000")
        .attr("dominant-baseline", "middle");

      // Add double-click event for job number and job name
      jobNumberText.on("dblclick", (event) => {
        event.stopPropagation();
        const job = tasks.filter((task) => task.project_id === d.project_id);
        setSelectedJob(job);
        setClickedTask(d);
        setIsJobModalOpen(true);
      });

      jobNameText.on("dblclick", (event) => {
        event.stopPropagation();
        const job = tasks.filter((task) => task.project_id === d.project_id);
        setSelectedJob(job);
        setClickedTask(d);
        setIsJobModalOpen(true);
      });

      // Add double-click event for room name
      taskNameText.on("dblclick", (event) => {
        event.stopPropagation();
        scrollToMonday(new Date(d.start_date));
      });
    });

    // Remove previous SVG elements
    chartSvg.selectAll("*").remove().append("rect");

    // Set SVG dimensions based on room count
    chartSvg.attr("width", chartWidth).attr("height", chartHeight);

    // Create row backgrounds for each room
    chartSvg
      .selectAll(".row-background")
      .data(activeRoomsData)
      .enter()
      .append("rect")
      .attr("x", 0)
      .attr("y", (d, i) => i * rowHeight)
      .attr("width", chartWidth)
      .attr("height", (d) => d.heightAdjust * rowHeight)
      .attr("fill", (d) =>
        d.jobsIndex % 2 === 0 ? alternateRowColors[0] : alternateRowColors[1]
      ) // Alternate colors
      .attr("stroke", strokeColor) // Set stroke color for bottom border
      .attr("stroke-width", 1) // Set stroke width
      .attr(
        "stroke-dasharray",
        (d) => `0,${d.heightAdjust * rowHeight},${chartWidth},0`
      );
    // Draw weekend backgrounds
    chartSvg
      .selectAll(".weekend-background")
      .data(dates)
      .enter()
      .append("rect")
      .attr("class", "weekend-background")
      .attr("x", (d, i) => i * dayWidth)
      .attr("y", 0)
      .attr("width", dayWidth)
      .attr("height", activeRoomsData.length * rowHeight) // Adjust height based on room count
      .attr("fill", (d) => {
        const dayOfWeek = d3.timeFormat("%a")(d);
        return dayOfWeek === "Sat" || dayOfWeek === "Sun"
          ? weekendColor
          : "none"; // Darker color for weekends
      })
      .attr("opacity", 0.5);

    // Add holiday backgrounds
    chartSvg
      .selectAll(".holiday-background")
      .data(dates)
      .enter()
      .append("rect")
      .attr("class", "holiday-background")
      .attr("x", (d, i) => i * dayWidth)
      .attr("y", 0)
      .attr("width", dayWidth)
      .attr("height", activeRoomsData.length * rowHeight)
      .attr("fill", (d) =>
        isHoliday(d, holidayChecker, holidays) ? "lightblue" : "none"
      )
      .attr("opacity", 0.5);

    // Draw vertical grid lines for each day
    chartSvg
      .selectAll(".vertical-line")
      .data(dates)
      .enter()
      .append("line")
      .attr("x1", (d, i) => i * dayWidth)
      .attr("x2", (d, i) => i * dayWidth)
      .attr("y1", 0)
      .attr("y2", activeRoomsData.length * rowHeight) // Adjust based on room count
      .attr("stroke", strokeColor)
      .attr("stroke-width", 1);
  }, [
    chartStartDate,
    dayWidth,
    holidayChecker,
    holidays,
    numDays,
    activeRoomsData,
    chartHeight,
    tasks,
  ]);

  useEffect(() => {
    let scrollLeft = 0;
    let scrollTop = 0;

    const handleBeforePrint = () => {
      const scrollableContainer = scrollableRef.current;
      if (scrollableContainer) {
        scrollLeft = scrollableContainer.scrollLeft;
        scrollTop = scrollableContainer.scrollTop;

        // Apply the transform directly to the grid container for printing
        scrollableContainer.style.setProperty(
          "--print-translate-x",
          `-${scrollLeft}px`
        );

        // Add margin to the left column in print view
        const leftColumnHeader = leftColumnHeaderRef?.current?.parentElement;
        if (leftColumnHeader) {
          leftColumnHeader.style.setProperty(
            "--print-margin-left",
            `${scrollLeft}px`
          );
        }

        // Add margin to the left column in print view
        const leftColumn = leftColumnRef?.current?.parentElement;
        if (leftColumn) {
          leftColumn.style.setProperty(
            "--print-margin-left",
            `${scrollLeft}px`
          );
        }
      }
    };

    const handleAfterPrint = () => {
      const scrollableContainer = scrollableRef.current;
      if (scrollableContainer) {
        // Reset the transform and restore scroll position
        scrollableContainer.style.removeProperty("--print-translate-x");
        scrollableContainer.style.removeProperty("--print-translate-y");
        scrollableContainer.scrollLeft = scrollLeft;
        scrollableContainer.scrollTop = scrollTop;
      }
    };

    const leftColumnHeader = leftColumnHeaderRef?.current?.parentElement;
    if (leftColumnHeader) {
      leftColumnHeader.style.removeProperty("--print-margin-left");
    }

    const leftColumn = leftColumnRef?.current?.parentElement;
    if (leftColumn) {
      leftColumn.style.removeProperty("--print-margin-left");
    }

    window.addEventListener("beforeprint", handleBeforePrint);
    window.addEventListener("afterprint", handleAfterPrint);

    return () => {
      window.removeEventListener("beforeprint", handleBeforePrint);
      window.removeEventListener("afterprint", handleAfterPrint);
    };
  }, []);

  return (
    <div className="flex flex-col h-screen print:block print:h-auto print:overflow-visible">
      <div className="flex justify-start ml-2 md:justify-center md:ml-0">
        <h1 className="text-2xl font-bold">Forever Furniture Job Schedule</h1>
      </div>
      <ChartActionButtons
        scrollToMonday={scrollToMonday}
        setIsJobModalOpen={setIsJobModalOpen}
        setIsBuilderModalOpen={setIsBuilderModalOpen}
        setIsHolidayModalOpen={setIsHolidayModalOpen}
        setIsSettingsModalOpen={setIsSettingsModalOpen}
        leftColumnWidth={leftColumnWidth}
      />

      {!activeRoomsData || activeRoomsData.length === 0 ? (
        <div className="empty-state-container">
          <div className="empty-state-message">
            <h2>Welcome to your Project Dashboard!</h2>
            <p>You don't have any projects yet. </p>
            <p>
              <strong>Start</strong> by adding employees using the <br />
              <strong>Employees</strong> button.
            </p>
            <p>
              <strong>Then</strong> add projects by clicking on the <br />
              <strong>Add Job</strong> button.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-grow overflow-auto print:h-auto print:overflow-visible">
          <div
            className="grid overflow-auto flex-grow max-h-full print:h-auto print:overflow-visible print:transform print:origin-top-left"
            style={{
              gridTemplateColumns: `${leftColumnWidth}px ${
                dayWidth * numDays
              }px`,
              transform:
                "translate(var(--print-translate-x, 0), var(--print-translate-y, 0))",
            }}
            ref={scrollableRef}
          >
            <div className="sticky top-0 left-0 z-[40] print:relative print:ml-[var(--print-margin-left,0)]">
              <svg ref={leftColumnHeaderRef} />
            </div>
            <div className="bg-gray-200 sticky top-0 z-[20]">
              <svg ref={headerRef} />
            </div>

            <div className="sticky top-0 left-0 relative z-[30] print:relative print:ml-[var(--print-margin-left,0)]">
              <svg ref={leftColumnRef} />
            </div>
            <div className="relative z-10">
              <svg className="absolute top-0 left-0" ref={chartRef} />
              <TaskGroups
                chartRef={chartRef}
                barMargin={barMargin}
                chartHeight={chartHeight}
                numDays={numDays}
                handleAutoScroll={handleAutoScroll}
                setIsLoading={setIsLoading}
                chartStartDate={chartStartDate}
                daysBeforeStart={daysBeforeStart}
                rowHeight={rowHeight}
                workdayHours={workdayHours}
                holidayChecker={holidayChecker}
                dayWidth={dayWidth}
                scrollToMonday={scrollToMonday}
                onDatabaseError={handleDatabaseError}
              />
            </div>
          </div>
        </div>
      )}
      <div className="gantt-footer pb-2 pt-1">
        <BuilderLegend />
      </div>

      {isLoading && (
        <div className="loading-overlay">
          <GridLoader color="maroon" size={15} />
          <p>Loading Job Schedule...</p>
        </div>
      )}

      {databaseError && (
        <ErrorToast
          message={databaseError}
          onClose={() => setDatabaseError(null)}
        />
      )}

      <JobModalChartData
        key={isJobModalOpen ? "open" : "closed"}
        isOpen={isJobModalOpen}
        onClose={() => {
          setSelectedJob(null);
          setIsJobModalOpen(false);
        }}
        onSave={saveJob}
        jobData={selectedJob}
        subTasksByEmployee={subTasksByEmployee}
        timeOffByBuilder={timeOffByBuilder}
        holidayChecker={holidayChecker}
        holidays={holidays}
        workdayHours={workdayHours}
        chartStartDate={chartStartDate}
        dayWidth={dayWidth}
        lastJobsIndex={lastJobsIndex}
        clickedTask={clickedTask}
        setIsLoading={setIsLoading}
        onDatabaseError={handleDatabaseError}
      />

      <BuilderModal
        visible={isBuilderModalOpen}
        onCancel={() => setIsBuilderModalOpen(false)}
        holidays={holidays}
        holidayChecker={holidayChecker}
        workdayHours={workdayHours}
        chartStartDate={chartStartDate}
        dayWidth={dayWidth}
      />

      <HolidayModal
        isOpen={isHolidayModalOpen}
        onClose={() => setIsHolidayModalOpen(false)}
      />

      <ChartSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        onDatabaseError={handleDatabaseError}
      />
    </div>
  );
};
