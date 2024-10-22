import { completedJobs } from "../../mocks/jobsCompleted";
import { Actions } from "../actions";

const initialState = {
	completedProjects: [...completedJobs],
};

export const completedProjectsReducer = (state = initialState, action) => {
	switch (action.type) {
		case Actions.completedProjects.UPDATE_COMPLETED_PROJECTS:
			return {
				...state,
				completedProjects: action.payload,
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
					(project) => project.id !== action.payload
				),
			};
		default:
			return state;
	}
};
