import { combineReducers } from "redux";
import { builders } from "./builders"; // Adjust the import path
import { holidaysReducer } from "./holidays";
import { chartDataReducer } from "./chartData";
import { taskDataReducer } from "./taskData";
import { completedProjectsReducer } from "./completedProjects";
import authReducer from "../authSlice";
import { projectsReducer } from "./projects";
import { chartConfigReducer } from "./chartConfig";
import { financialsDataReducer } from "./financialsData";
import { teamMembersReducer } from "./teamMembers";
import { featureTogglesReducer } from "./featureToggles";

const appReducer = combineReducers({
	auth: authReducer,
	builders,
	holidays: holidaysReducer,
	chartData: chartDataReducer,
	taskData: taskDataReducer,
	completedProjects: completedProjectsReducer,
	projects: projectsReducer,
	chartConfig: chartConfigReducer,
	financialsData: financialsDataReducer,
	teamMembers: teamMembersReducer,
	featureToggles: featureTogglesReducer,
});

// Root reducer that handles resetting state
const rootReducer = (state, action) => {
	// When clearAuth is dispatched, reset all state to undefined
	// This will cause each reducer to return its initial state
	if (action.type === 'auth/clearAuth') {
		state = undefined;
	}

	return appReducer(state, action);
};

export default rootReducer;
