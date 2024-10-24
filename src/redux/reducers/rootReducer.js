import { combineReducers } from "redux";
// import { ganttReducer } from "./ganttReducer";
import { builders } from "./builders"; // Adjust the import path
import { holidaysReducer } from "./holidays";
import { chartDataReducer } from "./chartData";
import { taskDataReducer } from "./taskData";
import { completedProjectsReducer } from "./completedProjects";

const rootReducer = combineReducers({
	// jobs: ganttReducer,
	builders,
	holidays: holidaysReducer,
	chartData: chartDataReducer,
	taskData: taskDataReducer,
	completedProjects: completedProjectsReducer,
	// other reducers if needed
});

export default rootReducer;
