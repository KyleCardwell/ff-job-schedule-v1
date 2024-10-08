// redux/store.js
import { createStore, applyMiddleware, compose } from "redux";
import rootReducer from "./reducers/rootReducer";
// import { thunk } from "redux-thunk";
import logger from 'redux-logger'

const store = createStore(
	rootReducer,
	compose(
		applyMiddleware(logger),
		window.__REDUX_DEVTOOLS_EXTENSION__ && window.__REDUX_DEVTOOLS_EXTENSION__()
	)
);

export default store;
