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
      // Transform sections into the database format
      const financialsData = sections.reduce((acc, section) => {
        // Each section should update its corresponding column
        acc[section.id] = {
          estimate: section.estimate || 0,
          actual_cost: section.id === 'hours'
            ? (section.data || []).reduce((sum, row) => sum + (parseFloat(row.hours) || 0), 0)
            : (section.inputRows || []).reduce((sum, row) => sum + (parseFloat(row.cost) || 0), 0),
          data: section.id === 'hours' ? section.data : section.inputRows
        };
        return acc;
      }, {});

      // Update the project_financials table
      const { data, error } = await supabase
        .from('project_financials')
        .update({
          hours: financialsData.hours,
          cabinets: financialsData.cabinets,
          doors: financialsData.doors,
          drawers: financialsData.drawers,
          other: financialsData.other,
          financials_updated_at: new Date().toISOString()
        })
        .eq('financials_id', financialsId);

      if (error) throw error;

      dispatch({
        type: Actions.financialsData.SAVE_PROJECT_FINANCIALS_SUCCESS,
        payload: { financials: financialsData }
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
