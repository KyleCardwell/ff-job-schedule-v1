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

    // Fetch lengths with embedded services and rules
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
        ),
        length_catalog_rules(
          id,
          rule_key,
          params,
          sort_order
        )
      `)
      .eq("team_id", teamId)
      .order("name", { ascending: true });

    if (error) throw error;

    // Transform to flatten services array and normalize rules
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
      rules: (length.length_catalog_rules || [])
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)),
      length_services: undefined, // Remove the nested structure
      length_catalog_rules: undefined, // Remove the nested structure
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
          // New item - remove metadata fields, services, and rules (computed/joined fields)
          const { id, isNew, markedForDeletion, services, rules, ...itemData } = item;
          toAdd.push({ ...itemData, team_id: teamId });
        } else {
          // Check if changed
          const originalItem = originalItems.find(
            (orig) => orig.id === item.id
          );
          if (originalItem && !isEqual(originalItem, item)) {
            const { isNew, markedForDeletion, services, rules, ...itemData } = item;
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

// Save length services + rules for all catalog items via a single RPC call.
// `items` is an array of { length_catalog_id, services, rules } where:
//   services: [{ service_id, time_per_unit, is_miter_time, is_cutout_time }]
//   rules:    [{ rule_key, params, sort_order }]
// The RPC handles team_service_id resolution, delete-then-insert (no ID gaps),
// and runs everything in one transaction.
export const saveLengthSettings =
  (items) => async (dispatch) => {
    dispatch({ type: lengths.SAVE_LENGTH_TIME_ANCHORS_START });
    try {
      const { data, error } = await supabase.rpc("save_length_settings", {
        p_items: items,
      });

      if (error) throw error;

      dispatch({ type: lengths.SAVE_LENGTH_TIME_ANCHORS_SUCCESS });
      return { success: true, data };
    } catch (error) {
      console.error("Error saving length settings:", error);
      dispatch({
        type: lengths.SAVE_LENGTH_TIME_ANCHORS_ERROR,
        payload: error.message,
      });
      return { success: false, error: error.message };
    }
  };
