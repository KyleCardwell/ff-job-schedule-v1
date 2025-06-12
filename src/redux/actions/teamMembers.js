import { supabase } from "../../utils/supabase";
import { Actions } from "../actions";

export const fetchTeamMembers = async (dispatch, teamId) => {
  try {
    dispatch({ type: Actions.teamMembers.FETCH_TEAM_MEMBERS_START });
    const { data, error } = await supabase
      .from("team_members")
      .select(
        `
        user_name, custom_permissions, role_id, team_member_id
      `
      )
      .eq("team_id", teamId);

    dispatch({
      type: Actions.teamMembers.FETCH_TEAM_MEMBERS_SUCCESS,
      payload: data,
    });

    return data;
  } catch (error) {
    console.error("Error fetching team members:", error);
    dispatch({
      type: Actions.teamMembers.FETCH_TEAM_MEMBERS_ERROR,
      payload: error,
    });
    throw error;
  }
};

export const fetchUserRoles = async (dispatch) => {
  try {
    dispatch({ type: Actions.userRoles.FETCH_USER_ROLES_START });
    const { data, error } = await supabase
      .from("roles")
      .select(
        "role_id, role_name, can_edit_projects, can_manage_teams, can_edit_schedule, can_edit_financials, can_view_profit_loss"
      );

    dispatch({
      type: Actions.userRoles.FETCH_USER_ROLES_SUCCESS,
      payload: data?.map(role => ({
        role_id: role.role_id,
        role_name: role.role_name,
        permissions: {
          can_edit_projects: role.can_edit_projects,
          can_manage_teams: role.can_manage_teams,
          can_edit_schedule: role.can_edit_schedule,
          can_edit_financials: role.can_edit_financials,
          can_view_profit_loss: role.can_view_profit_loss
        }
      }))
    });

    return data;
  } catch (error) {
    console.error("Error fetching user roles:", error);
    dispatch({
      type: Actions.userRoles.FETCH_USER_ROLES_ERROR,
      payload: error,
    });
    throw error;
  }
};
