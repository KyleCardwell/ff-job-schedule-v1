import {
  startOfWeek,
  isSameDay,
  subWeeks,
  parseISO,
  addDays,
  isSaturday,
  isSunday,
  isWithinInterval,
  isBefore,
  differenceInCalendarDays,
} from "date-fns";
import { normalizeDate } from "./dateUtils";

export const getChartData = (jobData) => {
  let positionCounter = 0;
  let earliestStartDate = new Date(8640000000000000); // Initialize with max date
  let latestStartDate = new Date(-8640000000000000); // Initialize with min date

  const taskList = jobData
    .flatMap((job, i) => {
      return job.rooms
        // .filter((room) => room.active)
        .map((room) => {
          const rowNumber = positionCounter++;

          room.workPeriods.forEach((workPeriod) => {
            const wpStartDate = new Date(workPeriod.startDate);

            // Update earliest and latest start dates
            if (wpStartDate < earliestStartDate) {
              earliestStartDate = wpStartDate;
            }
            if (wpStartDate > latestStartDate) {
              latestStartDate = wpStartDate;
            }
          });

          return {
            ...room,
            jobsIndex: i,
            jobId: job.id,
            jobName: job.name,
            rowNumber,
          };
        });
    })
    .flat();

  return {
    taskList,
    earliestStartDate,
    latestStartDate,
  };
};

export const getTaskData = (jobData, workdayHours = 8, dayWidth = 30) => {
  let positionCounter = 0;
  let multiWorkPeriodRooms = [];

  const tasks = jobData.flatMap((job, jobIndex) => {
    return job.rooms
      // .filter((room) => room.active)
      .flatMap((room, roomIndex) => {
        const rowNumber = positionCounter++;

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
            roomName: room.name,
            jobIndex,
            roomIndex,
            workPeriodIndex,
            workPeriodDuration: workPeriod.workPeriodDuration,
            rowNumber,
            active: room.active,
          };
        });
      });
  });

  // Group work periods by builderId
  const tasksByBuilder = tasks.reduce((acc, workPeriod) => {
    const builderId = workPeriod.builderId;
    if (!acc[builderId]) {
      acc[builderId] = [];
    }
    acc[builderId].push(workPeriod);
    return acc;
  }, {});

  // Sort tasks within each builder group by startDate
  Object.keys(tasksByBuilder).forEach((builderId) => {
    tasksByBuilder[builderId].sort(
      (a, b) => new Date(a.startDate) - new Date(b.startDate)
    );
  });

  return { tasks, tasksByBuilder, multiWorkPeriodRooms };
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

export const isHoliday = (date, holidayChecker, holidays) => {
  if (!holidayChecker) return false;
  const normalizedDate = normalizeDate(date);
  const holiday = holidayChecker.isHoliday(normalizedDate);
  return holiday && holidays.some((h) => h.name === holiday[0].name);
};

export const getNextWorkday = (
  date,
  holidayChecker,
  holidays,
  builderId,
  timeOffByBuilder
) => {
  let nextDay = normalizeDate(date);

  while (
    isSaturday(nextDay) ||
    isSunday(nextDay) ||
    isHoliday(nextDay, holidayChecker, holidays) ||
    (builderId &&
      timeOffByBuilder[builderId]?.some(
        (timeOffDate) =>
          normalizeDate(new Date(timeOffDate)).getTime() === nextDay.getTime()
      ))
  ) {
    nextDay = addDays(nextDay, 1);
  }
  return nextDay;
};

export const totalJobHours = (
  startDate,
  jobHours,
  workdayHours,
  holidayChecker,
  holidays,
  builderId,
  timeOffByBuilder
) => {
  let currentDate = normalizeDate(startDate);

  // Calculate total days based on jobHours (e.g., 16 hours = 2 days)
  let totalDays = Math.ceil(jobHours / workdayHours);

  // Loop through each day in the range based on totalDays
  for (let i = 0; i < totalDays; i++) {
    // Check if the current day is a weekend
    if (
      isSaturday(currentDate) ||
      isSunday(currentDate) ||
      isHoliday(currentDate, holidayChecker, holidays) ||
      (builderId &&
        timeOffByBuilder[builderId]?.some(
          (timeOffDate) =>
            normalizeDate(new Date(timeOffDate)).getTime() ===
            currentDate.getTime()
        ))
    ) {
      jobHours += 8;
      totalDays += 1;
    }
    // Move to the next day
    currentDate = addDays(currentDate, 1);
  }

  return Math.ceil(jobHours / workdayHours) * workdayHours; // Total job hours
};

// export const adjustMultiWorkPeriodTasks = (
//   sortedBuilderTasks,
//   multiWorkPeriodRooms
// ) => {
//   // Create a Map for efficient lookups
//   const multiWorkPeriodMap = new Map(
//     multiWorkPeriodRooms.map((room) => [room.id, room])
//   );

//   return sortedBuilderTasks.map((task) => {
//     if (multiWorkPeriodMap.has(task.roomId)) {
//       const room = multiWorkPeriodMap.get(task.roomId);

//       // Sort workPeriods by startDate
//       const sortedWorkPeriods = [...room.workPeriods].sort(
//         (a, b) => new Date(a.startDate) - new Date(b.startDate)
//       );

//       // Find overlapping work periods
//       const overlaps = sortedWorkPeriods.filter(
//         (wp) =>
//           wp.id !== task.id && // Check all other work periods
//           (isWithinInterval(new Date(task.startDate), {
//             start: new Date(wp.startDate),
//             end: addDays(new Date(wp.startDate), wp.duration),
//           }) ||
//             isWithinInterval(addDays(new Date(task.startDate), task.duration), {
//               start: new Date(wp.startDate),
//               end: addDays(new Date(wp.startDate), wp.duration),
//             }) ||
//             isWithinInterval(new Date(wp.startDate), {
//               start: new Date(task.startDate),
//               end: addDays(new Date(task.startDate), task.duration),
//             }))
//       );

//       const overlapCount = overlaps.length + 1;
//       const heightFactor = overlapCount > 1 ? 1 / Math.min(overlapCount, 3) : 1;
//       const yOffsetFactor =
//         overlaps.filter((o) => new Date(o.startDate) < new Date(task.startDate))
//           .length / Math.min(overlapCount, 3);

//       return {
//         ...task,
//         heightFactor,
//         yOffsetFactor,
//         totalWorkPeriods: sortedWorkPeriods.length,
//         showText:
//           task.id === sortedWorkPeriods[sortedWorkPeriods.length - 1].id ||
//           heightFactor === 1,
//       };
//     }
//     // If it's not a multi-work period room, return the task with default values
//     return {
//       ...task,
//       heightFactor: 1,
//       yOffsetFactor: 0,
//       totalWorkPeriods: 1,
//       showText: true,
//     };
//   });
// };

// const adjustMultiWorkPeriodTasks = (sortedBuilderTasks, multiWorkPeriodRooms) => {
//   // Create a Map for efficient lookups
//   const multiWorkPeriodMap = new Map(
//     multiWorkPeriodRooms.map((room) => [room.id, room])
//   );

//   return sortedBuilderTasks.map((task) => {
//     if (multiWorkPeriodMap.has(task.roomId)) {
//       const room = multiWorkPeriodMap.get(task.roomId);

//       // Ensure workPeriods are sorted by startDate
//       const [firstWP, secondWP] = room.workPeriods.sort(
//         (a, b) => new Date(a.startDate) - new Date(b.startDate)
//       );

// 			// const isOverlapping = secondWP && isWithinInterval(
//       //   new Date(secondWP.startDate),
//       //   {
//       //     start: new Date(firstWP.startDate),
//       //     end: addDays(new Date(firstWP.startDate), firstWP.workPeriodDuration / 8 - 1)
//       //   }
//       // );

// 			const isOverlapping = secondWP && isBefore(secondWP.startDate, firstWP.endDate)

//       const heightFactor = isOverlapping ? 0.5 : 1;
//       const yOffsetFactor = task.id === secondWP.id && isOverlapping ? 0.5 : 0;

//       return {
//         ...task,
//         heightFactor,
//         yOffsetFactor,
//         totalWorkPeriods: room.workPeriods.length,
//         showText: task.id === secondWP?.id || !isOverlapping,
//       };
//     }
//     // If it's not a multi-work period room, return the task with default values
//     return {
//       ...task,
//       heightFactor: 1,
//       yOffsetFactor: 0,
//       totalWorkPeriods: 1,
//       showText: true,
//     };
//   });
// };

export const calculateXPosition = (
  jobStartDate,
  chartStartDate,
  dayWidth = 30
) => {
  const normalizedJobStartDate = normalizeDate(jobStartDate);
  const normalizedChartStartDate = normalizeDate(chartStartDate);
  const diffInDays = differenceInCalendarDays(
    normalizedJobStartDate,
    normalizedChartStartDate
  );
  return diffInDays * dayWidth;
};

export const adjustMultiWorkPeriodTasks = (
  sortedBuilderTasks,
  multiWorkPeriodRooms
) => {
  // Create a Map for efficient lookups
  const multiWorkPeriodMap = new Map(
    multiWorkPeriodRooms.map((room) => [room.id, room])
  );

  return sortedBuilderTasks.map((task) => {
    if (multiWorkPeriodMap.has(task.roomId)) {
      const room = multiWorkPeriodMap.get(task.roomId);

      // Ensure workPeriods are sorted by startDate
      const [firstWP, secondWP] = room.workPeriods.sort(
        (a, b) => new Date(a.startDate) - new Date(b.startDate)
      );

      const isOverlapping =
        secondWP &&
        isBefore(new Date(secondWP.startDate), new Date(firstWP.endDate));

      const heightFactor = isOverlapping ? 0.5 : 1;
      const yOffsetFactor = task.id === secondWP.id && isOverlapping ? 0.5 : 0;

      return {
        ...task,
        heightFactor,
        yOffsetFactor,
        totalWorkPeriods: room.workPeriods.length,
        showText: task.id === secondWP?.id || !isOverlapping,
      };
    }
    // If it's not a multi-work period room, return the task with default values
    return {
      ...task,
      heightFactor: 1,
      yOffsetFactor: 0,
      totalWorkPeriods: 1,
      showText: true,
    };
  });
};

export const sortAndAdjustDates = (
  jobsArray,
  workdayHours,
  holidayChecker,
  holidays,
  draggedJobId,
  dropDate,
  timeOffByBuilder,
  dayWidth = 30,
  chartStartDate
) => {
  let arrayToProcess = [...jobsArray];

  // Handle drag and drop if applicable
  if (draggedJobId && dropDate) {
    const draggedJobIndex = arrayToProcess.findIndex(
      (job) => job.id === draggedJobId
    );

    if (draggedJobIndex !== -1) {
      // Remove the dragged job from the array
      const [draggedJob] = arrayToProcess.splice(draggedJobIndex, 1);

      // Find the index where to insert the dragged job
      const insertIndex = arrayToProcess.findIndex(
        (job) => normalizeDate(job.startDate) >= normalizeDate(dropDate)
      );

      if (insertIndex !== -1) {
        // Insert the dragged job at the found index
        arrayToProcess.splice(insertIndex, 0, draggedJob);
      } else {
        // If no job with a later date is found, append to the end
        arrayToProcess.push(draggedJob);
      }
    }
  }

  // Sort the array by date
  arrayToProcess.sort((a, b) => {
    const dateA = new Date(a.startDate);
    const dateB = new Date(b.startDate);
    return dateA - dateB;
  });

  // Adjust the dates and calculate endDates
  return arrayToProcess.reduce((acc, current, index) => {
    if (index === 0) {
      // Keep the first object's date as is
      const startDate = normalizeDate(current.startDate);
      const jobHours = totalJobHours(
        startDate,
        current.duration,
        workdayHours,
        holidayChecker,
        holidays,
        current.builderId,
        timeOffByBuilder
      );
      const newEndDate = addDays(startDate, Math.ceil(jobHours / workdayHours));
      acc.push({
        ...current,
        startDate: normalizeDate(startDate),
        endDate: normalizeDate(newEndDate),
        workPeriodDuration: (jobHours / workdayHours) * dayWidth,
        xPosition: calculateXPosition(startDate, chartStartDate, dayWidth),
      });
    } else {
      const previousJob = acc[index - 1];
      const newStartDate = getNextWorkday(
        previousJob.endDate,
        holidayChecker,
        holidays,
        current.builderId,
        timeOffByBuilder
      );
      const jobHours = totalJobHours(
        newStartDate,
        current.duration,
        workdayHours,
        holidayChecker,
        holidays,
        current.builderId,
        timeOffByBuilder
      );
      const endDate = addDays(newStartDate, Math.ceil(jobHours / workdayHours));
      acc.push({
        ...current,
        startDate: normalizeDate(newStartDate),
        endDate: normalizeDate(endDate),
        workPeriodDuration: (jobHours / workdayHours) * dayWidth,
        xPosition: calculateXPosition(newStartDate, chartStartDate, dayWidth),
      });
    }
    return acc;
  }, []);

  // return sortedTasks;
};

// Function to reconstruct the job structure for Redux
export const reconstructJobsForRedux = (flatJobs) => {
  const jobMap = {};
  flatJobs.forEach((job) => {
    if (!jobMap[job.jobId]) {
      jobMap[job.jobId] = { id: job.jobId, name: job.jobName, rooms: [] };
    }
    jobMap[job.jobId].rooms.push({
      id: job.id,
      builderId: job.builderId,
      startDate: job.startDate,
      duration: job.duration,
      jobNumber: job.jobNumber,
      name: job.name,
      active: job.active,
    });
  });
  return Object.values(jobMap);
};

