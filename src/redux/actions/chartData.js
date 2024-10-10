import { Actions } from "../actions";

export const updateEarliestStartDate = (earliestStartDate) => ({
	type: Actions.chartData.UPDATE_EARLIEST_START_DATE,
	payload: earliestStartDate,
});

export const updateLatestStartDate = (latestStartDate) => ({
	type: Actions.chartData.UPDATE_LATEST_START_DATE,
	payload: latestStartDate,
});