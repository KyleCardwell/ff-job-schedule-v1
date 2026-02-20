import { FACE_NAMES, ITEM_TYPES, SPLIT_DIRECTIONS } from "../utils/constants";

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
          { type: FACE_NAMES.DRAWER_FRONT },
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
      layout: {
        direction: SPLIT_DIRECTIONS.VERTICAL,
        children: [
          {
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
      },
    },
  ],
};

export const getCabinetFacePresets = (itemType) => {
  return CABINET_FACE_PRESETS[itemType] || [];
};
