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
    default:
      return state;
  }
};
