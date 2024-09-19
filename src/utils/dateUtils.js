// import dayjs from 'dayjs';
// import isBusinessDay from 'dayjs/plugin/isBusinessDay';

// dayjs.extend(isBusinessDay);

// export const isBusinessDayCheck = (date) => {
//   return dayjs(date).isBusinessDay();
// };

export const normalizeDate = (date) => {
	const normalized = new Date(date);
	normalized.setHours(0, 0, 0, 0); // Set time to 00:00:00
	return normalized;
};

export const formatDateForInput = (date) => {
  if (!date) return "";
  
  const d = new Date(date);
  const offset = d.getTimezoneOffset();
  // Adjust the date to fix timezone issues
  d.setMinutes(d.getMinutes() - offset);
  
  return d.toISOString().split("T")[0]; // Returns YYYY-MM-DD
};

