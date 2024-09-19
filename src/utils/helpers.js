export const normalizeDate = (date) => {
	const normalized = new Date(date);
	normalized.setHours(0, 0, 0, 0); // Set time to 00:00:00
	return normalized;
};
