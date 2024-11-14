// import { newJobs } from "../../mocks/jobsV2";
import { newJobs } from "../../mocks/jobsRealData";
import { getChartData } from "../../utils/helpers";
import { Actions } from "../actions";

const initialState = {
	chartData: [],
};

export const chartDataReducer = (state = initialState, action) => {
	switch (action.type) {
		case Actions.chartData.FETCH_CHART_DATA_START:
			return {
				...state,
				loading: true,
				error: null,
			};

		case Actions.chartData.FETCH_CHART_DATA_SUCCESS: {
			return {
				...state,
				chartData: action.payload,
				loading: false,
				error: null,
			};
		}

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
			return {
				...state,
				chartData: updatedChartData,
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

			return {
				...state,
				chartData: updatedChartData,
			};
		}
		case Actions.chartData.REMOVE_COMPLETED_JOB_FROM_CHART:
			const updatedChartData = state.chartData.filter(
				(item) => item.project_id !== action.payload
			);

			return {
				...state,
				chartData: updatedChartData,
			};

		default:
			return state;
	}
};
