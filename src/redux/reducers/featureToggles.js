import { Actions } from '../actions';

const initialState = {
  features: {},
  loading: false,
  error: null
};

export const featureTogglesReducer = (state = initialState, action) => {
  switch (action.type) {
    case Actions.featureToggles.FETCH_FEATURE_TOGGLES_REQUEST:
      return {
        ...state,
        loading: true,
        error: null
      };
    
    case Actions.featureToggles.FETCH_FEATURE_TOGGLES_SUCCESS:
      return {
        ...state,
        loading: false,
        features: action.payload,
        error: null
      };
    
    case Actions.featureToggles.FETCH_FEATURE_TOGGLES_ERROR:
      return {
        ...state,
        loading: false,
        error: action.payload
      };
    
    default:
      return state;
  }
};
