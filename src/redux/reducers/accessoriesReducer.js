import { accessories } from "../actionTypes";

/**
 * Helper function to organize catalog items by type
 * @param {Array} catalog - Flat array of accessory items
 * @returns {Object} Organized object with items grouped by type
 */
const organizeCatalogByType = (catalog) => {
  const organized = {
    glass: [],
    insert: [],
    hardware: [],
    rod: [],
    organizer: [],
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
  glass: [],
  insert: [],
  hardware: [],
  rod: [],
  organizer: [],
  other: [],
  timeAnchors: [],
  loading: false,
  error: null,
};

export const accessoriesReducer = (state = initialState, action) => {
  switch (action.type) {
    case accessories.FETCH_ACCESSORIES_CATALOG_START:
    case accessories.SAVE_ACCESSORIES_CATALOG_START:
      return {
        ...state,
        loading: true,
        error: null,
      };

    case accessories.FETCH_ACCESSORIES_CATALOG_ERROR:
    case accessories.SAVE_ACCESSORIES_CATALOG_ERROR:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    case accessories.FETCH_ACCESSORIES_CATALOG_SUCCESS: {
      const organized = organizeCatalogByType(action.payload);
      return {
        ...state,
        loading: false,
        catalog: action.payload,
        ...organized,
      };
    }

    case accessories.FETCH_ACCESSORY_TIME_ANCHORS_START:
      return {
        ...state,
        loading: true,
        error: null,
      };

    case accessories.FETCH_ACCESSORY_TIME_ANCHORS_SUCCESS:
      return {
        ...state,
        loading: false,
        timeAnchors: action.payload,
      };

    case accessories.FETCH_ACCESSORY_TIME_ANCHORS_ERROR:
    case accessories.SAVE_ACCESSORY_TIME_ANCHORS_ERROR:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    case accessories.SAVE_ACCESSORY_TIME_ANCHORS_SUCCESS:
      return {
        ...state,
        loading: false,
      };

    default:
      return state;
  }
};
