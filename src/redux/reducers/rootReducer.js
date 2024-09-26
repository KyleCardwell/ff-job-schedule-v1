import { combineReducers } from "redux";
import { ganttReducer } from "./ganttReducer";
import { builders } from "./builders"; // Adjust the import path
import { holidaysReducer } from "./holidays";

const rootReducer = combineReducers({
	jobs: ganttReducer,
	builders,
	holidays: holidaysReducer,
	// other reducers if needed
});

export default rootReducer;
