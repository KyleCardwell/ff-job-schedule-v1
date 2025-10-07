import { hardware } from "../actionTypes";

const initialState = {
  hinges: [],
  pulls: [],
  slides: [],
  loading: false,
  error: null,
};

export const hardwareReducer = (state = initialState, action) => {
  switch (action.type) {
    case hardware.FETCH_HARDWARE_START:
    case hardware.SAVE_HARDWARE_START:
      return {
        ...state,
        loading: true,
        error: null,
      };

    case hardware.FETCH_HARDWARE_ERROR:
    case hardware.SAVE_HARDWARE_ERROR:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    case hardware.FETCH_HINGES_SUCCESS:
      return {
        ...state,
        hinges: action.payload,
        loading: false,
        error: null,
      };

    case hardware.FETCH_PULLS_SUCCESS:
      return {
        ...state,
        pulls: action.payload,
        loading: false,
        error: null,
      };

    case hardware.FETCH_SLIDES_SUCCESS:
      return {
        ...state,
        slides: action.payload,
        loading: false,
        error: null,
      };

    default:
      return state;
  }
};
