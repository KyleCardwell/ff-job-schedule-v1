import { Actions } from "../actions";

const initialState = {
  estimates: [],
  currentEstimate: null,
  loading: false,
  error: null,
  filters: {
    status: "all", // 'new', 'in-progress', 'finalized'
    searchTerm: "",
  },
  projectsForSelection: [],
  projectsLoading: false,
  projectsError: null,
};

export const estimatesReducer = (state = initialState, action) => {
  switch (action.type) {
    // Fetch estimates
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

    // Create estimate
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

    // Update estimate
    case Actions.estimates.UPDATE_ESTIMATE_START:
      return {
        ...state,
        loading: true,
        error: null,
      };
    case Actions.estimates.UPDATE_ESTIMATE_SUCCESS:
      return {
        ...state,
        estimates: state.estimates.map((estimate) =>
          estimate.id === action.payload.id ? action.payload : estimate
        ),
        currentEstimate:
          state.currentEstimate &&
          state.currentEstimate.id === action.payload.id
            ? action.payload
            : state.currentEstimate,
        loading: false,
        error: null,
      };
    case Actions.estimates.UPDATE_ESTIMATE_ERROR:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    // Delete estimate
    case Actions.estimates.DELETE_ESTIMATE_START:
      return {
        ...state,
        loading: true,
        error: null,
      };
    case Actions.estimates.DELETE_ESTIMATE_SUCCESS:
      return {
        ...state,
        estimates: state.estimates.filter(
          (estimate) => estimate.id !== action.payload
        ),
        currentEstimate:
          state.currentEstimate && state.currentEstimate.id === action.payload
            ? null
            : state.currentEstimate,
        loading: false,
        error: null,
      };
    case Actions.estimates.DELETE_ESTIMATE_ERROR:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    // Set current estimate
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

    // Set filters
    case Actions.estimates.SET_ESTIMATE_FILTERS:
      return {
        ...state,
        filters: {
          ...state.filters,
          ...action.payload,
        },
      };
      
    // Fetch projects for selection
    case Actions.estimates.FETCH_PROJECTS_FOR_SELECTION_START:
      return {
        ...state,
        projectsLoading: true,
        projectsError: null,
      };
    case Actions.estimates.FETCH_PROJECTS_FOR_SELECTION_SUCCESS:
      return {
        ...state,
        projectsForSelection: action.payload,
        projectsLoading: false,
        projectsError: null,
      };
    case Actions.estimates.FETCH_PROJECTS_FOR_SELECTION_ERROR:
      return {
        ...state,
        projectsLoading: false,
        projectsError: action.payload,
      };
      
    // Create project for estimate
    case Actions.estimates.CREATE_PROJECT_START:
      return {
        ...state,
        projectsLoading: true,
        projectsError: null,
      };
    case Actions.estimates.CREATE_PROJECT_SUCCESS:
      return {
        ...state,
        projectsForSelection: [...state.projectsForSelection, action.payload],
        projectsLoading: false,
        projectsError: null,
      };
    case Actions.estimates.CREATE_PROJECT_ERROR:
      return {
        ...state,
        projectsLoading: false,
        projectsError: action.payload,
      };

    default:
      return state;
  }
};
