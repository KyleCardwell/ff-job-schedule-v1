import { Actions } from "../actions";
import { querySupabase, supabase } from "../../utils/supabase";

export const fetchProjects =
	(options = {}) =>
	async (dispatch) => {
		dispatch({ type: Actions.projects.FETCH_PROJECTS_START });

		try {
			const result = await querySupabase("projects", options);

			const flattenedResult = result
				.flatMap((project) =>
					project.tasks.flatMap((task) =>
						task.subTasks.map((subTask, index) => ({
							...subTask,
							project_id: task.project_id,
							project_name: project.project_name,
							project_created_at: project.project_created_at,
							task_name: task.task_name,
							task_created_at: task.task_created_at,
							task_active: task.task_active,
							heightAdjust: index === 0 ? task.subTasks.length : 0,
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

					return a.subTask_created_at.localeCompare(b.subTask_created_at);
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

// export const fetchAllSubTasks = () => async (dispatch) => {
// 	dispatch({ type: Actions.projects.FETCH_PROJECTS_START });

// 	try {
// 		const { data, error } = await supabase
// 			.from("subTasks")
// 			.select(
// 				`
//         *,
//         tasks!inner (
//           task_created_at,
//           project_id,
//           projects!inner (
//             project_created_at
//           )
//         )
//       `
// 			)
//       .order('project_created_at', { foreignTable: 'tasks.projects', ascending: true })
//       .order('task_created_at', { foreignTable: 'tasks', ascending: true })
//       .order('subTask_created_at', { ascending: true });

// 		if (error) throw error;

// 		const flattened = data.flatMap((item) => ({
// 			...item,
// 			...item.tasks,
// 			...item.tasks.projects,
// 			tasks: undefined,
// 			projects: undefined,
// 		}));

// 		dispatch({
// 			type: Actions.projects.FETCH_PROJECTS_SUCCESS,
// 			payload: flattened,
// 		});
// 	} catch (error) {
// 		console.error("Error fetching subtasks:", error);
// 		dispatch({
// 			type: Actions.projects.FETCH_PROJECTS_ERROR,
// 			payload: error.message,
// 		});
// 	}
// };

export const fetchProjectDateRange = () => async (dispatch) => {
	dispatch({ type: Actions.projects.FETCH_DATE_RANGE_START });

	try {
		const { data, error } = await supabase
			.from("subTasks")
			.select("startDate")
			.order("startDate", { ascending: true });

		if (error) throw error;

		dispatch({
			type: Actions.projects.FETCH_DATE_RANGE_SUCCESS,
			payload: {
				earliestStartDate: data[0]?.startDate, // First record has earliest date
				latestStartDate: data[data.length - 1]?.startDate, // Last record has latest date
			},
		});
	} catch (error) {
		dispatch({
			type: Actions.projects.FETCH_DATE_RANGE_ERROR,
			payload: error.message,
		});
	}
};

export const saveProject = (projectData) => async (dispatch) => {
	dispatch({ type: Actions.projects.CREATE_PROJECT_START });

	try {
		const {
			jobName,
			localRooms,
			newProjectCreatedAt,
			dayWidth,
			nextJobNumber,
		} = projectData;

		// 1. Create project
		const { data: newProject, error: projectError } = await supabase
			.from("projects")
			.upsert({
				project_name: jobName,
				project_created_at: newProjectCreatedAt,
			})
			.select()
			.single();

		if (projectError) throw projectError;

		// 2. Create tasks (rooms)
		const tasksData = localRooms.map((room) => ({
			project_id: newProject.id,
			task_number: room.task_number,
			task_name: room.task_name,
			task_active: room.task_active,
			task_created_at: room.task_createed_at,
		}));

		const { data: newTasks, error: tasksError } = await supabase
			.from("tasks")
			.upsert(tasksData)
			.select();

		if (tasksError) throw tasksError;

		// 3. Create subtasks (work periods)
		const subtasksData = localRooms.flatMap((room, roomIndex) =>
			room.workPeriods.map((wp) => ({
				// project_id: newProject.id,
				task_id: newTasks[roomIndex].id,
				employee_id: wp.employee_id,
				startDate: wp.startDate,
        endDate: wp.endDate,
				duration: wp.duration,
        subTask_width: wp.subTask_width,
				// task_active: wp.task_active,
				subTask_created_at: wp.subTask_created_at,
			}))
		);

		const { data: newSubtasks, error: subtasksError } = await supabase
			.from("subTasks")
			.upsert(subtasksData)
			.select();

		if (subtasksError) throw subtasksError;

		// 4. Format tasks for Redux
		const formattedTasks = newSubtasks.map((subtask) => {
			const task = newTasks.find((t) => t.id === subtask.task_id);
			return {
				id: subtask.id,
				project_id: newProject.id,
				project_name: newProject.name,
				task_name: task.task_name,
				task_number: task.task_number,
				employee_id: subtask.employee_id,
				startDate: subtask.startDate,
				duration: subtask.duration,
				task_active: subtask.task_active,
				task_createed_at: task.task_created_at,
				subTask_created_at: subtask.subTask_created_at,
				project_created_at: newProject.project_created_at,
				subTask_width: dayWidth,
			};
		});

		// 5. Update Redux store
		const { updatedTasks, updatedBuilderArrays } = sortAndAdjustBuilderTasks(
			formattedTasks,
			new Set(formattedTasks.map((task) => task.employee_id))
		);

		dispatch(jobModalUpdateChartData(updatedTasks, []));
		dispatch(jobModalUpdateTaskData(updatedTasks, updatedBuilderArrays, []));
		dispatch(updateNextJobNumber(nextJobNumber));

		dispatch({
			type: Actions.projects.CREATE_PROJECT_SUCCESS,
			payload: newProject,
		});

		return { success: true };
	} catch (error) {
		dispatch({
			type: Actions.projects.CREATE_PROJECT_ERROR,
			payload: error.message,
		});
		return { success: false, error: error.message };
	}
};
