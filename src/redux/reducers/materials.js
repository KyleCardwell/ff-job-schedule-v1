import { Actions } from "../actions";

const initialState = {
  boxMaterials: [],
  faceMaterials: [],
  loading: false,
  error: null,
};

export const materialsReducer = (state = initialState, action) => {
  switch (action.type) {
    case Actions.materials.FETCH_MATERIALS_START:
      return {
        ...state,
        loading: true,
        error: null,
      };

    case Actions.materials.FETCH_MATERIALS_ERROR:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    case Actions.materials.FETCH_SHEET_GOODS_SUCCESS: {
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

    default:
      return state;
  }
};
