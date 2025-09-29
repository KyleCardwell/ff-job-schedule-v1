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

export const CAN_HAVE_ROLL_OUTS_OR_SHELVES = [
  FACE_NAMES.DOOR,
  FACE_NAMES.PAIR_DOOR,
  FACE_NAMES.OPEN,
];

export const DRAWER_BOX_PRICE = 50;
export const ROLL_OUT_PRICE = 60;

export const DRAWER_BOX_HEIGHTS = [
  2.25, 3.25, 4.25, 5.25, 6.25, 7.25, 8.25, 9.25, 10.125, 11.125, 12.125,
  13.125, 14.125, 15.125,
];

export const CABINET_ANCHORS = {
  Base: [
    {
      width: 18,
      height: 30.5,
      depth: 24,
      shopHours: 0.4,
      finShopHours: 0.65,
      installHours: 0.5,
      finishHours: 1.0,
    },
    {
      width: 27,
      height: 30.5,
      depth: 24,
      shopHours: 0.5,
      finShopHours: 0.7,
      installHours: 0.55,
      finishHours: 1.2,
    },
    {
      width: 36,
      height: 30.5,
      depth: 24,
      shopHours: 0.6,
      finShopHours: 0.75,
      installHours: 0.6,
      finishHours: 1.4,
    },
  ],
  Upper: [
    {
      width: 18,
      height: 48,
      depth: 12,
      shopHours: 0.3,
      finShopHours: 0.55,
      installHours: 0.25,
      finishHours: 1.0,
    },
    {
      width: 27,
      height: 48,
      depth: 12,
      shopHours: 0.35,
      finShopHours: 0.6,
      installHours: 0.3,
      finishHours: 1.2,
    },
    {
      width: 36,
      height: 48,
      depth: 12,
      shopHours: 0.4,
      finShopHours: 0.65,
      installHours: 0.4,
      finishHours: 1.4,
    },
  ],
  Tall: [
    {
      width: 18,
      height: 96,
      depth: 24,
      shopHours: 0.5,
      finShopHours: 1.0,
      installHours: 0.6,
      finishHours: 1.2,
    },
    {
      width: 27,
      height: 96,
      depth: 24,
      shopHours: 0.55,
      finShopHours: 1.1,
      installHours: 0.7,
      finishHours: 1.4,
    },
    {
      width: 36,
      height: 96,
      depth: 24,
      shopHours: 0.6,
      finShopHours: 1.2,
      installHours: 0.8,
      finishHours: 1.6,
    },
  ],
  Bookcase: [
    {
      width: 18,
      height: 96,
      depth: 12,
      shopHours: 1.5,
      finShopHours: 1.5,
      installHours: 0.9,
      finishHours: 1.8,
    },
    {
      width: 27,
      height: 96,
      depth: 12,
      shopHours: 1.65,
      finShopHours: 1.65,
      installHours: 1.05,
      finishHours: 2.1,
    },
    {
      width: 36,
      height: 96,
      depth: 12,
      shopHours: 1.8,
      finShopHours: 1.8,
      installHours: 1.2,
      finishHours: 2.4,
    },
  ],
};

export const FACE_REVEALS = {
  euro: {
    top: .125,
    bottom: .125,
    left: .0625,
    right: .0625,
    reveal: .125,
  },
  face_frame: {
    top: 1.5,
    bottom: 1.5,
    left: .75,
    right: .75,
    reveal: 1.5,
  },
};
