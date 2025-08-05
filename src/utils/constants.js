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
}

export const SECTION_TYPES = {
  CABINETS: {type: "cabinets", title: "Cabinets"},
  LENGTHS: {type: "lengths", title: "Lengths"},
  ACCESSORIES: {type: "accessories", title: "Accessories"},
  OTHER: {type: "other", title: "Other"},
};

export const ITEM_FORM_WIDTHS = {
  QUANTITY: "36px",
  DEFAULT: "1fr",
  ACTIONS: "72px",
};

export const FACE_TYPES = [
  { value: "door", label: "Door", color: "#3B82F6" },
  { value: "pair_door", label: "Pair Door", color: "#8B5CF6" },
  { value: "drawer", label: "Drawer", color: "#10B981" },
  { value: "false_front", label: "False Front", color: "#f54d0b" },
  { value: "panel", label: "Panel", color: "#6B7280" },
  { value: "open", label: "Open", color: "#F59E0B" },
  { value: "container", label: "Container", color: "#E5E7EB" },
];