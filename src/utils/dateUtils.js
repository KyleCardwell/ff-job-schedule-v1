import { format, parseISO, startOfDay, isValid } from "date-fns";

export const normalizeDate = (date) => {
	try {
		// Handle null/undefined
		if (!date) {
			console.warn("normalizeDate received null/undefined date");
			return new Date().toISOString();
		}

		// If it's already a Date object
		if (date instanceof Date) {
			if (!isValid(date)) {
				console.warn("Invalid Date object received in normalizeDate");
				return new Date().toISOString();
			}
			return startOfDay(date).toISOString();
		}

		// If it's a string
		if (typeof date === "string") {
			const parsedDate = parseISO(date);
			if (!isValid(parsedDate)) {
				console.warn(`Invalid date string received in normalizeDate: ${date}`);
				return new Date().toISOString();
			}
			return startOfDay(parsedDate).toISOString();
		}

		// If we get here, it's an unsupported type
		console.warn(`Unsupported date type in normalizeDate: ${typeof date}`);
		return new Date().toISOString();
	} catch (error) {
		console.error("Error in normalizeDate:", error);
		return new Date().toISOString();
	}
};

export const formatDateForInput = (date) => {
	if (!date) return "";
	const normalizedDate = normalizeDate(date);
	return format(normalizedDate, "yyyy-MM-dd");
};
