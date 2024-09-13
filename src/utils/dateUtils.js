import dayjs from 'dayjs';
import isBusinessDay from 'dayjs/plugin/isBusinessDay';

dayjs.extend(isBusinessDay);

export const isBusinessDayCheck = (date) => {
  return dayjs(date).isBusinessDay();
};

// Here, you can add more date utility functions as needed.
