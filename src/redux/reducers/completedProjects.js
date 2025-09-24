import { completedJobs } from "../../mocks/jobsCompleted";
import { Actions } from "../actions";

const initialState = {
  completedProjects: [],
  loading: false,
  error: null,
};

export const completedProjectsReducer = (state = initialState, action) => {
  switch (action.type) {
    case Actions.completedProjects.FETCH_COMPLETED_PROJECTS_START:
      return {
        ...state,
        loading: true,
        error: null,
      };

    case Actions.completedProjects.FETCH_COMPLETED_PROJECTS_SUCCESS:
      return {
        ...state,
        loading: false,
        completedProjects: action.payload,
        error: null,
      };

    case Actions.completedProjects.FETCH_COMPLETED_PROJECTS_ERROR:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };
    case Actions.completedProjects.UPDATE_COMPLETED_PROJECTS:
      return {
        ...state,
        completedProjects: action.payload,
      };
    case Actions.completedProjects.UPDATE_SINGLE_COMPLETED_TASK:
      return {
        ...state,
        completedProjects: state.completedProjects.map((project) => {
          if (project.project_id !== action.payload.project_id) {
            return project;
          }
          return {
            ...project,
            tasks: project.tasks.map((task) =>
              task.task_id === action.payload.task_id
                ? { ...task, costing_complete: action.payload.costing_complete }
                : task
            ),
          };
        }),
      };
    case Actions.completedProjects.MARK_PROJECT_AS_COMPLETED:
      // This assumes that the project data is already in the state
      // You might need to adjust this based on your data structure
      return {
        ...state,
        completedProjects: [...state.completedProjects, action.payload],
      };
    case Actions.completedProjects.RESTORE_COMPLETED_PROJECT:
      return {
        ...state,
        completedProjects: state.completedProjects.filter(
          (project) => project.project_id !== action.payload
        ),
      };
    default:
      return state;
  }
};
