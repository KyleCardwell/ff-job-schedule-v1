import { supabase } from "../../utils/supabase";
import { partsListAnchors as Actions } from '../actionTypes/partsListAnchors';

// Fetch parts list anchors using the RPC function
export const fetchPartsListAnchors = () => {
  return async (dispatch, getState) => {
    dispatch({ type: Actions.FETCH_PARTS_LIST_ANCHORS_START });
    try {
      const { teamId } = getState().auth;
      const { data, error } = await supabase.rpc('get_team_parts_list_anchors', {
        p_team_id: teamId,
      });
      if (error) throw error;
      dispatch({ type: Actions.FETCH_PARTS_LIST_ANCHORS_SUCCESS, payload: data });
      return data;
    } catch (error) {
      dispatch({ type: Actions.FETCH_PARTS_LIST_ANCHORS_ERROR, payload: error.message });
      throw error;
    }
  };
};

// Batch save all changes for parts list anchors
export const savePartsListAnchors = (newAnchors, updatedAnchors, deletedIds) => {
  return async (dispatch, getState) => {
    dispatch({ type: Actions.UPDATE_PARTS_LIST_ANCHOR_START }); // Generic start action
    try {
      const { teamId } = getState().auth;

      // 1. Deletions
      if (deletedIds && deletedIds.length > 0) {
        const { error } = await supabase.from('team_parts_list_anchors').delete().in('id', deletedIds);
        if (error) throw error;
      }

      // 2. Updates
      if (updatedAnchors && updatedAnchors.length > 0) {
        const updatePromises = updatedAnchors.map(anchor => {
          const { id, cabinet_style_id, width, height, depth, services } = anchor;
          return supabase.rpc('update_parts_list_anchor_with_services', {
            p_anchor_id: id,
            p_team_id: teamId,
            p_width: width,
            p_height: height,
            p_depth: depth,
            p_cabinet_style_id: cabinet_style_id || null,
            p_services: services,
          });
        });

        const results = await Promise.all(updatePromises);
        results.forEach(res => { if (res.error) throw res.error; });
      }

      // 3. Creations
      if (newAnchors && newAnchors.length > 0) {
        const createPromises = newAnchors.map(anchor => {
          // eslint-disable-next-line no-unused-vars
          const { isNew, markedForDeletion, ...rest } = anchor;
          const { parts_list_id, cabinet_style_id, width, height, depth, services } = rest;
          
          // Ensure services is properly formatted as a JSONB array
          const formattedServices = Array.isArray(services) ? services : [];
          
          const params = {
            p_team_id: teamId,
            p_width: width,
            p_height: height,
            p_depth: depth,
            p_cabinet_style_id: cabinet_style_id || null,
            p_parts_list_id: parts_list_id,
            p_services: formattedServices,
          };
          
          return supabase.rpc('create_parts_list_anchor_with_services', params);
        });
        
        const createResults = await Promise.all(createPromises);
        createResults.forEach(res => {
          if (res.error) {
            throw res.error;
          }
        });
      }
      
      // After all operations, refetch the entire list to ensure correct sorting and data
      await dispatch(fetchPartsListAnchors());

    } catch (error) {
      dispatch({ type: Actions.UPDATE_PARTS_LIST_ANCHOR_ERROR, payload: error.message });
      throw error;
    }
  };
};
