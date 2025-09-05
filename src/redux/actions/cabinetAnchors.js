import { supabase } from "../../utils/supabase";
import { cabinetAnchors as Actions } from '../actionTypes/cabinetAnchors';

// Fetch cabinet anchors using the RPC function
export const fetchCabinetAnchors = () => {
  return async (dispatch, getState) => {
    dispatch({ type: Actions.FETCH_CABINET_ANCHORS_START });
    try {
      const { teamId } = getState().auth;
      const { data, error } = await supabase.rpc('get_team_cabinet_anchors', {
        p_team_id: teamId,
      });
      if (error) throw error;
      dispatch({ type: Actions.FETCH_CABINET_ANCHORS_SUCCESS, payload: data });
      return data;
    } catch (error) {
      dispatch({ type: Actions.FETCH_CABINET_ANCHORS_ERROR, payload: error.message });
      throw error;
    }
  };
};

// Create a new cabinet anchor and its services
export const createCabinetAnchor = (anchorData) => {
  return async (dispatch, getState) => {
    dispatch({ type: Actions.CREATE_CABINET_ANCHOR_START });
    try {
      const { teamId } = getState().auth;
      const { cabinet_type_id, width, height, depth, services } = anchorData;

      // 1. Insert into cabinet_anchors
      const { data: newAnchor, error: anchorError } = await supabase
        .from('cabinet_anchors')
        .insert({
          team_id: teamId,
          cabinet_type_id,
          width,
          height,
          depth,
          volume: width * height * depth,
        })
        .select()
        .single();

      if (anchorError) throw anchorError;

      // 2. Insert into cabinet_anchor_services
      const serviceEntries = services.map((service) => ({
        cabinet_anchor_id: newAnchor.id,
        team_service_id: service.team_service_id,
        hours: service.hours,
      }));

      const { error: servicesError } = await supabase
        .from('cabinet_anchor_services')
        .insert(serviceEntries);

      if (servicesError) throw servicesError;

      // 3. Refetch the newly created anchor in its final shape
      const { data: finalAnchor, error: refetchError } = await supabase
        .rpc('get_team_cabinet_anchors', { p_team_id: teamId })
        .eq('id', newAnchor.id)
        .single();

      if (refetchError) throw refetchError;

      dispatch({ type: Actions.CREATE_CABINET_ANCHOR_SUCCESS, payload: finalAnchor });
      return finalAnchor;
    } catch (error) {
      dispatch({ type: Actions.CREATE_CABINET_ANCHOR_ERROR, payload: error.message });
      throw error;
    }
  };
};

// Update an existing cabinet anchor and its services
export const updateCabinetAnchor = (anchorId, updates, services) => {
  return async (dispatch, getState) => {
    dispatch({ type: Actions.UPDATE_CABINET_ANCHOR_START });
    try {
      const { teamId } = getState().auth;

      // 1. Update the main anchor dimensions
      const { error: anchorError } = await supabase
        .from('cabinet_anchors')
        .update({ ...updates, volume: updates.width * updates.height * updates.depth })
        .eq('id', anchorId);

      if (anchorError) throw anchorError;

      // 2. Upsert service hours
      const serviceEntries = services.map((service) => ({
        cabinet_anchor_id: anchorId,
        team_service_id: service.team_service_id,
        hours: service.hours,
      }));

      const { error: servicesError } = await supabase
        .from('cabinet_anchor_services')
        .upsert(serviceEntries, { onConflict: ['cabinet_anchor_id', 'team_service_id'] });

      if (servicesError) throw servicesError;

      // 3. Refetch the updated anchor in its final shape
      const { data: finalAnchor, error: refetchError } = await supabase
        .rpc('get_team_cabinet_anchors', { p_team_id: teamId })
        .eq('id', anchorId)
        .single();

      if (refetchError) throw refetchError;

      dispatch({ type: Actions.UPDATE_CABINET_ANCHOR_SUCCESS, payload: finalAnchor });
      return finalAnchor;
    } catch (error) {
      dispatch({ type: Actions.UPDATE_CABINET_ANCHOR_ERROR, payload: error.message });
      throw error;
    }
  };
};

// Delete a cabinet anchor
export const deleteCabinetAnchor = (anchorId) => {
  return async (dispatch) => {
    dispatch({ type: Actions.DELETE_CABINET_ANCHOR_START });
    try {
      // RLS should ensure cascading delete on cabinet_anchor_services
      const { error } = await supabase
        .from('cabinet_anchors')
        .delete()
        .eq('id', anchorId);

      if (error) throw error;

      dispatch({ type: Actions.DELETE_CABINET_ANCHOR_SUCCESS, payload: anchorId });
      return anchorId;
    } catch (error) {
      dispatch({ type: Actions.DELETE_CABINET_ANCHOR_ERROR, payload: error.message });
      throw error;
    }
  };
};