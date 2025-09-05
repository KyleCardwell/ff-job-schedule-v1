import { combineReducers } from "redux";

import authReducer from "../authSlice";

import { builders } from "./builders"; // Adjust the import path
import cabinetTypesReducer from "./cabinetTypes";
import { chartConfigReducer } from "./chartConfig";
import { chartDataReducer } from "./chartData";
import { completedProjectsReducer } from "./completedProjects";
import { estimatesReducer } from "./estimates";
import { featureTogglesReducer } from "./featureToggles";
import { financialsDataReducer } from "./financialsData";
import { holidaysReducer } from "./holidays";
import { materialsReducer } from "./materials";
import { projectsReducer } from "./projects";
import servicesReducer from "./services";
import { taskDataReducer } from "./taskData";
import { teamMembersReducer } from "./teamMembers";

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
	estimates: estimatesReducer,
	featureToggles: featureTogglesReducer,
	materials: materialsReducer,
	services: servicesReducer,
	cabinetTypes: cabinetTypesReducer,
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
