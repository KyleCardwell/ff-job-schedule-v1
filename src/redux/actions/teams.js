import { supabase } from "../../utils/supabase";
import { Actions } from "../actions";

/**
 * Fetch team data including contact info and logo path
 */
export const fetchTeamData = async (dispatch, teamId) => {
  try {
    dispatch({ type: Actions.teams.FETCH_TEAM_DATA_START });
    const { data, error } = await supabase
      .from("teams")
      .select("team_id, team_name, contact_info, logo_path")
      .eq("team_id", teamId)
      .single();

    if (error) throw error;

    dispatch({
      type: Actions.teams.FETCH_TEAM_DATA_SUCCESS,
      payload: data,
    });

    return data;
  } catch (error) {
    console.error("Error fetching team data:", error);
    dispatch({
      type: Actions.teams.FETCH_TEAM_DATA_ERROR,
      payload: error,
    });
    throw error;
  }
};

/**
 * Update team contact info
 */
export const updateTeamContactInfo = async (dispatch, teamId, contactInfo) => {
  try {
    dispatch({ type: Actions.teams.UPDATE_TEAM_CONTACT_INFO_START });
    
    const { data, error } = await supabase
      .from("teams")
      .update({ contact_info: contactInfo })
      .eq("team_id", teamId)
      .select()
      .single();

    if (error) throw error;

    dispatch({
      type: Actions.teams.UPDATE_TEAM_CONTACT_INFO_SUCCESS,
      payload: data,
    });

    return data;
  } catch (error) {
    console.error("Error updating team contact info:", error);
    dispatch({
      type: Actions.teams.UPDATE_TEAM_CONTACT_INFO_ERROR,
      payload: error,
    });
    throw error;
  }
};

/**
 * Update team logo path after upload
 */
export const updateTeamLogoPath = async (dispatch, teamId, logoPath) => {
  try {
    dispatch({ type: Actions.teams.UPDATE_TEAM_LOGO_PATH_START });
    
    const { data, error } = await supabase
      .from("teams")
      .update({ logo_path: logoPath })
      .eq("team_id", teamId)
      .select()
      .single();

    if (error) throw error;

    dispatch({
      type: Actions.teams.UPDATE_TEAM_LOGO_PATH_SUCCESS,
      payload: data,
    });

    return data;
  } catch (error) {
    console.error("Error updating team logo path:", error);
    dispatch({
      type: Actions.teams.UPDATE_TEAM_LOGO_PATH_ERROR,
      payload: error,
    });
    throw error;
  }
};

/**
 * Upload logo to Supabase storage
 * Stores full path in storage (teamId/logo.ext) but only filename in database
 */
export const uploadTeamLogo = async (dispatch, teamId, file) => {
  try {
    dispatch({ type: Actions.teams.UPLOAD_TEAM_LOGO_START });

    // Generate filename (just the filename, not the full path)
    const fileExt = file.name.split(".").pop();
    const fileName = `logo.${fileExt}`;
    const storagePath = `${teamId}/${fileName}`; // Full path for storage

    // Upload file to storage with full path
    const { error: uploadError } = await supabase.storage
      .from("team-files")
      .upload(storagePath, file, {
        upsert: true, // Replace existing file
        contentType: file.type,
      });

    if (uploadError) throw uploadError;

    // Update team record with just the filename
    await updateTeamLogoPath(dispatch, teamId, fileName);

    dispatch({
      type: Actions.teams.UPLOAD_TEAM_LOGO_SUCCESS,
      payload: fileName,
    });

    return fileName;
  } catch (error) {
    console.error("Error uploading team logo:", error);
    dispatch({
      type: Actions.teams.UPLOAD_TEAM_LOGO_ERROR,
      payload: error,
    });
    throw error;
  }
};

/**
 * Get public URL for team logo
 * Note: Bucket must be set to "public" in Supabase for this to work
 * If you get 400 errors, the bucket might not be public
 */
export const getTeamLogoUrl = (teamId, fileName) => {
  if (!teamId || !fileName) return null;
  
  const fullPath = `${teamId}/${fileName}`;
  const { data } = supabase.storage
    .from("team-files")
    .getPublicUrl(fullPath);

  return data.publicUrl;
};

/**
 * Get signed URL for authenticated access (for private buckets)
 * Prepends teamId to the filename stored in database
 */
export const getTeamLogoSignedUrl = async (teamId, fileName, expiresIn = 3600) => {
  if (!teamId || !fileName) return null;
  
  try {
    const fullPath = `${teamId}/${fileName}`;
    const { data, error } = await supabase.storage
      .from("team-files")
      .createSignedUrl(fullPath, expiresIn); // expires in seconds (default 1 hour)

    if (error) throw error;
    return data.signedUrl;
  } catch (error) {
    console.error("Error creating signed URL:", error);
    return null;
  }
};

/**
 * Delete team logo
 */
export const deleteTeamLogo = async (dispatch, teamId, fileName) => {
  try {
    dispatch({ type: Actions.teams.DELETE_TEAM_LOGO_START });

    // Delete file from storage (prepend teamId to filename)
    const fullPath = `${teamId}/${fileName}`;
    const { error: deleteError } = await supabase.storage
      .from("team-files")
      .remove([fullPath]);

    if (deleteError) throw deleteError;

    // Clear logo path from team record
    await updateTeamLogoPath(dispatch, teamId, null);

    dispatch({
      type: Actions.teams.DELETE_TEAM_LOGO_SUCCESS,
    });

    return true;
  } catch (error) {
    console.error("Error deleting team logo:", error);
    dispatch({
      type: Actions.teams.DELETE_TEAM_LOGO_ERROR,
      payload: error,
    });
    throw error;
  }
};
