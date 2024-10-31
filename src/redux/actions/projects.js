import { Actions } from "../actions";
import { querySupabase, supabase } from "../../utils/supabase";

export const fetchProjects =
	(options = {}) =>
	async (dispatch) => {
		dispatch({ type: Actions.projects.FETCH_PROJECTS_START });

		try {
			const result = await querySupabase("projects", options);
			dispatch({
				type: Actions.projects.FETCH_PROJECTS_SUCCESS,
				payload: result,
			});
		} catch (error) {
			dispatch({
				type: Actions.projects.FETCH_PROJECTS_ERROR,
				payload: error.message,
			});
		}
	};

export const fetchProjectDateRange = () => async (dispatch) => {
	dispatch({ type: Actions.projects.FETCH_DATE_RANGE_START });

	try {
		const { data, error } = await supabase
			.from("subTasks")
			.select('startDate')
			.order("startDate", { ascending: true });

		if (error) throw error;

		dispatch({
			type: Actions.projects.FETCH_DATE_RANGE_SUCCESS,
			payload: {
				earliestStartDate: data[0]?.startDate, // First record has earliest date
				latestStartDate: data[data.length - 1]?.startDate, // Last record has latest date
			},
		});
	} catch (error) {
		dispatch({
			type: Actions.projects.FETCH_DATE_RANGE_ERROR,
			payload: error.message,
		});
	}
};
