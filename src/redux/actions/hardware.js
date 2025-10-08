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

    const { data, error } = await supabase
      .from("hardware_hinges")
      .select("id, name, actual_cost, price")
      .eq("team_id", teamId)
      .order("name", { ascending: true });

    if (error) throw error;

    dispatch(fetchHingesSuccess(data));
    return { data, error };
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

    const { data, error } = await supabase
      .from("hardware_pulls")
      .select("id, name, price, actual_cost")
      .eq("team_id", teamId)
      .order("name", { ascending: true });

    if (error) throw error;

    dispatch(fetchPullsSuccess(data));
    return { data, error };
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
          const { id, isNew, markedForDeletion, ...itemData } = item;
          toAdd.push({ ...itemData, team_id: teamId });
        } else {
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

    const { data, error } = await supabase
      .from("hardware_slides")
      .select("id, name, price, actual_cost")
      .eq("team_id", teamId)
      .order("name", { ascending: true });

    if (error) throw error;

    dispatch(fetchSlidesSuccess(data));
    return { data, error };
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
          const { id, isNew, markedForDeletion, ...itemData } = item;
          toAdd.push({ ...itemData, team_id: teamId });
        } else {
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
