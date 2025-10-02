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

export const getNextWorkday = (
  date,
  holidayMap,
  builderId,
  timeOffByBuilder = {}
) => {
  let nextDay = normalizeDate(date);

  while (
    isSaturday(nextDay) ||
    isSunday(nextDay) ||
    holidayMap[normalizeDate(nextDay)] ||
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
  holidayMap,
  builderId,
  timeOffByBuilder = {}
) => {
  let currentDate = normalizeDate(start_date);

  let totalHoursCounted = 0;

  while (totalHoursCounted < jobHours) {
    const dateStr = normalizeDate(currentDate);

    const isWeekend = isSaturday(currentDate) || isSunday(currentDate);
    const isHoliday = holidayMap[dateStr];
    const isTimeOff =
      builderId &&
      timeOffByBuilder[builderId]?.some((date) =>
        isSameDay(normalizeDate(new Date(date)), currentDate)
      );

    const isNonWorkingDay = isWeekend || isHoliday || isTimeOff;

    // Even on non-working days, job can't progress
    // So we don't add workdayHours to total time
    totalHoursCounted += isNonWorkingDay ? 0 : workdayHours;

    currentDate = addDays(currentDate, 1);
  }

  const totalDaysUsed = differenceInCalendarDays(
    currentDate,
    normalizeDate(start_date)
  );
  return totalDaysUsed * workdayHours;
};

export const calculateAdjustedWidth = (
  startDate,
  requestedWidth,
  dayWidth,
  holidayMap,
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
      holidayMap[normalizeDate(currentDate)] ||
      isTimeOff
    ) {
      nonWorkDays++;
    }

    currentDate = addDays(currentDate, 1);
  }

  const workDays = Math.max(1, requestedDays - nonWorkDays);
  return workDays * workdayHours;
};

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
  holidayMap,
  timeOffByBuilder,
  dayWidth = 30,
  chartStartDate
) => {
  let arrayToProcess = [...jobsArray];
  let conflicts = [];

  // Create a timeline map to track hard_start_dates
  const timeline = new Map();

  // Process hard start dates first
  arrayToProcess.forEach((task) => {
    if (task.hard_start_date) {
      timeline.set(normalizeDate(task.start_date), {
        task_name: task.task_name,
        subtask_id: task.subtask_id,
        project_name: task.project_name,
      });
    }
  });

  // Sort by date, prioritizing hard start dates and drag direction
  arrayToProcess.sort((a, b) => {
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

  // Process tasks and adjust dates
  const tasks = [];
  let lastEndDate = null;

  for (let i = 0; i < arrayToProcess.length; i++) {
    const current = arrayToProcess[i];
    const { isDragged, ...taskWithoutDragFlag } = current;

    // Calculate start date
    let start_date = normalizeDate(current.start_date);

    // Handle non-hard-start tasks that need to follow previous task
    if (!current.hard_start_date) {
      // If task is dragged left, use its original start date unless it would overlap with previous task
      // or a hard start task before it
      if (current.isDragged && current.draggedLeft) {
        const prevTask = arrayToProcess[i - 1];
        if (prevTask) {
          // If previous task is a hard start task or if current task would overlap with previous task
          if (
            prevTask.hard_start_date ||
            new Date(start_date) < new Date(prevTask.end_date)
          ) {
            start_date = normalizeDate(
              getNextWorkday(
                prevTask.end_date,
                holidayMap,
                current.employee_id,
                timeOffByBuilder
              )
            );
          }
        }
      }
      // If not dragged or dragged right, always start after previous task
      else if (lastEndDate) {
        start_date = normalizeDate(
          getNextWorkday(
            lastEndDate,
            holidayMap,
            current.employee_id,
            timeOffByBuilder
          )
        );
      }
    }

    // Prevent overlapping with hard start task at same date
    const nextTask = arrayToProcess[i + 1];
    if (
      nextTask?.hard_start_date &&
      normalizeDate(nextTask.start_date) === start_date
    ) {
      // Move current task to after nextTask's end_date
      start_date = normalizeDate(
        getNextWorkday(
          nextTask.end_date,
          holidayMap,
          current.employee_id,
          timeOffByBuilder
        )
      );

      // Also need to update lastEndDate to be nextTask's end_date
      lastEndDate = nextTask.end_date;
    }

    // Calculate job hours and end date
    const jobHours = totalJobHours(
      start_date,
      current.duration,
      workdayHours,
      holidayMap,
      current.employee_id,
      timeOffByBuilder
    );

    const end_date = normalizeDate(
      addDays(start_date, Math.ceil(jobHours / workdayHours))
    );

    // Check for conflicts with hard start dates
    const taskConflicts = Array.from(timeline.entries())
      .filter(([date, info]) => {
        if (current.hard_start_date || info.subtask_id === current.subtask_id) {
          return false;
        }
        const conflictDate = new Date(date);
        return (
          new Date(end_date) > conflictDate &&
          new Date(start_date) < conflictDate
        );
      })
      .map(([date, info]) => ({
        conflicting_task: current.task_name,
        project_name: current.project_name,
        overlaps_task: info.task_name,
        overlaps_project: info.project_name,
        hard_start_date: date,
        subtask_id: info.subtask_id,
      }));

    conflicts.push(...taskConflicts);

    // Create task with calculated dates
    const task = {
      ...taskWithoutDragFlag,
      start_date,
      end_date,
      subtask_width: (jobHours / workdayHours) * dayWidth,
      xPosition: calculateXPosition(start_date, chartStartDate, dayWidth),
    };

    tasks.push(task);
    lastEndDate = end_date;
  }

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
  services,
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
            const service = services?.find(
              (service) => service.team_service_id === typeData.team_service_id
            );
            const rate = typeData.rateOverride ?? service?.hourly_rate ?? 0;
            const hourlyEstimate = (typeData.estimate || 0) * rate;
            const fixedAmount = typeData.fixedAmount || 0;
            return typeAcc + hourlyEstimate + fixedAmount;
          }, 0) || 0;

        // Build services breakdown for hours section
        const servicesBreakdown = {};
        section.data?.forEach((typeData) => {
          const service = services?.find(
            (s) => s.team_service_id === typeData.team_service_id
          );
          const rate = typeData.rateOverride ?? service?.hourly_rate ?? 0;
          const estimate =
            (typeData.estimate || 0) * rate + (typeData.fixedAmount || 0);

          // Calculate actual hours, excluding fixed_amount entries
          const actualHours = (typeData.inputRows || []).reduce((sum, row) => {
            if (row.employee_id === "fixed_amount") return sum;
            const hoursValue = row.hours?.decimal ?? row.hours ?? 0;
            return sum + hoursValue;
          }, 0);

          servicesBreakdown[typeData.team_service_id] = {
            estimate,
            actual_cost: typeData.actual_cost || 0,
            service_name: service?.service_name || "Unknown Service",
            team_service_id: typeData.team_service_id,
            estimated_hours: typeData.estimate || 0,
            actual_hours: actualHours,
          };
        });

        return {
          ...acc,
          actual: acc.actual + actualTotal,
          estimate: acc.estimate + estimateTotal,
          sections: {
            ...acc.sections,
            [section.id]: {
              // actual_cost: actualTotal,
              // estimate: estimateTotal || 0,
              name: section.name,
              services: servicesBreakdown,
            },
          },
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
          sections: {
            ...acc.sections,
            [section.id]: {
              actual_cost: actualTotal,
              estimate: section.estimate || 0,
              name: section.name,
            },
          },
        };
      }
    },
    { actual: 0, estimate: 0, sections: {} }
  );

  if (adjustments) {
    // Calculate final totals with adjustments
    const subtotal = totals.estimate + (adjustments.addToSubtotal || 0);
    const profitAmount = subtotal * (adjustments.profit / 100);
    const commissionAmount = subtotal * (adjustments.commission / 100);
    const discountAmount =
      (subtotal + profitAmount + commissionAmount) *
      (adjustments.discount / 100);
    // Round up to nearest 5
    const adjustedEstimate =
      Math.ceil(
        (subtotal + profitAmount + commissionAmount - discountAmount) / 5
      ) *
        5 *
        adjustments.quantity +
      (adjustments.addToTotal || 0);

    const adjustedActual =
      totals.actual + commissionAmount * adjustments.quantity;
    const commissionTotal = commissionAmount * adjustments.quantity;

    return {
      subtotal,
      total: adjustedEstimate,
      actual: adjustedActual,
      sections: totals.sections,
      adjustments: [
        [
          "addToSubtotal",
          {
            name: "Adjust Subtotal",
            estimate: adjustments.addToSubtotal || 0,
            actual_cost: 0,
          },
        ],
        [
          "commission",
          {
            name: "commission",
            estimate: commissionTotal,
            actual_cost: commissionTotal,
          },
        ],
        [
          "profit",
          {
            name: "profit",
            estimate: profitAmount,
            actual_cost: 0,
          },
        ],
        [
          "discount",
          {
            name: "discount",
            estimate: discountAmount,
            actual_cost: discountAmount,
          },
        ],
        [
          "addToTotal",
          {
            name: "Adjust Total",
            estimate: adjustments.addToTotal || 0,
            actual_cost: 0,
          },
        ],
      ],
    };
  }

  return totals;
};

export function truncateTrailingZeros(num) {
  return parseFloat(num.toFixed(4)).toString();
}

export const calculateShelfQty = (height) => {
  return Math.floor(height / 16);
};
