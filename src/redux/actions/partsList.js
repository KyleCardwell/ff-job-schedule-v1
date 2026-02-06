import { supabase } from "../../utils/supabase";
import { partsList } from "../actionTypes/partsList";

// Fetch all active parts list items (not team-specific, all teams see all parts)
// Only fetches parts where is_active = true
export const fetchPartsList = () => {
  return async (dispatch) => {
    try {
      dispatch({ type: partsList.FETCH_PARTS_LIST_START });

      const { data, error } = await supabase
        .from("parts_list")
        .select("*")
        .eq("is_active", true);
        // .order("name", { ascending: true });

      if (error) throw error;

      dispatch({
        type: partsList.FETCH_PARTS_LIST_SUCCESS,
        payload: data,
      });

      return data;
    } catch (error) {
      dispatch({
        type: partsList.FETCH_PARTS_LIST_ERROR,
        payload: error.message,
      });
      throw error;
    }
  };
};
