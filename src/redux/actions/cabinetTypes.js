import { supabase } from "../../utils/supabase";
import { cabinetTypes } from "../actionTypes";

// Fetch all cabinet types
export const fetchCabinetTypes = () => {
  return async (dispatch, getState) => {
    try {
      dispatch({ type: cabinetTypes.FETCH_CABINET_TYPES_START });

      const { teamId } = getState().auth;

      const { data, error } = await supabase
        .from("team_cabinet_types_view")
        .select("*")
        .eq("team_id", teamId)
        .order("cabinet_type_id", { ascending: true });

      if (error) throw error;

      dispatch({
        type: cabinetTypes.FETCH_CABINET_TYPES_SUCCESS,
        payload: data,
      });

      return data;
    } catch (error) {
      console.error("Error fetching cabinet types:", error);
      dispatch({
        type: cabinetTypes.FETCH_CABINET_TYPES_ERROR,
        payload: error.message,
      });
      throw error;
    }
  };
};

// Update an existing cabinet type
export const updateCabinetType = (id, updates) => {
  return async (dispatch) => {
    try {
      dispatch({ type: cabinetTypes.UPDATE_CABINET_TYPE_START });

      const { data, error } = await supabase
        .from("team_cabinet_types")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      dispatch({
        type: cabinetTypes.UPDATE_CABINET_TYPE_SUCCESS,
        payload: data,
      });

      return data;
    } catch (error) {
      console.error("Error updating cabinet type:", error);
      dispatch({
        type: cabinetTypes.UPDATE_CABINET_TYPE_ERROR,
        payload: error.message,
      });
      throw error;
    }
  };
};



const cabinetTypesFromDatabase = [
      {
        cabinet_type_id: 1,
        cabinet_type_name: 'Base Cabinet',
        item_type: 'cabinet'
      },
      {
        cabinet_type_id: 2,
        cabinet_type_name: 'Upper Cabinet',
        item_type: 'cabinet'
      },
      {
        cabinet_type_id: 3,
        cabinet_type_name: 'Tall Cabinet',
        item_type: 'cabinet'
      },
      {
        cabinet_type_id: 5,
        cabinet_type_name: 'Filler',
        item_type: 'filler'
      },
      {
        cabinet_type_id: 10,
        cabinet_type_name: 'End Panel',
        item_type: 'end_panel'
      },
      {
        cabinet_type_id: 11,
        cabinet_type_name: 'Appliance Panel',
        item_type: 'appliance_panel'
      },
      {
        cabinet_type_id: 12,
        cabinet_type_name: 'Door',
        item_type: 'door_front'
      },
      {
        cabinet_type_id: 13,
        cabinet_type_name: 'Drawer Front',
        item_type: 'drawer_front'
      },
      {
        cabinet_type_id: 14,
        cabinet_type_name: 'Hood',
        item_type: 'hood'
      },
      {
        cabinet_type_id: 15,
        cabinet_type_name: 'Drawer Box',
        item_type: 'drawer_box'
      },
      {
        cabinet_type_id: 16,
        cabinet_type_name: 'Face Frame',
        item_type: 'face_frame'
      },
    ]