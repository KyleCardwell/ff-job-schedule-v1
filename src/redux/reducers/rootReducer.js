import { combineReducers } from "redux";

import authReducer from "../authSlice";

import { accessoriesReducer } from "./accessoriesReducer";
import { builders } from "./builders"; // Adjust the import path
import cabinetAnchorsReducer from "./cabinetAnchors";
import cabinetStylesReducer from "./cabinetStyles";
import cabinetTypesReducer from "./cabinetTypes";
import { chartConfigReducer } from "./chartConfig";
import { chartDataReducer } from "./chartData";
import { completedProjectsReducer } from "./completedProjects";
import { estimatesReducer } from "./estimates";
import { featureTogglesReducer } from "./featureToggles";
import { financialsDataReducer } from "./financialsData";
import { finishesReducer } from "./finishes";
import { hardwareReducer } from "./hardware";
import { holidaysReducer } from "./holidays";
import { lengthsReducer } from "./lengthsReducer";
import { materialsReducer } from "./materials";
import partsListReducer from "./partsList";
import partsListAnchorsReducer from "./partsListAnchors";
import { projectsReducer } from "./projects";
import servicesReducer from "./services";
import { taskDataReducer } from "./taskData";
import { teamEstimateDefaultsReducer } from "./teamEstimateDefaults";
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
	finishes: finishesReducer,
	hardware: hardwareReducer,
	services: servicesReducer,
	cabinetTypes: cabinetTypesReducer,
	cabinetAnchors: cabinetAnchorsReducer,
	cabinetStyles: cabinetStylesReducer,
	partsList: partsListReducer,
	partsListAnchors: partsListAnchorsReducer,
	accessories: accessoriesReducer,
	lengths: lengthsReducer,
	teamEstimateDefaults: teamEstimateDefaultsReducer,
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
