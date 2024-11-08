import { Actions } from "../actions";
import { querySupabase, supabase } from "../../utils/supabase";
import { v4 as uuidv4 } from "uuid";
import { jobModalUpdateChartData, updateNextJobNumber } from "./chartData";
import { jobModalUpdateTaskData } from "./taskData";

export const fetchProjects =
	(options = {}) =>
	async (dispatch) => {
		dispatch({ type: Actions.projects.FETCH_PROJECTS_START });

		try {
			const result = await querySupabase("projects", options);

			const flattenedResult = result
				.flatMap((project) =>
					project.tasks.flatMap((task) =>
						task.subtasks.map((subTask, index) => ({
							...subTask,
							project_id: task.project_id,
							project_name: project.project_name,
							project_created_at: project.project_created_at,
							task_name: task.task_name,
							task_created_at: task.task_created_at,
							task_active: task.task_active,
							heightAdjust: index === 0 ? task.subtasks.length : 0,
							task_number: task.task_number,
						}))
					)
				)
				.sort((a, b) => {
					const projectCompare = a.project_created_at.localeCompare(
						b.project_created_at
					);
					if (projectCompare !== 0) return projectCompare;

					const taskCompare = a.task_created_at.localeCompare(
						b.task_created_at
					);
					if (taskCompare !== 0) return taskCompare;

					return a.subtask_created_at.localeCompare(b.subtask_created_at);
				});

			// Create subTasksByEmployee from the sorted flattenedResult
			const subTasksByEmployee = flattenedResult.reduce((acc, subTask) => {
				if (!acc[subTask.employee_id]) {
					acc[subTask.employee_id] = [];
				}
				acc[subTask.employee_id].push(subTask);
				return acc;
			}, {});

			dispatch({
				type: Actions.chartData.FETCH_CHART_DATA_SUCCESS,
				payload: flattenedResult,
			});

			dispatch({
				type: Actions.taskData.FETCH_TASK_DATA_SUCCESS,
				payload: {
					flattenedResult,
					subTasksByEmployee,
				},
			});

			dispatch({
				type: Actions.projects.FETCH_PROJECTS_SUCCESS,
				payload: flattenedResult,
			});
		} catch (error) {
			dispatch({
				type: Actions.chartData.FETCH_CHART_DATA_ERROR,
				payload: error.message,
			});

			dispatch({
				type: Actions.taskData.FETCH_TASK_DATA_ERROR,
				payload: error.message,
			});

			dispatch({
				type: Actions.projects.FETCH_PROJECTS_ERROR,
				payload: error.message,
			});
		}
	};

export const saveProject = (projectData) => async (dispatch) => {
	dispatch({ type: Actions.projects.SAVE_PROJECT_START });

	try {
		const {
			jobName,
			projectId,
			newProjectCreatedAt,
			updatedTasks,
			removedWorkPeriods,
			updatedBuilderArrays,
			nextJobNumber,
		} = projectData;

		// 1. Create project
		const { data: newProject, error: projectError } = await supabase
			.from("projects")
			.upsert(
				{
					project_id: projectId,
					project_name: jobName,
					project_created_at: newProjectCreatedAt,
				},
				{ onConflict: "project_id", defaultToNull: false }
			)
			.select()
			.single();

		if (projectError)
			throw new Error(`Error creating project: ${projectError}`);

		// 2. Prepare tasks data with temp_task_id
		const tasksData = updatedTasks.reduce((acc, task) => {
			if (!acc[task.task_id]) {
				acc[task.task_id] = {
					task_id: task.taskIsNew ? undefined : task.task_id,
					temp_task_id: task.temp_task_id,
					project_id: task.taskIsNew ? newProject.project_id : task.project_id,
					task_number: task.task_number,
					task_name: task.task_name,
					task_active: task.task_active,
				};
			}
			return acc;
		}, {});

		console.log("tasksData", tasksData);
		// 3. Create/Update tasks
		const { data: newTasks, error: tasksError } = await supabase
			.from("tasks")
			.upsert(Object.values(tasksData), {
				onConflict: "task_id",
				defaultToNull: false,
			})
			.select();

		if (tasksError) throw new Error(`Error creating tasks: ${tasksError}`);
		console.log("newTasks", newTasks);

		// 4. Prepare subtasks data using the new task_ids
		const subtasksData = updatedTasks.map((wp) => {
			const newTask = newTasks.find(
				(task) =>
					task.task_id === wp.task_id || task.temp_task_id === wp.temp_task_id
			);

			if (!newTask) {
				console.log("could not find matching task for: ", wp);
				throw new Error(
					`Could not find matching task for work period ${wp.task_name}`
				);
			}
			return {
				subtask_id: wp.subTaskIsNew ? undefined : wp.subtask_id,
				task_id: wp.subTaskIsNew ? newTask.task_id : wp.task_id,
				temp_subtask_id: wp.temp_subtask_id,
				employee_id: wp.employee_id,
				start_date: wp.start_date,
				end_date: wp.end_date,
				duration: wp.duration,
				subtask_width: wp.subtask_width,
				subtask_created_at: wp.subtask_created_at,
			};
		});

		const { data: newSubtasks, error: subtasksError } = await supabase
			.from("subtasks")
			.upsert(subtasksData, {
				onConflict: "subtask_id",
				defaultToNull: false,
			})
			.select();

		if (subtasksError)
			throw new Error(`Error creating subtasks: ${subtasksError}`);
		console.log("newSubtasks", newSubtasks);

		// Format the new subtasks with all necessary data
		const formattedSubtasks = newSubtasks.map((subtask) => {
			const task = newTasks.find((t) => t.task_id === subtask.task_id);
			const originalTask = updatedTasks.find(
				(ut) =>
					(ut.subtask_id && ut.subtask_id === subtask.subtask_id) || 
            (ut.temp_subtask_id && ut.temp_subtask_id === subtask.temp_subtask_id)
    );

			console.log("Formatting subtask:", {
				subtask_id: subtask.subtask_id,
				temp_subtask_id: subtask.temp_subtask_id,
				task_name: task.task_name,
				originalTask: originalTask
					? {
							heightAdjust: originalTask.heightAdjust,
							task_name: originalTask.task_name,
							subtask_id: originalTask.subtask_id,
							temp_subtask_id: originalTask.temp_subtask_id,
					  }
					: "not found",
			});

      if (!originalTask) {
        console.error('Could not find original task for subtask:', subtask);
        console.log('Available updatedTasks:', updatedTasks.map(t => ({
            subtask_id: t.subtask_id,
            temp_subtask_id: t.temp_subtask_id,
            heightAdjust: t.heightAdjust
        })));
    }

			return {
				duration: subtask.duration,
				employee_id: subtask.employee_id,
				end_date: subtask.end_date,
				heightAdjust: originalTask.heightAdjust, // From original data
				project_created_at: originalTask.taskIsNew
					? newProject.project_created_at
					: originalTask.project_created_at,
				project_id: originalTask.taskIsNew
					? newProject.project_id
					: originalTask.project_id,
				project_name: newProject.project_name,
				start_date: subtask.start_date,
				subtask_created_at: subtask.subtask_created_at,
				subtask_id: subtask.subtask_id, // From database
				temp_subtask_id: subtask.temp_subtask_id,
				subtask_width: subtask.subtask_width,
				task_active: task.task_active,
				task_created_at: task.task_created_at,
				task_id: subtask.task_id, // From database
				task_name: task.task_name,
				task_number: task.task_number,
			};
		});

		// Update the existing builder arrays with the new database records
		const newBuilderArrays = Object.keys(updatedBuilderArrays).reduce(
			(acc, builderId) => {
				acc[builderId] = updatedBuilderArrays[builderId].map((task) => {
					// Find the matching formatted subtask by task_number
					const updatedTask = formattedSubtasks.find(
						(subtask) =>
							subtask.subtask_id === task.subtask_id ||
							subtask.temp_subtask_id === task.temp_subtask_id
					);
					return updatedTask || task; // fallback to original task if no match found
				});
				return acc;
			},
			{}
		);

		// // Update Redux with the new database records and builder arrays
		dispatch(jobModalUpdateChartData(formattedSubtasks, []));
		dispatch(jobModalUpdateTaskData(formattedSubtasks, newBuilderArrays, []));
		dispatch(updateNextJobNumber(nextJobNumber));

		dispatch({
			type: Actions.projects.SAVE_PROJECT_SUCCESS,
			payload: newProject,
		});

		return { success: true };
	} catch (error) {
		dispatch({
			type: Actions.projects.SAVE_PROJECT_ERROR,
			payload: error.message,
		});
		return { success: false, error: error.message };
	}
};

export const updateSubtasksPositions = async (tasks) => {
	try {
		const updates = tasks.map((task) => ({
			subtask_id: task.subtask_id,
			task_id: task.task_id,
			employee_id: task.employee_id,
			subtask_created_at: task.subtask_created_at,
			start_date: task.start_date,
			end_date: task.end_date,
			duration: task.duration,
			subtask_width: task.subtask_width,
		}));

		const { data, error } = await supabase
			.from("subtasks")
			.upsert(updates)
			.select();

		if (error) throw error;
		return data;
	} catch (error) {
		console.error("Error updating subtasks positions:", error);
		throw error;
	}
};
