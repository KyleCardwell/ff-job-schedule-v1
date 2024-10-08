// redux/store.js
import { createStore, applyMiddleware, compose } from "redux";
import rootReducer from "./reducers/rootReducer";
import { thunk } from "redux-thunk";
import logger from 'redux-logger'

const middlewares = [thunk, logger]

const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

const store = createStore(
	rootReducer,
	composeEnhancers(
		applyMiddleware(...middlewares)
	)
);

export default store;
