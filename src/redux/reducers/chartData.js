import { newJobs } from "../../mocks/jobsV2";
import { getChartData } from "../../utils/helpers";
import { Actions } from "../actions";

const { taskList, earliestStartDate, latestStartDate } = getChartData(newJobs);

const initialState = {
  chartData: taskList,
  earliestStartDate,
  latestStartDate,
};

console.log(initialState.chartData);

export const chartDataReducer = (state = initialState, action) => {
  switch (action.type) {
    case Actions.jobs.SAVE_JOBS:
      return {
        ...state,
        chartData: action.payload,
      };
    default:
      return state;
  }
};
