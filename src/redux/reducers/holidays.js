import { Actions } from "../actions";

const initialState = {
  holidays: [
    { name: "New Year's Day" },
    { name: "Memorial Day" },
    { name: "Independence Day" },
    { name: "Labor Day" },
    { name: "Thanksgiving Day" },
    { name: "Christmas Day" },
  ],
};

export const holidaysReducer = (state = initialState, action) => {
  switch (action.type) {
    case Actions.holidays.ADD_HOLIDAY:
      return {
        ...state,
        holidays: [...state.holidays, action.payload],
      };
    case Actions.holidays.REMOVE_HOLIDAY:
      return {
        ...state,
        holidays: state.holidays.filter(
          (holiday) => holiday.name !== action.payload
        ),
      };
    default:
      return state;
  }
};