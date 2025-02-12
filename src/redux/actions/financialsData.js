import { supabase } from "../../utils/supabase";
import { Actions } from "../actions";

// Action Creators
export const setLoading = (loading) => ({
  type: Actions.financialsData.SET_FINANCIALS_DATA_LOADING,
  payload: loading,
});

export const setError = (error) => ({
  type: Actions.financialsData.SET_FINANCIALS_DATA_ERROR,
  payload: error,
});

export const createProjectFinancials = (tasks) => {
  return async (dispatch) => {
    dispatch(setLoading(true));
    try {
      const projectFinancialsData = tasks.map((task) => ({
        task_id: task.task_id,
      }));

      const { data, error } = await supabase
        .from("project_financials")
        .insert(projectFinancialsData)
        // .select();

      if (error) throw error;

    //   dispatch({
    //     type: Actions.financialsData.CREATE_PROJECT_FINANCIALS,
    //     payload: data,
    //   });

    //   return data;
    return "successfully created project financials";
    } catch (error) {
      dispatch(setError(error.message));
      throw error;
    } finally {
      dispatch(setLoading(false));
    }
  };
};

export const fetchProjectFinancials = (projectId) => {
  return async (dispatch) => {
    dispatch(setLoading(true));
    try {
      const { data, error } = await supabase
        .from("project_financials")
        .select(
          `
          *,
          tasks:task_id (*)
        `
        )
        .eq("tasks.project_id", projectId);

      if (error) throw error;

      dispatch({
        type: Actions.financialsData.FETCH_PROJECT_FINANCIALS,
        payload: data,
      });

      return data;
    } catch (error) {
      dispatch(setError(error.message));
      throw error;
    } finally {
      dispatch(setLoading(false));
    }
  };
};
