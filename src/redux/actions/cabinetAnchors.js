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

// Batch save all changes for cabinet anchors
export const saveCabinetAnchors = (newAnchors, updatedAnchors, deletedIds) => {
  return async (dispatch, getState) => {
    dispatch({ type: Actions.UPDATE_CABINET_ANCHOR_START }); // Generic start action
    try {
      const { teamId } = getState().auth;

      // 1. Deletions
      if (deletedIds && deletedIds.length > 0) {
        const { error } = await supabase.from('cabinet_anchors').delete().in('id', deletedIds);
        if (error) throw error;
      }

      // 2. Updates
      if (updatedAnchors && updatedAnchors.length > 0) {
        const updatePromises = updatedAnchors.map(anchor => {
          const { id, cabinet_type_id, width, height, depth, services } = anchor;
          return supabase.rpc('update_cabinet_anchor_with_services', {
            p_anchor_id: id,
            p_team_id: teamId,
            p_cabinet_type_id: cabinet_type_id,
            p_width: width,
            p_height: height,
            p_depth: depth,
            p_services: services,
          });
        });

        const results = await Promise.all(updatePromises);
        results.forEach(res => { if (res.error) throw res.error; });
      }

      // 3. Creations
      if (newAnchors && newAnchors.length > 0) {
        const createPromises = newAnchors.map(anchor => {
          const { isNew, markedForDeletion, ...rest } = anchor;
          const { cabinet_type_id, width, height, depth, services } = rest;
          
          // Ensure services is properly formatted as a JSONB array
          const formattedServices = Array.isArray(services) ? services : [];
          
          const params = {
            p_team_id: teamId,
            p_cabinet_type_id: cabinet_type_id,
            p_width: width,
            p_height: height,
            p_depth: depth,
            p_services: formattedServices,
          };
          
          console.log('Creating anchor with params:', params);
          return supabase.rpc('create_cabinet_anchor_with_services', params);
        });
        
        const createResults = await Promise.all(createPromises);
        createResults.forEach(res => {
          if (res.error) {
            console.error('Error creating anchor:', res.error);
            throw res.error;
          }
        });
      }
      
      // After all operations, refetch the entire list to ensure correct sorting and data
      await dispatch(fetchCabinetAnchors());

    } catch (error) {
      console.error('Error saving cabinet anchors:', {
        errorMessage: error.message,
        errorDetails: error,
        updatedAnchors,
        newAnchors,
        deletedIds,
      });
      dispatch({ type: Actions.UPDATE_CABINET_ANCHOR_ERROR, payload: error.message });
      throw error;
    }
  };
};