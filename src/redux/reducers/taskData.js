// import { newJobs } from "../../mocks/jobsV2";
import { newJobs } from "../../mocks/jobsRealData";
import { getTaskData } from "../../utils/helpers";
import { Actions } from "../actions";

// const { tasks, tasksByBuilder } = getTaskData(newJobs);

const initialState = {
	tasks: [],
	subTasksByEmployee: {},
};

export const taskDataReducer = (state = initialState, action) => {
	switch (action.type) {
		case Actions.taskData.FETCH_TASK_DATA_START:
			return {
				...state,
				loading: true,
				error: null,
			};

		case Actions.taskData.FETCH_TASK_DATA_SUCCESS:
			return {
				...state,
				tasks: action.payload.flattenedResult,
				subTasksByEmployee: action.payload.subTasksByEmployee,
				loading: false,
				error: null,
			};

		case Actions.taskData.FETCH_TASK_DATA_ERROR:
			return {
				...state,
				loading: false,
				error: action.payload,
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
				subTasksByEmployee: {
					...state.subTasksByEmployee,
					[action.payload.employee_id]: action.payload.taskList,
				},
			};
		}
		case Actions.taskData.UPDATE_TASKS_AFTER_BUILDER_CHANGES: {
			const updatedTasks = action.payload;
			const updatedTasksMap = new Map(
				updatedTasks.map((task) => [task.id, task])
			);

			// Create a new subTasksByEmployee object
			const subTasksByEmployee = {};

			// Update tasks while maintaining original order
			const newTasks = state.tasks.map((task) => {
				const updatedTask = updatedTasksMap.get(task.id);
				if (updatedTask) {
					// Add task to subTasksByEmployee
					if (!subTasksByEmployee[updatedTask.employee_id]) {
						subTasksByEmployee[updatedTask.employee_id] = [];
					}
					subTasksByEmployee[updatedTask.employee_id].push(updatedTask);
					return updatedTask;
				}
				// If task wasn't updated, add it to subTasksByEmployee as is
				if (!subTasksByEmployee[task.employee_id]) {
					subTasksByEmployee[task.employee_id] = [];
				}
				subTasksByEmployee[task.employee_id].push(task);
				return task;
			});

			return {
				...state,
				tasks: newTasks,
				subTasksByEmployee,
			};
		}
		case Actions.taskData.JOB_MODAL_UPDATE_TASK_DATA: {
			const { updatedTasks, updatedBuilderArrays, removedWorkPeriods } =
				action.payload;

			let updatedTasksState = state.tasks.filter(
				(task) => !removedWorkPeriods.includes(task.id)
			);
			let updatedsubTasksByEmployee = { ...state.subTasksByEmployee };

			// Replace or add the updated tasks
			updatedTasks.forEach((updatedTask) => {
				const existingIndex = updatedTasksState.findIndex(
					(task) => task.id === updatedTask.id
				);
				if (existingIndex !== -1) {
					updatedTasksState[existingIndex] = updatedTask;
				} else {
					updatedTasksState.push(updatedTask);
				}
			});

			// Sort the tasks by created_at dates
			updatedTasksState.sort((a, b) => {
				if (a.project_created_at === b.project_created_at) {
					if (a.task_created_at === b.task_created_at) {
						return a.subTask_created_at.localeCompare(b.subTask_created_at);
					}
					return a.task_created_at.localeCompare(b.task_created_at);
				}
				return a.project_created_at.localeCompare(b.project_created_at);
			});

			// Update subTasksByEmployee with updatedBuilderArrays
			Object.entries(updatedBuilderArrays).forEach(([builderId, tasks]) => {
				updatedsubTasksByEmployee[builderId] = tasks;
			});

			return {
				...state,
				tasks: updatedTasksState,
				subTasksByEmployee: updatedsubTasksByEmployee,
			};
		}
		case Actions.taskData.REMOVE_COMPLETED_JOB_FROM_TASKS:
			return {
				...state,
				tasks: state.tasks.filter((task) => task.jobId !== action.payload),
				subTasksByEmployee: Object.fromEntries(
					Object.entries(state.subTasksByEmployee).map(([builderId, tasks]) => [
						builderId,
						tasks.filter((task) => task.jobId !== action.payload),
					])
				),
			};
		default:
			return state;
	}
};
