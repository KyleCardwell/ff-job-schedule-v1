// import { newJobs } from "../../mocks/jobsV2";
import { newJobs } from "../../mocks/jobsRealData";
import { getChartData } from "../../utils/helpers";
import { Actions } from "../actions";

const { taskList, earliestStartDate, latestStartDate } = getChartData(newJobs);

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
		// case Actions.chartData.JOB_MODAL_UPDATE_CHART_DATA: {
		// 	const { updatedTasks, removedWorkPeriods } = action.payload;

		// 	// First, remove the tasks that should be deleted
		// 	let updatedChartData = state.chartData.filter(
		// 		(task) => !removedWorkPeriods.includes(task.id)
		// 	);

		// 	updatedTasks.forEach((updatedTask) => {
		// 		const existingIndex = updatedChartData.findIndex(
		// 			(task) => task.id === updatedTask.id
		// 		);

		// 		if (existingIndex !== -1) {
		// 			// Update existing task
		// 			updatedChartData[existingIndex] = {
		// 				...updatedChartData[existingIndex],
		// 				...updatedTask,
		// 			};
		// 		} else {
		// 			// New task: find the correct position to insert
		// 			let insertIndex = updatedChartData.length; // Default to end of array

		// 			// Find the last task of the same room
		// 			const sameRoomLastIndex = updatedChartData.reduce(
		// 				(lastIndex, task, index) => {
		// 					return task.roomId === updatedTask.roomId ? index : lastIndex;
		// 				},
		// 				-1
		// 			);

		// 			if (sameRoomLastIndex !== -1) {
		// 				// Insert after the last task of the same room
		// 				insertIndex = sameRoomLastIndex + 1;
		// 			} else {
		// 				// If no tasks for this room, find the last task of the same job
		// 				const sameJobLastIndex = updatedChartData.reduce(
		// 					(lastIndex, task, index) => {
		// 						return task.jobId === updatedTask.jobId ? index : lastIndex;
		// 					},
		// 					-1
		// 				);

		// 				if (sameJobLastIndex !== -1) {
		// 					// Insert after the last task of the same job
		// 					insertIndex = sameJobLastIndex + 1;
		// 				}
		// 			}

		// 			// Insert the new task
		// 			updatedChartData.splice(insertIndex, 0, updatedTask);
		// 		}
		// 	});

		// 	const { earliestStartDate, latestStartDate, needsUpdate } =
		// 		updateDateRange(state, updatedChartData);

		// 	return {
		// 		...state,
		// 		chartData: updatedChartData,
		// 		...(needsUpdate && { earliestStartDate, latestStartDate }),
		// 	};
		// }
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
				if (a.projectCreatedAt === b.projectCreatedAt) {
					if (a.roomCreatedAt === b.roomCreatedAt) {
						return a.subTaskCreatedAt.localeCompare(b.subTaskCreatedAt);
					}
					return a.roomCreatedAt.localeCompare(b.roomCreatedAt);
				}
				return a.projectCreatedAt.localeCompare(b.projectCreatedAt);
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
