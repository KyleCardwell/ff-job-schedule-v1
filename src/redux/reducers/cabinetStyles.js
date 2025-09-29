import { cabinetStyles } from "../actionTypes";

const initialState = {
  styles: {},
  loading: false,
  error: null,
};

const cabinetStylesReducer = (state = initialState, action) => {
  switch (action.type) {
    case cabinetStyles.FETCH_TEAM_CABINET_STYLES_START:
    case cabinetStyles.ADD_TEAM_CABINET_STYLE_START:
    case cabinetStyles.UPDATE_TEAM_CABINET_STYLES_START:
      return { ...state, loading: true, error: null };

    case cabinetStyles.FETCH_TEAM_CABINET_STYLES_SUCCESS:
      return { ...state, loading: false, styles: action.payload };

    case cabinetStyles.ADD_TEAM_CABINET_STYLE_SUCCESS:
      // This case might need adjustment depending on how single additions are handled.
      // For now, assuming it might not be used with the new grouped structure.
      return {
        ...state,
        loading: false,
      };

    case cabinetStyles.UPDATE_TEAM_CABINET_STYLES_SUCCESS: {
      const updatedStylesArray = action.payload;
      // Create a shallow copy of the styles object to avoid direct mutation
      const newStyles = { ...state.styles };

      updatedStylesArray.forEach((updatedStyle) => {
        const { cabinet_style_id } = updatedStyle;
        const styleGroup = newStyles[cabinet_style_id];

        if (styleGroup) {
          const typeIndex = styleGroup.types.findIndex(
            (t) => t.team_cabinet_style_id === updatedStyle.id
          );

          if (typeIndex !== -1) {
            // Create a new 'types' array using .map() to ensure immutability
            const newTypes = styleGroup.types.map((type, index) => {
              if (index === typeIndex) {
                // For the item to be updated, return a new object with merged properties
                return { ...type, ...updatedStyle };
              }
              // For all other items, return the original object
              return type;
            });

            // Replace the old style group with a new one containing the new 'types' array
            newStyles[cabinet_style_id] = {
              ...styleGroup,
              types: newTypes,
            };
          }
        }
      });

      return {
        ...state,
        loading: false,
        styles: newStyles,
      };
    }

    case cabinetStyles.FETCH_TEAM_CABINET_STYLES_ERROR:
    case cabinetStyles.ADD_TEAM_CABINET_STYLE_ERROR:
    case cabinetStyles.UPDATE_TEAM_CABINET_STYLES_ERROR:
      return { ...state, loading: false, error: action.payload };

    default:
      return state;
  }
};

export default cabinetStylesReducer;