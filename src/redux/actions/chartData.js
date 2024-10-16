import { Actions } from "../actions";

export const updateEarliestStartDate = (earliestStartDate) => ({
  type: Actions.chartData.UPDATE_EARLIEST_START_DATE,
  payload: earliestStartDate,
});

export const updateLatestStartDate = (latestStartDate) => ({
  type: Actions.chartData.UPDATE_LATEST_START_DATE,
  payload: latestStartDate,
});

export const updateOneBuilderChartData = (taskList) => {
  return {
    type: Actions.chartData.UPDATE_ONE_BUILDER_CHART_DATA,
    payload: taskList,
  };
};
