import { format, parseISO, startOfDay, isValid } from "date-fns";

export const normalizeDate = (date) => {
	try {
			// Handle null/undefined
			if (!date) {
					const now = new Date();
					return new Date(
							Date.UTC(
									now.getUTCFullYear(), 
									now.getUTCMonth(), 
									now.getUTCDate(),
									12, // Set to noon UTC
									0,
									0,
									0
							)
					).toISOString().replace('.000Z', '+00:00');
			}

			// If it's already a Date object
			if (date instanceof Date) {
					if (!isValid(date)) {
							const now = new Date();
							return new Date(
									Date.UTC(
											now.getUTCFullYear(), 
											now.getUTCMonth(), 
											now.getUTCDate(),
											12,
											0,
											0,
											0
									)
							).toISOString().replace('.000Z', '+00:00');
					}
					return new Date(
							Date.UTC(
									date.getUTCFullYear(), 
									date.getUTCMonth(), 
									date.getUTCDate(),
									12,
									0,
									0,
									0
							)
					).toISOString().replace('.000Z', '+00:00');
			}

			// If it's a string
			if (typeof date === "string") {
					const parsedDate = parseISO(date);
					if (!isValid(parsedDate)) {
							const now = new Date();
							return new Date(
									Date.UTC(
											now.getUTCFullYear(), 
											now.getUTCMonth(), 
											now.getUTCDate(),
											12,
											0,
											0,
											0
									)
							).toISOString().replace('.000Z', '+00:00');
					}
					return new Date(
							Date.UTC(
									parsedDate.getUTCFullYear(),
									parsedDate.getUTCMonth(),
									parsedDate.getUTCDate(),
									12,
									0,
									0,
									0
							)
					).toISOString().replace('.000Z', '+00:00');
			}

			// If we get here, it's an unsupported type
			const now = new Date();
			return new Date(
					Date.UTC(
							now.getUTCFullYear(), 
							now.getUTCMonth(), 
							now.getUTCDate(),
							12,
							0,
							0,
							0
					)
			).toISOString().replace('.000Z', '+00:00');
	} catch (error) {
			const now = new Date();
			return new Date(
					Date.UTC(
							now.getUTCFullYear(), 
							now.getUTCMonth(), 
							now.getUTCDate(),
							12,
							0,
							0,
							0
					)
			).toISOString().replace('.000Z', '+00:00');
	}
};

export const formatDateForInput = (date) => {
	if (!date) return "";
	const utcDate = new Date(date);
	return `${utcDate.getUTCFullYear()}-${String(
		utcDate.getUTCMonth() + 1
	).padStart(2, "0")}-${String(utcDate.getUTCDate()).padStart(2, "0")}`;
};
