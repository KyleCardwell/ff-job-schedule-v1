import { materials } from "../actionTypes";

const initialState = {
  boxMaterials: [],
  faceMaterials: [],
  drawerBoxMaterials: [], 
  loading: false,
  error: null,
};

export const materialsReducer = (state = initialState, action) => {
  switch (action.type) {
    case materials.FETCH_MATERIALS_START:
      case materials.SAVE_MATERIALS_START:
      return {
        ...state,
        loading: true,
        error: null,
      };

    case materials.FETCH_MATERIALS_ERROR:
    case materials.SAVE_MATERIALS_ERROR:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    case materials.FETCH_SHEET_GOODS_SUCCESS: {
      // Process the sheet goods into separate arrays for box and face materials
      const boxMaterials = action.payload
        .filter(material => material.box_mat)
        .map(material => {
          const { box_mat, face_mat, ...rest } = material;
          return rest;
        });

      const faceMaterials = action.payload
        .filter(material => material.face_mat)
        .map(material => {
          const { box_mat, face_mat, ...rest } = material;
          return rest;
        });

      return {
        ...state,
        boxMaterials,
        faceMaterials,
        loading: false,
        error: null,
      };
    }

    case materials.FETCH_DRAWER_BOX_MATERIALS_SUCCESS: {
      return {
        ...state,
        drawerBoxMaterials: action.payload,
        loading: false,
        error: null,
      };
    }

    default:
      return state;
  }
};
