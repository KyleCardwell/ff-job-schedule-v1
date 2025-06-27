import { Actions } from "../actions";
import { supabase } from "../../utils/supabase";
import { ESTIMATE_STATUS } from "../../utils/constants";

// Create estimate project
export const createEstimateProject = (projectData) => {
  return async (dispatch, getState) => {
    try {
      dispatch({ type: Actions.estimates.CREATE_ESTIMATE_PROJECT_START });
      
      const { teamId } = getState().auth;
      const { data, error } = await supabase
        .from('estimate_projects')
        .insert({
          ...projectData,
          team_id: teamId,
        })
        .select('*')
        .single();

      if (error) throw error;

      dispatch({
        type: Actions.estimates.CREATE_ESTIMATE_PROJECT_SUCCESS,
        payload: data
      });

      return data;
    } catch (error) {
      console.error('Error creating estimate project:', error);
      dispatch({
        type: Actions.estimates.CREATE_ESTIMATE_PROJECT_ERROR,
        payload: error.message
      });
      throw error;
    }
  };
};

// Create estimate
export const createEstimate = (estimateProjectId) => {
  return async (dispatch, getState) => {
    try {
      dispatch({ type: Actions.estimates.CREATE_ESTIMATE_START });
      
      const { session } = getState().auth;
      const { data, error } = await supabase
        .from('estimates')
        .insert({
          est_project_id: estimateProjectId,
          status: ESTIMATE_STATUS.DRAFT,
          created_by: session.user.id,
          updated_by: session.user.id,
        })
        .select(`
          *,
          estimate_project:estimate_projects (*)
        `)
        .single();

      if (error) throw error;

      dispatch({
        type: Actions.estimates.CREATE_ESTIMATE_SUCCESS,
        payload: data
      });

      return data;
    } catch (error) {
      console.error('Error creating estimate:', error);
      dispatch({
        type: Actions.estimates.CREATE_ESTIMATE_ERROR,
        payload: error.message
      });
      throw error;
    }
  };
};

// Fetch estimates with related data
export const fetchEstimates = (filters = {}) => {
  return async (dispatch, getState) => {
    try {
      dispatch({ type: Actions.estimates.FETCH_ESTIMATES_START });
      
      const { teamId } = getState().auth;
      
      let query = supabase
        .from('estimates')
        .select(`
          *,
          estimate_project:estimate_projects (
            est_project_id,
            team_id,
            est_project_name
          )
        `)
        .eq('estimate_projects.team_id', teamId);

      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      if (filters.searchTerm) {
        query = query.or(`estimate_projects.est_project_name.ilike.%${filters.searchTerm}%`);
      }

      const { data: estimates, error } = await query;

      if (error) throw error;

      dispatch({ 
        type: Actions.estimates.FETCH_ESTIMATES_SUCCESS, 
        payload: estimates 
      });

      return estimates;
    } catch (error) {
      console.error('Error fetching estimates:', error);
      dispatch({
        type: Actions.estimates.FETCH_ESTIMATES_ERROR,
        payload: error.message
      });
      throw error;
    }
  };
};

// Create task
export const createTask = (estimateId, taskData) => {
  return async (dispatch, getState) => {
    try {
      dispatch({ type: Actions.estimates.CREATE_TASK_START });
      
      const { data, error } = await supabase
        .from('estimate_tasks')
        .insert({
          ...taskData,
          estimate_id: estimateId
        })
        .select()
        .single();

      if (error) throw error;

      dispatch({
        type: Actions.estimates.CREATE_TASK_SUCCESS,
        payload: data
      });

      return data;
    } catch (error) {
      console.error('Error creating task:', error);
      dispatch({
        type: Actions.estimates.CREATE_TASK_ERROR,
        payload: error.message
      });
      throw error;
    }
  };
};

// Create section
export const createSection = (taskId, sectionData) => {
  return async (dispatch, getState) => {
    try {
      dispatch({ type: Actions.estimates.CREATE_SECTION_START });
      
      const { data, error } = await supabase
        .from('estimate_sections')
        .insert({
          ...sectionData,
          task_id: taskId
        })
        .select()
        .single();

      if (error) throw error;

      dispatch({
        type: Actions.estimates.CREATE_SECTION_SUCCESS,
        payload: data
      });

      return data;
    } catch (error) {
      console.error('Error creating section:', error);
      dispatch({
        type: Actions.estimates.CREATE_SECTION_ERROR,
        payload: error.message
      });
      throw error;
    }
  };
};

// Create item
export const createItem = (sectionId, itemData) => {
  return async (dispatch, getState) => {
    try {
      dispatch({ type: Actions.estimates.CREATE_ITEM_START });
      
      const { data, error } = await supabase
        .from('estimate_items')
        .insert({
          ...itemData,
          section_id: sectionId
        })
        .select()
        .single();

      if (error) throw error;

      dispatch({
        type: Actions.estimates.CREATE_ITEM_SUCCESS,
        payload: data
      });

      return data;
    } catch (error) {
      console.error('Error creating item:', error);
      dispatch({
        type: Actions.estimates.CREATE_ITEM_ERROR,
        payload: error.message
      });
      throw error;
    }
  };
};

// Approve estimate
export const approveEstimate = (estimateId) => {
  return async (dispatch, getState) => {
    try {
      dispatch({ type: Actions.estimates.APPROVE_ESTIMATE_START });
      
      const { session } = getState().auth;
      
      // Get the estimate and its project data
      const { data: estimate, error: estimateError } = await supabase
        .from('estimates')
        .select(`
          *,
          estimate_project:estimate_projects (*)
        `)
        .eq('estimate_id', estimateId)
        .single();

      if (estimateError) throw estimateError;

      // Create project from estimate_project data
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
          team_id: estimate.estimate_project.team_id,
          project_name: estimate.estimate_project.project_name,
        })
        .select()
        .single();

      if (projectError) throw projectError;

      // Update estimate status
      const { data: updatedEstimate, error: updateError } = await supabase
        .from('estimates')
        .update({ 
          status: 'approved',
          updated_by: session.user.id 
        })
        .eq('estimate_id', estimateId)
        .select()
        .single();

      if (updateError) throw updateError;

      dispatch({
        type: Actions.estimates.APPROVE_ESTIMATE_SUCCESS,
        payload: {
          estimate: updatedEstimate,
          project
        }
      });

      return { estimate: updatedEstimate, project };
    } catch (error) {
      console.error('Error approving estimate:', error);
      dispatch({
        type: Actions.estimates.APPROVE_ESTIMATE_ERROR,
        payload: error.message
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
          estimate_project:estimate_projects (*),
          tasks:estimate_tasks (
            *,
            sections:estimate_sections (
              *,
              items:estimate_items (*)
            )
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
