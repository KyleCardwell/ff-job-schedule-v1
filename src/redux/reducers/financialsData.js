import { Actions } from "../actions";

const initialState = {
  taskFinancials: [],
  projectFinancials: [],
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
        taskFinancials: [...state.taskFinancials, ...action.payload],
        error: null,
      };

    case Actions.financialsData.FETCH_TASK_FINANCIALS:
      return {
        ...state,
        taskFinancials: action.payload,
        error: null,
      };

    case Actions.financialsData.FETCH_PROJECT_FINANCIALS:
      return {
        ...state,
        projectFinancials: action.payload,
        error: null,
      };

    default:
      return state;
  }
};
