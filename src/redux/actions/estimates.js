import { ESTIMATE_STATUS } from "../../utils/constants";
import { supabase } from "../../utils/supabase";
import { Actions } from "../actions";

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
      
      let { data: estimates, error } = await supabase
        .rpc('get_estimates_with_user_names', {
          team_id_param: teamId
        });

      if (error) throw error;

      // Apply filters client-side since they're not frequently changing
      if (filters.status && filters.status !== 'all') {
        estimates = estimates.filter(est => est.status === filters.status);
      }

      if (filters.searchTerm) {
        estimates = estimates.filter(est => 
          est.est_project_name.toLowerCase().includes(filters.searchTerm.toLowerCase())
        );
      }

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
        .from('estimate_full_details')
        .select('*')
        .eq('estimate_id', estimateId)
        .single();

      if (error) throw error;

      // Transform the data to match our frontend structure
      const estimate = {
        estimate_id: data.estimate_id,
        est_project_id: data.est_project_id,
        status: data.status,
        is_current: data.is_current,
        created_at: data.estimate_created_at,
        updated_at: data.estimate_updated_at,
        est_project_name: data.est_project_name,
        est_client_name: data.est_client_name,
        team_id: data.team_id,
        street: data.street,
        state: data.state,
        city: data.city,
        zip: data.zip,
        estimate_data: data.estimate_data,
        tasks: (data.tasks || [])
          .map(task => ({
            ...task.task,
            sections: (task.sections || [])
              .map(section => ({
                ...section,
                section_data: section.section_data || {},
                items: section.items || []
              }))
              .sort((a, b) => (a.section_order || 0) - (b.section_order || 0))
          }))
          .sort((a, b) => (a.task_order || 0) - (b.task_order || 0))
      };

      dispatch({
        type: Actions.estimates.FETCH_ESTIMATE_SUCCESS,
        payload: estimate
      });

      return estimate;
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

// Update project information for an existing estimate
export const updateEstimateProject = (estimateId, projectData) => {
  return async (dispatch, getState) => {
    try {
      dispatch({ type: Actions.estimates.UPDATE_ESTIMATE_START });

      // Update the project info
      const { data: updatedProject, error: projectError } = await supabase
        .from('estimate_projects')
        .update({
          est_project_name: projectData.est_project_name,
          est_client_name: projectData.est_client_name,
          street: projectData.street,
          city: projectData.city,
          state: projectData.state,
          zip: projectData.zip,
          updated_at: new Date().toISOString(),
        })
        .eq('est_project_id', projectData.est_project_id)
        .select()
        .single();

      if (projectError) throw projectError;

      // Update Redux state with just the project changes
      dispatch({
        type: Actions.estimates.UPDATE_ESTIMATE_SUCCESS,
        payload: {
          type: 'project',
          data: updatedProject
        }
      });

    } catch (error) {
      console.error("Error updating estimate project:", error);
      dispatch({
        type: Actions.estimates.UPDATE_ESTIMATE_ERROR,
        payload: error.message
      });
      throw error;
    }
  };
};

// Update an existing task
export const updateTask = (estimateId, taskId, updates) => {
  return async (dispatch, getState) => {
    try {
      dispatch({ type: Actions.estimates.UPDATE_ESTIMATE_START });

      const { data: updatedTask, error } = await supabase
        .from('estimate_tasks')
        .update(updates)
        .eq('est_task_id', taskId)
        .select()
        .single();

      if (error) throw error;

      const { currentEstimate } = getState().estimates;
      const updatedTasks = currentEstimate.tasks.map(task => 
        task.est_task_id === taskId ? updatedTask : task
      );

      dispatch({
        type: Actions.estimates.UPDATE_ESTIMATE_SUCCESS,
        payload: {
          type: 'task',
          data: {
            estimateId,
            tasks: updatedTasks
          }
        }
      });

      return updatedTask;
    } catch (error) {
      console.error('Error updating task:', error);
      dispatch({
        type: Actions.estimates.UPDATE_ESTIMATE_ERROR,
        payload: error.message
      });
      throw error;
    }
  };
};

// Add a new task to an estimate project
export const addTask = (estimateId, taskName) => {
  return async (dispatch, getState) => {
    try {
      dispatch({ type: Actions.estimates.UPDATE_ESTIMATE_START });

      const { currentEstimate } = getState().estimates;
      const currentTasks = currentEstimate?.tasks || [];
      const maxOrder = currentTasks.reduce((max, task) => Math.max(max, task.task_order || 0), -1);
      const newTaskOrder = maxOrder + 1;

      const { data: newTask, error } = await supabase
        .from('estimate_tasks')
        .insert([
          {
            estimate_id: estimateId,
            est_task_name: taskName.trim(),
            task_order: newTaskOrder
          }
        ])
        .select()
        .single();

      if (error) throw error;

      dispatch({
        type: Actions.estimates.UPDATE_ESTIMATE_SUCCESS,
        payload: {
          type: 'task',
          data: {
            estimateId,
            tasks: [...currentTasks, newTask].sort((a, b) => (a.task_order || 0) - (b.task_order || 0))
          }
        }
      });

      return newTask;
    } catch (error) {
      console.error('Error adding task:', error);
      dispatch({
        type: Actions.estimates.UPDATE_ESTIMATE_ERROR,
        payload: error.message
      });
      throw error;
    }
  };
};

// Delete a task
export const deleteTask = (estimateId, taskId) => {
  return async (dispatch, getState) => {
    try {
      dispatch({ type: Actions.estimates.UPDATE_ESTIMATE_START });

      const { error } = await supabase
        .from('estimate_tasks')
        .delete()
        .eq('est_task_id', taskId);

      if (error) throw error;

      const { currentEstimate } = getState().estimates;
      dispatch({
        type: Actions.estimates.UPDATE_ESTIMATE_SUCCESS,
        payload: {
          estimateId,
          tasks: currentEstimate.tasks.filter(task => task.est_task_id !== taskId)
        }
      });
    } catch (error) {
      console.error('Error deleting task:', error);
      dispatch({
        type: Actions.estimates.UPDATE_ESTIMATE_ERROR,
        payload: error.message
      });
      throw error;
    }
  };
};

// Add a new section to a task
export const addSection = (estimateId, taskId, sectionData) => {
  return async (dispatch, getState) => {
    try {
      dispatch({ type: Actions.estimates.UPDATE_ESTIMATE_START });

      const { currentEstimate } = getState().estimates;
      const currentTask = currentEstimate?.tasks?.find(task => task.est_task_id === taskId);
      const currentSections = currentTask?.sections || [];
      const maxOrder = currentSections.reduce((max, section) => Math.max(max, section.section_order || 0), 0);
      const newSectionOrder = maxOrder + 1;

      const { data: newSection, error } = await supabase
        .from('estimate_sections')
        .insert([{
         section_data: sectionData,
          est_task_id: taskId,
          section_order: newSectionOrder
        }])
        .select()
        .single();

      if (error) throw error;

      // Update just the current task with the new section
      const updatedTask = {
        ...currentTask,
        sections: [...currentSections, newSection].sort((a, b) => 
          (a.section_order || 0) - (b.section_order || 0)
        )
      };

      dispatch({
        type: Actions.estimates.UPDATE_ESTIMATE_SUCCESS,
        payload: {
          type: 'section',
          data: {
            estimateId,
            taskId,
            task: updatedTask
          }
        }
      });

      return newSection;
    } catch (error) {
      console.error('Error adding section:', error);
      dispatch({
        type: Actions.estimates.UPDATE_ESTIMATE_ERROR,
        payload: error.message
      });
      throw error;
    }
  };
};

// Update an existing section
export const updateSection = (estimateId, taskId, sectionId, updates) => {
  return async (dispatch, getState) => {
    try {
      dispatch({ type: Actions.estimates.UPDATE_ESTIMATE_START });

      const { currentEstimate } = getState().estimates;
      const currentTask = currentEstimate?.tasks?.find(task => task.est_task_id === taskId);
      const currentSections = currentTask?.sections || [];

      const { data: updatedSection, error } = await supabase
        .from('estimate_sections')
        .update({ 
          section_data: {
            ...currentSections.find(s => s.est_section_id === sectionId)?.section_data,
            ...updates
          }
        })
        .eq('est_section_id', sectionId)
        .select()
        .single();

      if (error) throw error;

      // Update just the current task with the updated section
      const updatedTask = {
        ...currentTask,
        sections: currentSections.map(section =>
          section.est_section_id === sectionId ? updatedSection : section
        ).sort((a, b) => (a.section_order || 0) - (b.section_order || 0))
      };

      dispatch({
        type: Actions.estimates.UPDATE_ESTIMATE_SUCCESS,
        payload: {
          type: 'section',
          data: {
            estimateId,
            taskId,
            task: updatedTask
          }
        }
      });

      return updatedSection;
    } catch (error) {
      console.error('Error updating section:', error);
      dispatch({
        type: Actions.estimates.UPDATE_ESTIMATE_ERROR,
        payload: error.message
      });
      throw error;
    }
  };
};
