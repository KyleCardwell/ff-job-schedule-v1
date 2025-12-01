import { finishes } from "../actionTypes";

const initialState = {
  finishes: [],
  loading: false,
  error: null,
};

export const finishesReducer = (state = initialState, action) => {
  switch (action.type) {
    case finishes.FETCH_FINISHES_START:
    case finishes.SAVE_FINISHES_START:
      return {
        ...state,
        loading: true,
        error: null,
      };

    case finishes.FETCH_FINISHES_ERROR:
    case finishes.SAVE_FINISHES_ERROR:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    case finishes.FETCH_FINISHES_SUCCESS:
      return {
        ...state,
        finishes: action.payload,
        loading: false,
        error: null,
      };

    case finishes.SAVE_FINISHES_SUCCESS:
      return {
        ...state,
        loading: false,
        error: null,
      };

    default:
      return state;
  }
};
