import { sortAndAdjustDates } from "../../utils/helpers";
import { Actions } from "../actions";
import { eachDayOfInterval } from "date-fns";
import { normalizeDate } from "../../utils/dateUtils";
import { fetchProjects, updateSubtasksPositions } from "./projects";
import { supabase } from "../../utils/supabase";
import { fetchEmployees } from "./builders";

export const updateTasksByOneBuilder = (employee_id, taskList) => {
	return {
		type: Actions.taskData.UPDATE_TASKS_BY_ONE_BUILDER,
		payload: { employee_id, taskList },
	};
};

export const updateTasksAfterBuilderChanges = (
	updatedBuilders,
	deletedBuilderIds,
	workdayHours,
	holidayChecker,
	holidays,
	dayWidth,
	chartStartDate,
	defaultBuilderId
) => {
	return async (dispatch, getState) => {
		const state = getState();
		const allTasks = state.taskData.tasks;

		// Create a complete timeOffByBuilder object
		const timeOffByBuilder = updatedBuilders.reduce((acc, builder) => {
			acc[builder.employee_id] = builder.time_off?.flatMap((period) =>
				eachDayOfInterval({
					start: normalizeDate(new Date(period.start)),
					end: normalizeDate(new Date(period.end)),
				}).map((day) => normalizeDate(day))
			);
			return acc;
		}, {});

		// Handle deleted builders
		const tasksAfterDeletion = allTasks.map((task) =>
			deletedBuilderIds.includes(task.employee_id)
				? { ...task, employee_id: defaultBuilderId }
				: task
		);

		// Update tasks for each builder
		const updatedTasks = updatedBuilders.reduce((acc, builder) => {
			const builderTasks = acc.filter(
				(task) => task.employee_id === builder.employee_id
			);
			const sortedTasks = sortAndAdjustDates(
				builderTasks,
				workdayHours,
				holidayChecker,
				holidays,
				timeOffByBuilder,
				dayWidth,
				chartStartDate
			);
			return [
				...acc.filter((task) => task.employee_id !== builder.employee_id),
				...sortedTasks,
			];
		}, tasksAfterDeletion);

		try {
			// Update subtasks in the database
			await updateSubtasksPositions(updatedTasks);

			if (deletedBuilderIds.length > 0) {
				const { error } = await supabase
					.from("employees")
					.delete()
					.in("employee_id", deletedBuilderIds);

				if (error) throw error;
				await dispatch(fetchEmployees())
			}

			// Update Redux store
			// dispatch({
			// 	type: Actions.taskData.UPDATE_TASKS_AFTER_BUILDER_CHANGES,
			// 	payload: updatedTasks,
			// });
				await dispatch(fetchProjects())
		} catch (error) {
			console.error("Error updating subtasks positions:", error);
			throw error;
		}
	};
};

export const jobModalUpdateTaskData = (
	updatedTasks,
	updatedBuilderArrays,
	removedWorkPeriods
) => {
	return {
		type: Actions.taskData.JOB_MODAL_UPDATE_TASK_DATA,
		payload: { updatedTasks, updatedBuilderArrays, removedWorkPeriods },
	};
};

export const removeCompletedJobFromTasks = (jobId) => ({
	type: Actions.taskData.REMOVE_COMPLETED_JOB_FROM_TASKS,
	payload: jobId,
});
