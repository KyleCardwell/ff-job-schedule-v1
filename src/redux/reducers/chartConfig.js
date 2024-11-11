import { Actions } from "../actions";

const initialState = {
	chart_config_id: null,
	next_task_number: null,
	loading: false,
	error: null,
};

export const chartConfigReducer = (state = initialState, action) => {
	switch (action.type) {
		case Actions.chartConfig.FETCH_CONFIG_START:
			return {
				...state,
				loading: true,
				error: null,
			};

		case Actions.chartConfig.FETCH_CONFIG_SUCCESS:
			return {
				...state,
				loading: false,
				chart_config_id: action.payload.chart_config_id,
				next_task_number: action.payload.next_task_number,
			};

		case Actions.chartConfig.FETCH_CONFIG_ERROR:
			return {
				...state,
				loading: false,
				error: action.payload,
			};

		case Actions.chartConfig.UPDATE_NEXT_TASK_NUMBER:
			return {
				...state,
				next_task_number: action.payload,
			};

		default:
			return state;
	}
};
