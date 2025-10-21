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
  MANAGE_HARDWARE: "/manage/hardware",
  COMPLETED: "/completed",
  COMPLETED_PROJECT: "/completed/:projectId",
  SETTINGS: "/settings",
  LOGOUT: "/logout",
  ESTIMATES: "/estimates",
  NEW_ESTIMATE: "/estimates/new",
  IN_PROGRESS_ESTIMATES: "/estimates/in-progress",
  FINALIZED_ESTIMATES: "/estimates/finalized",
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
