// redux/store.js
import { createStore } from "redux";
import { ganttReducer } from "./ganttReducer";

const store = createStore(ganttReducer);

export default store;
