// redux/store.js
import { configureStore } from "@reduxjs/toolkit";
import rootReducer from "./reducers/rootReducer";
import logger from "redux-logger";

const store = configureStore({
	reducer: rootReducer,
	middleware: (getDefaultMiddleware) => {
		const customizedMiddleware = getDefaultMiddleware({
			serializableCheck: false,
		});

		// Only add logger in development
		if (process.env.NODE_ENV === "development") {
			return customizedMiddleware.concat(logger);
		}

		return customizedMiddleware.concat(logger);
	},
	devTools: process.env.NODE_ENV === "development",
});

export default store;
