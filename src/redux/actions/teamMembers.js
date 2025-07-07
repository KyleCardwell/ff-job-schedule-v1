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

    if (error) throw error;

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

export const updateTeamMembers = async (dispatch, updates) => {
  try {
    dispatch({ type: Actions.teamMembers.UPDATE_TEAM_MEMBERS_START });

    // Execute all updates in parallel
    const promises = updates.map(({ team_member_id, role_id, custom_permissions }) => 
      supabase
        .from('team_members')
        .update({ 
          role_id,
          custom_permissions 
        })
        .eq('team_member_id', team_member_id)
    );

    const results = await Promise.all(promises);
    
    // Check if any update failed
    const errors = results.filter(result => result.error);
    if (errors.length > 0) {
      throw new Error(`Failed to update ${errors.length} team members`);
    }

    // Check if all updates were successful (status 204 means success with no content)
    const allSuccessful = results.every(r => r.status === 204 || (r.data && r.data.length > 0));
    if (!allSuccessful) {
      throw new Error('Some updates did not complete successfully');
    }

    // For 204 responses, reconstruct the member data from the original updates
    const updatedMembers = updates.map(update => ({
      team_member_id: update.team_member_id,
      role_id: update.role_id,
      custom_permissions: update.custom_permissions
    }));

    dispatch({
      type: Actions.teamMembers.UPDATE_TEAM_MEMBERS_SUCCESS,
      payload: updatedMembers
    });

    return updatedMembers;
  } catch (error) {
    console.error("Error updating team members:", error);
    dispatch({
      type: Actions.teamMembers.UPDATE_TEAM_MEMBERS_ERROR,
      payload: error
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
        "role_id, role_name, can_edit_projects, can_manage_teams, can_edit_schedule, can_edit_financials, can_view_profit_loss, can_create_estimates"
      );

    if (error) throw error;

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
          can_view_profit_loss: role.can_view_profit_loss,
          can_create_estimates: role.can_create_estimates,
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

export const fetchTeamMemberData = async (dispatch, userId) => {
  try {
    const { data: teamMemberData, error: teamMemberError } = await supabase
      .from("team_members")
      .select(`*`)
      .eq("user_id", userId)
      .single();

    if (teamMemberError && teamMemberError.code !== "PGRST116") {
      throw teamMemberError;
    }

    return { teamMemberData, error: teamMemberError };
  } catch (error) {
    console.error("Error fetching team member data:", error);
    throw error;
  }
};

export const fetchTeamMemberRole = async (dispatch, roleId) => {
  try {
    const { data: roleData, error: roleError } = await supabase
      .from("roles")
      .select(
        "can_edit_projects, can_manage_teams, can_edit_schedule, can_edit_financials, can_view_profit_loss, can_create_estimates"
      )
      .eq("role_id", roleId)
      .single();

    if (roleError) throw roleError;

    return roleData;
  } catch (error) {
    console.error("Error fetching team member role:", error);
    throw error;
  }
};
