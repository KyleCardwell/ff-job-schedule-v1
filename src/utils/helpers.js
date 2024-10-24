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
				const wpStartDate = new Date(workPeriod.startDate);
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
					jobId: job.id,
					jobName: job.name,
					rowNumber,
					jobNumber: room.jobNumber,
					// jobsIndex: i,
          workPeriodIndex,
					heightAdjust: workPeriodIndex === 0 ? workPeriods : 0,
					roomCreatedAt: room.roomCreatedAt,
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
					roomIndex,
					workPeriodIndex,
					workPeriodDuration: workPeriod.workPeriodDuration,
					rowNumber,
					active: room.active,
					roomCreatedAt: room.roomCreatedAt,
          heightAdjust: workPeriodIndex === 0 ? workPeriods : 0,
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

	// // Handle drag and drop if applicable
	// if (draggedJobId && dropDate) {
	// 	const draggedJobIndex = arrayToProcess.findIndex(
	// 		(job) => job.id === draggedJobId
	// 	);

	// 	if (draggedJobIndex !== -1) {
	// 		// Remove the dragged job from the array
	// 		const [draggedJob] = arrayToProcess.splice(draggedJobIndex, 1);

	// 		// Find the index where to insert the dragged job
	// 		const insertIndex = arrayToProcess.findIndex(
	// 			(job) => normalizeDate(job.startDate) >= normalizeDate(dropDate)
	// 		);

	// 		if (insertIndex !== -1) {
	// 			// Insert the dragged job at the found index
	// 			arrayToProcess.splice(insertIndex, 0, draggedJob);
	// 		} else {
	// 			// If no job with a later date is found, append to the end
	// 			arrayToProcess.push(draggedJob);
	// 		}
	// 	}
	// }

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
