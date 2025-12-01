import isEqual from "lodash/isEqual";

import { supabase } from "../../utils/supabase";
import { hardware } from "../actionTypes";

// Action creators
export const fetchHardwareStart = () => ({
  type: hardware.FETCH_HARDWARE_START,
});

export const fetchHardwareError = (error) => ({
  type: hardware.FETCH_HARDWARE_ERROR,
  payload: error,
});

export const fetchHingesSuccess = (hinges) => ({
  type: hardware.FETCH_HINGES_SUCCESS,
  payload: hinges,
});

export const fetchPullsSuccess = (pulls) => ({
  type: hardware.FETCH_PULLS_SUCCESS,
  payload: pulls,
});

export const fetchSlidesSuccess = (slides) => ({
  type: hardware.FETCH_SLIDES_SUCCESS,
  payload: slides,
});

// Async action to fetch hinges from Supabase
export const fetchHinges = () => async (dispatch, getState) => {
  try {
    dispatch(fetchHardwareStart());

    const state = getState();
    const teamId = state.auth.teamId;

    // Fetch hinges with embedded services
    const { data, error } = await supabase
      .from("hardware_hinges")
      .select(`
        *,
        hardware_services!hardware_hinges_id(
          id,
          team_service_id,
          time_per_unit,
          team_services!inner(
            service_id,
            services!inner(name)
          )
        )
      `)
      .eq("team_id", teamId)
      .order("name", { ascending: true });

    if (error) throw error;

    // Transform to flatten services array
    const hingesWithServices = (data || []).map(hinge => ({
      ...hinge,
      services: (hinge.hardware_services || []).map(hs => ({
        id: hs.id,
        team_service_id: hs.team_service_id,
        service_id: hs.team_services?.service_id,
        service_name: hs.team_services?.services?.name,
        time_per_unit: hs.time_per_unit
      })),
      hardware_services: undefined // Remove the nested structure
    }));

    dispatch(fetchHingesSuccess(hingesWithServices));
    return { data: hingesWithServices, error };
  } catch (error) {
    console.error("Error fetching hinges:", error);
    dispatch(fetchHardwareError(error.message));
    return { success: false, error: error.message };
  }
};

// Unified action to save hinges (add, update, delete)
export const saveHinges =
  (items, originalItems) => async (dispatch, getState) => {
    dispatch({ type: hardware.SAVE_HARDWARE_START });
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
          .from("hardware_hinges")
          .delete()
          .eq("id", id);
        if (error) errors.push(`Delete failed: ${error.message}`);
      }

      // Add
      if (toAdd.length > 0) {
        const { error } = await supabase.from("hardware_hinges").insert(toAdd);
        if (error) errors.push(`Insert failed: ${error.message}`);
      }

      // Update
      for (const item of toUpdate) {
        const { id, ...updateData } = item;
        const { error } = await supabase
          .from("hardware_hinges")
          .update(updateData)
          .eq("id", id);
        if (error)
          errors.push(`Update failed for ${item.name}: ${error.message}`);
      }

      if (errors.length > 0) {
        throw new Error(errors.join("; "));
      }

      // Refresh data
      const result = await dispatch(fetchHinges());
      return { success: true, data: result?.data };
    } catch (error) {
      console.error("Error saving hinges:", error);
      dispatch(fetchHardwareError(error.message));
      return { success: false, error: error.message };
    }
  };

// ------------ Pulls ------------
// -------------------------------

export const fetchPulls = () => async (dispatch, getState) => {
  try {
    dispatch(fetchHardwareStart());

    const state = getState();
    const teamId = state.auth.teamId;

    // Fetch pulls with embedded services
    const { data, error } = await supabase
      .from("hardware_pulls")
      .select(`
        *,
        hardware_services!hardware_pulls_id(
          id,
          team_service_id,
          time_per_unit,
          team_services!inner(
            service_id,
            services!inner(name)
          )
        )
      `)
      .eq("team_id", teamId)
      .order("name", { ascending: true });

    if (error) throw error;

    // Transform to flatten services array
    const pullsWithServices = (data || []).map(pull => ({
      ...pull,
      services: (pull.hardware_services || []).map(hs => ({
        id: hs.id,
        team_service_id: hs.team_service_id,
        service_id: hs.team_services?.service_id,
        service_name: hs.team_services?.services?.name,
        time_per_unit: hs.time_per_unit
      })),
      hardware_services: undefined // Remove the nested structure
    }));

    dispatch(fetchPullsSuccess(pullsWithServices));
    return { data: pullsWithServices, error };
  } catch (error) {
    console.error("Error fetching pulls:", error);
    dispatch(fetchHardwareError(error.message));
    return { success: false, error: error.message };
  }
};

// Unified action to save pulls (add, update, delete)
export const savePulls =
  (items, originalItems) => async (dispatch, getState) => {
    dispatch({ type: hardware.SAVE_HARDWARE_START });
    try {
      const state = getState();
      const teamId = state.auth.teamId;

      // Separate items into add, update, delete
      const toAdd = [];
      const toUpdate = [];
      const toDelete = [];

      // Find items to delete
      originalItems.forEach((originalItem) => {
        const currentItem = items.find((item) => item.id === originalItem.id);
        if (!currentItem || currentItem.markedForDeletion) {
          toDelete.push(originalItem.id);
        }
      });

      // Find items to add or update
      items.forEach((item) => {
        if (item.markedForDeletion) return;

        if (item.isNew) {
          const { id, isNew, markedForDeletion, services, ...itemData } = item;
          toAdd.push({ ...itemData, team_id: teamId });
        } else {
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
          .from("hardware_pulls")
          .delete()
          .eq("id", id);
        if (error) errors.push(`Delete failed: ${error.message}`);
      }

      // Add
      if (toAdd.length > 0) {
        const { error } = await supabase.from("hardware_pulls").insert(toAdd);
        if (error) errors.push(`Insert failed: ${error.message}`);
      }

      // Update
      for (const item of toUpdate) {
        const { id, ...updateData } = item;
        const { error } = await supabase
          .from("hardware_pulls")
          .update(updateData)
          .eq("id", id);
        if (error)
          errors.push(`Update failed for ${item.name}: ${error.message}`);
      }

      if (errors.length > 0) {
        throw new Error(errors.join("; "));
      }

      // Refresh data
      const result = await dispatch(fetchPulls());
      return { success: true, data: result?.data };
    } catch (error) {
      console.error("Error saving pulls:", error);
      dispatch(fetchHardwareError(error.message));
      return { success: false, error: error.message };
    }
  };

// ------------ Slides ------------
// --------------------------------

export const fetchSlides = () => async (dispatch, getState) => {
  try {
    dispatch(fetchHardwareStart());

    const state = getState();
    const teamId = state.auth.teamId;

    // Fetch slides with embedded services
    const { data, error } = await supabase
      .from("hardware_slides")
      .select(`
        *,
        hardware_services!hardware_slides_id(
          id,
          team_service_id,
          time_per_unit,
          team_services!inner(
            service_id,
            services!inner(name)
          )
        )
      `)
      .eq("team_id", teamId)
      .order("name", { ascending: true });

    if (error) throw error;

    // Transform to flatten services array
    const slidesWithServices = (data || []).map(slide => ({
      ...slide,
      services: (slide.hardware_services || []).map(hs => ({
        id: hs.id,
        team_service_id: hs.team_service_id,
        service_id: hs.team_services?.service_id,
        service_name: hs.team_services?.services?.name,
        time_per_unit: hs.time_per_unit
      })),
      hardware_services: undefined // Remove the nested structure
    }));

    dispatch(fetchSlidesSuccess(slidesWithServices));
    return { data: slidesWithServices, error };
  } catch (error) {
    console.error("Error fetching slides:", error);
    dispatch(fetchHardwareError(error.message));
    return { success: false, error: error.message };
  }
};

// Unified action to save slides (add, update, delete)
export const saveSlides =
  (items, originalItems) => async (dispatch, getState) => {
    dispatch({ type: hardware.SAVE_HARDWARE_START });
    try {
      const state = getState();
      const teamId = state.auth.teamId;

      // Separate items into add, update, delete
      const toAdd = [];
      const toUpdate = [];
      const toDelete = [];

      // Find items to delete
      originalItems.forEach((originalItem) => {
        const currentItem = items.find((item) => item.id === originalItem.id);
        if (!currentItem || currentItem.markedForDeletion) {
          toDelete.push(originalItem.id);
        }
      });

      // Find items to add or update
      items.forEach((item) => {
        if (item.markedForDeletion) return;

        if (item.isNew) {
          const { id, isNew, markedForDeletion, services, ...itemData } = item;
          toAdd.push({ ...itemData, team_id: teamId });
        } else {
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
          .from("hardware_slides")
          .delete()
          .eq("id", id);
        if (error) errors.push(`Delete failed: ${error.message}`);
      }

      // Add
      if (toAdd.length > 0) {
        const { error } = await supabase.from("hardware_slides").insert(toAdd);
        if (error) errors.push(`Insert failed: ${error.message}`);
      }

      // Update
      for (const item of toUpdate) {
        const { id, ...updateData } = item;
        const { error } = await supabase
          .from("hardware_slides")
          .update(updateData)
          .eq("id", id);
        if (error)
          errors.push(`Update failed for ${item.name}: ${error.message}`);
      }

      if (errors.length > 0) {
        throw new Error(errors.join("; "));
      }

      // Refresh data
      const result = await dispatch(fetchSlides());
      return { success: true, data: result?.data };
    } catch (error) {
      console.error("Error saving slides:", error);
      dispatch(fetchHardwareError(error.message));
      return { success: false, error: error.message };
    }
  };

// ------------ Hardware Services ------------
// --------------------------------------------

// Save hardware services (add, update, delete)
export const saveHardwareServices =
  (hardwareType, hardwareId, services) => async (dispatch, getState) => {
    dispatch({ type: hardware.SAVE_HARDWARE_SERVICES_START });
    try {
      const state = getState();
      const teamId = state.auth.teamId;
      
      // Get all team services for this team
      const { data: teamServices, error: teamServicesError } = await supabase
        .from("team_services")
        .select("id, service_id")
        .eq("team_id", teamId);
      
      if (teamServicesError) throw teamServicesError;

      // Map hardware type to column name
      const hardwareColumn = `hardware_${hardwareType}s_id`;

      // Get existing hardware services for this hardware item
      const { data: existingServices, error: fetchError } = await supabase
        .from("hardware_services")
        .select("*")
        .eq(hardwareColumn, hardwareId);

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
        
        // If time is 0 or empty, mark for deletion if it exists
        if (!timeValue || timeValue === 0) {
          const existing = existingServices?.find(
            (es) => es.team_service_id === teamService.id
          );
          if (existing) {
            toDelete.push(existing.id);
          }
        } else {
          // Add or update
          const existing = existingServices?.find(
            (es) => es.team_service_id === teamService.id
          );
          
          // Map hardware type to correct column
          const hardwareColumn = `hardware_${hardwareType}s_id`;
          
          toUpsert.push({
            id: existing?.id,
            [hardwareColumn]: hardwareId,
            team_service_id: teamService.id,
            time_per_unit: timeValue,
          });
        }
      });

      // Delete services with 0 time
      for (const id of toDelete) {
        const { error } = await supabase
          .from("hardware_services")
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
              .from("hardware_services")
              .update(updateData)
              .eq("id", id);
            if (error) errors.push(`Update failed: ${error.message}`);
          } else {
            // Insert new
            const { id, ...insertData } = service;
            const { error } = await supabase
              .from("hardware_services")
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
      
      dispatch({ type: hardware.SAVE_HARDWARE_SERVICES_SUCCESS });
      return { success: true };
    } catch (error) {
      console.error("Error saving hardware services:", error);
      dispatch({
        type: hardware.SAVE_HARDWARE_SERVICES_ERROR,
        payload: error.message,
      });
      return { success: false, error: error.message };
    }
  };
