import { Actions } from "../actions";

export const addHoliday = (name) => ({
  type: Actions.holidays.ADD_HOLIDAY,
  payload: { name },
});

export const removeHoliday = (name) => ({
  type: Actions.holidays.REMOVE_HOLIDAY,
  payload: name,
});