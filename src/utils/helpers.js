import {
  startOfWeek,
  isSameDay,
  subWeeks,
  parseISO,
  addDays,
  isSaturday,
  isSunday,
  differenceInCalendarDays,
} from "date-fns";
import { normalizeDate } from "./dateUtils";

export const getChartData = (jobData) => {
  let positionCounter = 0;
  let earliestStartDate = new Date(8640000000000000); // Initialize with max date
  let latestStartDate = new Date(-8640000000000000); // Initialize with min date

  const taskList = jobData.flatMap((job) => {
    return job.rooms.flatMap((room) => {
      const workPeriods = room.workPeriods.length;
      return room.workPeriods.map((workPeriod, workPeriodIndex) => {
        const wpStartDate = new Date(workPeriod.start_date);
        const rowNumber = positionCounter++;

        // Update earliest and latest start dates
        if (wpStartDate < earliestStartDate) {
          earliestStartDate = wpStartDate;
        }
        if (wpStartDate > latestStartDate) {
          latestStartDate = wpStartDate;
        }

        return {
          ...workPeriod,
          roomId: room.id,
          taskName: room.name,
          project_id: job.id,
          project_name: job.project_name,
          rowNumber,
          jobNumber: room.jobNumber,
          project_created_at: job.project_created_at,
          project_scheduled_at: job.project_scheduled_at,
          heightAdjust: workPeriodIndex === 0 ? workPeriods : 0,
          task_created_at: room.task_created_at,
          active: room.active,
        };
      });
    });
  });

  return {
    taskList,
    earliestStartDate,
    latestStartDate,
  };
};

export const getTaskData = (jobData) => {
  let positionCounter = 0;
  let multiWorkPeriodRooms = [];

  const tasks = jobData.flatMap((job, jobsIndex) => {
    return job.rooms.flatMap((room, roomIndex) => {
      const rowNumber = positionCounter++;
      const workPeriods = room.workPeriods.length;
      if (room.workPeriods.length > 1) {
        multiWorkPeriodRooms.push(room);
      }

      return room.workPeriods.map((workPeriod, workPeriodIndex) => {
        return {
          ...workPeriod,
          jobId: job.id,
          jobName: job.name,
          jobNumber: room.jobNumber,
          roomId: room.id,
          taskName: room.name,
          jobsIndex,
          task_created_at: room.task_created_at,
          roomIndex,
          project_created_at: job.project_created_at,
          project_scheduled_at: job.project_scheduled_at,
          workPeriodIndex,
          subtask_width: workPeriod.subtask_width,
          rowNumber,
          active: room.active,
          task_created_at: room.task_created_at,
          heightAdjust: workPeriodIndex === 0 ? workPeriods : 0,
        };
      });
    });
  });

  // Group work periods by builderId
  const subTasksByEmployee = tasks.reduce((acc, workPeriod) => {
    const builderId = workPeriod.employee_id;
    if (!acc[builderId]) {
      acc[builderId] = [];
    }
    acc[builderId].push(workPeriod);
    return acc;
  }, {});

  // Sort tasks within each builder group by start_date
  Object.keys(subTasksByEmployee).forEach((builderId) => {
    subTasksByEmployee[builderId].sort(
      (a, b) => new Date(a.start_date) - new Date(b.start_date)
    );
  });

  return { tasks, subTasksByEmployee, multiWorkPeriodRooms };
};

export const binarySearch = (arr, target) => {
  let left = 0;
  let right = arr.length - 1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const comparison = arr[mid].start_date.localeCompare(target.start_date);

    if (comparison === 0) {
      // If dates are equal, respect draggedLeft for positioning
      return target.draggedLeft ? mid : mid + 1;
    }
    if (comparison < 0) left = mid + 1;
    else right = mid - 1;
  }
  return left;
};

export const getPreviousMonday = (dateInput) => {
  // Parse the date if it's a string, otherwise use it as is
  const inputDate =
    typeof dateInput === "string" ? parseISO(dateInput) : dateInput;

  const normalizedDate = normalizeDate(inputDate);
  const startOfCurrentWeek = startOfWeek(normalizedDate, { weekStartsOn: 1 }); // 1 represents Monday

  // If the input date is already a Monday, return it
  if (isSameDay(normalizedDate, startOfCurrentWeek)) {
    return normalizedDate;
  }

  // Otherwise, return the previous Monday
  return normalizeDate(subWeeks(startOfCurrentWeek, 1));
};

// export const isHoliday = (date, holidayChecker, holidays) => {
//   if (!holidayChecker) return false;
//   const normalizedDate = normalizeDate(date);
//   const holiday = holidayChecker.isHoliday(normalizedDate);
//   return holiday && holidays.some((h) => h.name === holiday[0].name);
// };
export const isHoliday = (
  date,
  holidayChecker,
  { standardHolidays, customHolidays }
) => {
  if (!date) return false;

  const normalizedDate = normalizeDate(date);

  // Check custom holidays first
  if (customHolidays?.length > 0) {
    const isCustomHoliday = customHolidays.some((holiday) =>
      isSameDay(parseISO(holiday.name), parseISO(normalizedDate))
    );
    if (isCustomHoliday) return true;
  }

  // Then check standard holidays
  if (holidayChecker && standardHolidays?.length > 0) {
    const holiday = holidayChecker.isHoliday(normalizedDate);
    return holiday && standardHolidays.some((h) => h.name === holiday[0].name);
  }

  return false;
};

export const getNextWorkday = (
  date,
  holidayChecker,
  holidays,
  builderId,
  timeOffByBuilder = {}
) => {
  let nextDay = normalizeDate(date);

  while (
    isSaturday(nextDay) ||
    isSunday(nextDay) ||
    isHoliday(nextDay, holidayChecker, holidays) ||
    (builderId &&
      timeOffByBuilder[builderId]?.some((timeOffDate) =>
        isSameDay(normalizeDate(new Date(timeOffDate)), nextDay)
      ))
  ) {
    nextDay = normalizeDate(addDays(nextDay, 1));
  }
  return nextDay;
};

export const totalJobHours = (
  start_date,
  jobHours,
  workdayHours,
  holidayChecker,
  holidays,
  builderId,
  timeOffByBuilder = {}
) => {
  let currentDate = normalizeDate(start_date);

  // Calculate total days based on jobHours (e.g., 16 hours = 2 days)
  let totalDays = Math.ceil(jobHours / workdayHours);

  // Loop through each day in the range based on totalDays
  for (let i = 0; i < totalDays; i++) {
    // Check if the current day is a weekend
    const isTimeOff =
      builderId && timeOffByBuilder[builderId]
        ? timeOffByBuilder[builderId].some((timeOffDate) =>
            isSameDay(normalizeDate(new Date(timeOffDate)), currentDate)
          )
        : false;

    if (
      isSaturday(currentDate) ||
      isSunday(currentDate) ||
      isHoliday(currentDate, holidayChecker, holidays) ||
      isTimeOff
    ) {
      jobHours += 8;
      totalDays += 1;
    }
    // Move to the next day
    currentDate = addDays(currentDate, 1);
  }

  return Math.ceil(jobHours / workdayHours) * workdayHours; // Total job hours
};

export const calculateAdjustedWidth = (
  startDate,
  requestedWidth,
  dayWidth,
  holidayChecker,
  holidays,
  builderId,
  timeOffByBuilder = {},
  workdayHours
) => {
  const requestedDays = Math.max(1, Math.ceil(requestedWidth / dayWidth));
  let currentDate = parseISO(normalizeDate(startDate));
  let nonWorkDays = 0;

  // Count non-work days within the requested range
  for (let i = 0; i < requestedDays; i++) {
    const isTimeOff =
      builderId && timeOffByBuilder[builderId]
        ? timeOffByBuilder[builderId].some((timeOffDate) => {
            const normalizedTimeOff = parseISO(timeOffDate);
            return isSameDay(normalizedTimeOff, currentDate);
          })
        : false;

    if (
      isSaturday(currentDate) ||
      isSunday(currentDate) ||
      isHoliday(currentDate, holidayChecker, holidays) ||
      isTimeOff
    ) {
      nonWorkDays++;
    }

    currentDate = addDays(currentDate, 1);
  }

  const workDays = Math.max(1, requestedDays - nonWorkDays);
  return workDays * workdayHours;
};

// export const calculateXPosition = (
// 	jobStartDate,
// 	chartStartDate,
// 	dayWidth = 30
// ) => {
// 	const normalizedJobStartDate = normalizeDate(jobStartDate);
// 	const normalizedChartStartDate = normalizeDate(chartStartDate);
// 	const diffInDays = differenceInCalendarDays(
// 		normalizedJobStartDate,
// 		normalizedChartStartDate
// 	);
// 	return diffInDays * dayWidth;
// };

export const calculateXPosition = (
  jobStartDate,
  chartStartDate,
  dayWidth = 30
) => {
  // Ensure we're working with normalized date strings
  const normalizedJobStartDate = normalizeDate(jobStartDate);
  const normalizedChartStartDate = normalizeDate(chartStartDate);

  // Parse the normalized dates
  const jobDate = parseISO(normalizedJobStartDate);
  const chartDate = parseISO(normalizedChartStartDate);

  // Create UTC dates for comparison
  const jobUTC = new Date(
    Date.UTC(jobDate.getFullYear(), jobDate.getMonth(), jobDate.getDate())
  );

  const chartUTC = new Date(
    Date.UTC(chartDate.getFullYear(), chartDate.getMonth(), chartDate.getDate())
  );

  const diffInDays = differenceInCalendarDays(jobUTC, chartUTC);
  return diffInDays * dayWidth;
};

export const sortAndAdjustDates = (
  jobsArray,
  workdayHours,
  holidayChecker,
  holidays,
  timeOffByBuilder,
  dayWidth = 30,
  chartStartDate,
  skipSort = false
) => {
  let arrayToProcess = [...jobsArray];
  let conflicts = [];

  // Create a timeline map to track hard_start_dates
  const timeline = new Map();

  // Sort the array by date
  if (!skipSort) {
    arrayToProcess.sort((a, b) => {
      // Track hard_start_dates in the timeline while sorting
      if (a.hard_start_date) {
        timeline.set(normalizeDate(a.start_date), {
          task_name: a.task_name,
          subtask_id: a.subtask_id,
          project_name: a.project_name,
        });
      }
      if (b.hard_start_date) {
        timeline.set(normalizeDate(b.start_date), {
          task_name: b.task_name,
          subtask_id: b.subtask_id,
          project_name: b.project_name,
        });
      }

      const dateComparison = a.start_date.localeCompare(b.start_date);
      if (dateComparison === 0) {
        // If dates are equal, prioritize hard start dates
        if (a.hard_start_date && !b.hard_start_date) return -1;
        if (!a.hard_start_date && b.hard_start_date) return 1;

        // If both have same hard_start_date status, consider drag direction
        if (a.isDragged) {
          return a.draggedLeft ? -1 : 1; // Go first if dragged left, last if dragged right
        }
        if (b.isDragged) {
          return b.draggedLeft ? 1 : -1; // Go last if dragged left, first if dragged right
        }
      }
      return dateComparison;
    });
  }

  // Adjust the dates and calculate endDates
  const tasks = arrayToProcess.reduce((acc, current, index, array) => {
    const initialStartDate = normalizeDate(current.start_date);
    const nextElement = array[index + 1];

    // Calculate current element's dates first
    const start_date =
      index === 0 || current.hard_start_date
        ? initialStartDate
        : normalizeDate(
            getNextWorkday(
              acc[acc.length - 1].end_date,
              holidayChecker,
              holidays,
              current.employee_id,
              timeOffByBuilder
            )
          );

    const jobHours = totalJobHours(
      start_date,
      current.duration,
      workdayHours,
      holidayChecker,
      holidays,
      current.employee_id,
      timeOffByBuilder
    );

    const end_date = normalizeDate(
      addDays(start_date, Math.ceil(jobHours / workdayHours))
    );

    // Check for conflicts with hard start dates
    const taskConflicts = Array.from(timeline.entries())
      .filter(
        ([date, info]) =>
          !current.hard_start_date && // Don't check hard start tasks against themselves
          info.subtask_id !== current.subtask_id && // Don't check against self
          new Date(end_date) > new Date(date) && // Task ends after hard start date
          new Date(start_date) < new Date(date) // Task starts before hard start date
      )
      .map(([date, info]) => ({
        conflicting_task: current.task_name,
        project_name: current.project_name,
        overlaps_task: info.task_name,
        overlaps_project: info.project_name,
        hard_start_date: date,
        subtask_id: info.subtask_id,
      }));

    // Add any conflicts found to our list
    if (taskConflicts.length > 0) {
      conflicts.push(...taskConflicts);
    }

    // Create new task object without isDragged flag
    const { isDragged, ...taskWithoutDragFlag } = current;

    const currentTask = {
      ...taskWithoutDragFlag,
      start_date,
      end_date,
      subtask_width: (jobHours / workdayHours) * dayWidth,
      xPosition: calculateXPosition(start_date, chartStartDate, dayWidth),
    };

    // Check if next element has hard_start_date and would overlap with current
    if (
      nextElement?.hard_start_date &&
      normalizeDate(nextElement.start_date) === start_date
    ) {
      // Add the hard_start_date element first with its original dates
      acc.push(nextElement);

      // Then add current element with adjusted start_date based on hard_start_date element
      const adjustedStartDate = normalizeDate(
        getNextWorkday(
          nextElement.end_date,
          holidayChecker,
          holidays,
          current.employee_id,
          timeOffByBuilder
        )
      );

      acc.push({
        ...currentTask,
        start_date: adjustedStartDate,
        end_date: normalizeDate(
          addDays(adjustedStartDate, Math.ceil(jobHours / workdayHours))
        ),
        xPosition: calculateXPosition(
          adjustedStartDate,
          chartStartDate,
          dayWidth
        ),
      });

      // Skip the next element since we already processed it
      array.splice(index + 1, 1);
    } else {
      // Add current element normally
      acc.push(currentTask);
    }

    return acc;
  }, []);

  return { tasks, conflicts };
};

// Function to reconstruct the job structure for Redux
export const reconstructJobsForRedux = (flatJobs) => {
  const jobMap = {};
  flatJobs.forEach((job) => {
    if (!jobMap[job.project_id]) {
      jobMap[job.project_id] = {
        id: job.project_id,
        name: job.jobName,
        rooms: [],
      };
    }
    jobMap[job.project_id].rooms.push({
      id: job.id,
      builderId: job.employee_id,
      start_date: job.start_date,
      duration: job.duration,
      jobNumber: job.jobNumber,
      name: job.name,
      active: job.active,
    });
  });
  return Object.values(jobMap);
};

export const calculateFinancialTotals = (
  sections,
  chartConfig,
  adjustments = null
) => {
  const totals = sections.reduce(
    (acc, section) => {
      if (section.id === "hours") {
        // For hours section, sum up the actual costs from each type
        const actualTotal =
          section.data?.reduce(
            (sum, typeData) => sum + (typeData.actual_cost || 0),
            0
          ) || 0;

        // For estimate, multiply estimated hours by employee type rates and add fixed amounts
        const estimateTotal =
          section.data?.reduce((typeAcc, typeData) => {
            const employeeType = chartConfig.employee_type?.find(
              (type) => type.id === typeData.type_id
            );
            const hourlyEstimate =
              (typeData.estimate || 0) * (employeeType?.rate || 0);
            const fixedAmount = typeData.fixedAmount || 0;
            return typeAcc + hourlyEstimate + fixedAmount;
          }, 0) || 0;

        return {
          ...acc,
          actual: acc.actual + actualTotal,
          estimate: acc.estimate + estimateTotal,
        };
      } else {
        // For non-hours sections, calculate actual from input rows
        const actualTotal = (section.inputRows || []).reduce(
          (sum, row) => sum + (row.cost || 0),
          0
        );

        return {
          ...acc,
          actual: acc.actual + actualTotal,
          estimate: acc.estimate + (section.estimate || 0),
        };
      }
    },
    { actual: 0, estimate: 0 }
  );

  if (adjustments) {
    // Calculate final totals with adjustments
    const subtotal = totals.estimate;
    const profitAmount = subtotal * (adjustments.profit / 100);
    const commissionAmount = subtotal * (adjustments.commission / 100);
    const discountAmount = subtotal * (adjustments.discount / 100);
    // Round up to nearest 5
    const adjustedEstimate =
      Math.ceil(
        (subtotal + profitAmount + commissionAmount - discountAmount) / 5
      ) *
      5 *
      adjustments.quantity;

    return {
      subtotal,
      total: adjustedEstimate,
      actual: totals.actual,
    };
  }

  return totals;
};
