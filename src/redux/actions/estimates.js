import { Actions } from "../actions";
import { supabase } from "../../utils/supabase";

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

      const { teamId } = getState().auth;
      const { session } = getState().auth;

      // Add team_id and created_by to the estimate data
      const newEstimate = {
        ...estimateData,
        team_id: teamId,
        created_by: session.user.id,
        status: "new",
        created_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("estimates")
        .insert(newEstimate)
        .select()
        .single();

      if (error) throw error;

      dispatch({
        type: Actions.estimates.CREATE_ESTIMATE_SUCCESS,
        payload: data,
      });

      return data;
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
  return async (dispatch) => {
    try {
      dispatch({ type: Actions.estimates.UPDATE_ESTIMATE_START });

      const { data, error } = await supabase
        .from("estimates")
        .update(estimateData)
        .eq("id", id)
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

// Delete an estimate
export const deleteEstimate = (id) => {
  return async (dispatch) => {
    try {
      dispatch({ type: Actions.estimates.DELETE_ESTIMATE_START });

      const { error } = await supabase.from("estimates").delete().eq("id", id);

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
