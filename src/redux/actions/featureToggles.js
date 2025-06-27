import { supabase } from '../../utils/supabase';
import { Actions } from '../actions';

// Action Creators
export const fetchFeatureToggles = () => async (dispatch) => {
  dispatch({ type: Actions.featureToggles.FETCH_FEATURE_TOGGLES_REQUEST });
  
  try {
    const { data, error } = await supabase
      .from('feature_toggles')
      .select('feature_name, feature_enabled');
      
    if (error) throw error;
    
    // Transform array into key-value object
    const features = data.reduce((acc, { feature_name, feature_enabled }) => ({
      ...acc,
      [feature_name]: feature_enabled
    }), {});
    
    dispatch({
      type: Actions.featureToggles.FETCH_FEATURE_TOGGLES_SUCCESS,
      payload: features
    });
  } catch (error) {
    dispatch({
      type: Actions.featureToggles.FETCH_FEATURE_TOGGLES_ERROR,
      payload: error.message
    });
  }
};
