import React, {
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
} from "react";
import { useDispatch, useSelector } from "react-redux";
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
import { calculateXPosition, isHoliday } from "../utils/helpers";
import BuilderLegend from "./BuilderLegend";
import BuilderModal from "./BuilderModal";
import JobModalChartData from "./JobModalChartData";
import HolidayModal from "./HolidayModal";
import TaskGroups from "./TaskGroups";
import { eachDayOfInterval, parseISO } from "date-fns";
import ErrorToast from "./ErrorToast";
import ChartSettingsModal from "./ChartSettingsModal";
import EmployeeScheduleSpans from "./EmployeeScheduleSpans";
import EmployeeScheduleSpanLabels from "./EmployeeScheduleSpanLabels";
import { saveHolidays } from "../redux/actions/holidays";
import { usePermissions } from "../hooks/usePermissions";
import {
  headerButtonClass,
  headerButtonColor,
} from "../assets/tailwindConstants";
import { Actions } from "../redux/actions";
import DateRangeFilter from "./DateRangeFilter";

export const ChartContainer = () => {
  const dispatch = useDispatch();

  const holidays = useSelector((state) => state.holidays);
  const { chartData } = useSelector((state) => state.chartData);
  const { tasks, subTasksByEmployee } = useSelector((state) => state.taskData);
  const workdayHours = useSelector((state) => state.chartConfig.workday_hours);
  const { canEditSchedule } = usePermissions();

  const employees = useSelector((state) => state.builders.employees);
  const defaultEmployeeId = employees[0]?.employee_id;
  const [estimatedCompletionDate, setEstimatedCompletionDate] = useState("");

  const [holidayChecker, setHolidayChecker] = useState(null);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);
  const [dateFilter, setDateFilter] = useState({
    startDate: null,
    endDate: null,
  });

  const daysBeforeStart = 15;
  const daysAfterEnd = 15;
  const dayWidth = 30;

  useEffect(() => {
    const hd = new Holidays();
    hd.init("US"); // Initialize with US holidays. Change as needed.
    setHolidayChecker(hd);
  }, []);

  const { earliestStartDate, latestStartDate } = useMemo(() => {
    let earliest = new Date(8640000000000000);
    let latest = new Date(-8640000000000000);
    let hasAssignedTasks = false;

    chartData
      .filter((room) => room.task_active)
      .forEach((room) => {
        if (room.employee_id !== defaultEmployeeId) {
          hasAssignedTasks = true;
          const roomStartDate = parseISO(normalizeDate(room.start_date));
          const roomEndDate = parseISO(normalizeDate(room.end_date));

          if (roomStartDate < earliest) {
            earliest = roomStartDate;
          }
          if (roomEndDate > latest) {
            latest = roomEndDate;
          }
        }
      });

    return {
      earliestStartDate: hasAssignedTasks ? earliest : null,
      latestStartDate: hasAssignedTasks ? latest : null,
    };
  }, [chartData, defaultEmployeeId]); // Only recalculate when these dependencies change

  const { activeRoomsData, lastJobsIndex, someTaskAssigned } = useMemo(() => {
    let someTaskAssigned = false;

    const activeRooms = chartData
      .filter((room) => room.task_active)
      .map((room) => {
        if (room.employee_id !== defaultEmployeeId) {
          someTaskAssigned = true;
        }
        return room;
      });

    // Only apply filters if they are active
    const hasActiveFilters =
      selectedEmployeeIds.length > 0 ||
      dateFilter.startDate ||
      dateFilter.endDate;

    const taskHeights = {};
    const filteredRooms = hasActiveFilters
      ? activeRooms
          .filter((room) => {
            const passesEmployeeFilter =
              selectedEmployeeIds.length === 0 ||
              selectedEmployeeIds.includes(room.employee_id);

            // Convert dates once for efficiency
            const taskStartDate = normalizeDate(room.start_date);
            const taskEndDate = normalizeDate(room.end_date);

            // Handle date filtering with null cases
            let passesDateFilter = true;

            if (dateFilter.startDate || dateFilter.endDate) {
              const filterStart = dateFilter.startDate || '-infinity';
              const filterEnd = dateFilter.endDate || 'infinity';
              
              passesDateFilter =
                taskEndDate > filterStart &&
                ((taskStartDate >= filterStart &&
                  taskStartDate <= filterEnd) ||
                  (filterStart >= taskStartDate &&
                    filterStart <= filterEnd));
            }

            // If room passes filters, increment its task_id count
            if (passesEmployeeFilter && passesDateFilter) {
              taskHeights[room.task_id] = (taskHeights[room.task_id] || 0) + 1;
              return true;
            }
            return false;
          })
          .map((room, index, array) => ({
            ...room,
            heightAdjust:
              index > 0 && array[index - 1].task_id === room.task_id
                ? 0
                : taskHeights[room.task_id],
          }))
      : activeRooms;

    // Calculate jobsIndex after filtering
    let currentJobId = null;
    let jobsIndex = -1;
    const roomsWithJobsIndex = filteredRooms.map(room => {
      if (room.project_id !== currentJobId) {
        currentJobId = room.project_id;
        jobsIndex++;
      }
      return {
        ...room,
        jobsIndex
      };
    });

    return {
      activeRoomsData: roomsWithJobsIndex,
      lastJobsIndex: jobsIndex,
      someTaskAssigned,
    };
  }, [chartData, defaultEmployeeId, selectedEmployeeIds, dateFilter]);

  useEffect(() => {
    if (earliestStartDate) {
      dispatch({
        type: Actions.chartData.UPDATE_CHART_START_DATE,
        payload: subDays(earliestStartDate, daysBeforeStart),
      });
    }
  }, [earliestStartDate, dispatch]);

  const chartRef = useRef(null);
  const leftColumnRef = useRef(null); // For the fixed left column
  const leftColumnHeaderRef = useRef(null); // For the fixed left column header
  const headerRef = useRef(null); // For the fixed header
  const monthHeaderRef = useRef(null); // Add new ref for month header
  const scrollableRef = useRef(null);
  const timeOffSvgRef = useRef(null);
  const employeesScheduledRef = useRef(null);

  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [isBuilderModalOpen, setIsBuilderModalOpen] = useState(false);
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [clickedTask, setClickedTask] = useState(null);
  const [databaseError, setDatabaseError] = useState(null);
  const [isExpanded, setIsExpanded] = useState(true);

  const [isLoading, setIsLoading] = useState(false);

  const rowHeight = 25;
  const barMargin = 3;
  const chartHeight = activeRoomsData.reduce(
    (total, room) => total + room.heightAdjust * rowHeight,
    0
  );
  const spanBarHeight = 6;

  const employeesScheduledHeight = useMemo(() => {
    return employees.reduce((total, employee) => {
      if (!employee.can_schedule) return total;
      return (
        total +
        (employee.scheduling_conflicts.length > 0
          ? rowHeight - spanBarHeight
          : spanBarHeight)
      );
    }, 0);
  }, [employees, rowHeight, spanBarHeight]);

  const monthHeaderHeight = 20;
  const dayHeaderHeight = 25;
  const headerHeight = monthHeaderHeight + dayHeaderHeight;
  const headerTextGap = 5;
  const alternateMonthColors = ["bg-slate-200", "bg-slate-300"];

  const leftColumnWidth = 280;
  const employeeColorWidth = 5;

  const timeOffByBuilder = useMemo(() => {
    return employees.reduce((acc, builder) => {
      acc[builder.employee_id] = builder.time_off.flatMap((period) =>
        eachDayOfInterval({
          start: normalizeDate(new Date(period.start)),
          end: normalizeDate(new Date(period.end)),
        }).map((day) => normalizeDate(day))
      );
      return acc;
    }, {});
  }, [employees]);

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

  // Create an array of dates for the column headers
  const dates = useMemo(() => {
    return Array.from({ length: numDays }, (_, i) => {
      const date = addDays(parseISO(normalizeDate(chartStartDate)), i);
      return date;
    });
  }, [numDays, chartStartDate]);

  const monthHeaders = useMemo(() => {
    const months = new Set();
    let currentMonth = null;
    let monthStartIndex = 0;

    dates.forEach((date, index) => {
      const monthKey = format(date, "MMMM yyyy");
      const monthNumber = parseInt(format(date, "M")); // Get month number (1-12)

      if (monthKey !== currentMonth) {
        if (currentMonth) {
          months.add({
            key: currentMonth,
            monthNumber,
            startDate: dates[monthStartIndex],
            width: (index - monthStartIndex) * dayWidth,
            xPosition: monthStartIndex * dayWidth,
          });
        }
        currentMonth = monthKey;
        monthStartIndex = index;
      }

      // If this is the last date, add the final month
      if (index === dates.length - 1) {
        months.add({
          key: currentMonth,
          monthNumber,
          startDate: dates[monthStartIndex],
          width: (index - monthStartIndex + 1) * dayWidth,
          xPosition: monthStartIndex * dayWidth,
        });
      }
    });

    return Array.from(months);
  }, [dates, dayWidth]);

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
    const chartSvg = d3.select(chartRef.current);
    chartSvg.selectAll("*").remove(); // Clear previous SVG content

    const leftColumnSvg = d3.select(leftColumnRef.current);
    leftColumnSvg.selectAll("*").remove();

    const leftHeaderSvg = d3.select(leftColumnHeaderRef.current);
    leftHeaderSvg.selectAll("*").remove();

    const monthHeaderSvg = d3.select(monthHeaderRef.current);
    monthHeaderSvg.selectAll("*").remove();

    const headerSvg = d3.select(headerRef.current);
    headerSvg.selectAll("*").remove();

    const employeesScheduledSvg = d3.select(employeesScheduledRef.current);
    employeesScheduledSvg.selectAll("*").remove();

    const timeOffSvg = d3.select(timeOffSvgRef.current);
    timeOffSvg.selectAll("*").remove();

    const weekendColor = "#b9c0c9"; // Darker color for weekends
    const alternateRowColors = ["#f9f9f9", "#e5e7eb"]; // Alternating colors for rows
    const alternateAttentionColors = ["#faf16e", "#f3e520"];
    const strokeColor = "#aab1ba"; // stroke color

    const chartWidth = numDays * dayWidth || 300;

    const headerDatesVisibleHeight = isExpanded
      ? dayHeaderHeight + employeesScheduledHeight
      : dayHeaderHeight;

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

    headerSvg
      .attr("width", numDays * dayWidth)
      .attr("height", headerDatesVisibleHeight);

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
            .attr("height", headerDatesVisibleHeight) // Adjust to cover the header
            .attr("fill", isHolidayDate ? "lightblue" : weekendColor); // Light blue for holidays, grey for weekends
        }

        // Date number
        group
          .append("text")
          .attr("x", i * dayWidth + headerTextGap)
          .attr("y", 13)
          .text(d3.timeFormat("%d")(d))
          .attr("fill", "#000")
          .attr("font-size", "14px")
          .attr("font-weight", "bold")
          .attr("text-anchor", "left");

        // Day of the week
        group
          .append("text")
          .attr("x", i * dayWidth + headerTextGap)
          .attr("y", 23) // Adjust vertical position for day of the week
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
        const employee = employees.find((b) => b.employee_id === d.employee_id);
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
        const job = tasks.filter((task) => task.project_id === d.project_id); // Find the job associated with the room
        setSelectedJob(job);
        setClickedTask(d);
        setIsJobModalOpen(true);
      });

      jobNameText.on("dblclick", (event) => {
        event.stopPropagation();
        const job = tasks.filter((task) => task.project_id === d.project_id); // Find the job associated with the room
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
    employees,
    holidayChecker,
    isExpanded,
    holidays,
    numDays,
    activeRoomsData,
    chartHeight,
    tasks,
  ]);

  useEffect(() => {
    if (holidays?.customHolidays?.length) {
      const filteredCustomHolidays = holidays.customHolidays.filter(
        (holiday) =>
          holiday.name.localeCompare(normalizeDate(chartStartDate)) >= 0
      );

      // If we filtered out any holidays, update them
      if (filteredCustomHolidays.length !== holidays.customHolidays.length) {
        dispatch(
          saveHolidays(holidays.standardHolidays, filteredCustomHolidays)
        );
      }
    }
  }, [chartStartDate, holidays?.customHolidays, holidays?.standardHolidays]);

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

  const calculateEmployeePositions = useMemo(() => {
    // First pass: Calculate employee data with yPositions
    let currentY = spanBarHeight / 2;
    const employeeData = employees
      .filter(
        (emp) => emp.employee_id !== defaultEmployeeId && emp.can_schedule
      )
      .reduce((acc, employee) => {
        acc[employee.employee_id] = {
          employeeId: employee.employee_id,
          color: employee.employee_color,
          yPosition: currentY,
          height:
            employee.scheduling_conflicts?.length > 0
              ? rowHeight - spanBarHeight
              : spanBarHeight,
          scheduling_conflicts: employee.scheduling_conflicts,
        };
        currentY += acc[employee.employee_id].height;
        return acc;
      }, {});

    // Second pass: Create segments array
    const segments = [];
    Object.entries(subTasksByEmployee).forEach(([employee_id, tasks]) => {
      if (+employee_id === defaultEmployeeId || tasks.length === 0) return;

      const employee = employeeData[employee_id];
      if (!employee) return;

      let currentSegment = {
        startTask: tasks[0],
        endTask: tasks[0],
      };

      // Process each task to create segments
      for (let i = 1; i < tasks.length; i++) {
        const task = tasks[i];

        if (task.hard_start_date) {
          // End current segment and start new one
          const startXPosition = calculateXPosition(
            normalizeDate(currentSegment.startTask.start_date),
            normalizeDate(chartStartDate),
            dayWidth
          );

          const endXPosition = calculateXPosition(
            normalizeDate(currentSegment.endTask.start_date),
            normalizeDate(chartStartDate),
            dayWidth
          );

          segments.push({
            employeeId: employee_id,
            color: employee.color,
            yPosition: employee.yPosition,
            height: employee.height,
            xPosition: startXPosition,
            width:
              endXPosition +
              currentSegment.endTask.subtask_width -
              startXPosition,
          });

          // Start new segment
          currentSegment = {
            startTask: task,
            endTask: task,
          };
        } else {
          // Extend current segment
          currentSegment.endTask = task;
        }
      }

      // Add the final segment
      const startXPosition = calculateXPosition(
        normalizeDate(currentSegment.startTask.start_date),
        normalizeDate(chartStartDate),
        dayWidth
      );

      const endXPosition = calculateXPosition(
        normalizeDate(currentSegment.endTask.start_date),
        normalizeDate(chartStartDate),
        dayWidth
      );

      segments.push({
        employeeId: employee_id,
        color: employee.color,
        yPosition: employee.yPosition,
        height: employee.height,
        xPosition: startXPosition,
        width:
          endXPosition + currentSegment.endTask.subtask_width - startXPosition,
      });
    });

    return {
      employeeData: Object.values(employeeData),
      segments,
    };
  }, [
    employees,
    subTasksByEmployee,
    chartStartDate,
    dayWidth,
    defaultEmployeeId,
    rowHeight,
    spanBarHeight,
  ]);

  const updateChartState = useCallback(
    ({ selectedEmployeeIds: newEmployeeIds, dateRange }) => {
      if (newEmployeeIds !== undefined) {
        setSelectedEmployeeIds(newEmployeeIds);
      }
      if (dateRange !== undefined) {
        setDateFilter(dateRange);
      }
    },
    []
  );

  return (
    <div className="flex flex-col h-[calc(100vh-50px)] print:block print:h-auto print:overflow-visible">
      <div className="fixed right-0 top-0 h-[50px] z-[100] flex print:hidden">
        <button
          className={`${headerButtonClass} ${headerButtonColor}`}
          onClick={() => scrollToMonday(new Date())}
        >
          Scroll to Today
        </button>
        {canEditSchedule && (
          <button
            className={`${headerButtonClass} ${headerButtonColor}`}
            onClick={() => setIsJobModalOpen(true)}
          >
            Add Project
          </button>
        )}
      </div>
      {!activeRoomsData || activeRoomsData.length === 0 ? (
        <div className="empty-state-container">
          <div className="empty-state-message mt-8">
            <h2>Welcome to your Project Dashboard!</h2>
            <p>You don't have any projects yet. </p>
            <br />
            <p>
              <strong>Start</strong> by adding employee types using the <br />
              <strong>Settings</strong> button.
            </p>
            <br />
            <p>
              <strong>Then</strong> add employees using the <br />
              <strong>Employees</strong> button.
            </p>
            <br />
            <p>
              <strong>Finally</strong>, add projects by clicking on the <br />
              <strong>Add Job</strong> button.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-grow overflow-auto print:h-auto print:overflow-visible">
          <div className="relative">
            {/* Fixed conflict text */}
            {isExpanded &&
              calculateEmployeePositions.employeeData.map((span, index) => {
                const employee = employees.find(
                  (emp) => emp.employee_id === span.employeeId
                );
                if (!employee?.scheduling_conflicts?.length) return null;

                return (
                  <div
                    key={span.employeeId}
                    className="flex gap-5 absolute text-white text-sm whitespace-nowrap z-[22]"
                    style={{
                      top: span.yPosition + headerHeight,
                      left: leftColumnWidth + 6,
                    }}
                  >
                    {employee.scheduling_conflicts.map(
                      (conflict, conflictIndex) => (
                        <div
                          key={`${span.employeeId}-${conflictIndex}`}
                          className="px-1"
                          style={{
                            backgroundColor:
                              index % 2 === 0 ? "black" : "white",
                            color: index % 2 === 0 ? "white" : "black",
                            height: rowHeight - spanBarHeight,
                          }}
                        >
                          {`${conflict.project_name} ${conflict.conflicting_task} overlaps ${conflict.overlaps_project} ${conflict.overlaps_task}`}
                        </div>
                      )
                    )}
                  </div>
                );
              })}
          </div>

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
            <div className="sticky top-0 left-0 z-[40] print:relative print:ml-[var(--print-margin-left,0)] relative">
              <svg ref={leftColumnHeaderRef} />
              {someTaskAssigned && (
                <div
                  className="bg-gray-200 absolute top-0 right-0 z-[41] w-1/6 flex items-center justify-center cursor-pointer"
                  style={{ height: `${headerHeight}px` }}
                  onClick={() => setIsExpanded(!isExpanded)}
                >
                  <svg
                    className={`w-6 h-6 transition-transform duration-300 ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              )}
              {someTaskAssigned && (
                <div
                  className={`overflow-hidden ${
                    isExpanded ? "opacity-100 z-[21]" : "opacity-0 h-0"
                  } absolute bottom-0`}
                  style={{
                    height: isExpanded ? `${employeesScheduledHeight}px` : 0,
                  }}
                >
                  <EmployeeScheduleSpanLabels
                    leftColumnWidth={leftColumnWidth}
                    employeesScheduledHeight={employeesScheduledHeight}
                    spanBarHeight={spanBarHeight}
                    rowHeight={rowHeight}
                  />
                </div>
              )}
            </div>
            {someTaskAssigned && (
              <div className="bg-gray-200 sticky top-0 z-[20] relative">
                <div
                  className="flex"
                  style={{ height: `${monthHeaderHeight}px` }}
                >
                  {monthHeaders.map((month) => (
                    <div
                      key={month.key}
                      className={`flex items-center font-bold text-md ${
                        alternateMonthColors[month.monthNumber % 2]
                      } text-nowrap`}
                      style={{
                        width: `${month.width}px`,
                        height: `${monthHeaderHeight}px`,
                        borderRight: "1px solid #e5e7eb",
                        printColorAdjust: "exact",
                        WebkitPrintColorAdjust: "exact",
                        MozPrintColorAdjust: "exact",
                      }}
                    >
                      <div
                        className="sticky px-2"
                        style={{
                          left: `${leftColumnWidth}px`,
                        }}
                      >
                        {month.key}
                      </div>
                    </div>
                  ))}
                </div>

                <svg ref={headerRef} />

                <div
                  className={`overflow-hidden ${
                    isExpanded ? "opacity-100 z-[21]" : "opacity-0 h-0"
                  } absolute bottom-0`}
                  style={{
                    height: isExpanded ? `${employeesScheduledHeight}px` : 0,
                  }}
                >
                  <EmployeeScheduleSpans
                    chartRef={chartRef}
                    chartStartDate={chartStartDate}
                    numDays={numDays}
                    dayWidth={dayWidth}
                    leftColumnWidth={leftColumnWidth}
                    spanBarHeight={spanBarHeight}
                    rowHeight={rowHeight}
                    employeePositions={calculateEmployeePositions.segments}
                    employeesScheduledHeight={employeesScheduledHeight}
                  />
                </div>
              </div>
            )}

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
                setEstimatedCompletionDate={setEstimatedCompletionDate}
                earliestStartDate={earliestStartDate}
                selectedEmployeeIds={selectedEmployeeIds}
                dateFilter={dateFilter}
              />
            </div>
          </div>
        </div>
      )}
      <div className="flex gantt-footer pb-2 pt-1">
        <div
          className="flex items-center justify-center px-2 font-bold print:invisible"
          style={{ width: `${leftColumnWidth}px` }}
        >
          {estimatedCompletionDate &&
            `Booked Out: ${format(estimatedCompletionDate, "MMM d, yyyy")}`}
        </div>
        <div className="flex justify-between flex-grow">
          {activeRoomsData?.length > 0 && (
            <>
              <BuilderLegend
                selectedEmployeeIds={selectedEmployeeIds}
                onEmployeeFilter={(employeeIds) =>
                  updateChartState({ selectedEmployeeIds: employeeIds })
                }
              />
              <DateRangeFilter
                onFilterChange={(dateRange) => updateChartState({ dateRange })}
                setSelectedEmployeeIds={setSelectedEmployeeIds}
              />
            </>
          )}
        </div>
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
        workdayHours={workdayHours}
        holidayChecker={holidayChecker}
        dayWidth={dayWidth}
        chartStartDate={chartStartDate}
      />

      <ChartSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        onDatabaseError={handleDatabaseError}
      />
    </div>
  );
};
