import { Actions } from "../actions";

export const updateTasksByOneBuilder = (builderId, taskList) => {
  return {
    type: Actions.taskData.UPDATE_TASKS_BY_ONE_BUILDER,
    payload: { builderId, taskList },
  };
};
