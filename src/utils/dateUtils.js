import { format, parseISO, startOfDay } from 'date-fns';

export const normalizeDate = (date) => {
  const parsedDate = typeof date === 'string' ? parseISO(date) : date;
  return startOfDay(parsedDate);
};

export const formatDateForInput = (date) => {
  if (!date) return "";
  const normalizedDate = normalizeDate(date);
  return format(normalizedDate, 'yyyy-MM-dd');
};

