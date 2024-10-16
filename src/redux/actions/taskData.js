import { sortAndAdjustDates } from "../../utils/helpers";
import { Actions } from "../actions";
import { eachDayOfInterval } from "date-fns";
import { normalizeDate } from "../../utils/dateUtils";
export const updateTasksByOneBuilder = (builderId, taskList) => {
	return {
		type: Actions.taskData.UPDATE_TASKS_BY_ONE_BUILDER,
		payload: { builderId, taskList },
	};
};

export const updateTasksAfterBuilderChanges = (
	updatedBuilders,
	deletedBuilderIds,
	workdayHours,
	holidayChecker,
	holidays,
	dayWidth,
	chartStartDate
) => {
	return (dispatch, getState) => {
		const state = getState();
		const allTasks = state.taskData.tasks;

		// Create a complete timeOffByBuilder object
		const timeOffByBuilder = updatedBuilders.reduce((acc, builder) => {
			acc[builder.id] = builder.timeOff.flatMap((period) =>
				eachDayOfInterval({
					start: normalizeDate(new Date(period.start)),
					end: normalizeDate(new Date(period.end)),
				}).map((day) => normalizeDate(day).toISOString())
			);
			return acc;
		}, {});

		// Handle deleted builders
		const tasksAfterDeletion = allTasks.map((task) =>
			deletedBuilderIds.includes(task.builderId)
				? { ...task, builderId: "1" }
				: task
		);

		// Update tasks for each builder
		const updatedTasks = updatedBuilders.reduce((acc, builder) => {
			const builderTasks = acc.filter((task) => task.builderId === builder.id);
			const sortedTasks = sortAndAdjustDates(
				builderTasks,
				workdayHours,
				holidayChecker,
				holidays,
				builder.id,
				null,
				timeOffByBuilder,
				dayWidth,
				chartStartDate
			);
			return [
				...acc.filter((task) => task.builderId !== builder.id),
				...sortedTasks,
			];
		}, tasksAfterDeletion);

		dispatch({
			type: Actions.taskData.UPDATE_TASKS_AFTER_BUILDER_CHANGES,
			payload: updatedTasks,
		});
	};
};
