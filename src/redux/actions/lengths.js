import isEqual from "lodash/isEqual";

import { supabase } from "../../utils/supabase";
import { lengths } from "../actionTypes";

// Action creators
export const fetchLengthsCatalogStart = () => ({
  type: lengths.FETCH_LENGTHS_CATALOG_START,
});

export const fetchLengthsCatalogError = (error) => ({
  type: lengths.FETCH_LENGTHS_CATALOG_ERROR,
  payload: error,
});

export const fetchLengthsCatalogSuccess = (catalog) => ({
  type: lengths.FETCH_LENGTHS_CATALOG_SUCCESS,
  payload: catalog,
});

// Fetch lengths catalog with embedded services (following hardware pattern)
export const fetchLengthsCatalog = () => async (dispatch, getState) => {
  dispatch({ type: lengths.FETCH_LENGTHS_CATALOG_START });
  try {
    const state = getState();
    const teamId = state.auth.teamId;

    // Fetch lengths with embedded services (same pattern as hardware)
    const { data, error } = await supabase
      .from("lengths_catalog")
      .select(`
        *,
        length_services!length_catalog_id(
          id,
          team_service_id,
          time_per_unit,
          is_miter_time,
          is_cutout_time,
          team_services!inner(
            service_id,
            services!inner(name)
          )
        )
      `)
      .eq("team_id", teamId)
      .order("name", { ascending: true });

    if (error) throw error;

    // Transform to flatten services array (same pattern as hardware)
    const lengthsWithServices = (data || []).map((length) => ({
      ...length,
      services: (length.length_services || []).map((ls) => ({
        id: ls.id,
        team_service_id: ls.team_service_id,
        service_id: ls.team_services?.service_id,
        service_name: ls.team_services?.services?.name,
        time_per_unit: ls.time_per_unit,
        is_miter_time: ls.is_miter_time,
        is_cutout_time: ls.is_cutout_time,
      })),
      length_services: undefined, // Remove the nested structure
    }));

    dispatch({
      type: lengths.FETCH_LENGTHS_CATALOG_SUCCESS,
      payload: lengthsWithServices,
    });
    return { data: lengthsWithServices, error };
  } catch (error) {
    console.error("Error fetching lengths catalog:", error);
    dispatch({
      type: lengths.FETCH_LENGTHS_CATALOG_ERROR,
      payload: error.message,
    });
    return { success: false, error: error.message };
  }
};

// Unified action to save lengths catalog (add, update, delete)
// Following hardware pattern
export const saveLengthsCatalog =
  (items, originalItems) => async (dispatch, getState) => {
    dispatch({ type: lengths.SAVE_LENGTHS_CATALOG_START });
    try {
      const state = getState();
      const teamId = state.auth.teamId;

      // Separate items into add, update, delete
      const toAdd = [];
      const toUpdate = [];
      const toDelete = [];

      // Find items to delete (in original but not in current, or marked for deletion)
      originalItems.forEach((originalItem) => {
        const currentItem = items.find((item) => item.id === originalItem.id);
        if (!currentItem || currentItem.markedForDeletion) {
          toDelete.push(originalItem.id);
        }
      });

      // Find items to add or update
      items.forEach((item) => {
        if (item.markedForDeletion) return; // Skip marked for deletion

        if (item.isNew) {
          // New item - remove metadata fields and services (computed field)
          const { id, isNew, markedForDeletion, services, ...itemData } = item;
          toAdd.push({ ...itemData, team_id: teamId });
        } else {
          // Check if changed
          const originalItem = originalItems.find(
            (orig) => orig.id === item.id
          );
          if (originalItem && !isEqual(originalItem, item)) {
            const { isNew, markedForDeletion, services, ...itemData } = item;
            toUpdate.push({ ...itemData, updated_at: new Date() });
          }
        }
      });

      // Execute operations
      const errors = [];

      // Delete
      for (const id of toDelete) {
        const { error } = await supabase
          .from("lengths_catalog")
          .delete()
          .eq("id", id);
        if (error) errors.push(`Delete failed: ${error.message}`);
      }

      // Add
      if (toAdd.length > 0) {
        const { error } = await supabase.from("lengths_catalog").insert(toAdd);
        if (error) errors.push(`Insert failed: ${error.message}`);
      }

      // Update
      for (const item of toUpdate) {
        const { id, ...updateData } = item;
        const { error } = await supabase
          .from("lengths_catalog")
          .update(updateData)
          .eq("id", id);
        if (error)
          errors.push(`Update failed for ${item.name}: ${error.message}`);
      }

      if (errors.length > 0) {
        throw new Error(errors.join("; "));
      }

      // Refresh data
      const result = await dispatch(fetchLengthsCatalog());
      return { success: true, data: result?.data };
    } catch (error) {
      console.error("Error saving lengths catalog:", error);
      dispatch({
        type: lengths.SAVE_LENGTHS_CATALOG_ERROR,
        payload: error.message,
      });
      return { success: false, error: error.message };
    }
  };

// Save length services (following hardware pattern but using length_services table)
export const saveLengthServices =
  (lengthId, services) => async (dispatch, getState) => {
    dispatch({ type: lengths.SAVE_LENGTH_TIME_ANCHORS_START });
    try {
      const state = getState();
      const teamId = state.auth.teamId;
      
      // Get all team services for this team
      const { data: teamServices, error: teamServicesError } = await supabase
        .from("team_services")
        .select("id, service_id")
        .eq("team_id", teamId);
      
      if (teamServicesError) throw teamServicesError;

      // Get existing services for this length item
      const { data: existingServices, error: fetchError } = await supabase
        .from("length_services")
        .select("*")
        .eq("length_catalog_id", lengthId);

      if (fetchError) throw fetchError;

      const errors = [];
      const toUpsert = [];
      const toDelete = [];

      // Process each service
      services.forEach((service) => {
        const teamService = teamServices.find(
          (ts) => ts.service_id === service.service_id
        );
        
        if (!teamService) return;

        const timeValue = parseFloat(service.time_per_unit);
        const isMiterTime = service.is_miter_time || false;
        const isCutoutTime = service.is_cutout_time || false;
        
        // If time is 0 or empty, mark for deletion if it exists
        if (!timeValue || timeValue === 0) {
          const existing = existingServices?.find(
            (es) => es.team_service_id === teamService.id && 
                    es.is_miter_time === isMiterTime && 
                    es.is_cutout_time === isCutoutTime
          );
          if (existing) {
            toDelete.push(existing.id);
          }
        } else {
          // Add or update
          const existing = existingServices?.find(
            (es) => es.team_service_id === teamService.id && 
                    es.is_miter_time === isMiterTime && 
                    es.is_cutout_time === isCutoutTime
          );
          
          toUpsert.push({
            id: existing?.id,
            length_catalog_id: lengthId,
            team_service_id: teamService.id,
            time_per_unit: timeValue,
            is_miter_time: isMiterTime,
            is_cutout_time: isCutoutTime,
          });
        }
      });

      // Delete services with 0 time
      for (const id of toDelete) {
        const { error } = await supabase
          .from("length_services")
          .delete()
          .eq("id", id);
        if (error) errors.push(`Delete failed: ${error.message}`);
      }

      // Upsert services (insert or update)
      if (toUpsert.length > 0) {
        for (const service of toUpsert) {
          if (service.id) {
            // Update existing
            const { id, ...updateData } = service;
            const { error } = await supabase
              .from("length_services")
              .update(updateData)
              .eq("id", id);
            if (error) errors.push(`Update failed: ${error.message}`);
          } else {
            // Insert new
            const { id, ...insertData } = service;
            const { error } = await supabase
              .from("length_services")
              .insert(insertData);
            if (error) errors.push(`Insert failed: ${error.message}`);
          }
        }
      }

      if (errors.length > 0) {
        throw new Error(errors.join("; "));
      }

      // Don't refetch here - let the caller decide when to refetch
      // This prevents multiple flashes when saving services for multiple items
      
      dispatch({ type: lengths.SAVE_LENGTH_TIME_ANCHORS_SUCCESS });
      return { success: true };
    } catch (error) {
      console.error("Error saving length services:", error);
      dispatch({
        type: lengths.SAVE_LENGTH_TIME_ANCHORS_ERROR,
        payload: error.message,
      });
      return { success: false, error: error.message };
    }
  };
