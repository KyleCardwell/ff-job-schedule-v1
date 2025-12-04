import { supabase } from "../../utils/supabase";
import { teamEstimateDefaults } from "../actionTypes";

// Fetch team defaults
export const fetchTeamDefaults = () => {
  return async (dispatch, getState) => {
    try {
      dispatch({ type: teamEstimateDefaults.FETCH_TEAM_DEFAULTS_START });

      const { teamId } = getState().auth;
      
      if (!teamId) {
        throw new Error("No team ID found");
      }

      const { data: teamData, error: teamError } = await supabase
        .from("teams")
        .select(`
          team_id,
          team_name,
          default_cabinet_style_id,
          default_box_mat,
          default_face_mat,
          default_drawer_box_mat,
          default_hinge_id,
          default_slide_id,
          default_door_pull_id,
          default_drawer_pull_id,
          default_face_finish,
          default_box_finish,
          default_door_inside_molding,
          default_door_outside_molding,
          default_drawer_inside_molding,
          default_drawer_outside_molding,
          default_door_reeded_panel,
          default_drawer_reeded_panel,
          default_door_style,
          default_drawer_front_style,
          default_profit,
          default_commission,
          default_discount
        `)
        .eq("team_id", teamId)
        .single();

      if (teamError) {
        if (teamError.code === "PGRST116") {
          throw new Error("You do not have permission to view team defaults");
        }
        throw teamError;
      }

      dispatch({
        type: teamEstimateDefaults.FETCH_TEAM_DEFAULTS_SUCCESS,
        payload: teamData,
      });

      return teamData;
    } catch (error) {
      console.error("Error fetching team defaults:", error);
      dispatch({
        type: teamEstimateDefaults.FETCH_TEAM_DEFAULTS_ERROR,
        payload: error.message,
      });
      throw error;
    }
  };
};

// Update team defaults
export const updateTeamDefaults = (teamId, defaults) => {
  return async (dispatch) => {
    try {
      dispatch({ type: teamEstimateDefaults.UPDATE_TEAM_DEFAULTS_START });

      // All fields use the default_ prefix and are REQUIRED (NOT NULL)
      const updatePayload = {
        default_cabinet_style_id: defaults.default_cabinet_style_id,
        default_box_mat: defaults.default_box_mat,
        default_face_mat: defaults.default_face_mat,
        default_drawer_box_mat: defaults.default_drawer_box_mat,
        default_hinge_id: defaults.default_hinge_id,
        default_slide_id: defaults.default_slide_id,
        default_door_pull_id: defaults.default_door_pull_id,
        default_drawer_pull_id: defaults.default_drawer_pull_id,
        default_face_finish: defaults.default_face_finish,
        default_box_finish: defaults.default_box_finish,
        default_door_inside_molding: defaults.default_door_inside_molding,
        default_door_outside_molding: defaults.default_door_outside_molding,
        default_drawer_inside_molding: defaults.default_drawer_inside_molding,
        default_drawer_outside_molding: defaults.default_drawer_outside_molding,
        default_door_reeded_panel: defaults.default_door_reeded_panel,
        default_drawer_reeded_panel: defaults.default_drawer_reeded_panel,
        default_door_style: defaults.default_door_style,
        default_drawer_front_style: defaults.default_drawer_front_style,
        default_profit: defaults.default_profit,
        default_commission: defaults.default_commission,
        default_discount: defaults.default_discount,
        updated_at: new Date(),
      };

      const { error: updateError } = await supabase
        .from("teams")
        .update(updatePayload)
        .eq("team_id", teamId);

      if (updateError) throw updateError;

      // Refetch to get updated data
      const { data: teamData, error: fetchError } = await supabase
        .from("teams")
        .select(`
          team_id,
          team_name,
          default_cabinet_style_id,
          default_box_mat,
          default_face_mat,
          default_drawer_box_mat,
          default_hinge_id,
          default_slide_id,
          default_door_pull_id,
          default_drawer_pull_id,
          default_face_finish,
          default_box_finish,
          default_door_inside_molding,
          default_door_outside_molding,
          default_drawer_inside_molding,
          default_drawer_outside_molding,
          default_door_reeded_panel,
          default_drawer_reeded_panel,
          default_door_style,
          default_drawer_front_style,
          default_profit,
          default_commission,
          default_discount
        `)
        .eq("team_id", teamId)
        .single();

      if (fetchError) throw fetchError;

      dispatch({
        type: teamEstimateDefaults.UPDATE_TEAM_DEFAULTS_SUCCESS,
        payload: teamData,
      });

      return teamData;
    } catch (error) {
      console.error("Error updating team defaults:", error);
      dispatch({
        type: teamEstimateDefaults.UPDATE_TEAM_DEFAULTS_ERROR,
        payload: error.message,
      });
      throw error;
    }
  };
};
