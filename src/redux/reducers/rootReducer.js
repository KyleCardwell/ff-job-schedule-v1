import { combineReducers } from "redux";
import { builders } from "./builders"; // Adjust the import path
import { holidaysReducer } from "./holidays";
import { chartDataReducer } from "./chartData";
import { taskDataReducer } from "./taskData";
import { completedProjectsReducer } from "./completedProjects";
import authReducer from "../authSlice";
import { projectsReducer } from "./projects";
import { chartConfigReducer } from "./chartConfig";

const rootReducer = combineReducers({
	auth: authReducer,
	builders,
	holidays: holidaysReducer,
	chartData: chartDataReducer,
	taskData: taskDataReducer,
	completedProjects: completedProjectsReducer,
	projects: projectsReducer,
	chartConfig: chartConfigReducer,
	// other reducers if needed
});

export default rootReducer;
