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

// Add a new cabinet type
// export const addCabinetType = (cabinetTypeData) => {
//   return async (dispatch, getState) => {
//     try {
//       dispatch({ type: cabinetTypes.ADD_CABINET_TYPE_START });

//       const { teamId } = getState().auth;
//       const { data, error } = await supabase
//         .from("team_cabinet_types")
//         .insert([{ ...cabinetTypeData, team_id: teamId }])
//         .select()
//         .single();

//       if (error) throw error;

//       dispatch({
//         type: cabinetTypes.ADD_CABINET_TYPE_SUCCESS,
//         payload: data,
//       });

//       return data;
//     } catch (error) {
//       console.error("Error adding cabinet type:", error);
//       dispatch({
//         type: cabinetTypes.ADD_CABINET_TYPE_ERROR,
//         payload: error.message,
//       });
//       throw error;
//     }
//   };
// };

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