import { partsList } from "../actionTypes/partsList";

const initialState = {
  items: [],
  loading: false,
  error: null,
};

const partsListReducer = (state = initialState, action) => {
  switch (action.type) {
    case partsList.FETCH_PARTS_LIST_START:
      return { ...state, loading: true, error: null };

    case partsList.FETCH_PARTS_LIST_SUCCESS:
      return { ...state, loading: false, items: action.payload };

    case partsList.FETCH_PARTS_LIST_ERROR:
      return { ...state, loading: false, error: action.payload };

    default:
      return state;
  }
};

export default partsListReducer;
