// import { newJobs } from "../../mocks/jobsV2";
import { newJobs } from "../../mocks/jobsRealData";
import { getChartData } from "../../utils/helpers";
import { Actions } from "../actions";

const { taskList, earliestStartDate, latestStartDate } = getChartData(newJobs);

const updateDateRange = (state, updatedTasks) => {
	let { earliestStartDate, latestStartDate } = state;
	let needsUpdate = false;

	updatedTasks.forEach((task) => {
		const startDate = new Date(task.startDate);
		if (startDate < earliestStartDate || startDate > latestStartDate) {
			needsUpdate = true;
		}
	});

	if (needsUpdate) {
		const allTasks = [...state.chartData, ...updatedTasks];
		earliestStartDate = new Date(
			Math.min(...allTasks.map((t) => new Date(t.startDate)))
		);
		latestStartDate = new Date(
			Math.max(...allTasks.map((t) => new Date(t.startDate)))
		);
	}

	return { earliestStartDate, latestStartDate, needsUpdate };
};

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
		// case Actions.chartData.UPDATE_EARLIEST_START_DATE:
		// 	return {
		// 		...state,
		// 		earliestStartDate: action.payload,
		// 	};
		// case Actions.chartData.UPDATE_LATEST_START_DATE:
		// 	return {
		// 		...state,
		// 		latestStartDate: action.payload,
		// 	};
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
				updateDateRange(state, action.payload);
			return {
				...state,
				chartData: updatedChartData,
				...(needsUpdate && { earliestStartDate, latestStartDate }),
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

			const { earliestStartDate, latestStartDate, needsUpdate } =
				updateDateRange(state, updatedTasks);

			return {
				...state,
				chartData: updatedChartData,
				...(needsUpdate && { earliestStartDate, latestStartDate }),
			};
		}
		case Actions.chartData.REMOVE_COMPLETED_JOB_FROM_CHART:
			return {
				...state,
				chartData: state.chartData.filter(
					(item) => item.jobId !== action.payload
				),
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
