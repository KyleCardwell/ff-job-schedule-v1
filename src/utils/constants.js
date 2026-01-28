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
};

export const ITEM_FORM_WIDTHS = {
  QUANTITY: "36px",
  DEFAULT: "1fr",
  THREE_FOURTHS: ".75fr",
  ACTIONS: "72px",
};

export const SPLIT_DIRECTIONS = {
  HORIZONTAL: "horizontal",
  VERTICAL: "vertical",
};

export const FACE_NAMES = {
  DOOR: "door",
  PAIR_DOOR: "pair_door",
  DRAWER_FRONT: "drawer_front",
  FALSE_FRONT: "false_front",
  PANEL: "panel",
  OPEN: "open",
  CONTAINER: "container",
  REVEAL: "reveal",
  ROOT: "root",
};

// Default face types for standard cabinets
export const FACE_TYPES = [
  { value: FACE_NAMES.DOOR, label: "Door", color: "#3B82F6" },
  { value: FACE_NAMES.PAIR_DOOR, label: "Pair Door", color: "#8B5CF6" },
  { value: FACE_NAMES.DRAWER_FRONT, label: "Drawer Front", color: "#10B981" },
  { value: FACE_NAMES.FALSE_FRONT, label: "False Front", color: "#f54d0b" },
  { value: FACE_NAMES.PANEL, label: "Panel", color: "#6B7280" },
  { value: FACE_NAMES.OPEN, label: "Open", color: "#F59E0B" },
  { value: FACE_NAMES.CONTAINER, label: "Container", color: "#E5E7EB" },
  { value: FACE_NAMES.REVEAL, label: "", color: "#E5E7EB" },
];

// Face types for door/drawer fronts and end panels (no reveals for door/drawer fronts)
export const PANEL_FACE_TYPES = [
  { value: FACE_NAMES.PANEL, label: "Panel", color: "#6B7280" },
];

// Face types for drawer fronts (includes reveals)
export const DRAWER_FRONT_FACE_TYPES = [
  { value: FACE_NAMES.DRAWER_FRONT, label: "Drawer Front", color: "#10B981" },
  { value: FACE_NAMES.FALSE_FRONT, label: "False Front", color: "#f54d0b" },
];

export const DOOR_FRONT_FACE_TYPES = [
  { value: FACE_NAMES.DOOR, label: "Door", color: "#3B82F6" },
  { value: FACE_NAMES.PAIR_DOOR, label: "Pair Door", color: "#8B5CF6" },
];

// Face types for end panels (includes reveals)
export const END_PANEL_FACE_TYPES = [
  { value: FACE_NAMES.PANEL, label: "Panel", color: "#6B7280" },
  { value: FACE_NAMES.REVEAL, label: "", color: "#E5E7EB" },
];

// Face types for fillers (just panel, not divisible)
export const FILLER_FACE_TYPES = [
  { value: FACE_NAMES.PANEL, label: "Panel", color: "#6B7280" },
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
export const CABINET_TYPES = [1, 2, 3]

// Face style string constants for comparisons (maintainable single source of truth)
export const FACE_STYLE_VALUES = {
  FIVE_PIECE_HARDWOOD: "5_piece_hardwood",
  FIVE_PIECE_HARDWOOD_REEDED: "5_piece_hardwood_reeded",
  SLAB_HARDWOOD: "slab_hardwood",
  SLAB_SHEET: "slab_sheet",
  SLAB_SHEET_REEDED: "slab_sheet_reeded"
};

// Face styles array (works for both UI dropdowns and database)
export const FACE_STYLES = [
  { id: FACE_STYLE_VALUES.FIVE_PIECE_HARDWOOD, label: "5-Piece Hardwood", value: FACE_STYLE_VALUES.FIVE_PIECE_HARDWOOD },
  // { id: FACE_STYLE_VALUES.FIVE_PIECE_HARDWOOD_REEDED, label: "5-Piece Hardwood Reeded", value: FACE_STYLE_VALUES.FIVE_PIECE_HARDWOOD_REEDED },
  { id: FACE_STYLE_VALUES.SLAB_HARDWOOD, label: "Slab Hardwood", value: FACE_STYLE_VALUES.SLAB_HARDWOOD },
  { id: FACE_STYLE_VALUES.SLAB_SHEET, label: "Slab Sheet", value: FACE_STYLE_VALUES.SLAB_SHEET },
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
 */
export const PARTS_LIST_MAPPING = {
  side_unfinished: 1,
  side_finished: 6,
  topBottom_unfinished: 2,
  topBottom_finished: 7,
  back_unfinished: 3,
  back_finished: 8,
  partition_unfinished: 4,
  partition_finished: 9,
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
}

// Display names for panel mods (used in estimates, PDFs, etc.)
export const PANEL_MOD_DISPLAY_NAMES = {
  15: "Reeded Panels",
  22: "Grooved Panels",
  // Add more panel mods here as needed
};
  
export const FIXED_AMOUNT = 'fixed_amount';

export const EDIT_TYPES = {
  TEAM: "team",
  ESTIMATE: "estimate",
  SECTION: "section",
};