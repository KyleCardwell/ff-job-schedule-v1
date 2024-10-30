import { Actions } from '../actions';

const initialState = {
  data: null,
  loading: false,
  error: null
};

export const projectsReducer = (state = initialState, action) => {
  switch (action.type) {
    case Actions.projects.FETCH_PROJECTS_START:
      return {
        ...state,
        loading: true,
        error: null
      };
    case Actions.projects.FETCH_PROJECTS_SUCCESS:
      return {
        ...state,
        loading: false,
        data: action.payload
      };
    case Actions.projects.FETCH_PROJECTS_ERROR:
      return {
        ...state,
        loading: false,
        error: action.payload
      };
    default:
      return state;
  }
};