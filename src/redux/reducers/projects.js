import { Actions } from "../actions";

const initialState = {
	data: null,
	loading: false,
	error: null,
	dateRange: {
		earliestStartDate: null,
		latestStartDate: null,
		loading: false,
		error: null,
	},
};

export const projectsReducer = (state = initialState, action) => {
	switch (action.type) {
		case Actions.projects.FETCH_PROJECTS_START:
			return {
				...state,
				loading: true,
				error: null,
			};

		case Actions.projects.FETCH_PROJECTS_SUCCESS:
			return {
				...state,
				loading: false,
				data: action.payload,
			};

		case Actions.projects.FETCH_PROJECTS_ERROR:
			return {
				...state,
				loading: false,
				error: action.payload,
			};

		case Actions.projects.FETCH_DATE_RANGE_START:
			return {
				...state,
				dateRange: {
					...state.dateRange,
					loading: true,
					error: null,
				},
			};

		case Actions.projects.FETCH_DATE_RANGE_SUCCESS:
			return {
				...state,
				dateRange: {
					earliestStartDate: action.payload.earliestStartDate,
					latestStartDate: action.payload.latestStartDate,
					loading: false,
					error: null,
				},
			};

		case Actions.projects.FETCH_DATE_RANGE_ERROR:
			return {
				...state,
				dateRange: {
					...state.dateRange,
					loading: false,
					error: action.payload,
				},
			};

		case Actions.projects.CREATE_PROJECT_START:
			return {
				...state,
				loading: true,
				error: null,
			};

		case Actions.projects.CREATE_PROJECT_SUCCESS:
			return {
				...state,
				loading: false,
				data: state.data ? [...state.data, action.payload] : [action.payload],
			};

		case Actions.projects.CREATE_PROJECT_ERROR:
			return {
				...state,
				loading: false,
				error: action.payload,
			};
		default:
			return state;
	}
};
