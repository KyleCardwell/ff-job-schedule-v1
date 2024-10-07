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


export const sortAndAdjustDates = (
	jobsArray,
	workdayHours,
	holidayChecker,
	holidays,
	draggedJobId,
	dropDate,
	timeOffByBuilder
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
			const endDate = addDays(startDate, Math.ceil(jobHours / workdayHours));
			acc.push({
				...current,
				startDate,
				endDate,
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
			acc.push({ ...current, startDate: newStartDate, endDate });
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
