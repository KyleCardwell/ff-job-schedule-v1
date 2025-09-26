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
      return {
        ...state,
        loading: false,
        types: [...state.types, action.payload],
      };

    case cabinetTypes.UPDATE_CABINET_TYPE_SUCCESS:
      return {
        ...state,
        loading: false,
        types: state.types.map((type) =>{

          if (type.team_cabinet_type_id === action.payload.id) {
            return {...type,
              default_width: action.payload.default_width,
              default_height: action.payload.default_height,
              default_depth: action.payload.default_depth,
            };
          } else {
            return type;
          }
        }
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
