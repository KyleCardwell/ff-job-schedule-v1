import { lengths } from "../actionTypes";

/**
 * Helper function to organize catalog items by type
 * @param {Array} catalog - Flat array of length items
 * @returns {Object} Organized object with items grouped by type
 */
const organizeCatalogByType = (catalog) => {
  const organized = {
    molding: [],
    base: [],
    shelf: [],
    top: [],
    other: [],
  };

  catalog.forEach((item) => {
    const type = item.type || "other";
    if (organized[type]) {
      organized[type].push(item);
    } else {
      organized.other.push(item);
    }
  });

  return organized;
};

const initialState = {
  catalog: [], // Keep full catalog for reference
  molding: [],
  base: [],
  shelf: [],
  top: [],
  other: [],
  timeAnchors: [],
  loading: false,
  error: null,
};

export const lengthsReducer = (state = initialState, action) => {
  switch (action.type) {
    case lengths.FETCH_LENGTHS_CATALOG_START:
    case lengths.SAVE_LENGTHS_CATALOG_START:
      return {
        ...state,
        loading: true,
        error: null,
      };

    case lengths.FETCH_LENGTHS_CATALOG_ERROR:
    case lengths.SAVE_LENGTHS_CATALOG_ERROR:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    case lengths.FETCH_LENGTHS_CATALOG_SUCCESS: {
      const organized = organizeCatalogByType(action.payload);
      return {
        ...state,
        loading: false,
        catalog: action.payload,
        ...organized,
      };
    }

    case lengths.FETCH_LENGTH_TIME_ANCHORS_START:
      return {
        ...state,
        loading: true,
        error: null,
      };

    case lengths.FETCH_LENGTH_TIME_ANCHORS_SUCCESS:
      return {
        ...state,
        loading: false,
        timeAnchors: action.payload,
      };

    case lengths.FETCH_LENGTH_TIME_ANCHORS_ERROR:
    case lengths.SAVE_LENGTH_TIME_ANCHORS_ERROR:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    case lengths.SAVE_LENGTH_TIME_ANCHORS_SUCCESS:
      return {
        ...state,
        loading: false,
      };

    default:
      return state;
  }
};
