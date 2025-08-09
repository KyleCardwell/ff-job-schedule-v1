export const PATHS = {
  HOME: "/",
  MANAGE: "/manage",
  MANAGE_EMPLOYEES: "/manage/employees",
  MANAGE_CHART: "/manage/chart",
  MANAGE_HOLIDAYS: "/manage/holidays",
  MANAGE_TEAM: "/manage/team",
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
  ACTIONS: "72px",
};

export const FACE_TYPES = [
  { value: "door", label: "Door", color: "#3B82F6" },
  { value: "pair_door", label: "Pair Door", color: "#8B5CF6" },
  { value: "drawer_front", label: "Drawer Front", color: "#10B981" },
  { value: "false_front", label: "False Front", color: "#f54d0b" },
  { value: "panel", label: "Panel", color: "#6B7280" },
  { value: "open", label: "Open", color: "#F59E0B" },
  { value: "container", label: "Container", color: "#E5E7EB" },
];

export const CABINET_ANCHORS = {
  Base: [
    {
      width: 18,
      height: 34.5,
      depth: 24,
      shopHours: 0.65,
      installHours: 0.5,
      finishHours: 1.0,
    },
    {
      width: 27,
      height: 34.5,
      depth: 24,
      shopHours: 0.7,
      installHours: 0.55,
      finishHours: 1.2,
    },
    {
      width: 36,
      height: 34.5,
      depth: 24,
      shopHours: 0.75,
      installHours: 0.6,
      finishHours: 1.4,
    },
  ],
  Upper: [
    {
      width: 18,
      height: 30,
      depth: 12,
      shopHours: 0.55,
      installHours: 0.25,
      finishHours: 1.0,
    },
    {
      width: 27,
      height: 30,
      depth: 12,
      shopHours: 0.6,
      installHours: 0.3,
      finishHours: 1.2,
    },
    {
      width: 36,
      height: 30,
      depth: 12,
      shopHours: 0.65,
      installHours: 0.4,
      finishHours: 1.4,
    },
  ],
  Tall: [
    {
      width: 18,
      height: 96,
      depth: 24,
      shopHours: 1.0,
      installHours: 0.6,
      finishHours: 1.2,
    },
    {
      width: 27,
      height: 96,
      depth: 24,
      shopHours: 1.1,
      installHours: 0.7,
      finishHours: 1.4,
    },
    {
      width: 36,
      height: 96,
      depth: 24,
      shopHours: 1.2,
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
      installHours: 0.9,
      finishHours: 1.8,
    },
    {
      width: 27,
      height: 96,
      depth: 12,
      shopHours: 1.65,
      installHours: 1.05,
      finishHours: 2.1,
    },
    {
      width: 36,
      height: 96,
      depth: 12,
      shopHours: 1.8,
      installHours: 1.2,
      finishHours: 2.4,
    },
  ],
};

export const FINISH_ADJUSTMENTS = {
  clearCoat: 1.0,
  stain: 1.0, // baseline
  paint: 1.2, // more labor than stain
  glaze: 1.15,
  dryBrush: 1.25,
  wireBrush: 1.3,
};
