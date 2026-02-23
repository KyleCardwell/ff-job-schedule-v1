import { FACE_NAMES, ITEM_TYPES, SPLIT_DIRECTIONS } from "../utils/constants";

const CABINET_TYPE_IDS = {
  BASE: 1,
  UPPER: 2,
  TALL: 3,
};

const STYLE_BASE_DRAWER_HEIGHT = {
  byCabinetStyleId: {
    13: 6,
  },
  default: 5,
};

const B2Dw_ROOT_LAYOUT = {
  direction: SPLIT_DIRECTIONS.VERTICAL,
  children: [
    { type: FACE_NAMES.DRAWER_FRONT },
    { type: FACE_NAMES.DRAWER_FRONT },
  ],
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
      ...B2Dw_ROOT_LAYOUT,
    },
    B2Dw_ROOT_LAYOUT,
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
      key: "3df",
      label: "3Df",
      description: "3-drawer stack",
      cabinetTypeId: [CABINET_TYPE_IDS.BASE],
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
      key: "4df",
      label: "4Df",
      description: "4-drawer stack",
      cabinetTypeId: [CABINET_TYPE_IDS.BASE],
      layout: B4D_ROOT_LAYOUT,
    },
    {
      key: "2d",
      label: "2D",
      description: "2-door stack",
      cabinetTypeId: [
        CABINET_TYPE_IDS.BASE,
        CABINET_TYPE_IDS.UPPER,
        CABINET_TYPE_IDS.TALL,
      ],
      layout: {
        direction: SPLIT_DIRECTIONS.VERTICAL,
        children: [{ type: FACE_NAMES.DOOR }, { type: FACE_NAMES.DOOR }],
      },
    },
    {
      key: "d_ro",
      label: "D/RO",
      description: "Door with 1 rollout",
      cabinetTypeId: [
        CABINET_TYPE_IDS.BASE,
        CABINET_TYPE_IDS.UPPER,
        CABINET_TYPE_IDS.TALL,
      ],
      layout: {
        type: FACE_NAMES.DOOR,
        rollOutQty: 1,
      },
    },
    {
      key: "df_d",
      label: "Df/D",
      description: "Drawer front with door below",
      cabinetTypeId: [CABINET_TYPE_IDS.BASE],
      layout: {
        direction: SPLIT_DIRECTIONS.VERTICAL,
        children: [{ type: FACE_NAMES.DRAWER_FRONT, height: STYLE_BASE_DRAWER_HEIGHT }, { type: FACE_NAMES.DOOR }],
      },
    },
    {
      key: "d_4df",
      label: "D/4Df",
      description: "Top door with 4Df below",
      cabinetTypeId: [CABINET_TYPE_IDS.TALL],
      layout: {
        direction: SPLIT_DIRECTIONS.VERTICAL,
        children: [{ type: FACE_NAMES.DOOR }, B4D_ROOT_LAYOUT],
      },
    },
    {
      key: "pd_o_2df",
      label: "PD/O/2Df",
      description: "Top door with 2Df below",
      cabinetTypeId: [CABINET_TYPE_IDS.TALL],
      layout: {
        direction: SPLIT_DIRECTIONS.VERTICAL,
        children: [
          {
            type: FACE_NAMES.PAIR_DOOR,
            height: {default: 36}
          },
          {
            direction: SPLIT_DIRECTIONS.VERTICAL,
            children: [{ type: FACE_NAMES.OPEN, height: {default: 30} }, B2Dw_ROOT_LAYOUT],
          },
        ],
      },
    },
  ],
};

export const getCabinetFacePresets = (itemType, cabinetTypeId = null) => {
  const presets = CABINET_FACE_PRESETS[itemType] || [];

  if (typeof cabinetTypeId !== "number") {
    return presets;
  }

  return presets.filter((preset) => {
    if (!Array.isArray(preset.cabinetTypeId) || preset.cabinetTypeId.length === 0) {
      return true;
    }

    return preset.cabinetTypeId.includes(cabinetTypeId);
  });
};
