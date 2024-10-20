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
		case Actions.chartData.JOB_MODAL_UPDATE_CHART_DATA: {
			const { updatedTasks, removedWorkPeriods } = action.payload;

			// First, remove the tasks that should be deleted
			let updatedChartData = state.chartData.filter(
				(task) => !removedWorkPeriods.includes(task.id)
			);

			updatedTasks.forEach((updatedTask) => {
				const existingIndex = updatedChartData.findIndex(
					(task) => task.id === updatedTask.id
				);

				if (existingIndex !== -1) {
					// Update existing task
					updatedChartData[existingIndex] = {
						...updatedChartData[existingIndex],
						...updatedTask,
					};
				} else {
					// New task: find the correct position to insert
					let insertIndex = updatedChartData.length; // Default to end of array

					// Find the last task of the same room
					const sameRoomLastIndex = updatedChartData.reduce(
						(lastIndex, task, index) => {
							return task.roomId === updatedTask.roomId ? index : lastIndex;
						},
						-1
					);

					if (sameRoomLastIndex !== -1) {
						// Insert after the last task of the same room
						insertIndex = sameRoomLastIndex + 1;
					} else {
						// If no tasks for this room, find the last task of the same job
						const sameJobLastIndex = updatedChartData.reduce(
							(lastIndex, task, index) => {
								return task.jobId === updatedTask.jobId ? index : lastIndex;
							},
							-1
						);

						if (sameJobLastIndex !== -1) {
							// Insert after the last task of the same job
							insertIndex = sameJobLastIndex + 1;
						}
					}

					// Insert the new task
					updatedChartData.splice(insertIndex, 0, updatedTask);
				}
			});

			return {
				...state,
				chartData: updatedChartData,
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
