import { partsListAnchors as Actions } from '../actionTypes/partsListAnchors';

const initialState = {
  itemsByPartsList: {},  
  loading: false,
  error: null,
};

const partsListAnchorsReducer = (state = initialState, action) => {
  switch (action.type) {
    // Fetch
    case Actions.FETCH_PARTS_LIST_ANCHORS_START:
      return { ...state, loading: true, error: null };
    case Actions.FETCH_PARTS_LIST_ANCHORS_SUCCESS:
      return { ...state, loading: false, itemsByPartsList: action.payload };
    case Actions.FETCH_PARTS_LIST_ANCHORS_ERROR:
      return { ...state, loading: false, error: action.payload };

    // All creations, updates, and deletes are handled by savePartsListAnchors,
    // which triggers a refetch. We only need a single start/error state for the save operation.
    case Actions.UPDATE_PARTS_LIST_ANCHOR_START: // Re-using for generic save start
      return { ...state, loading: true };
    case Actions.UPDATE_PARTS_LIST_ANCHOR_ERROR: // Re-using for generic save error
      return { ...state, loading: false, error: action.payload };

    default:
      return state;
  }
};

export default partsListAnchorsReducer;
