import isEqual from "lodash/isEqual";

import { supabase } from "../../utils/supabase";
import { materials } from "../actionTypes";

// Action creators
export const fetchMaterialsStart = () => ({
  type: materials.FETCH_MATERIALS_START,
});

export const fetchMaterialsError = (error) => ({
  type: materials.FETCH_MATERIALS_ERROR,
  payload: error,
});

export const fetchSheetGoodsSuccess = (materialList) => ({
  type: materials.FETCH_SHEET_GOODS_SUCCESS,
  payload: materialList,
});

// Async action to fetch sheet goods from Supabase
export const fetchSheetGoods = () => async (dispatch, getState) => {
  try {
    dispatch(fetchMaterialsStart());

    const state = getState();
    const teamId = state.auth.teamId;

    const { data, error } = await supabase
      .from("wood_catalog")
      .select(
        "id, name, width, height, thickness, area, sheet_price, bd_ft_price, box_mat, face_mat, five_piece, slab_door, needs_finish"
      )
      .eq("team_id", teamId)
      .order("name", { ascending: true });

    if (error) throw error;

    dispatch(fetchSheetGoodsSuccess(data));
    return { data, error };
  } catch (error) {
    console.error("Error fetching sheet goods:", error);
    dispatch(fetchMaterialsError(error.message));
    return { success: false, error: error.message };
  }
};

// Unified action to save sheet goods (add, update, delete)
export const saveSheetGoods =
  (items, originalItems) => async (dispatch, getState) => {
    dispatch({ type: materials.SAVE_MATERIALS_START });
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
            toUpdate.push(itemData);
          }
        }
      });

      // Execute operations
      const errors = [];

      // Delete
      for (const id of toDelete) {
        const { error } = await supabase
          .from("wood_catalog")
          .delete()
          .eq("id", id);
        if (error) errors.push(`Delete failed: ${error.message}`);
      }

      // Add
      if (toAdd.length > 0) {
        const { error } = await supabase.from("wood_catalog").insert(toAdd);
        if (error) errors.push(`Insert failed: ${error.message}`);
      }

      // Update
      for (const item of toUpdate) {
        const { id, ...updateData } = item;
        const { error } = await supabase
          .from("wood_catalog")
          .update(updateData)
          .eq("id", id);
        if (error)
          errors.push(`Update failed for ${item.name}: ${error.message}`);
      }

      if (errors.length > 0) {
        throw new Error(errors.join("; "));
      }

      // Refresh data
      await dispatch(fetchSheetGoods());
      return { success: true };
    } catch (error) {
      console.error("Error saving sheet goods:", error);
      dispatch(fetchMaterialsError(error.message));
      return { success: false, error: error.message };
    }
  };

// ------------ Drawer Box Materials ------------
// ----------------------------------------------

export const fetchDrawerBoxMaterials = () => async (dispatch) => {
  try {
    const { data, error } = await supabase
      .from("drawer_wood_catalog")
      .select(
        "id, name, width, height, thickness, area, sheet_price, needs_finish"
      )
      .order("name", { ascending: true });

    if (error) throw error;

    dispatch({
      type: materials.FETCH_DRAWER_BOX_MATERIALS_SUCCESS,
      payload: data,
    });
    return data;
  } catch (error) {
    console.error("Error fetching drawer box materials:", error);
    dispatch(fetchMaterialsError(error.message));
    return { success: false, error: error.message };
  }
};

// Unified action to save drawer box materials (add, update, delete)
export const saveDrawerBoxMaterials =
  (items, originalItems) => async (dispatch, getState) => {
    if (isEqual(items, originalItems)) return;
    dispatch({ type: materials.SAVE_MATERIALS_START });
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
            toUpdate.push(itemData);
          }
        }
      });

      // Execute operations
      const errors = [];

      // Delete
      for (const id of toDelete) {
        const { error } = await supabase
          .from("drawer_wood_catalog")
          .delete()
          .eq("id", id);
        if (error) errors.push(`Delete failed: ${error.message}`);
      }

      // Add
      if (toAdd.length > 0) {
        const { error } = await supabase
          .from("drawer_wood_catalog")
          .insert(toAdd);
        if (error) errors.push(`Insert failed: ${error.message}`);
      }

      // Update
      for (const item of toUpdate) {
        const { id, ...updateData } = item;
        const { error } = await supabase
          .from("drawer_wood_catalog")
          .update(updateData)
          .eq("id", id);
        if (error)
          errors.push(`Update failed for ${item.name}: ${error.message}`);
      }

      if (errors.length > 0) {
        throw new Error(errors.join("; "));
      }

      // Refresh data
      await dispatch(fetchDrawerBoxMaterials());
      return { success: true };
    } catch (error) {
      console.error("Error saving drawer box materials:", error);
      dispatch(fetchMaterialsError(error.message));
      return { success: false, error: error.message };
    }
  };
