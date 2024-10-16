import { sortAndAdjustDates } from "../../utils/helpers";
import { Actions } from "../actions";

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
        { [builder.id]: builder.timeOff },
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
