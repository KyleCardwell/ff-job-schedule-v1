import { cabinetAnchors as Actions } from '../actionTypes/cabinetAnchors';

const initialState = {
  items: [],
  loading: false,
  error: null,
};

const cabinetAnchorsReducer = (state = initialState, action) => {
  switch (action.type) {
    // Fetch
    case Actions.FETCH_CABINET_ANCHORS_START:
      return { ...state, loading: true, error: null };
    case Actions.FETCH_CABINET_ANCHORS_SUCCESS:
      return { ...state, loading: false, items: action.payload };
    case Actions.FETCH_CABINET_ANCHORS_ERROR:
      return { ...state, loading: false, error: action.payload };

    // Create
    case Actions.CREATE_CABINET_ANCHOR_START:
      return { ...state, loading: true };
    case Actions.CREATE_CABINET_ANCHOR_SUCCESS:
      return { ...state, loading: false, items: [...state.items, action.payload] };
    case Actions.CREATE_CABINET_ANCHOR_ERROR:
      return { ...state, loading: false, error: action.payload };

    // Update
    case Actions.UPDATE_CABINET_ANCHOR_START:
      return { ...state, loading: true };
    case Actions.UPDATE_CABINET_ANCHOR_SUCCESS:
      return {
        ...state,
        loading: false,
        items: state.items.map(item =>
          item.id === action.payload.id ? action.payload : item
        ),
      };
    case Actions.UPDATE_CABINET_ANCHOR_ERROR:
      return { ...state, loading: false, error: action.payload };

    // Delete
    case Actions.DELETE_CABINET_ANCHOR_START:
      return { ...state, loading: true };
    case Actions.DELETE_CABINET_ANCHOR_SUCCESS:
      return {
        ...state,
        loading: false,
        items: state.items.filter(item => item.id !== action.payload),
      };
    case Actions.DELETE_CABINET_ANCHOR_ERROR:
      return { ...state, loading: false, error: action.payload };

    default:
      return state;
  }
};

export default cabinetAnchorsReducer;