import { Actions } from "../actions";
import { querySupabase } from "../../utils/supabase";

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
