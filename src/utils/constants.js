export const PATHS = {
  HOME: "/",
  MANAGE: "/manage",
  MANAGE_EMPLOYEES: "/manage/employees",
  MANAGE_CHART: "/manage/chart",
  MANAGE_HOLIDAYS: "/manage/holidays",
  MANAGE_TEAM: "/manage/team",
  MANAGE_SERVICES: "/manage/services",
  MANAGE_CABINET_STYLES: "/manage/cabinet-styles",
  MANAGE_CABINET_TYPES: "/manage/cabinet-types",
  MANAGE_PARTS_LIST: "/manage/parts-list",
  MANAGE_MATERIALS: "/manage/materials",
  MANAGE_FINISHES: "/manage/finishes",
  MANAGE_HARDWARE: "/manage/hardware",
  MANAGE_ACCESSORIES: "/manage/accessories",
  MANAGE_LENGTHS: "/manage/lengths",
  MANAGE_TEAM_ESTIMATE_DEFAULTS: "/manage/estimate-defaults",
  COMPLETED: "/completed",
  COMPLETED_PROJECT: "/completed/:projectId",
  SETTINGS: "/settings",
  LOGOUT: "/logout",
  ESTIMATES: "/estimates",
  NEW_ESTIMATE: "/estimates/new",
  IN_PROGRESS_ESTIMATES: "/estimates/in-progress",
  FINALIZED_ESTIMATES: "/estimates/finalized",
  ESTIMATE_PREVIEW: "/estimates/in-progress/:estimateId/preview",
};

export const ESTIMATE_STATUS = {
  DRAFT: "draft",
  FINALIZED: "finalized",
};

export const SECTION_TYPES = {
  CABINETS: { type: "cabinets", title: "Cabinets" },
  LENGTHS: { type: "lengths", title: "Lengths" },
  ACCESSORIES: { type: "accessories", title: "Accessories" },
  OTHER: { type: "other", title: "Other" },
};

export const ITEM_TYPES = {
  CABINET: { type: "cabinet", title: "Cabinet" },
  FILLER: { type: "filler", title: "Filler" },
  END_PANEL: { type: "end_panel", title: "End Panel" },
  APPLIANCE_PANEL: { type: "appliance_panel", title: "Appliance Panel" },
  DOOR_FRONT: { type: "door_front", title: "Door Front" },
  DRAWER_FRONT: { type: "drawer_front", title: "Drawer Front" },
  HOOD: { type: "hood", title: "Hood" },
  DRAWER_BOX: { type: "drawer_box", title: "Drawer Box" },
  FACE_FRAME: { type: "face_frame", title: "Face Frame" },
};

export const ITEM_FORM_WIDTHS = {
  QUANTITY: "36px",
  DEFAULT: "1fr",
  THREE_FOURTHS: ".75fr",
  ACTIONS: "72px",
};

export const PRE_FINISHED = "Pre-Finished";
export const NONE = "None";
export const NOT_SELECTED = "Not Selected";

export const SPLIT_DIRECTIONS = {
  HORIZONTAL: "horizontal",
  VERTICAL: "vertical",
};
export const FACE_DETAILS = {
  DOOR: { value: "door", label: "Door", color: "#3B82F6" },
  PAIR_DOOR: { value: "pair_door", label: "Pair Door", color: "#8B5CF6" },
  DRAWER_FRONT: {
    value: "drawer_front",
    label: "Drawer Front",
    color: "#06885dff",
  },
  FALSE_FRONT: { value: "false_front", label: "False Front", color: "#a0c312b7" },
  PANEL: { value: "panel", label: "Panel", color: "#6B7280" },
  OPEN: { value: "open", label: "Open", color: "#F59E0B" },
  CONTAINER: { value: "container", label: "Container", color: "#E5E7EB" },
  REVEAL: { value: "reveal", label: "Reveal", color: "#e6e6e6ff" },
  DRAWER_BOX: { value: "drawer_box", label: "Drawer Box", color: "#24ad10ff" },
  ROOT: { value: "root", label: "Root", color: "#e6e6e6ff" },
};

export const FACE_NAMES = {
  DOOR: FACE_DETAILS.DOOR.value,
  PAIR_DOOR: FACE_DETAILS.PAIR_DOOR.value,
  DRAWER_FRONT: FACE_DETAILS.DRAWER_FRONT.value,
  FALSE_FRONT: FACE_DETAILS.FALSE_FRONT.value,
  PANEL: FACE_DETAILS.PANEL.value,
  OPEN: FACE_DETAILS.OPEN.value,
  CONTAINER: FACE_DETAILS.CONTAINER.value,
  REVEAL: FACE_DETAILS.REVEAL.value,
  DRAWER_BOX: FACE_DETAILS.DRAWER_BOX.value,
  ROOT: FACE_DETAILS.ROOT.value,
};

// Default face types for standard cabinets (CABINET FACE DIVIDER)
export const FACE_TYPES = [
  FACE_DETAILS.DOOR,
  FACE_DETAILS.PAIR_DOOR,
  FACE_DETAILS.DRAWER_FRONT,
  FACE_DETAILS.FALSE_FRONT,
  FACE_DETAILS.PANEL,
  FACE_DETAILS.OPEN,
  FACE_DETAILS.CONTAINER,
  FACE_DETAILS.REVEAL,
];

// Face types for door/drawer fronts and end panels (no reveals for door/drawer fronts)
export const PANEL_FACE_TYPES = [
  FACE_DETAILS.PANEL,
];

export const DRAWER_BOX_FACE_TYPES = [
  FACE_DETAILS.DRAWER_BOX,
];

// Face types for drawer fronts (includes reveals)
export const DRAWER_FRONT_FACE_TYPES = [
  FACE_DETAILS.DRAWER_FRONT,
  FACE_DETAILS.FALSE_FRONT,
];

export const DOOR_FRONT_FACE_TYPES = [
  FACE_DETAILS.DOOR,
  FACE_DETAILS.PAIR_DOOR,
];

// Face types for end panels (includes reveals)
export const END_PANEL_FACE_TYPES = [
  FACE_DETAILS.PANEL,
  FACE_DETAILS.REVEAL,
];

// Face types for fillers (just panel, not divisible)
export const FILLER_FACE_TYPES = [
  FACE_DETAILS.PANEL,
];

export const CAN_BE_BEADED = [
  FACE_NAMES.DOOR,
  FACE_NAMES.PAIR_DOOR,
  FACE_NAMES.DRAWER_FRONT,
  FACE_NAMES.FALSE_FRONT,
  FACE_NAMES.PANEL,
  FACE_NAMES.OPEN,
];

// Accessory application contexts (maps to face types that can have accessories)
export const ACCESSORY_APPLIES_TO_OPTIONS = [
  { value: FACE_NAMES.DOOR, label: "Door" },
  { value: FACE_NAMES.PAIR_DOOR, label: "Pair Door" },
  { value: FACE_NAMES.DRAWER_FRONT, label: "Drawer Front" },
  { value: FACE_NAMES.FALSE_FRONT, label: "False Front" },
  { value: FACE_NAMES.PANEL, label: "Panel" },
  { value: FACE_NAMES.OPEN, label: "Opening" },
  // { value: "cabinet", label: "Cabinet (Box)" },
  // { value: "standalone", label: "Standalone" },
];

export const CAN_HAVE_ROLL_OUTS_OR_SHELVES = [
  FACE_NAMES.DOOR,
  FACE_NAMES.PAIR_DOOR,
  FACE_NAMES.DRAWER_FRONT,
  FACE_NAMES.OPEN,
];

export const CAN_HAVE_PULLS = [
  FACE_NAMES.DOOR,
  FACE_NAMES.PAIR_DOOR,
  FACE_NAMES.DRAWER_FRONT,
];

export const DRAWER_BOX_HEIGHTS = [
  2.25, 3.25, 4.25, 5.25, 6.25, 7.25, 8.25, 9.25, 10.25, 11.125, 12.125, 13.125,
  14.125, 15.125,
];

export const DRAWER_BOX_MOD_BY_ID = {
  13: { subtractWidth: 1.875 },
  14: { subtractWidth: 0.5 },
};

// database cabinet types
export const CABINET_TYPES = [1, 2, 3];

// Face style string constants for comparisons (maintainable single source of truth)
export const FACE_STYLE_VALUES = {
  FIVE_PIECE_HARDWOOD: "5_piece_hardwood",
  FIVE_PIECE_HARDWOOD_REEDED: "5_piece_hardwood_reeded",
  SLAB_HARDWOOD: "slab_hardwood",
  SLAB_SHEET: "slab_sheet",
  SLAB_SHEET_REEDED: "slab_sheet_reeded",
};

// Face styles array (works for both UI dropdowns and database)
export const FACE_STYLES = [
  {
    id: FACE_STYLE_VALUES.FIVE_PIECE_HARDWOOD,
    label: "5-Piece Hardwood",
    value: FACE_STYLE_VALUES.FIVE_PIECE_HARDWOOD,
  },
  // { id: FACE_STYLE_VALUES.FIVE_PIECE_HARDWOOD_REEDED, label: "5-Piece Hardwood Reeded", value: FACE_STYLE_VALUES.FIVE_PIECE_HARDWOOD_REEDED },
  {
    id: FACE_STYLE_VALUES.SLAB_HARDWOOD,
    label: "Slab Hardwood",
    value: FACE_STYLE_VALUES.SLAB_HARDWOOD,
  },
  {
    id: FACE_STYLE_VALUES.SLAB_SHEET,
    label: "Slab Sheet",
    value: FACE_STYLE_VALUES.SLAB_SHEET,
  },
  // { id: FACE_STYLE_VALUES.SLAB_SHEET_REEDED, label: "Slab Sheet Reeded", value: FACE_STYLE_VALUES.SLAB_SHEET_REEDED }
];

export const ACCESSORY_TYPES = {
  GLASS: "glass",
  INSERT: "insert",
  HARDWARE: "hardware",
  SHOP_BUILT: "shop_built",
  ORGANIZER: "organizer",
  OTHER: "other",
};

export const ACCESSORY_UNITS = {
  AREA: "area",
  LENGTH: "length",
  PERIMETER: "perimeter",
  VOLUME: "volume",
  UNIT: "unit",
};

export const LENGTH_TYPES = {
  MOLDING: "molding",
  BASE: "base",
  SHELF: "shelf",
  TOP: "top",
  OTHER: "other",
};

/**
 * Map box part types to parts_list IDs based on type and finish status
 * These IDs are fixed and consistent across all teams
 *
 * Note: topBottom, back, and partition parts use side anchor IDs (1 and 6)
 * because those parts are inactive in the database and redirect to side anchors
 *
 * ORIGINAL:
 * side_unfinished: 1,  Box Side Unfinished
 * side_finished: 6,    Box Side Finished
 * topBottom_unfinished: 2, Box Top/Bottom Unfinished
 * topBottom_finished: 7, Box Top/Bottom Finished
 * back_unfinished: 3,  Box Back Unfinished
 * back_finished: 8,    Box Back Finished
 * partition_unfinished: 4, Box Partition Unfinished
 * partition_finished: 9, Box Partition Finished
 */
export const PARTS_LIST_MAPPING = {
  side_unfinished: 1,
  side_finished: 6,
  topBottom_unfinished: 1, // Uses side_unfinished anchors (part ID 2 is inactive)
  topBottom_finished: 6, // Uses side_finished anchors (part ID 7 is inactive)
  back_unfinished: 1, // Uses side_unfinished anchors (part ID 3 is inactive)
  back_finished: 6, // Uses side_finished anchors (part ID 8 is inactive)
  partition_unfinished: 1, // Uses side_unfinished anchors (part ID 4 is inactive)
  partition_finished: 6, // Uses side_finished anchors (part ID 9 is inactive)
  shelf_unfinished: 5,
  shelf_finished: 10,
  filler_finished: 11,
  slab_door_unfinished: 12,
  slab_door_finished: 13,
  "5_piece_door_finished": 14, // 5-piece doors always need finish
  panel_mod_reeded_finished: 15,
  end_panel_finished: 17,
  appliance_panel_finished: 18,
  nosing: 19,
  face_frame_finished: 20,
  hood_finished: 21, // Hood cabinets - includes depth in calculation
  panel_mod_grooved_finished: 22,
};

export const PART_NAMES = {
  NOSING: "nosing",
  SIDE: "side",
  TOP_BOTTOM: "topBottom",
  BACK: "back",
  PARTITION: "partition",
  SHELF: "shelf",
  RIGHT: "right",
  LEFT: "left",
  TOP: "top",
  BOTTOM: "bottom",
};

// Display names for panel mods (used in estimates, PDFs, etc.)
export const PANEL_MOD_DISPLAY_NAMES = {
  15: "Reeded Panels",
  22: "Grooved Panels",
  // Add more panel mods here as needed
};

export const FIXED_AMOUNT = "fixed_amount";

export const EDIT_TYPES = {
  TEAM: "team",
  ESTIMATE: "estimate",
  SECTION: "section",
};
