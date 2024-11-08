// import { newJobs } from "../../mocks/jobsV2";
import { newJobs } from "../../mocks/jobsRealData";
import { getChartData } from "../../utils/helpers";
import { Actions } from "../actions";

// const { taskList, earliestStartDate, latestStartDate } = getChartData(newJobs);

const updateDateRange = (state, updatedTasks) => {
	let needsUpdate = false;

	// Sort the updated tasks by start_date
	const sortedTasks = [...updatedTasks]?.sort(
		(a, b) => new Date(a.start_date) - new Date(b.start_date)
	);

	// Determine the new earliest and latest start dates
	const newEarliestStartDate = new Date(sortedTasks[0]?.start_date);
	const newLatestStartDate = new Date(
		sortedTasks[sortedTasks.length - 1]?.start_date
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
				earliestStartDate: action.payload[0]?.start_date,
				latestStartDate:
					action.payload[action.payload.length - 1]?.start_date,
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
				action.payload.map((task) => [task.subtask_id, task])
			);
			const updatedChartData = state.chartData.map((task) => {
				if (updatedTasksMap.has(task.subtask_id)) {
					const updatedTask = updatedTasksMap.get(task.subtask_id);
					return {
						...task,
						...updatedTask,
						start_date: updatedTask.start_date,
						subtask_width: updatedTask.subtask_width,
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
				(task) => !removedWorkPeriods.includes(task.subtask_id)
			);

			const tasksToUpdate = updatedTasks.filter(
				(task) => !removedWorkPeriods.includes(task.subtask_id)
			);

			// Replace or add the updated tasks
			tasksToUpdate.forEach((updatedTask) => {
				const existingIndex = updatedChartData.findIndex(
					(task) => task.subtask_id === updatedTask.subtask_id
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
						return a.subtask_created_at.localeCompare(b.subtask_created_at);
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
				(item) => item.project_id !== action.payload
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
