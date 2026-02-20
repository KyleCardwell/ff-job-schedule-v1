import { FACE_NAMES, ITEM_TYPES, SPLIT_DIRECTIONS } from "../utils/constants";

const STYLE_BASE_DRAWER_HEIGHT = {
  byCabinetStyleId: {
    13: 6,
  },
  default: 5,
};

const B4D_ROOT_LAYOUT = {
  direction: SPLIT_DIRECTIONS.VERTICAL,
  children: [
    {
      // Exact top drawer heights are style-dependent (6" for style 13, otherwise 5")
      // and include one internal reveal gap between the two top drawers.
      height: {
        ...STYLE_BASE_DRAWER_HEIGHT,
        multiply: 2,
        addRevealGaps: 1,
      },
      direction: SPLIT_DIRECTIONS.VERTICAL,
      children: [
        { type: FACE_NAMES.DRAWER_FRONT },
        { type: FACE_NAMES.DRAWER_FRONT },
      ],
    },
    {
      direction: SPLIT_DIRECTIONS.VERTICAL,
      children: [
        { type: FACE_NAMES.DRAWER_FRONT },
        { type: FACE_NAMES.DRAWER_FRONT },
      ],
    },
  ],
};

/**
 * Preset face layouts by item type.
 *
 * layout format:
 * - leaf node: { type: FACE_NAMES.* }
 * - container: { direction: SPLIT_DIRECTIONS.*, children: [layout, ...] }
 */
export const CABINET_FACE_PRESETS = {
  [ITEM_TYPES.CABINET.type]: [
    {
      key: "b3d",
      label: "B3D",
      description: "3-drawer stack",
      layout: {
        direction: SPLIT_DIRECTIONS.VERTICAL,
        children: [
          {
            type: FACE_NAMES.DRAWER_FRONT,
            height: STYLE_BASE_DRAWER_HEIGHT,
          },
          {
            direction: SPLIT_DIRECTIONS.VERTICAL,
            children: [
              { type: FACE_NAMES.DRAWER_FRONT },
              { type: FACE_NAMES.DRAWER_FRONT },
            ],
          },
        ],
      },
    },
    {
      key: "b4d",
      label: "B4D",
      description: "4-drawer stack",
      layout: B4D_ROOT_LAYOUT,
    },
    {
      key: "2d",
      label: "2D",
      description: "2-door stack",
      layout: {
        direction: SPLIT_DIRECTIONS.VERTICAL,
        children: [
          { type: FACE_NAMES.DOOR },
          { type: FACE_NAMES.DOOR },
        ],
      },
    },
    {
      key: "d_b4d",
      label: "D + B4D",
      description: "Top door with B4D below",
      layout: {
        direction: SPLIT_DIRECTIONS.VERTICAL,
        children: [
          { type: FACE_NAMES.DOOR },
          B4D_ROOT_LAYOUT,
        ],
      },
    },
  ],
};

export const getCabinetFacePresets = (itemType) => {
  return CABINET_FACE_PRESETS[itemType] || [];
};
