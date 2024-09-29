import {
	startOfWeek,
	isSameDay,
	subWeeks,
	parseISO,
	addDays,
	isSaturday,
	isSunday,
} from "date-fns";

export const normalizeDate = (date) => {
	const normalized = new Date(date);
	normalized.setHours(0, 0, 0, 0); // Set time to 00:00:00
	return normalized;
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

export const getNextWorkday = (date) => {
	let nextDay = normalizeDate(date);
	while (isSaturday(nextDay) || isSunday(nextDay) || isHoliday(nextDay)) {
		nextDay = addDays(nextDay, 1);
	}
	return nextDay;
};

// Updated sortAndAdjustDates function
export const totalJobHours = (startDate, jobHours, workdayHours) => {
	let currentDate = normalizeDate(startDate);

	// Calculate total days based on jobHours (e.g., 16 hours = 2 days)
	let totalDays = Math.ceil(jobHours / workdayHours);

	// Loop through each day in the range based on totalDays
	for (let i = 0; i < totalDays; i++) {
		// Check if the current day is a weekend
		if (
			isSaturday(currentDate) ||
			isSunday(currentDate) ||
			isHoliday(currentDate)
		) {
			jobHours += 8;
			totalDays += 1;
		}
		// Move to the next day
		currentDate = addDays(currentDate, 1);
	}

	return Math.ceil(jobHours / workdayHours) * workdayHours; // Total job hours
};

export const sortAndAdjustDates = (jobsArray, workdayHours) => {
	// First, sort the array by date and newness
	const sortedArray = jobsArray.sort((a, b) => {
		if (a.isNew && !b.isNew) return -1;
		if (b.isNew && !a.isNew) return 1;

		const dateA = new Date(a.startDate);
		const dateB = new Date(b.startDate);

		return dateA - dateB;
	});

	// Then, adjust the dates
	return sortedArray.reduce((acc, current, index) => {
		if (index === 0) {
			// Keep the first object's date as is
			acc.push({
				...current,
				startDate: normalizeDate(current.startDate),
				isNew: false,
			});
		} else {
			const previousJob = acc[index - 1];
			const previousEndDate = addDays(
				previousJob.startDate,
				Math.ceil(
					totalJobHours(
						previousJob.startDate,
						previousJob.duration,
						workdayHours
					) / workdayHours
				)
			);
			const newStartDate = getNextWorkday(previousEndDate);
			acc.push({ ...current, startDate: newStartDate, isNew: false });
		}
		return acc;
	}, []);
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
