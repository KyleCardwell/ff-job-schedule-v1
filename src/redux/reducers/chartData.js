// import { newJobs } from "../../mocks/jobsV2";
import { newJobs } from "../../mocks/jobsRealData";
import { getChartData } from "../../utils/helpers";
import { Actions } from "../actions";

const { taskList, earliestStartDate, latestStartDate } = getChartData(newJobs);

const initialState = {
	chartData: taskList,
	earliestStartDate,
	latestStartDate,
	nextJobNumber: 101,
};

export const chartDataReducer = (state = initialState, action) => {
	switch (action.type) {
		case Actions.jobs.SAVE_JOBS:
			return {
				...state,
				chartData: action.payload,
			};
		case Actions.chartData.UPDATE_EARLIEST_START_DATE:
			return {
				...state,
				earliestStartDate: action.payload,
			};
		case Actions.chartData.UPDATE_LATEST_START_DATE:
			return {
				...state,
				latestStartDate: action.payload,
			};
		case Actions.chartData.UPDATE_ONE_BUILDER_CHART_DATA: {
			const updatedTasksMap = new Map(
				action.payload.map((task) => [task.id, task])
			);

			return {
				...state,
				chartData: state.chartData.map((task) => {
					if (updatedTasksMap.has(task.id)) {
						const updatedTask = updatedTasksMap.get(task.id);
						return {
							...task,
							...updatedTask,
							startDate: updatedTask.startDate,
							// Include any other fields that need to be explicitly updated
						};
					}
					return task;
				}),
			};
		}
		case Actions.jobs.UPDATE_NEXT_JOB_NUMBER:
			return {
				...state,
				nextJobNumber: action.payload,
			};
		default:
			return state;
	}
};
