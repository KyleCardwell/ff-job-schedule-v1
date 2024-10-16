// import { newJobs } from "../../mocks/jobsV2";
import { newJobs } from "../../mocks/jobsRealData";
import { getChartData } from "../../utils/helpers";
import { Actions } from "../actions";

const { taskList, earliestStartDate, latestStartDate } = getChartData(newJobs);

const initialState = {
  chartData: taskList,
  earliestStartDate,
  latestStartDate,
};

export const chartDataReducer = (state = initialState, action) => {
  switch (action.type) {
    case Actions.jobs.SAVE_JOBS:
      return {
        ...state,
        chartData: action.payload,
      };
    case Actions.chartData.UPDATE_EARLIEST_START_DATE:
      return {
        ...state,
        earliestStartDate: action.payload,
      };
    case Actions.chartData.UPDATE_LATEST_START_DATE:
      return {
        ...state,
        latestStartDate: action.payload,
      };
      case Actions.chartData.UPDATE_ONE_BUILDER_CHART_DATA: {
        const updatedTasksMap = new Map(
          action.payload.map((task) => [task.id, task])
        );
        
        return {
          ...state,
          chartData: state.chartData.map((project) => {
            const updatedWorkPeriods = project.workPeriods.map((wp) =>
              updatedTasksMap.has(wp.id)
                ? { ...wp, ...updatedTasksMap.get(wp.id) }
                : wp
            );
            
            // Sort the workPeriods by startDate
            const sortedWorkPeriods = [...updatedWorkPeriods].sort((a, b) => 
              new Date(a.startDate) - new Date(b.startDate)
            );
      
            return {
              ...project,
              workPeriods: sortedWorkPeriods,
              startDate: sortedWorkPeriods[0].startDate, // Update the project startDate
            };
          }),
        };
      }
    default:
      return state;
  }
};
