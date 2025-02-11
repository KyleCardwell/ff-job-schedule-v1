import { Actions } from "../actions";

const initialState = {
  financials: [],
  loading: false,
  error: null,
};

export const financialsDataReducer = (state = initialState, action) => {
  switch (action.type) {
    case Actions.financialsData.SET_FINANCIALS_DATA_LOADING:
      return {
        ...state,
        loading: action.payload,
      };

    case Actions.financialsData.SET_FINANCIALS_DATA_ERROR:
      return {
        ...state,
        error: action.payload,
      };

    case Actions.financialsData.CREATE_PROJECT_FINANCIALS:
      return {
        ...state,
        financials: [...state.financials, ...action.payload],
        error: null,
      };

    case Actions.financialsData.FETCH_PROJECT_FINANCIALS:
      return {
        ...state,
        financials: action.payload,
        error: null,
      };

    default:
      return state;
  }
}