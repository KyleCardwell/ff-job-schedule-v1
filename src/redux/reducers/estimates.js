import { Actions } from "../actions";

const initialState = {
  loading: false,
  error: null,
  estimates: [],
  currentEstimate: null,
  filters: {
    status: "all",
    searchTerm: "",
  },
  projectsForSelection: [],
  projectsLoading: false,
  projectsError: null,
  estimateProjects: [],
};

export const estimatesReducer = (state = initialState, action) => {
  switch (action.type) {
    case Actions.estimates.FETCH_ESTIMATES_START:
      return {
        ...state,
        loading: true,
        error: null,
      };

    case Actions.estimates.FETCH_ESTIMATES_SUCCESS:
      return {
        ...state,
        estimates: action.payload,
        loading: false,
        error: null,
      };

    case Actions.estimates.FETCH_ESTIMATES_ERROR:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    case Actions.estimates.CREATE_ESTIMATE_START:
      return {
        ...state,
        loading: true,
        error: null,
      };

    case Actions.estimates.CREATE_ESTIMATE_SUCCESS:
      return {
        ...state,
        estimates: [...state.estimates, action.payload],
        currentEstimate: action.payload,
        loading: false,
        error: null,
      };

    case Actions.estimates.CREATE_ESTIMATE_ERROR:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    case Actions.estimates.SET_CURRENT_ESTIMATE:
      return {
        ...state,
        currentEstimate: action.payload,
      };

    case Actions.estimates.CLEAR_CURRENT_ESTIMATE:
      return {
        ...state,
        currentEstimate: null,
      };

    case Actions.estimates.SET_ESTIMATE_FILTERS:
      return {
        ...state,
        filters: {
          ...state.filters,
          ...action.payload,
        },
      };

    case Actions.estimates.CREATE_ESTIMATE_PROJECT_START:
      return {
        ...state,
        loading: true,
        error: null,
      };

    case Actions.estimates.CREATE_ESTIMATE_PROJECT_SUCCESS:
      return {
        ...state,
        estimateProjects: [...state.estimateProjects, action.payload],
        loading: false,
        error: null,
      };

    case Actions.estimates.CREATE_ESTIMATE_PROJECT_ERROR:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    default:
      return state;
  }
};
