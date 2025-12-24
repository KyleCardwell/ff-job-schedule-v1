import isEqual from "lodash/isEqual";

import { supabase } from "../../utils/supabase";
import { accessories } from "../actionTypes";

// Action creators
export const fetchAccessoriesCatalogStart = () => ({
  type: accessories.FETCH_ACCESSORIES_CATALOG_START,
});

export const fetchAccessoriesCatalogError = (error) => ({
  type: accessories.FETCH_ACCESSORIES_CATALOG_ERROR,
  payload: error,
});

export const fetchAccessoriesCatalogSuccess = (catalog) => ({
  type: accessories.FETCH_ACCESSORIES_CATALOG_SUCCESS,
  payload: catalog,
});

// Async action to fetch accessories catalog from Supabase
export const fetchAccessoriesCatalog = () => async (dispatch, getState) => {
  try {
    dispatch(fetchAccessoriesCatalogStart());

    const state = getState();
    const teamId = state.auth.teamId;

    const { data, error } = await supabase
      .from("accessories_catalog")
      .select("*")
      .eq("team_id", teamId)
      .order("name", { ascending: true });

    if (error) throw error;

    dispatch(fetchAccessoriesCatalogSuccess(data));
    return { data, error };
  } catch (error) {
    console.error("Error fetching accessories catalog:", error);
    dispatch(fetchAccessoriesCatalogError(error.message));
    return { success: false, error: error.message };
  }
};

// Unified action to save accessories catalog (add, update, delete)
export const saveAccessoriesCatalog =
  (items, originalItems) => async (dispatch, getState) => {
    dispatch({ type: accessories.SAVE_ACCESSORIES_CATALOG_START });
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
          // New item - remove metadata fields
          const { id, isNew, markedForDeletion, ...itemData } = item;
          toAdd.push({ ...itemData, team_id: teamId });
        } else {
          // Check if changed
          const originalItem = originalItems.find(
            (orig) => orig.id === item.id
          );
          if (originalItem && !isEqual(originalItem, item)) {
            const { isNew, markedForDeletion, ...itemData } = item;
            toUpdate.push({ ...itemData, updated_at: new Date() });
          }
        }
      });

      // Execute operations
      const errors = [];

      // Delete
      for (const id of toDelete) {
        const { error } = await supabase
          .from("accessories_catalog")
          .delete()
          .eq("id", id);
        if (error) errors.push(`Delete failed: ${error.message}`);
      }

      // Add
      if (toAdd.length > 0) {
        const { error } = await supabase
          .from("accessories_catalog")
          .insert(toAdd);
        if (error) errors.push(`Insert failed: ${error.message}`);
      }

      // Update
      for (const item of toUpdate) {
        const { id, ...updateData } = item;
        const { error } = await supabase
          .from("accessories_catalog")
          .update(updateData)
          .eq("id", id);
        if (error)
          errors.push(`Update failed for ${item.name}: ${error.message}`);
      }

      if (errors.length > 0) {
        throw new Error(errors.join("; "));
      }

      // Refresh data
      const result = await dispatch(fetchAccessoriesCatalog());
      return { success: true, data: result?.data };
    } catch (error) {
      console.error("Error saving accessories catalog:", error);
      dispatch(fetchAccessoriesCatalogError(error.message));
      return { success: false, error: error.message };
    }
  };

// ------------ Accessory Time Anchors ------------
// ------------------------------------------------

export const fetchAccessoryTimeAnchors = () => async (dispatch, getState) => {
  try {
    dispatch({ type: accessories.FETCH_ACCESSORY_TIME_ANCHORS_START });

    const state = getState();
    const teamId = state.auth.teamId;

    // Fetch anchors with their associated catalog items
    const { data, error } = await supabase
      .from("accessory_time_anchors")
      .select(`
        *,
        accessories_catalog!inner(team_id)
      `)
      .eq("accessories_catalog.team_id", teamId);

    if (error) throw error;

    dispatch({
      type: accessories.FETCH_ACCESSORY_TIME_ANCHORS_SUCCESS,
      payload: data,
    });
    return { data, error };
  } catch (error) {
    console.error("Error fetching accessory time anchors:", error);
    dispatch({
      type: accessories.FETCH_ACCESSORY_TIME_ANCHORS_ERROR,
      payload: error.message,
    });
    return { success: false, error: error.message };
  }
};

// Save time anchors for a specific accessory (similar to parts list anchors pattern)
export const saveAccessoryTimeAnchors =
  (accessoryCatalogId, newAnchors, updatedAnchors, deletedAnchorIds) =>
  async (dispatch) => {
    dispatch({ type: accessories.SAVE_ACCESSORY_TIME_ANCHORS_START });
    try {
      const errors = [];

      // Delete anchors
      if (deletedAnchorIds && deletedAnchorIds.length > 0) {
        const { error: deleteError } = await supabase
          .from("accessory_time_anchors")
          .delete()
          .in("id", deletedAnchorIds);

        if (deleteError) errors.push(`Delete failed: ${deleteError.message}`);
      }

      // Update existing anchors
      if (updatedAnchors && updatedAnchors.length > 0) {
        for (const anchor of updatedAnchors) {
          const { error } = await supabase
            .from("accessory_time_anchors")
            .update({
              minutes_per_unit: anchor.minutes_per_unit,
            })
            .eq("id", anchor.id);

          if (error)
            errors.push(
              `Update failed for anchor ${anchor.id}: ${error.message}`
            );
        }
      }

      // Insert new anchors
      if (newAnchors && newAnchors.length > 0) {
        const { error: insertError } = await supabase
          .from("accessory_time_anchors")
          .insert(
            newAnchors.map((anchor) => ({
              accessories_catalog_id: accessoryCatalogId,
              team_service_id: anchor.team_service_id,
              minutes_per_unit: anchor.minutes_per_unit,
            }))
          );

        if (insertError) errors.push(`Insert failed: ${insertError.message}`);
      }

      if (errors.length > 0) {
        throw new Error(errors.join("; "));
      }

      // Refetch all time anchors to get fresh data
      const result = await dispatch(fetchAccessoryTimeAnchors());

      dispatch({
        type: accessories.SAVE_ACCESSORY_TIME_ANCHORS_SUCCESS,
      });

      return { success: true, data: result?.data };
    } catch (error) {
      console.error("Error saving accessory time anchors:", error);
      dispatch({
        type: accessories.SAVE_ACCESSORY_TIME_ANCHORS_ERROR,
        payload: error.message,
      });
      return { success: false, error: error.message };
    }
  };
