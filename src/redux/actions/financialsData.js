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
        .insert(projectFinancialsData);
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

export const fetchTaskFinancials = (taskId) => {
  return async (dispatch) => {
    dispatch(setLoading(true));
    try {
      const { data, error } = await supabase
        .from("project_financials")
        .select(`*`)
        .eq("task_id", taskId)
        .single();

      if (error) throw error;

      dispatch({
        type: Actions.financialsData.FETCH_TASK_FINANCIALS,
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

export const saveProjectFinancials = (financialsId, sections) => {
  return async (dispatch) => {
    try {
      console.log('Saving sections:', sections); // Debug log

      // Create update object directly
      const updateData = sections.reduce((acc, section) => {
        // Each section already has the correct structure, just need to stringify
        acc[section.id] = JSON.stringify({
          estimate: section.estimate || 0,
          actual_cost: section.actual_cost || 0,
          data: section.id === 'hours' ? section.data : section.inputRows || []
        });

        console.log(`${section.id} data:`, acc[section.id]); // Debug log
        return acc;
      }, {});

      // Add timestamp to update data
      updateData.financials_updated_at = new Date().toISOString();

      console.log('Update data:', updateData); // Debug log

      // Update the project_financials table
      const { data, error } = await supabase
        .from('project_financials')
        .update(updateData)
        .eq('financials_id', financialsId);

      if (error) throw error;

      dispatch({
        type: Actions.financialsData.SAVE_PROJECT_FINANCIALS_SUCCESS,
        payload: { financials: sections }
      });

      return { success: true };
    } catch (error) {
      console.error('Error saving project financials:', error);
      dispatch({
        type: Actions.financialsData.SAVE_PROJECT_FINANCIALS_ERROR,
        payload: error.message
      });
      return { success: false, error: error.message };
    }
  };
};
