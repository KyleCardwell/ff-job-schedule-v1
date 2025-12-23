import { Actions } from "../actions";

const initialState = {
  teamData: null,
  loading: false,
  error: null,
  uploadingLogo: false,
};

export const teamsReducer = (state = initialState, action) => {
  switch (action.type) {
    case Actions.teams.FETCH_TEAM_DATA_START:
      return {
        ...state,
        loading: true,
        error: null,
      };

    case Actions.teams.FETCH_TEAM_DATA_SUCCESS:
      return {
        ...state,
        teamData: action.payload,
        loading: false,
        error: null,
      };

    case Actions.teams.FETCH_TEAM_DATA_ERROR:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    case Actions.teams.UPDATE_TEAM_CONTACT_INFO_START:
      return {
        ...state,
        loading: true,
        error: null,
      };

    case Actions.teams.UPDATE_TEAM_CONTACT_INFO_SUCCESS:
      return {
        ...state,
        teamData: { ...state.teamData, ...action.payload },
        loading: false,
        error: null,
      };

    case Actions.teams.UPDATE_TEAM_CONTACT_INFO_ERROR:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    case Actions.teams.UPLOAD_TEAM_LOGO_START:
      return {
        ...state,
        uploadingLogo: true,
        error: null,
      };

    case Actions.teams.UPLOAD_TEAM_LOGO_SUCCESS:
      return {
        ...state,
        teamData: { ...state.teamData, logo_path: action.payload },
        uploadingLogo: false,
        error: null,
      };

    case Actions.teams.UPLOAD_TEAM_LOGO_ERROR:
      return {
        ...state,
        uploadingLogo: false,
        error: action.payload,
      };

    case Actions.teams.UPDATE_TEAM_LOGO_PATH_SUCCESS:
      return {
        ...state,
        teamData: { ...state.teamData, logo_path: action.payload.logo_path },
      };

    case Actions.teams.DELETE_TEAM_LOGO_SUCCESS:
      return {
        ...state,
        teamData: { ...state.teamData, logo_path: null },
      };

    default:
      return state;
  }
};
