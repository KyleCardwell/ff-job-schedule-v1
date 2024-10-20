// import { newJobs } from "../../mocks/jobsV2";
import { newJobs } from "../../mocks/jobsRealData";
import { getTaskData } from "../../utils/helpers";
import { Actions } from "../actions";

const { tasks, tasksByBuilder, multiWorkPeriodRooms } = getTaskData(newJobs);

const initialState = {
	tasks,
	tasksByBuilder,
	multiWorkPeriodRooms: multiWorkPeriodRooms,
};

export const taskDataReducer = (state = initialState, action) => {
	switch (action.type) {
		case Actions.jobs.SAVE_JOBS:
			return {
				...state,
				taskData: action.payload,
			};
		case Actions.taskData.UPDATE_TASKS_BY_ONE_BUILDER: {
			const updatedTasksMap = new Map(
				action.payload.taskList.map((task) => [task.id, task])
			);
			return {
				...state,
				tasks: state.tasks.map((task) => {
					return updatedTasksMap.get(task.id) || task;
				}),
				tasksByBuilder: {
					...state.tasksByBuilder,
					[action.payload.builderId]: action.payload.taskList,
				},
			};
		}
		case Actions.taskData.UPDATE_TASKS_AFTER_BUILDER_CHANGES: {
			const updatedTasks = action.payload;
			const tasksByBuilder = updatedTasks.reduce((acc, task) => {
				if (!acc[task.builderId]) acc[task.builderId] = [];
				acc[task.builderId].push(task);
				return acc;
			}, {});

			return {
				...state,
				tasks: updatedTasks,
				tasksByBuilder,
			};
		}
		case Actions.taskData.JOB_MODAL_UPDATE_TASK_DATA: {
			const { updatedTasks, updatedBuilderArrays, removedWorkPeriods } =
				action.payload;

			let updatedTasksState = state.tasks.filter(
				(task) => !removedWorkPeriods.includes(task.id)
			);
			let updatedTasksByBuilder = { ...state.tasksByBuilder };

			updatedTasks.forEach((updatedTask) => {
				const existingIndex = updatedTasksState.findIndex(
					(task) => task.id === updatedTask.id
				);

				if (existingIndex !== -1) {
					// Update existing task
					updatedTasksState[existingIndex] = {
						...updatedTasksState[existingIndex],
						...updatedTask,
					};
				} else {
					// New task: find the correct position to insert
					let insertIndex = updatedTasksState.length; // Default to end of array

					// Find the last task of the same room
					const sameRoomLastIndex = updatedTasksState.reduce(
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
						const sameJobLastIndex = updatedTasksState.reduce(
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
					updatedTasksState.splice(insertIndex, 0, updatedTask);
				}
			});

			// Update tasksByBuilder with updatedBuilderArrays
			Object.entries(updatedBuilderArrays).forEach(([builderId, tasks]) => {
				updatedTasksByBuilder[builderId] = tasks;
			});

			return {
				...state,
				tasks: updatedTasksState,
				tasksByBuilder: updatedTasksByBuilder,
			};
		}
		default:
			return state;
	}
};
