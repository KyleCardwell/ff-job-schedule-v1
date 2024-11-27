import { Actions } from "../actions";

const initialState = {
  standardHolidays: [],
  customHolidays: [],
  loading: false,
  error: null,
};

export const holidaysReducer = (state = initialState, action) => {
  switch (action.type) {
    // case Actions.holidays.ADD_HOLIDAY:
    //   return {
    //     ...state,
    //     holidays: [...state.holidays, action.payload],
    //   };
    // case Actions.holidays.REMOVE_HOLIDAY:
    //   return {
    //     ...state,
    //     holidays: state.holidays.filter(
    //       (holiday) => holiday.name !== action.payload
    //     ),
    //   };
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
        holidays: [
          ...action.payload.standardHolidays,
          ...action.payload.customHolidays,
        ],
      };

    case Actions.holidays.FETCH_HOLIDAYS_ERROR:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };
    default:
      return state;
  }
};
