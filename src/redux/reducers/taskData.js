import { Actions } from "../actions";

const initialState = {
  taskData: [],
};

export const taskDataReducer = (state = initialState, action) => {
  switch (action.type) {
    case Actions.jobs.SAVE_JOBS:
      return {
        ...state,
        taskData: action.payload,
      };
    default:
      return state;
  }
};
