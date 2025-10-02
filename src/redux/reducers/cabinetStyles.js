import { cabinetStyles } from "../actionTypes";

const initialState = {
  styles: [],
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
      // Payload is now an ARRAY of groups: [{ cabinet_style_id, cabinet_style_name, description, types: [...] }, ...]
      return { ...state, loading: false, styles: action.payload };

    case cabinetStyles.ADD_TEAM_CABINET_STYLE_SUCCESS:
      return { ...state, loading: false };

    case cabinetStyles.UPDATE_TEAM_CABINET_STYLES_SUCCESS: {
      const updatedStylesArray = action.payload; // array of rows from team_cabinet_styles

      // For each group in styles, update its types where there's a matching update
      const newStyles = state.styles.map((group) => {
        const updatesForGroup = updatedStylesArray.filter(
          (u) => u.cabinet_style_id === group.cabinet_style_id
        );
        if (updatesForGroup.length === 0) return group;

        // Create a new types array with merged updates
        const newTypes = group.types.map((type) => {
          const match = updatesForGroup.find(
            (u) => u.id === type.team_cabinet_style_id
          );
          return match ? { ...type, ...match } : type;
        });

        // Get the is_active value from the first update for this group
        // (all updates for a group will have the same is_active value)
        const groupIsActive = updatesForGroup[0]?.is_active;
        
        // Only update is_active if it's defined in the updates
        const updatedGroup = { ...group, types: newTypes };
        if (groupIsActive !== undefined) {
          updatedGroup.is_active = groupIsActive;
        }

        return updatedGroup;
      });

      return { ...state, loading: false, styles: newStyles };
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