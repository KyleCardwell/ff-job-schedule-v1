import { teamEstimateDefaults } from "../actionTypes";

const initialState = {
  teamDefaults: null,
  loading: false,
  error: null,
};

export const teamEstimateDefaultsReducer = (state = initialState, action) => {
  switch (action.type) {
    case teamEstimateDefaults.FETCH_TEAM_DEFAULTS_START:
    case teamEstimateDefaults.UPDATE_TEAM_DEFAULTS_START:
      return {
        ...state,
        loading: true,
        error: null,
      };

    case teamEstimateDefaults.FETCH_TEAM_DEFAULTS_SUCCESS:
      return {
        ...state,
        teamDefaults: action.payload,
        loading: false,
        error: null,
      };

    case teamEstimateDefaults.UPDATE_TEAM_DEFAULTS_SUCCESS:
      return {
        ...state,
        teamDefaults: action.payload,
        loading: false,
        error: null,
      };

    case teamEstimateDefaults.FETCH_TEAM_DEFAULTS_ERROR:
    case teamEstimateDefaults.UPDATE_TEAM_DEFAULTS_ERROR:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    default:
      return state;
  }
};
