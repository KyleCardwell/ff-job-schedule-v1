// import { newJobs } from "../../mocks/jobsV2";
import { newJobs } from "../../mocks/jobsRealData";
import { getChartData } from "../../utils/helpers";
import { Actions } from "../actions";

// const { taskList, earliestStartDate, latestStartDate } = getChartData(newJobs);

const updateDateRange = (state, updatedTasks) => {
	let needsUpdate = false;

	// Sort the updated tasks by startDate
	const sortedTasks = [...updatedTasks].sort(
		(a, b) => new Date(a.startDate) - new Date(b.startDate)
	);

	// Determine the new earliest and latest start dates
	const newEarliestStartDate = new Date(sortedTasks[0].startDate);
	const newLatestStartDate = new Date(
		sortedTasks[sortedTasks.length - 1].startDate
	);

	// Check if the dates need to be updated
	if (
		newEarliestStartDate !== state.earliestStartDate ||
		newLatestStartDate !== state.latestStartDate
	) {
		needsUpdate = true;
	}

	return {
		earliestStartDate: newEarliestStartDate,
		latestStartDate: newLatestStartDate,
		needsUpdate,
	};
};

const initialState = {
	chartData: [],
	earliestStartDate: null,
	latestStartDate: null,
	nextJobNumber: 101,
};

export const chartDataReducer = (state = initialState, action) => {
	switch (action.type) {
		case Actions.chartData.FETCH_CHART_DATA_START:
			return {
				...state,
				loading: true,
				error: null,
			};

		case Actions.chartData.FETCH_CHART_DATA_SUCCESS:
			return {
				...state,
				chartData: action.payload,
				earliestStartDate: action.payload[0]?.startDate,
				latestStartDate:
					action.payload[action.payload.length - 1]?.startDate,
				loading: false,
				error: null,
			};

		case Actions.chartData.FETCH_CHART_DATA_ERROR:
			return {
				...state,
				loading: false,
				error: action.payload,
			};

		case Actions.chartData.UPDATE_ONE_BUILDER_CHART_DATA: {
			const updatedTasksMap = new Map(
				action.payload.map((task) => [task.id, task])
			);
			const updatedChartData = state.chartData.map((task) => {
				if (updatedTasksMap.has(task.id)) {
					const updatedTask = updatedTasksMap.get(task.id);
					return {
						...task,
						...updatedTask,
						startDate: updatedTask.startDate,
					};
				}
				return task;
			});
			const { earliestStartDate, latestStartDate, needsUpdate } =
				updateDateRange(state, [...updatedChartData]);
			return {
				...state,
				chartData: updatedChartData,
				...(needsUpdate && { earliestStartDate, latestStartDate }),
			};
		}

		case Actions.chartData.JOB_MODAL_UPDATE_CHART_DATA: {
			const { updatedTasks, removedWorkPeriods } = action.payload;

			// Remove the tasks that should be deleted
			let updatedChartData = state.chartData.filter(
				(task) => !removedWorkPeriods.includes(task.id)
			);

			// Replace or add the updated tasks
			updatedTasks.forEach((updatedTask) => {
				const existingIndex = updatedChartData.findIndex(
					(task) => task.id === updatedTask.id
				);
				if (existingIndex !== -1) {
					updatedChartData[existingIndex] = updatedTask;
				} else {
					updatedChartData.push(updatedTask);
				}
			});

			// Sort the tasks
			updatedChartData.sort((a, b) => {
				if (a.project_created_at === b.project_created_at) {
					if (a.task_created_at === b.task_created_at) {
						return a.subTask_created_at.localeCompare(b.subTask_created_at);
					}
					return a.task_created_at.localeCompare(b.task_created_at);
				}
				return a.project_created_at.localeCompare(b.project_created_at);
			});

			const { earliestStartDate, latestStartDate, needsUpdate } =
				updateDateRange(state, updatedChartData);

			return {
				...state,
				chartData: updatedChartData,
				...(needsUpdate && { earliestStartDate, latestStartDate }),
			};
		}
		case Actions.chartData.REMOVE_COMPLETED_JOB_FROM_CHART:
			const updatedChartData = state.chartData.filter(
				(item) => item.jobId !== action.payload
			);
			const { earliestStartDate, latestStartDate, needsUpdate } =
				updateDateRange(state, updatedChartData);
			return {
				...state,
				chartData: updatedChartData,
				...(needsUpdate && { earliestStartDate, latestStartDate }),
			};

		case Actions.jobs.UPDATE_NEXT_JOB_NUMBER:
			return {
				...state,
				nextJobNumber: action.payload,
			};

		default:
			return state;
	}
};
