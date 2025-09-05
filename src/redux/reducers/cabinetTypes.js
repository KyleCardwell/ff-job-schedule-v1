import { cabinetTypes } from "../actionTypes";

const initialState = {
  types: [],
  loading: false,
  error: null,
};

const cabinetTypesReducer = (state = initialState, action) => {
  switch (action.type) {
    case cabinetTypes.FETCH_CABINET_TYPES_START:
    case cabinetTypes.ADD_CABINET_TYPE_START:
    case cabinetTypes.UPDATE_CABINET_TYPE_START:
      return { ...state, loading: true, error: null };

    case cabinetTypes.FETCH_CABINET_TYPES_SUCCESS:
      return { ...state, loading: false, types: action.payload };

    case cabinetTypes.ADD_CABINET_TYPE_SUCCESS:
      return { ...state, loading: false, types: [...state.types, action.payload] };

    case cabinetTypes.UPDATE_CABINET_TYPE_SUCCESS:
      return {
        ...state,
        loading: false,
        types: state.types.map((type) =>
          type.id === action.payload.id ? action.payload : type
        ),
      };

    case cabinetTypes.FETCH_CABINET_TYPES_ERROR:
    case cabinetTypes.ADD_CABINET_TYPE_ERROR:
    case cabinetTypes.UPDATE_CABINET_TYPE_ERROR:
      return { ...state, loading: false, error: action.payload };

    default:
      return state;
  }
};

export default cabinetTypesReducer;