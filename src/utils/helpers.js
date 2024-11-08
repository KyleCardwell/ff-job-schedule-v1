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
	timeOffByBuilder
) => {
	let currentDate = normalizeDate(start_date);

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

	// Sort the array by date
	arrayToProcess.sort((a, b) => {
		return a.start_date.localeCompare(b.start_date);
	});

	// Adjust the dates and calculate endDates
	return arrayToProcess.reduce((acc, current, index) => {
		const initialStartDate = normalizeDate(current.start_date);

		const start_date =
			index === 0
				? initialStartDate
				: normalizeDate(
						getNextWorkday(
							acc[index - 1].end_date,
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

		acc.push({
			...current,
			start_date: start_date,
			end_date: end_date,
			subtask_width: (jobHours / workdayHours) * dayWidth,
			xPosition: calculateXPosition(start_date, chartStartDate, dayWidth),
		});
		return acc;
	}, []);
};

// Function to reconstruct the job structure for Redux
export const reconstructJobsForRedux = (flatJobs) => {
	const jobMap = {};
	flatJobs.forEach((job) => {
		if (!jobMap[job.project_id]) {
			jobMap[job.project_id] = { id: job.project_id, name: job.jobName, rooms: [] };
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
