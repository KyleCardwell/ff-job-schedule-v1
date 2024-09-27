import { startOfWeek, isSameDay, subWeeks, parseISO } from 'date-fns';

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
