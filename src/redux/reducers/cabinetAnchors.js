import { cabinetAnchors as Actions } from '../actionTypes/cabinetAnchors';

const initialState = {
  itemsByType: {},  
  loading: false,
  error: null,
};

const cabinetAnchorsReducer = (state = initialState, action) => {
  switch (action.type) {
    // Fetch
    case Actions.FETCH_CABINET_ANCHORS_START:
      return { ...state, loading: true, error: null };
    case Actions.FETCH_CABINET_ANCHORS_SUCCESS:
      return { ...state, loading: false, itemsByType: action.payload };
    case Actions.FETCH_CABINET_ANCHORS_ERROR:
      return { ...state, loading: false, error: action.payload };

    // All creations, updates, and deletes are handled by saveCabinetAnchors,
    // which triggers a refetch. We only need a single start/error state for the save operation.
    case Actions.UPDATE_CABINET_ANCHOR_START: // Re-using for generic save start
      return { ...state, loading: true };
    case Actions.UPDATE_CABINET_ANCHOR_ERROR: // Re-using for generic save error
      return { ...state, loading: false, error: action.payload };

    default:
      return state;
  }
};

export default cabinetAnchorsReducer;