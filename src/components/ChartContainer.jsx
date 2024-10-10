import React, { useEffect, useRef, useState, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import ChartActionButtons from "./ChartActionButtons";
import { addDays, differenceInCalendarDays, startOfWeek } from "date-fns";
import { GridLoader } from "react-spinners";
import { normalizeDate } from "../utils/dateUtils";
import * as d3 from "d3";
import Holidays from "date-holidays";
import { isHoliday } from "../utils/helpers";
import BuilderLegend from "./BuilderLegend";
import BuilderModal from "./BuilderModal";
import HolidayModal from "./HolidayModal";
import TaskGroups from "./TaskGroups";

export const ChartContainer = () => {
  const dispatch = useDispatch();

  const holidays = useSelector((state) => state.holidays.holidays);
  const { earliestStartDate, latestStartDate, chartData } = useSelector(
    (state) => state.chartData
  );

  const chartRef = useRef(null);
  const headerRef = useRef(null); // For the fixed header
  const leftColumnRef = useRef(null); // For the fixed left column
  const leftColumnHeaderRef = useRef(null); // For the fixed left column
  const scrollableRef = useRef(null);
  const leftScrollableRef = useRef(null);
  const timeOffSvgRef = useRef(null);

  const [holidayChecker, setHolidayChecker] = useState(null);
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [isBuilderModalOpen, setIsBuilderModalOpen] = useState(false);
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);

  const [isLoading, setIsLoading] = useState(false);

  const daysBeforeStart = 30;
  const daysAfterEnd = 60;
  const dayWidth = 30;
  const workdayHours = 8;
  const rowHeight = 25;
  const barMargin = 3;
  const headerTextGap = 5;
  const leftColumnWidth = 270;
  const chartHeight = chartData.length * rowHeight;

  const chartStartDate = useMemo(() => {
    return addDays(earliestStartDate, -daysBeforeStart);
  }, [earliestStartDate, daysBeforeStart]);

  const numDays = useMemo(() => {
    return (
      differenceInCalendarDays(latestStartDate, earliestStartDate) +
      daysBeforeStart +
      daysAfterEnd
    );
  }, [earliestStartDate, latestStartDate, daysBeforeStart, daysAfterEnd]);

  const scrollToMonday = (date) => {
    const normalizedDate = normalizeDate(date);
    const mondayOfThisWeek = startOfWeek(new Date(normalizedDate), {
      weekStartsOn: 1,
    }); // 1 represents Monday
    const diffDays = differenceInCalendarDays(mondayOfThisWeek, chartStartDate);
    const scrollPosition = diffDays * dayWidth;
    const ganttRightBody = document.querySelector(".gantt-right-body");

    setTimeout(() => {
      if (ganttRightBody) {
        ganttRightBody.scrollTo({
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
    if (clientX < left + buffer) {
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

    const weekendColor = "#c1c1c1"; // Darker color for weekends
    const alternateRowColors = ["#f9f9f9", "#e0e0e0"]; // Alternating colors for rows
    const strokeColor = "#bebebe"; // stroke color

    const chartWidth = numDays * dayWidth;

    // Create an array of dates for the column headers
    const dates = Array.from({ length: numDays }, (_, i) => {
      return addDays(chartStartDate, i);
    });

    const rightHeader = d3.select(".gantt-right-header");
    const rightBody = d3.select(".gantt-right-body");
    const leftBody = d3.select(".gantt-left-body");

    rightHeader.on("scroll", () => {
      rightBody.node().scrollLeft = rightHeader.node().scrollLeft;
    });

    rightBody.on("scroll", () => {
      rightHeader.node().scrollLeft = rightBody.node().scrollLeft;
      leftBody.node().scrollTop = rightBody.node().scrollTop;
    });

    leftBody.on("scroll", () => {
      rightBody.node().scrollTop = leftBody.node().scrollTop;
    });

    chartSvg.attr("width", chartWidth).attr("height", chartHeight);

    leftHeaderSvg.attr("width", leftColumnWidth).attr("height", 40);

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

    headerSvg.attr("width", numDays * dayWidth).attr("height", 40);

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

        const isWeekend = d.getDay() === 0 || d.getDay() === 6;
        const isHolidayDate = isHoliday(d, holidayChecker, holidays);

        // Append a rectangle for weekends
        if (isWeekend || isHolidayDate) {
          group
            .append("rect")
            .attr("x", i * dayWidth)
            .attr("y", 0)
            .attr("width", dayWidth)
            .attr("height", 40) // Adjust to cover the header
            .attr("fill", isHolidayDate ? "lightblue" : "#e0e0e0"); // Light blue for holidays, grey for weekends
        }
        group
          .append("text")
          .attr("x", i * dayWidth + headerTextGap)
          .attr("y", 10)
          .text(d3.timeFormat("%b")(d))
          .attr("fill", "#000")
          .attr("font-size", "11px")
          .attr("font-weight", "bold")
          .attr("text-anchor", "left");
        group
          .append("text")
          .attr("x", i * dayWidth + headerTextGap)
          .attr("y", 25)
          .text(d3.timeFormat("%d")(d))
          .attr("fill", "#000")
          .attr("font-size", "11px")
          .attr("font-weight", "bold")
          .attr("text-anchor", "left");

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

    // leftColumnSvg.on("dblclick", (event) => {
    //   const [x, y] = d3.pointer(event);
    //   const rowIndex = Math.floor(y / rowHeight); // Calculate which row was clicked based on y-coordinate
    //   const room = activeRoomsData[rowIndex]; // Get the room data based on the row index

    //   if (room) {
    //     const job = jobs.find((j) => j.id === room.jobId); // Find the job associated with the room
    //     handleRowDoubleClick(job); // Call the double-click handler with the job data
    //   }
    // });

    // Background rows
    leftColumnSvg
      .selectAll(".row-background")
      .data(chartData)
      .enter()
      .append("rect")
      .attr("x", 0)
      .attr("y", (d, i) => i * rowHeight)
      .attr("width", leftColumnWidth)
      .attr("height", rowHeight)
      .attr("fill", (d) =>
        d.jobsIndex % 2 === 0 ? alternateRowColors[0] : alternateRowColors[1]
      ); // Alternate colors

    const textGroups = leftColumnSvg
      .selectAll(".job-text-group")
      .data(chartData)
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
        .attr("y", rowHeight / 2)
        .text(d.jobNumber)
        .attr("fill", "#000")
        .attr("dominant-baseline", "middle");

      const jobNameText = group
        .append("text")
        .attr("class", "job-name")
        .attr("x", 50)
        .attr("y", rowHeight / 2)
        .text(d.jobName)
        .attr("fill", "#000")
        .attr("dominant-baseline", "middle");

      const roomNameText = group
        .append("text")
        .attr("class", "room-name")
        .attr("x", 130)
        .attr("y", rowHeight / 2)
        .text(d.name)
        .attr("fill", "#000")
        .attr("dominant-baseline", "middle");

      // // Add double-click event for job number and job name
      // jobNumberText.on("dblclick", (event) => {
      //   event.stopPropagation();
      //   const job = jobs.find((job) => job.id === d.jobId);
      //   setSelectedJob(job);
      //   setIsJobModalOpen(true);
      // });

      // jobNameText.on("dblclick", (event) => {
      //   event.stopPropagation();
      //   const job = jobs.find((job) => job.id === d.jobId);
      //   setSelectedJob(job);
      //   setIsJobModalOpen(true);
      // });

      // Add double-click event for room name
      roomNameText.on("dblclick", (event) => {
        event.stopPropagation();
        scrollToMonday(new Date(d.startDate));
      });
    });

    // Remove previous SVG elements
    chartSvg.selectAll("*").remove().append("rect");

    // Set SVG dimensions based on room count
    chartSvg.attr("width", chartWidth).attr("height", chartHeight);

    // Create row backgrounds for each room
    chartSvg
      .selectAll(".row-background")
      .data(chartData)
      .enter()
      .append("rect")
      .attr("x", 0)
      .attr("y", (d, i) => i * rowHeight)
      .attr("width", chartWidth)
      .attr("height", rowHeight)
      .attr("fill", (d) =>
        d.jobsIndex % 2 === 0 ? alternateRowColors[0] : alternateRowColors[1]
      ) // Alternate colors
      .attr("stroke", strokeColor) // Set stroke color for bottom border
      .attr("stroke-width", 1) // Set stroke width
      .attr("stroke-dasharray", `0,${rowHeight},${chartWidth},0`); // Apply stroke only to the bottom

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
      .attr("height", chartData.length * rowHeight) // Adjust height based on room count
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
      .attr("height", chartData.length * rowHeight)
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
      .attr("y2", chartData.length * rowHeight) // Adjust based on room count
      .attr("stroke", strokeColor)
      .attr("stroke-width", 1);

    // Add scrolling behavior for the chart
    const scrollableDiv = d3.select(scrollableRef.current);
    scrollableDiv.on("scroll", () => {
      const scrollLeft = scrollableDiv.node().scrollLeft;
      const scrollTop = scrollableDiv.node().scrollTop;

      headerSvg.attr("transform", `translate(${-scrollLeft}, 0)`);
      leftColumnSvg.attr("transform", `translate(0, ${-scrollTop})`);
    });

    const leftScrollableDiv = d3.select(leftScrollableRef.current);
    leftScrollableDiv.on("scroll", () => {
      const scrollTop = leftScrollableDiv.node().scrollTop;

      chartSvg.attr("transform", `translate(0, ${-scrollTop})`);
    });
  }, [chartStartDate, dayWidth, holidayChecker, holidays, numDays, chartData]);

  useEffect(() => {
    scrollToMonday(new Date());
  }, [])

  return (
    <div className="gantt-chart-container">
      <h1>Forever Furniture Job Schedule</h1>
      <ChartActionButtons
        scrollToMonday={scrollToMonday}
        setIsJobModalOpen={setIsJobModalOpen}
        setIsBuilderModalOpen={setIsBuilderModalOpen}
        setIsHolidayModalOpen={setIsHolidayModalOpen}
      />
      <div className="gantt-container">
        <div className="gantt-content">
          <div className="gantt-left">
            <div className="gantt-left-header">
              <svg ref={leftColumnHeaderRef} />
            </div>
            <div className="gantt-left-body">
              <svg ref={leftColumnRef} />
            </div>
          </div>
          <div className="gantt-right">
            <div className="gantt-right-header">
              <svg ref={headerRef} />
            </div>
            <div
              className="gantt-right-body"
              ref={scrollableRef}
            >
              <svg className="inner-chart chart-svg" ref={chartRef} />
              <TaskGroups
                chartRef={chartRef}
                barMargin={barMargin}
                chartHeight={chartHeight}
                numDays={numDays}
                handleAutoScroll={handleAutoScroll}
                setIsLoading={setIsLoading}
                chartStartDate={chartStartDate}
                rowHeight={rowHeight}
                workdayHours={workdayHours}
                holidayChecker={holidayChecker}
                dayWidth={dayWidth}
              />
            </div>
          </div>
        </div>
        <div className="gantt-footer">
          <BuilderLegend />
        </div>
      </div>

      {isLoading && (
        <div className="loading-overlay">
          <GridLoader color="maroon" size={15} />
          <p>Loading Job Schedule...</p>
        </div>
      )}

      {/* <JobModal
        key={isJobModalOpen ? "open" : "closed"}
        isOpen={isJobModalOpen}
        onClose={() => {
          setSelectedJob(null);
          setIsJobModalOpen(false);
        }}
        onSave={saveJob}
        jobData={selectedJob}
        jobsByBuilder={jobsByBuilder}
        timeOffByBuilder={timeOffByBuilder}
        holidayChecker={holidayChecker}
        holidays={holidays}
        workdayHours={workdayHours}
      /> */}
      <BuilderModal
        visible={isBuilderModalOpen}
        onCancel={() => setIsBuilderModalOpen(false)}
      />
      <HolidayModal
        isOpen={isHolidayModalOpen}
        onClose={() => setIsHolidayModalOpen(false)}
      />
    </div>
  );
};
