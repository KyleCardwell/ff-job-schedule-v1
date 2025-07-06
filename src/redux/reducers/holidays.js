import { Actions } from "../actions";

const initialState = {
  standardHolidays: [],
  customHolidays: [],
  loading: false,
  error: null,
  holidayMap: {},
};

export const holidaysReducer = (state = initialState, action) => {
  switch (action.type) {
    case Actions.holidays.FETCH_HOLIDAYS_START:
      return {
        ...state,
        loading: true,
        error: null,
      };

    case Actions.holidays.FETCH_HOLIDAYS_SUCCESS:
      return {
        ...state,
        loading: false,
        standardHolidays: action.payload.standardHolidays,
        customHolidays: action.payload.customHolidays,
      };

    case Actions.holidays.FETCH_HOLIDAYS_ERROR:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    case Actions.holidays.SET_HOLIDAY_MAP:
      return {
        ...state,
        holidayMap: action.payload,
      };
    default:
      return state;
  }
};
