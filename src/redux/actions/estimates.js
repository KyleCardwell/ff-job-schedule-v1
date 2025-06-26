import { Actions } from "../actions";
import { supabase } from "../../utils/supabase";
import { ESTIMATE_STATUS } from "../../utils/constants";

// Fetch all estimates
export const fetchEstimates = (filters = {}) => {
  return async (dispatch, getState) => {
    try {
      dispatch({ type: Actions.estimates.FETCH_ESTIMATES_START });

      const { teamId } = getState().auth;

      // Use a join to get estimates for the team's projects
      let query = supabase
        .from("estimates")
        .select(
          `
          *,
          projects:project_id (
          project_id,
          project_name,
          team_id
        )
        `
        )
        .eq("projects.team_id", teamId);

      // Apply filters if provided
      if (filters.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
      }

      if (filters.searchTerm) {
        query = query.ilike("project_name", `%${filters.searchTerm}%`);
      }

      // Execute the query
      const { data, error } = await query;

      if (error) throw error;

      dispatch({
        type: Actions.estimates.FETCH_ESTIMATES_SUCCESS,
        payload: data,
      });
    } catch (error) {
      console.error("Error fetching estimates:", error);
      dispatch({
        type: Actions.estimates.FETCH_ESTIMATES_ERROR,
        payload: error.message,
      });
    }
  };
};

// Create a new estimate
export const createEstimate = (estimateData) => {
  return async (dispatch, getState) => {
    try {
      dispatch({ type: Actions.estimates.CREATE_ESTIMATE_START });

      const { session } = getState().auth;

      // Validate project_id
      if (!estimateData.project_id) {
        throw new Error("Project ID is required to create an estimate");
      }

      const currentTime = new Date().toISOString();
      // Add team_id and created_by to the estimate data
      const newEstimate = {
        ...estimateData,
        status: estimateData.status || ESTIMATE_STATUS.DRAFT,
        created_by: session.user.id,
        created_at: currentTime,
        updated_by: session.user.id,
        updated_at: currentTime,
      };

      // Insert the estimate with the project_id
      const { data, error } = await supabase
        .from("estimates")
        .insert(newEstimate)
        .select()
        .single();

      if (error) throw error;

      // Fetch the project details to include in the response
      const { data: projectData, error: projectError } = await supabase
        .from("projects")
        .select("project_name")
        .eq("project_id", data.project_id)
        .single();

      if (projectError) {
        console.warn("Could not fetch project details:", projectError);
      }

      // Combine estimate with project details
      const estimateWithProject = {
        ...data,
        project_name: projectData?.project_name || "Unknown Project",
      };

      dispatch({
        type: Actions.estimates.CREATE_ESTIMATE_SUCCESS,
        payload: estimateWithProject,
      });

      return estimateWithProject;
    } catch (error) {
      console.error("Error creating estimate:", error);
      dispatch({
        type: Actions.estimates.CREATE_ESTIMATE_ERROR,
        payload: error.message,
      });
      throw error;
    }
  };
};

// Update an existing estimate
export const updateEstimate = (id, estimateData) => {
  return async (dispatch, getState) => {
    try {
      dispatch({ type: Actions.estimates.UPDATE_ESTIMATE_START });

      const { session } = getState().auth;

      const updatedEstimate = {
        ...estimateData,
        updated_by: session.user.id,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("estimates")
        .update(updatedEstimate)
        .eq("estimate_id", id)
        .select()
        .single();

      if (error) throw error;

      dispatch({
        type: Actions.estimates.UPDATE_ESTIMATE_SUCCESS,
        payload: data,
      });

      return data;
    } catch (error) {
      console.error("Error updating estimate:", error);
      dispatch({
        type: Actions.estimates.UPDATE_ESTIMATE_ERROR,
        payload: error.message,
      });
      throw error;
    }
  };
};

// Update an estimate with estimate_data (tasks, sections, etc.)
export const updateEstimateData = (estimateId, estimateData) => {
  return async (dispatch, getState) => {
    try {
      dispatch({ type: Actions.estimates.UPDATE_ESTIMATE_START });

      const { session } = getState().auth;
      const currentTime = new Date().toISOString();

      // Prepare the update data
      const updateData = {
        estimate_data: estimateData,
        updated_by: session.user.id,
        updated_at: currentTime,
      };

      // Update the estimate with estimate_data
      const { data, error } = await supabase
        .from("estimates")
        .update(updateData)
        .eq("estimate_id", estimateId)
        .select()
        .single();

      if (error) throw error;

      dispatch({
        type: Actions.estimates.UPDATE_ESTIMATE_SUCCESS,
        payload: data,
      });

      return data;
    } catch (error) {
      console.error("Error updating estimate data:", error);
      dispatch({
        type: Actions.estimates.UPDATE_ESTIMATE_ERROR,
        payload: error.message,
      });
      throw error;
    }
  };
};

// Fetch a single estimate with all its data
export const fetchEstimateById = (estimateId) => {
  return async (dispatch) => {
    try {
      dispatch({ type: Actions.estimates.FETCH_ESTIMATE_START });

      const { data, error } = await supabase
        .from("estimates")
        .select(`
          *,
          projects:project_id (
            project_id,
            project_name,
            team_id
          )
        `)
        .eq("estimate_id", estimateId)
        .single();

      if (error) throw error;

      dispatch({
        type: Actions.estimates.FETCH_ESTIMATE_SUCCESS,
        payload: data,
      });

      return data;
    } catch (error) {
      console.error("Error fetching estimate:", error);
      dispatch({
        type: Actions.estimates.FETCH_ESTIMATE_ERROR,
        payload: error.message,
      });
      throw error;
    }
  };
};

// Delete an estimate
export const deleteEstimate = (id) => {
  return async (dispatch) => {
    try {
      dispatch({ type: Actions.estimates.DELETE_ESTIMATE_START });

      const { error } = await supabase.from("estimates").delete().eq("estimate_id", id);

      if (error) throw error;

      dispatch({
        type: Actions.estimates.DELETE_ESTIMATE_SUCCESS,
        payload: id,
      });
    } catch (error) {
      console.error("Error deleting estimate:", error);
      dispatch({
        type: Actions.estimates.DELETE_ESTIMATE_ERROR,
        payload: error.message,
      });
      throw error;
    }
  };
};

// Set the current estimate
export const setCurrentEstimate = (estimate) => ({
  type: Actions.estimates.SET_CURRENT_ESTIMATE,
  payload: estimate,
});

// Clear the current estimate
export const clearCurrentEstimate = () => ({
  type: Actions.estimates.CLEAR_CURRENT_ESTIMATE,
});

// Set estimate filters
export const setEstimateFilters = (filters) => ({
  type: Actions.estimates.SET_ESTIMATE_FILTERS,
  payload: filters,
});

// Fetch projects for selection in the estimate form
export const fetchProjectsForSelection = () => {
  return async (dispatch, getState) => {
    try {
      dispatch({ type: Actions.estimates.FETCH_PROJECTS_FOR_SELECTION_START });
      
      const { teamId } = getState().auth;
      
      // Fetch all projects for the team (both active and completed)
      const { data, error } = await supabase
        .from("projects")
        .select("project_id, project_name, project_completed_at")
        .eq("team_id", teamId)
        .order("project_name", { ascending: true });
      
      if (error) throw error;
      
      dispatch({
        type: Actions.estimates.FETCH_PROJECTS_FOR_SELECTION_SUCCESS,
        payload: data,
      });
      
      return data;
    } catch (error) {
      console.error("Error fetching projects for selection:", error);
      dispatch({
        type: Actions.estimates.FETCH_PROJECTS_FOR_SELECTION_ERROR,
        payload: error.message,
      });
      throw error;
    }
  };
};

// Create a new project for an estimate
export const createProjectForEstimate = (projectData) => {
  return async (dispatch, getState) => {
    try {
      dispatch({ type: Actions.estimates.CREATE_PROJECT_START });
      
      const { teamId } = getState().auth;
      
      // Add team_id to the project data
      const newProject = {
        project_name: projectData.project_name,
        project_created_at: new Date().toISOString(),
        team_id: teamId,
      };
      
      // Insert the new project
      const { data, error } = await supabase
        .from("projects")
        .insert(newProject)
        .select()
        .single();
      
      if (error) throw error;
      
      dispatch({
        type: Actions.estimates.CREATE_PROJECT_SUCCESS,
        payload: data,
      });
      
      return data;
    } catch (error) {
      console.error("Error creating project for estimate:", error);
      dispatch({
        type: Actions.estimates.CREATE_PROJECT_ERROR,
        payload: error.message,
      });
      throw error;
    }
  };
};
