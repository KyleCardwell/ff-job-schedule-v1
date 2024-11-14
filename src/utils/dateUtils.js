import { format, parseISO, startOfDay, isValid } from "date-fns";

export const normalizeDate = (date) => {
	try {
		// Handle null/undefined
		if (!date) {
			// console.warn("normalizeDate received null/undefined date");
			return new Date().toISOString().replace(/\.000Z|Z/, "+00:00");
		}

		// If it's already a Date object
		if (date instanceof Date) {
			if (!isValid(date)) {
				// console.warn("Invalid Date object received in normalizeDate");
				return new Date().toISOString().replace(/\.000Z|Z/, "+00:00");
			}
			return startOfDay(date)
				.toISOString()
				.replace(/\.000Z|Z/, "+00:00");
		}

		// If it's a string
		if (typeof date === "string") {
			const parsedDate = parseISO(date);
			if (!isValid(parsedDate)) {
				// console.warn(`Invalid date string received in normalizeDate: ${date}`);
				return new Date().toISOString().replace(/\.000Z|Z/, "+00:00");
			}
			return startOfDay(parsedDate)
				.toISOString()
				.replace(/\.000Z|Z/, "+00:00");
		}

		// If we get here, it's an unsupported type
		// console.warn(`Unsupported date type in normalizeDate: ${typeof date}`);
		return new Date().toISOString().replace(/\.000Z|Z/, "+00:00");
	} catch (error) {
		// console.error("Error in normalizeDate:", error);
		return new Date().toISOString().replace(/\.000Z|Z/, "+00:00");
	}
};

export const formatDateForInput = (date) => {
	if (!date) return "";
	const normalizedDate = normalizeDate(date);
	return format(normalizedDate, "yyyy-MM-dd");
};
