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
  return async (dispatch, getState) => {
    dispatch(setLoading(true));
    try {
      const { teamId } = getState().auth;
      
      const projectFinancialsData = tasks.map((task) => ({
        project_id: projectId,
        task_id: task.task_id,
        team_id: teamId
      }));

      const { data, error } = await supabase
        .from("project_financials")
        .insert(projectFinancialsData);

      if (error) {
        if (error.code === 'PGRST204') {
          throw new Error('You do not have permission to create financial records');
        }
        throw error;
      }

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
  return async (dispatch, getState) => {
    dispatch(setLoading(true));
    try {
      const { teamId } = getState().auth;

      // First try to fetch existing data
      let { data, error } = await supabase
        .from("project_financials")
        .select("*")
        .eq("task_id", taskId)
        .single();

      if (error) {
        if (error.code === 'PGRST204') {
          throw new Error('You do not have permission to view financial records');
        }
        // If no data exists, create a new row
        if (error.code === "PGRST116") {
          const { data: newData, error: insertError } = await supabase
            .from("project_financials")
            .insert({
              task_id: taskId,
              project_id: projectId,
              team_id: teamId
            })
            .select()
            .single();

          if (insertError) {
            if (insertError.code === 'PGRST204') {
              throw new Error('You do not have permission to create financial records');
            }
            throw insertError;
          }
          data = newData;
        } else {
          throw error;
        }
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

      if (projectError) {
        if (projectError.code === 'PGRST204') {
          throw new Error('You do not have permission to view this project');
        }
        if (projectError.code === "PGRST116" || !projectData) {
          dispatch(setError("Project not found"));
          dispatch({
            type: Actions.financialsData.FETCH_PROJECT_FINANCIALS,
            payload: [],
          });
          return;
        }
        throw projectError;
      }

      const { data, error } = await supabase
        .from("project_financials")
        .select(
          `
          *,
          tasks:task_id (
            task_name,
            task_number,
            task_created_at
          )
        `
        )
        .eq("project_id", projectId)
        .order('tasks(task_created_at)', { ascending: true });

      if (error) {
        if (error.code === 'PGRST204') {
          throw new Error('You do not have permission to view financial records');
        }
        if (error.code === "PGRST116" || data.length < 1) {
          dispatch(setError("Project not found"));
          dispatch({
            type: Actions.financialsData.FETCH_PROJECT_FINANCIALS,
            payload: [],
          });
          return;
        }
        throw error;
      }

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

export const saveProjectFinancials = (financialsId, sections, adjustments) => {
  return async (dispatch) => {
    try {
      // Create update object directly
      const updateData = sections.reduce((acc, section) => {
        if (section.id === "hours") {
          // For hours section, maintain the employee type data structure
          const processedData = section.data.map((typeData) => {
            // Calculate actual_cost for this type from inputRows
            const typeActualCost = (typeData.inputRows || []).reduce(
              (sum, row) => sum + (row.actual_cost || 0),
              0
            );

            return {
              type_id: typeData.type_id,
              type_name: typeData.type_name,
              estimate: typeData.estimate || 0,
              fixedAmount: typeData.fixedAmount || 0,
              actual_cost: typeActualCost,
              inputRows: typeData.inputRows || [],
            };
          });

          // Calculate total actual_cost from all types
          const totalActualCost = processedData.reduce(
            (sum, typeData) => sum + typeData.actual_cost,
            0
          );

          acc[section.id] = {
            name: section.sectionName.toLowerCase(),
            estimate: section.estimate || 0,
            actual_cost: totalActualCost,
            data: processedData,
          };
        } else {
          // For non-hours sections
          const actualCost = (section.inputRows || []).reduce(
            (sum, row) => sum + (row.cost || 0),
            0
          );

          acc[section.id] = {
            name: section.sectionName.toLowerCase(),
            estimate: section.estimate || 0,
            actual_cost: actualCost,
            data: section.inputRows || [],
          };
        }

        return acc;
      }, {});

      const financialData = {
        financial_data: updateData,
        adjustments: adjustments,
        financials_updated_at: new Date().toISOString(),
      }

      // Update the project_financials table
      const { data, error } = await supabase
        .from("project_financials")
        .update(financialData)
        .eq("financials_id", financialsId);

      if (error) {
        if (error.code === 'PGRST204') {
          throw new Error('You do not have permission to modify financial records');
        }
        throw error;
      }

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
