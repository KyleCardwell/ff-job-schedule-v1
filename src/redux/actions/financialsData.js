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

export const createProjectFinancials = (projectId, tasks) => {
  return async (dispatch) => {
    dispatch(setLoading(true));
    try {
      const projectFinancialsData = tasks.map((task) => ({
        project_id: projectId,
        task_id: task.task_id,
      }));

      const { data, error } = await supabase
        .from("project_financials")
        .insert(projectFinancialsData);

      if (error) throw error;

      return "successfully created project financials";
    } catch (error) {
      dispatch(setError(error.message));
      throw error;
    } finally {
      dispatch(setLoading(false));
    }
  };
};

export const fetchTaskFinancials = (taskId, projectId) => {
  return async (dispatch) => {
    dispatch(setLoading(true));
    try {
      // First try to fetch existing data
      let { data, error } = await supabase
        .from("project_financials")
        .select("*")
        .eq("task_id", taskId)
        .single();

      // If no data exists, create a new row
      if (!data && error?.code === "PGRST116") {
        const { data: newData, error: insertError } = await supabase
          .from("project_financials")
          .insert({
            task_id: taskId,
            project_id: projectId,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        data = newData;
      } else if (error) {
        throw error;
      }

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
      const { data: projectData, error: projectError } = await supabase
        .from("projects")
        .select("project_completed_at, project_name")
        .eq("project_id", projectId)
        .single();

      if (projectError?.code === "PGRST116" || !projectData) {
        dispatch(setError("Project not found"));
        return;
      }
      if (projectError) throw projectError;
      const { data, error } = await supabase
        .from("project_financials")
        .select(
          `
          *,
          tasks:task_id (
            task_name,
            task_number
          )
        `
        )
        .eq("project_id", projectId);

      if (error?.code === "PGRST116" || data.length < 1) {
        dispatch(setError("Project not found"));
        return;
      }
      if (error) throw error;

      // Extract task info and keep array structure
      const processedData = data.map((record) => ({
        ...record,
        task_name: record.tasks?.task_name,
        task_number: record.tasks?.task_number,
        project_name: projectData.project_name,
        project_completed_at: projectData.project_completed_at,
      }));

      dispatch({
        type: Actions.financialsData.FETCH_PROJECT_FINANCIALS,
        payload: processedData,
      });

      return processedData;
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
      // Create update object directly
      const updateData = sections.reduce((acc, section) => {
        if (section.id === "hours") {
          // For hours section, maintain the employee type data structure
          acc[section.id] = {
            estimate: section.estimate || 0,
            actual_cost: section.actual_cost || 0,
            data: section.data.map((typeData) => ({
              type_id: typeData.type_id,
              type_name: typeData.type_name,
              estimate: typeData.estimate || 0,
              actual_cost: typeData.actual_cost || 0,
              inputRows: typeData.inputRows || [], // Use inputRows consistently
            })),
          };
        } else {
          // For non-hours sections
          acc[section.id] = {
            estimate: section.estimate || 0,
            actual_cost: section.actual_cost || 0,
            data: section.inputRows || [],
          };
        }
        return acc;
      }, {});

      // Add timestamp to update data
      updateData.financials_updated_at = new Date().toISOString();

      // Update the project_financials table
      const { data, error } = await supabase
        .from("project_financials")
        .update(updateData)
        .eq("financials_id", financialsId);

      if (error) throw error;

      dispatch({
        type: Actions.financialsData.SAVE_TASK_FINANCIALS_SUCCESS,
        payload: { financials: sections },
      });

      return { success: true };
    } catch (error) {
      console.error("Error saving project financials:", error);
      dispatch({
        type: Actions.financialsData.SAVE_TASK_FINANCIALS_ERROR,
        payload: error.message,
      });
      return { success: false, error: error.message };
    }
  };
};
