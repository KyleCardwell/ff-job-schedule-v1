import { Actions } from "../actions";

const initialState = {
  teamMembers: [],
  userRoles: [],
  loading: false,
  error: null,
};

export const teamMembersReducer = (state = initialState, action) => {
  switch (action.type) {
    case Actions.teamMembers.FETCH_TEAM_MEMBERS_START:
      return {
        ...state,
        loading: true,
        error: null,
      };

    case Actions.teamMembers.FETCH_TEAM_MEMBERS_ERROR:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    case Actions.teamMembers.FETCH_TEAM_MEMBERS_SUCCESS:
      return {
        ...state,
        teamMembers: action.payload,
        loading: false,
        error: null,
      };

    case Actions.userRoles.FETCH_USER_ROLES_START:
      return {
        ...state,
        loading: true,
        error: null,
      };

    case Actions.userRoles.FETCH_USER_ROLES_ERROR:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    case Actions.userRoles.FETCH_USER_ROLES_SUCCESS:
      return {
        ...state,
        userRoles: action.payload,
        loading: false,
        error: null,
      };

    default:
      return state;
  }
};
