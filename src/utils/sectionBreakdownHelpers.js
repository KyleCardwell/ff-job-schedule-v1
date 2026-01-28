import { roundToHundredth } from "./estimateHelpers";

/**
 * Format currency value
 */
export const formatCurrency = (value) => {
  return `$${roundToHundredth(parseFloat(value || 0)).toLocaleString()}`;
};

/**
 * Format hours value
 */
export const formatHours = (hours) => {
  if (!hours || hours === 0) return "-";
  return Number(hours.toFixed(2));
};

/**
 * Helper to show aggregated hours note
 */
export const getHoursDisplay = (hoursByService, showAggregateNote = false) => {
  if (!hoursByService || Object.keys(hoursByService).length === 0) return null;
  return { hoursByService, showAggregateNote };
};

/**
 * Get breakdown categories configuration
 */
export const getBreakdownCategories = (sectionCalculations) => [
  {
    title: "Cabinet Boxes",
    cost: sectionCalculations?.boxTotal || 0,
    count: sectionCalculations?.boxCount || 0,
    unit: "boxes",
    ...getHoursDisplay(sectionCalculations?.categoryHours?.boxes),
  },
  {
    title: "Doors",
    cost: sectionCalculations?.facePrices?.door || 0,
    count: sectionCalculations?.faceCounts?.door || 0,
    unit: "doors",
    ...getHoursDisplay(sectionCalculations?.categoryHours?.door),
  },
  {
    title: "Drawer Fronts",
    cost: sectionCalculations?.facePrices?.drawer_front || 0,
    count: sectionCalculations?.faceCounts?.drawer_front || 0,
    unit: "fronts",
    ...getHoursDisplay(sectionCalculations?.categoryHours?.drawer_front),
  },
  {
    title: "False Fronts",
    cost: sectionCalculations?.facePrices?.false_front || 0,
    count: sectionCalculations?.faceCounts?.false_front || 0,
    unit: "fronts",
    ...getHoursDisplay(sectionCalculations?.categoryHours?.false_front),
  },
  {
    title: "Panels",
    cost: sectionCalculations?.facePrices?.panel || 0,
    count: sectionCalculations?.faceCounts?.panel || 0,
    unit: "panels",
    ...getHoursDisplay(sectionCalculations?.categoryHours?.panel),
  },
  {
    title: "Hood",
    cost: 0,
    count: sectionCalculations?.hoodCount || 0,
    unit: "hoods",
    ...getHoursDisplay(sectionCalculations?.categoryHours?.hood),
  },
  {
    title: "Drawer Boxes",
    cost: sectionCalculations?.drawerBoxTotal || 0,
    count: sectionCalculations?.drawerBoxCount || 0,
    unit: "boxes",
    skipHours: true,
  },
  {
    title: "Rollouts",
    cost: sectionCalculations?.rollOutTotal || 0,
    count: sectionCalculations?.rollOutCount || 0,
    unit: "rollouts",
    skipHours: true,
  },
  {
    title: "Hinges",
    cost: sectionCalculations?.hingesTotal || 0,
    count: sectionCalculations?.hingesCount || 0,
    unit: "hinges",
    ...getHoursDisplay(sectionCalculations?.categoryHours?.hinges),
  },
  {
    title: "Drawer Slides",
    cost: sectionCalculations?.slidesTotal || 0,
    count: sectionCalculations?.slidesCount || 0,
    unit: "slides",
    ...getHoursDisplay(sectionCalculations?.categoryHours?.slides),
  },
  {
    title: "Pulls",
    cost: sectionCalculations?.pullsTotal || 0,
    count: sectionCalculations?.pullsCount || 0,
    unit: "pulls",
    ...getHoursDisplay(sectionCalculations?.categoryHours?.pulls),
  },
  {
    title: "Face Frame",
    cost: sectionCalculations?.faceFrameWoodTotal || 0,
    count: roundToHundredth(sectionCalculations?.faceFrameWoodCount) || 0,
    unit: "bd ft",
    ...getHoursDisplay(sectionCalculations?.categoryHours?.faceFrame),
  },
  {
    title: "Fillers",
    cost: sectionCalculations?.fillerWoodTotal || 0,
    count: roundToHundredth(sectionCalculations?.fillerWoodCount) || 0,
    unit: "bd ft",
    ...getHoursDisplay(sectionCalculations?.categoryHours?.fillers),
  },
  {
    title: "Panel Mods",
    cost: 0,
    count: 0,
    unit: "",
    ...getHoursDisplay(sectionCalculations?.categoryHours?.panelMods),
  },
  {
    title: "Lengths",
    cost: sectionCalculations?.lengthsTotal || 0,
    count: roundToHundredth(sectionCalculations?.lengthsCount) || 0,
    unit: "items",
    ...getHoursDisplay(sectionCalculations?.categoryHours?.lengths),
  },
  {
    title: "Accessories",
    cost: sectionCalculations?.accessoriesTotal || 0,
    count: sectionCalculations?.accessoriesCount || 0,
    unit: "items",
    ...getHoursDisplay(sectionCalculations?.categoryHours?.accessories),
  },
  {
    title: "Other",
    cost: sectionCalculations?.otherTotal || 0,
    count: sectionCalculations?.otherCount || 0,
    unit: "items",
    skipHours: true,
  },
  {
    title: "Nosing",
    cost: sectionCalculations?.endPanelNosingWoodTotal || 0,
    count: roundToHundredth(sectionCalculations?.endPanelNosingWoodCount) || 0,
    unit: "bd ft",
    ...getHoursDisplay(sectionCalculations?.categoryHours?.nosing),
  },
];

/**
 * Get service name from allServices array by service_id
 */
export const getServiceName = (serviceId, allServices) => {
  if (!allServices || allServices.length === 0) {
    return `Service ${serviceId}`;
  }

  const service = allServices.find((s) => s.service_id === serviceId);
  return service?.service_name || `Service ${serviceId}`;
};

/**
 * Get labor adjustment hours from section.add_hours
 * Returns hoursByService object with setup_hours added to service_id 4 (Install)
 */
export const getLaborAdjustmentHours = (addHours) => {
  if (!addHours || typeof addHours !== "object") {
    return null;
  }

  const hoursByService = {};
  let hasAnyHours = false;

  // Process service-specific hours (excluding setup_hours)
  Object.entries(addHours).forEach(([key, hours]) => {
    if (key === "setup_hours") return;

    const serviceId = parseInt(key);
    const numericHours = parseFloat(hours) || 0;

    if (numericHours > 0) {
      hoursByService[serviceId] = numericHours;
      hasAnyHours = true;
    }
  });

  // Add setup_hours to service_id 4 (Install)
  const setupHours = parseFloat(addHours.setup_hours) || 0;
  if (setupHours > 0) {
    if (!hoursByService[4]) {
      hoursByService[4] = 0;
    }
    hoursByService[4] += setupHours;
    hasAnyHours = true;
  }

  return hasAnyHours ? hoursByService : null;
};
