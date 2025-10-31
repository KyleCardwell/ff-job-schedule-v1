import isEqual from "lodash/isEqual";

import { supabase } from "../../utils/supabase";
import { finishes } from "../actionTypes";

// Action creators
export const fetchFinishesStart = () => ({
  type: finishes.FETCH_FINISHES_START,
});

export const fetchFinishesSuccess = (finishesList) => ({
  type: finishes.FETCH_FINISHES_SUCCESS,
  payload: finishesList,
});

export const fetchFinishesError = (error) => ({
  type: finishes.FETCH_FINISHES_ERROR,
  payload: error,
});

// Async action to fetch finishes from Supabase
export const fetchFinishes = () => async (dispatch, getState) => {
  try {
    dispatch(fetchFinishesStart());

    const state = getState();
    const teamId = state.auth.teamId;

    const { data, error } = await supabase
      .from("estimate_finishes")
      .select("id, name, shop_markup, finish_markup, created_at, updated_at")
      .eq("team_id", teamId)
      .order("id", { ascending: true });

    if (error) throw error;

    dispatch(fetchFinishesSuccess(data));
    return { data, error };
  } catch (error) {
    console.error("Error fetching finishes:", error);
    dispatch(fetchFinishesError(error.message));
    return { success: false, error: error.message };
  }
};

// Unified action to save finishes (add, update, delete)
export const saveFinishes =
  (items, originalItems) => async (dispatch, getState) => {
    dispatch({ type: finishes.SAVE_FINISHES_START });
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
          const { id, isNew, markedForDeletion, created_at, updated_at, ...itemData } = item;
          toAdd.push({ ...itemData, team_id: teamId });
        } else {
          // Check if changed
          const originalItem = originalItems.find(
            (orig) => orig.id === item.id
          );
          if (originalItem && !isEqual(originalItem, item)) {
            const { isNew, markedForDeletion, created_at, ...itemData } = item;
            toUpdate.push({ ...itemData, updated_at: new Date() });
          }
        }
      });

      // Execute operations
      const errors = [];

      // Delete
      for (const id of toDelete) {
        const { error } = await supabase
          .from("estimate_finishes")
          .delete()
          .eq("id", id);
        if (error) errors.push(`Delete failed: ${error.message}`);
      }

      // Add
      if (toAdd.length > 0) {
        const { error } = await supabase.from("estimate_finishes").insert(toAdd);
        if (error) errors.push(`Insert failed: ${error.message}`);
      }

      // Update
      for (const item of toUpdate) {
        const { id, ...updateData } = item;
        const { error } = await supabase
          .from("estimate_finishes")
          .update(updateData)
          .eq("id", id);
        if (error)
          errors.push(`Update failed for ${item.name}: ${error.message}`);
      }

      if (errors.length > 0) {
        throw new Error(errors.join("; "));
      }

      // Refresh data
      const result = await dispatch(fetchFinishes());
      return { success: true, data: result?.data };
    } catch (error) {
      console.error("Error saving finishes:", error);
      dispatch(fetchFinishesError(error.message));
      return { success: false, error: error.message };
    }
  };
