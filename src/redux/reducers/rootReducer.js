import { combineReducers } from "redux";
import { ganttReducer } from "./ganttReducer";
import { builders } from "./builders"; // Adjust the import path

const rootReducer = combineReducers({
	jobs: ganttReducer,
	builders,
	// other reducers if needed
});

export default rootReducer;
