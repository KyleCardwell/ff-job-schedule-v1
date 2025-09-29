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
        .from("estimate_projects")
        .insert({
          ...projectData,
          team_id: teamId,
        })
        .select("*")
        .single();

      if (error) throw error;

      dispatch({
        type: Actions.estimates.CREATE_ESTIMATE_PROJECT_SUCCESS,
        payload: data,
      });

      return data;
    } catch (error) {
      console.error("Error creating estimate project:", error);
      dispatch({
        type: Actions.estimates.CREATE_ESTIMATE_PROJECT_ERROR,
        payload: error.message,
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
        .from("estimates")
        .insert({
          est_project_id: estimateProjectId,
          status: ESTIMATE_STATUS.DRAFT,
          created_by: session.user.id,
          updated_by: session.user.id,
        })
        .select(
          `
          *,
          estimate_project:estimate_projects (*)
        `
        )
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

// Fetch estimates with related data
export const fetchEstimates = (filters = {}) => {
  return async (dispatch, getState) => {
    try {
      dispatch({ type: Actions.estimates.FETCH_ESTIMATES_START });

      const { teamId } = getState().auth;

      let { data: estimates, error } = await supabase.rpc(
        "get_estimates_with_user_names",
        {
          team_id_param: teamId,
        }
      );

      if (error) throw error;

      // Apply filters client-side since they're not frequently changing
      if (filters.status && filters.status !== "all") {
        estimates = estimates.filter((est) => est.status === filters.status);
      }

      if (filters.searchTerm) {
        estimates = estimates.filter((est) =>
          est.est_project_name
            .toLowerCase()
            .includes(filters.searchTerm.toLowerCase())
        );
      }

      dispatch({
        type: Actions.estimates.FETCH_ESTIMATES_SUCCESS,
        payload: estimates,
      });

      return estimates;
    } catch (error) {
      console.error("Error fetching estimates:", error);
      dispatch({
        type: Actions.estimates.FETCH_ESTIMATES_ERROR,
        payload: error.message,
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
        .from("estimates")
        .select(
          `
          *,
          estimate_project:estimate_projects (*)
        `
        )
        .eq("estimate_id", estimateId)
        .single();

      if (estimateError) throw estimateError;

      // Create project from estimate_project data
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .insert({
          team_id: estimate.estimate_project.team_id,
          project_name: estimate.estimate_project.project_name,
        })
        .select()
        .single();

      if (projectError) throw projectError;

      // Update estimate status
      const { data: updatedEstimate, error: updateError } = await supabase
        .from("estimates")
        .update({
          status: "approved",
          updated_by: session.user.id,
        })
        .eq("estimate_id", estimateId)
        .select()
        .single();

      if (updateError) throw updateError;

      dispatch({
        type: Actions.estimates.APPROVE_ESTIMATE_SUCCESS,
        payload: {
          estimate: updatedEstimate,
          project,
        },
      });

      return { estimate: updatedEstimate, project };
    } catch (error) {
      console.error("Error approving estimate:", error);
      dispatch({
        type: Actions.estimates.APPROVE_ESTIMATE_ERROR,
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
        .from("estimate_full_details")
        .select("*")
        .eq("estimate_id", estimateId)
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
        tasks_order: data.tasks_order,
        tasks: (data.tasks || []).map((task) => ({
          ...task.task,
          sections: (task.sections || []),
        })),
        estimateDefault: data.estimates_default,
      };

      dispatch({
        type: Actions.estimates.FETCH_ESTIMATE_SUCCESS,
        payload: estimate,
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

      const { error } = await supabase
        .from("estimates")
        .delete()
        .eq("estimate_id", id);

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
        .from("estimate_projects")
        .update({
          est_project_name: projectData.est_project_name,
          est_client_name: projectData.est_client_name,
          street: projectData.street,
          city: projectData.city,
          state: projectData.state,
          zip: projectData.zip,
          updated_at: new Date().toISOString(),
        })
        .eq("est_project_id", projectData.est_project_id)
        .select()
        .single();

      if (projectError) throw projectError;

      // Update Redux state with just the project changes
      dispatch({
        type: Actions.estimates.UPDATE_ESTIMATE_SUCCESS,
        payload: {
          type: "project",
          data: updatedProject,
        },
      });
    } catch (error) {
      console.error("Error updating estimate project:", error);
      dispatch({
        type: Actions.estimates.UPDATE_ESTIMATE_ERROR,
        payload: error.message,
      });
      throw error;
    }
  };
};

// Generic function to update an order array column in any table
export const updateOrderArray = async (
  tableName,
  idColumn,
  rowId,
  orderColumn,
  orderedIds
) => {
  try {
    const { error } = await supabase
      .from(tableName)
      .update({ [orderColumn]: orderedIds })
      .eq(idColumn, rowId);

    if (error) throw error;
  } catch (error) {
    console.error(`Error updating order for ${tableName}:`, error);
    throw error;
  }
};

// Add a new task to an estimate
export const addTask = (estimateId, taskName) => {
  return async (dispatch, getState) => {
    try {
      dispatch({ type: Actions.estimates.UPDATE_ESTIMATE_START });

      const { currentEstimate } = getState().estimates;
      const currentTasks = currentEstimate?.tasks || [];

      // Create the new task - the database trigger will create the initial section
      const { data: newTask, error: insertError } = await supabase
        .from("estimate_tasks")
        .insert([
          {
            estimate_id: estimateId,
            est_task_name: taskName.trim(),
          },
        ])
        .select()
        .single();

      if (insertError) throw insertError;

      // Add the new task ID to the order array and update the estimate
      const newTasksOrder = [...(currentEstimate.tasks_order || []), newTask.est_task_id];
      await updateOrderArray(
        'estimates',
        'estimate_id',
        estimateId,
        'tasks_order',
        newTasksOrder
      );

      // Fetch the task with sections using task_full_details view
      const { data: taskWithSections, error: fetchError } = await supabase
        .from("task_full_details")
        .select("*")
        .eq("est_task_id", newTask.est_task_id)
        .single();

      if (fetchError) throw fetchError;

      // Transform the task to match our frontend structure
      const taskWithFormattedSections = {
        ...taskWithSections,
        sections: taskWithSections.sections || [],
      };

      dispatch({
        type: Actions.estimates.UPDATE_ESTIMATE_SUCCESS,
        payload: {
          type: "task",
          data: {
            estimateId,
            tasks: [...currentTasks, taskWithFormattedSections],
            tasks_order: newTasksOrder,
          },
        },
      });

      return taskWithFormattedSections;
    } catch (error) {
      console.error("Error adding task:", error);
      dispatch({
        type: Actions.estimates.UPDATE_ESTIMATE_ERROR,
        payload: error.message,
      });
      throw error;
    }
  };
};

// Update a task
export const updateTask = (estimateId, taskId, updates) => {
  return async (dispatch, getState) => {
    try {
      dispatch({ type: Actions.estimates.UPDATE_ESTIMATE_START });

      // Update the task
      const { error: updateError } = await supabase
        .from("estimate_tasks")
        .update(updates)
        .eq("est_task_id", taskId);

      if (updateError) throw updateError;

      // Fetch the updated task with sections using task_full_details view
      const { data: taskWithSections, error: fetchError } = await supabase
        .from("task_full_details")
        .select("*")
        .eq("est_task_id", taskId)
        .single();

      if (fetchError) throw fetchError;

      // Transform the task to match our frontend structure
      const taskWithFormattedSections = {
        ...taskWithSections,
        sections: taskWithSections.sections || [],
      };

      // Update the tasks array with the updated task
      const { currentEstimate } = getState().estimates;
      const updatedTasks = currentEstimate.tasks.map((task) =>
        task.est_task_id === taskId ? taskWithFormattedSections : task
      );

      dispatch({
        type: Actions.estimates.UPDATE_ESTIMATE_SUCCESS,
        payload: {
          type: "task",
          data: {
            estimateId,
            tasks: updatedTasks,
          },
        },
      });

      return taskWithFormattedSections;
    } catch (error) {
      console.error("Error updating task:", error);
      dispatch({
        type: Actions.estimates.UPDATE_ESTIMATE_ERROR,
        payload: error.message,
      });
      throw error;
    }
  };
};

// Delete a task
export const deleteTask = (estimateId, taskId) => {
  return async (dispatch, getState) => {
    try {
      dispatch({ type: Actions.estimates.DELETE_ESTIMATE_TASK_START });

      const { error } = await supabase
        .from("estimate_tasks")
        .delete()
        .eq("est_task_id", taskId);

      if (error) throw error;

      // Remove the task ID from the order array in the estimate
      const { currentEstimate } = getState().estimates;
      const newTasksOrder = currentEstimate.tasks_order.filter(id => id !== taskId);
      await updateOrderArray(
        'estimates',
        'estimate_id',
        currentEstimate.estimate_id,
        'tasks_order',
        newTasksOrder
      );

      dispatch({
        type: Actions.estimates.DELETE_ESTIMATE_TASK_SUCCESS,
        payload: { taskId, newTasksOrder },
      });
    } catch (error) {
      dispatch({
        type: Actions.estimates.DELETE_ESTIMATE_TASK_ERROR,
        payload: error.message,
      });
      throw error;
    }
  };
};

// Add a new section to a task
export const addSection = (estimateId, taskId, sectionData) => {
  return async (dispatch) => {
    try {
      dispatch({ type: Actions.estimates.UPDATE_ESTIMATE_START });

      // Extract boxMaterial from the section data
      const { boxMaterial, faceMaterial, ...restOfSectionData } = sectionData;

      // Create the new section
      const { data: newSection, error } = await supabase
        .from("estimate_sections")
        .insert([
          {
            section_data: restOfSectionData,
            box_mat: boxMaterial !== undefined ? +boxMaterial : null,
            face_mat: faceMaterial !== undefined ? +faceMaterial : null,
            est_task_id: taskId,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // Transform the section to match our frontend structure
      const sectionWithFormattedData = {
        ...newSection,
        section_data: newSection.section_data || {},
        cabinets: [],
        lengths: [],
        accessories: [],
        other: [],
      };

      dispatch({
        type: Actions.estimates.ADD_SECTION_SUCCESS,
        payload: {
          taskId,
          section: sectionWithFormattedData,
        },
      });

      return newSection;
    } catch (error) {
      console.error("Error adding section:", error);
      dispatch({
        type: Actions.estimates.UPDATE_ESTIMATE_ERROR,
        payload: error.message,
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
      const currentTask = currentEstimate?.tasks?.find(
        (task) => task.est_task_id === taskId
      );
      const currentSections = currentTask?.sections || [];

      // Extract boxMaterial and faceMaterial from updates
      const { boxMaterial, faceMaterial, style, ...sectionData } = updates;

      // Prepare the update payload for Supabase
      const updatePayload = {
        // Set box_mat and face_mat separately if provided
        ...(boxMaterial !== undefined && { box_mat: +boxMaterial }),
        ...(faceMaterial !== undefined && { face_mat: +faceMaterial }),
        ...(style !== undefined && { cabinet_style_id: +style }),

        // Merge the rest into section_data
        section_data: {
          ...currentSections.find((s) => s.est_section_id === sectionId)
            ?.section_data,
          ...sectionData,
        },
      };

      const { data: updatedSection, error } = await supabase
        .from("estimate_sections")
        .update(updatePayload)
        .eq("est_section_id", sectionId)
        .select()
        .single();

      if (error) throw error;

      dispatch({
        type: Actions.estimates.UPDATE_SECTION_METADATA_SUCCESS,
        payload: {
          taskId,
          sectionId,
          updates: updatedSection,
        },
      });

      return updatedSection;
    } catch (error) {
      console.error("Error updating section:", error);
      dispatch({
        type: Actions.estimates.UPDATE_ESTIMATE_ERROR,
        payload: error.message,
      });
      throw error;
    }
  };
};

// Delete a section
export const deleteSection = (estimateId, taskId, sectionId) => {
  return async (dispatch, getState) => {
    try {
      dispatch({ type: Actions.estimates.UPDATE_ESTIMATE_START });

      // Don't allow deleting if it's the only section
      const { currentEstimate } = getState().estimates;
      const currentTask = currentEstimate?.tasks?.find(
        (task) => task.est_task_id === taskId
      );
      const currentSections = currentTask?.sections || [];

      if (currentSections.length <= 1) {
        throw new Error("Cannot delete the only section in a task");
      }

      const { error } = await supabase
        .from("estimate_sections")
        .delete()
        .eq("est_section_id", sectionId);

      if (error) throw error;

      // Update just the current task with the section removed
      const updatedTask = {
        ...currentTask,
        sections: currentSections
          .filter((section) => section.est_section_id !== sectionId),
      };

      dispatch({
        type: Actions.estimates.UPDATE_ESTIMATE_SUCCESS,
        payload: {
          type: "section",
          data: {
            estimateId,
            taskId,
            task: updatedTask,
          },
        },
      });
    } catch (error) {
      console.error("Error deleting section:", error);
      dispatch({
        type: Actions.estimates.UPDATE_ESTIMATE_ERROR,
        payload: error.message,
      });
      throw error;
    }
  };
};

// Generic function to update section items in any of the 4 tables (cabinets, accessories, lengths, other)
export const updateSectionItems = (
  tableName,
  sectionId,
  items,
  idsToDelete = []
) => {
  return async (dispatch, getState) => {
    try {
      dispatch({ type: Actions.estimates.UPDATE_SECTION_ITEMS_START });

      // Validate table name for security
      const allowedTables = [
        "estimate_cabinets",
        "estimate_accessories",
        "estimate_lengths",
        "estimate_other",
      ];
      if (!allowedTables.includes(tableName)) {
        throw new Error(`Invalid table name: ${tableName}`);
      }

      // 1. Delete specific items if any IDs are provided
      if (idsToDelete && idsToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from(tableName)
          .delete()
          .in("id", idsToDelete);

        if (deleteError) throw deleteError;
        console.log(`Deleted ${idsToDelete.length} items from ${tableName}`);
      }

      // 2. Process items for updates and inserts
      let processedItems = items; // Start with original items
      let updatedItems = [];
      let insertedItems = [];

      if (items && items.length > 0) {
        const itemsToUpdate = items.filter(
          (item) => item.id && !idsToDelete.includes(item.id)
        );
        const itemsToInsert = items.filter((item) => !item.id);

        // 3. Update existing items
        if (itemsToUpdate.length > 0) {
          const updatePromises = itemsToUpdate.map((item) => {
            const { id, ...updateData } = item;
            return supabase
              .from(tableName)
              .update({ ...updateData, updated_at: new Date() })
              .eq("id", id);
          });

          const updateResults = await Promise.all(updatePromises);
          const updateErrors = updateResults.filter((result) => result.error);

          if (updateErrors.length > 0) {
            throw new Error(`Failed to update ${updateErrors.length} items`);
          }

          updatedItems = itemsToUpdate; // Store the items that were updated
          console.log(`Updated ${itemsToUpdate.length} items in ${tableName}`);
        }

        // 4. Insert new items and update IDs
        if (itemsToInsert.length > 0) {
          const itemData = itemsToInsert.map((item) => {
            const { id, ...insertData } = item;
            return {
              est_section_id: sectionId,
              ...insertData,
            };
          });

          const { data: insertedItemsFromDB, error: insertError } =
            await supabase.from(tableName).insert(itemData).select("*");

          if (insertError) throw insertError;
          console.log(
            `Inserted ${itemsToInsert.length} new items into ${tableName}`
          );

          // Create a mapping of temp_id to new database id
          const tempIdToIdMap = new Map();
          insertedItemsFromDB.forEach((insertedItem, index) => {
            const originalItem = itemsToInsert[index];
            if (originalItem.temp_id) {
              tempIdToIdMap.set(originalItem.temp_id, insertedItem.id);
            }
          });

          // Create final items array with updated IDs
          processedItems = items.map((item) => {
            if (item.temp_id && tempIdToIdMap.has(item.temp_id)) {
              return {
                ...item,
                id: tempIdToIdMap.get(item.temp_id),
                temp_id: undefined,
              };
            }
            return item;
          });

          // Store the inserted items with their new IDs
          insertedItems = insertedItemsFromDB;
        }
      }

      dispatch({
        type: Actions.estimates.UPDATE_SECTION_ITEMS_SUCCESS,
        payload: {
          type: tableName.replace("estimate_", ""),
          data: {
            sectionId,
            tableName,
            itemOrder: null,
            operations: {
              updated: updatedItems,
              inserted: insertedItems,
              deleted: idsToDelete,
            },
          },
        },
      });

      return processedItems;
    } catch (error) {
      console.error(`Error updating ${tableName}:`, error);
      dispatch({
        type: Actions.estimates.UPDATE_SECTION_ITEMS_ERROR,
        payload: error.message,
      });
      throw error;
    }
  };
};

// Update the order of items for a specific section
export const updateSectionItemOrder = (sectionId, tableName, orderedIds) => {
  return async (dispatch) => {
    dispatch({ type: Actions.estimates.UPDATE_SECTION_ITEM_ORDER_START });
    try {
      const itemType = tableName.replace("estimate_", "");
      const orderColumn = `${itemType}_order`;

      await updateOrderArray(
        "estimate_sections",
        "est_section_id",
        sectionId,
        orderColumn,
        orderedIds
      );

      dispatch({
        type: Actions.estimates.UPDATE_SECTION_ITEM_ORDER_SUCCESS,
        payload: { sectionId, itemType, orderedIds },
      });
    } catch (error) {
      dispatch({
        type: Actions.estimates.UPDATE_SECTION_ITEM_ORDER_ERROR,
        payload: error.message,
      });
    }
  };
};

// Update the order of tasks for an estimate
export const updateTaskOrder = (estimateId, orderedTaskIds) => {
  return async (dispatch) => {
    dispatch({ type: Actions.estimates.UPDATE_TASK_ORDER_START });
    try {
      await updateOrderArray(
        'estimates',      // The table name
        'estimate_id',    // The column to match for the row ID
        estimateId,       // The ID of the estimate to update
        'tasks_order',    // The column containing the order array
        orderedTaskIds    // The new array of ordered task IDs
      );
      dispatch({
        type: Actions.estimates.UPDATE_TASK_ORDER_SUCCESS,
        payload: { estimateId, orderedTaskIds },
      });
    } catch (error) {
      dispatch({
        type: Actions.estimates.UPDATE_TASK_ORDER_ERROR,
        payload: error.message,
      });
    }
  };
};
