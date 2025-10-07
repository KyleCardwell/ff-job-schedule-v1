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

// Function to add new sheet good material
export const addSheetGood = (material) => async (dispatch, getState) => {
  try {
    const state = getState();
    const teamId = state.auth.teamId;

    const { data, error } = await supabase
      .from("wood_catalog")
      .insert({
        ...material,
        team_id: teamId,
      })
      .select();

    if (error) throw error;

    // After successful insert, fetch all materials to update state
    dispatch(fetchSheetGoods());
    return { success: true, data };
  } catch (error) {
    console.error("Error adding sheet good:", error);
    dispatch(fetchMaterialsError(error.message));
    return { success: false, error: error.message };
  }
};

// Function to update sheet good material
export const updateSheetGood = (material) => async (dispatch) => {
  try {
    const { data, error } = await supabase
      .from("wood_catalog")
      .update({
        material_name: material.material_name,
        material_description: material.material_description,
        material_cost: material.material_cost,
        box_mat: material.box_mat,
        face_mat: material.face_mat,
        // Add any other fields that can be updated
      })
      .eq("id", material.id)
      .select();

    if (error) throw error;

    // After successful update, fetch all materials to update state
    dispatch(fetchSheetGoods());
    return { success: true, data };
  } catch (error) {
    console.error("Error updating sheet good:", error);
    dispatch(fetchMaterialsError(error.message));
    return { success: false, error: error.message };
  }
};

// Function to delete sheet good material
export const deleteSheetGood = (id) => async (dispatch) => {
  try {
    const { error } = await supabase.from("wood_catalog").delete().eq("id", id);

    if (error) throw error;

    // After successful delete, fetch all materials to update state
    dispatch(fetchSheetGoods());
    return { success: true };
  } catch (error) {
    console.error("Error deleting sheet good:", error);
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
