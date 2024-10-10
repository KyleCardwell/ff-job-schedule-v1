// import { newJobs } from "../../mocks/jobsV2";
import { newJobs } from "../../mocks/jobsRealData";
import { getTaskData } from "../../utils/helpers";
import { Actions } from "../actions";

const { tasks, tasksByBuilder } = getTaskData(newJobs);

const initialState = {
  tasks,
  tasksByBuilder,
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
