import { MaxRectsPacker } from "maxrects-packer";

import { CABINET_TYPES } from "./constants";

export const roundToHundredth = (num) => Math.round(num * 100) / 100;

/**
 * Map box part types to parts_list IDs based on type and finish status
 * These IDs are fixed and consistent across all teams
 */
const PARTS_LIST_MAPPING = {
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
};

/**
 * Get parts_list_id for a box part based on its type and finish status
 */
const getPartsListId = (partType, isFinished) => {
  const key = `${partType}_${isFinished ? "finished" : "unfinished"}`;
  return PARTS_LIST_MAPPING[key];
};

/**
 * Generic interpolation function for calculating time based on area
 * @param {Array} anchors - Array of anchor objects with dimensions and services
 * @param {number} targetArea - The area to interpolate for (width × height)
 * @param {number} teamServiceId - The service ID to get time for
 * @param {number} cabinetStyleId - Optional cabinet style ID for filtering (null = applies to all)
 * @returns {number} - Interpolated time in minutes
 */
export const interpolateTimeByArea = (anchors, targetArea, teamServiceId, cabinetStyleId = null) => {
  if (!anchors || anchors.length === 0) {
    return 0;
  }

  // Filter anchors by cabinet_style_id
  // Include anchors where cabinet_style_id is null (applies to all) OR matches the target style
  const filteredAnchors = anchors.filter((anchor) => {
    return anchor.cabinet_style_id === null || anchor.cabinet_style_id == cabinetStyleId;
  });

  if (filteredAnchors.length === 0) {
    return 0;
  }

  // Build array of {area, minutes} for this service, filtering out missing services
  const dataPoints = filteredAnchors
    .map((anchor) => {
      const service = anchor.services.find(
        (s) => s.team_service_id === teamServiceId
      );
      if (!service) return null;

      const area = anchor.width * anchor.height;
      return {
        area,
        minutes: service.minutes || 0,
      };
    })
    .filter(Boolean);

  if (dataPoints.length === 0) {
    return 0;
  }

  // Sort by area for interpolation
  dataPoints.sort((a, b) => a.area - b.area);

  // If only one data point, return its value
  if (dataPoints.length === 1) {
    return dataPoints[0].minutes;
  }

  // If target is below minimum, return minimum value
  if (targetArea <= dataPoints[0].area) {
    return dataPoints[0].minutes;
  }

  // If target is above maximum, return maximum value
  // if (targetArea >= dataPoints[dataPoints.length - 1].area) {
  //   return dataPoints[dataPoints.length - 1].minutes;
  // }

  // Find the two points to interpolate between
  for (let i = 0; i < dataPoints.length - 1; i++) {
    const lower = dataPoints[i];
    const upper = dataPoints[i + 1];

    if (targetArea >= lower.area && targetArea <= upper.area) {
      // Avoid division by zero
      if (upper.area - lower.area === 0) {
        return lower.minutes;
      }

      // Linear interpolation: minutes = m1 + (m2 - m1) * (area - a1) / (a2 - a1)
      const ratio = (targetArea - lower.area) / (upper.area - lower.area);
      const interpolatedMinutes =
        lower.minutes + ratio * (upper.minutes - lower.minutes);

      return roundToHundredth(interpolatedMinutes);
    }
  }

  // Fallback (shouldn't reach here with proper sorting)
  return dataPoints[dataPoints.length - 1].minutes;
};

/**
 * Calculate total hours by service for a list of box parts (single cabinet)
 * @param {Array} boxPartsList - Array of box part objects from calculateBoxSummary
 * @param {Object} context - Calculation context
 * @param {Object} context.partsListAnchors - Redux state.partsListAnchors.itemsByPartsList
 * @param {Object} context.selectedBoxMaterial - Selected box material with multipliers
 * @param {Object} context.selectedFaceMaterial - Selected face material with multipliers
 * @param {Array} context.globalServices - Global services array
 * @returns {Object} - { serviceId: hours }
 */
const calculatePartsTimeForCabinet = (boxPartsList, context = {}) => {
  const { partsListAnchors, selectedBoxMaterial, selectedFaceMaterial, globalServices } = context;
  
  if (!boxPartsList || boxPartsList.length === 0 || !partsListAnchors) {
    return {};
  }

  // Collect all unique service IDs across all parts
  const allServiceIds = new Set();
  Object.values(partsListAnchors).forEach((anchors) => {
    anchors.forEach((anchor) => {
      anchor.services.forEach((service) => {
        allServiceIds.add(service.team_service_id);
      });
    });
  });

  const hoursByService = {};

  // Initialize all services to 0
  allServiceIds.forEach((serviceId) => {
    hoursByService[serviceId] = 0;
  });

  // Process each part
  boxPartsList.forEach((part) => {
    const partsListId = getPartsListId(part.type, part.finish);

    if (!partsListId) {
      return;
    }

    const anchors = partsListAnchors[partsListId];

    if (!anchors || anchors.length === 0) {
      // No anchors for this part type - skip it
      return;
    }

    const area = part.width * part.height;
    const quantity = part.quantity || 1;

    // Determine which material this part uses based on finish boolean
    const partMaterial = part.finish ? selectedFaceMaterial : selectedBoxMaterial;

    // Calculate time for each service
    allServiceIds.forEach((teamServiceId) => {
      // Box parts don't have style-specific anchors, pass null for cabinetStyleId
      const minutesEach = interpolateTimeByArea(anchors, area, teamServiceId, null);
      let totalMinutes = minutesEach * quantity;

      // Apply multipliers based on service and material
      if (partMaterial?.material?.needs_finish && globalServices) {
        const service = globalServices.find((s) => s.team_service_id === parseInt(teamServiceId));
        if (service) {
          if (service.service_id === 2 && partMaterial.shopMultiplier) {
            // Shop multiplier for service ID 2
            totalMinutes *= partMaterial.shopMultiplier;
          } else if (service.service_id === 3 && partMaterial.finishMultiplier) {
            // Finish multiplier for service ID 3
            totalMinutes *= partMaterial.finishMultiplier;
          }
        }
      }

      hoursByService[teamServiceId] += totalMinutes;
    });
  });

  // Convert minutes to hours for final output
  Object.keys(hoursByService).forEach((serviceId) => {
    hoursByService[serviceId] = roundToHundredth(
      hoursByService[serviceId] / 60
    );
  });

  return hoursByService;
};

/**
 * Calculate total hours by service for all cabinets in a section
 * This replaces the old getCabinetHours function
 * @param {Object} section - Section object with cabinets array
 * @param {Object} context - Calculation context
 * @param {Object} context.partsListAnchors - Redux state.partsListAnchors.itemsByPartsList
 * @param {Object} context.selectedBoxMaterial - Selected box material with multipliers
 * @param {Object} context.selectedFaceMaterial - Selected face material with multipliers
 * @param {Array} context.globalServices - Global services array
 * @returns {Object} - { hoursByService }
 */
export const calculateBoxPartsTime = (section, context = {}) => {
  const { partsListAnchors, globalServices } = context;
  const totals = {
    hoursByService: {}, // Detailed breakdown by service
  };

  if (!section.cabinets || !Array.isArray(section.cabinets)) {
    return totals;
  }

  if (!partsListAnchors) {
    return totals;
  }

  section.cabinets.forEach((cabinet) => {
    if (!cabinet.face_config?.boxSummary?.boxPartsList) return;

    const quantity = Number(cabinet.quantity) || 1;
    const boxPartsList = cabinet.face_config.boxSummary.boxPartsList;

    // Calculate hours for this cabinet's parts (multipliers applied per-part)
    const cabinetHours = calculatePartsTimeForCabinet(boxPartsList, context);

    // Aggregate by service and multiply by cabinet quantity
    Object.entries(cabinetHours).forEach(([teamServiceId, hours]) => {
      const service = globalServices.find((s) => s.team_service_id === parseInt(teamServiceId));
      if (!service) return;
      
      if (!totals.hoursByService[service.service_id]) {
        totals.hoursByService[service.service_id] = 0;
      }

      // Only multiply by cabinet quantity here - multipliers already applied per-part
      totals.hoursByService[service.service_id] += hours * quantity;
    });
  });

  return totals;
};

/**
 * Calculate total hours by service for door/drawer faces using parts list anchors
 * @param {Array} faces - Array of face objects with width, height, and area
 * @param {string} doorStyle - The door style (slab_sheet, slab_hardwood, 5_piece_hardwood)
 * @param {number} cabinetStyleId - Cabinet style ID for filtering style-specific anchors
 * @param {Object} context - Calculation context
 * @param {Object} context.partsListAnchors - Redux state.partsListAnchors.itemsByPartsList
 * @param {Object} context.selectedFaceMaterial - Selected face material with multipliers
 * @param {Array} context.globalServices - Global services array
 * @returns {Object} - { serviceId: hours }
 */
export const calculateDoorPartsTime = (faces, doorStyle, cabinetStyleId, context = {}) => {
  const { partsListAnchors, selectedFaceMaterial, globalServices } = context;
  
  if (!faces || faces.length === 0 || !partsListAnchors || !doorStyle) {
    return {};
  }

  // Determine which parts_list_id to use based on door style
  let partsListId;
  if (doorStyle === "5_piece_hardwood") {
    // 5-piece doors always need finish
    partsListId = PARTS_LIST_MAPPING["5_piece_door_finished"];
  } else if (doorStyle === "slab_sheet" || doorStyle === "slab_hardwood") {
    // Slab doors may or may not need finish based on material
    const needsFinish = selectedFaceMaterial?.material?.needs_finish;
    partsListId = needsFinish 
      ? PARTS_LIST_MAPPING.slab_door_finished 
      : PARTS_LIST_MAPPING.slab_door_unfinished;
  } else {
    // Unknown style, skip
    return {};
  }

  const anchors = partsListAnchors[partsListId];

  if (!anchors || anchors.length === 0) {
    // No anchors for this door type - skip it
    return {};
  }

  // Collect all unique service IDs from anchors
  const allServiceIds = new Set();
  anchors.forEach((anchor) => {
    anchor.services.forEach((service) => {
      allServiceIds.add(service.team_service_id);
    });
  });

  const hoursByService = {};

  // Initialize all services to 0
  allServiceIds.forEach((serviceId) => {
    hoursByService[serviceId] = 0;
  });

  // Process each face
  faces.forEach((face) => {
    const area = face.width * face.height;

    // Calculate time for each service
    allServiceIds.forEach((teamServiceId) => {
      const minutesEach = interpolateTimeByArea(anchors, area, teamServiceId, cabinetStyleId);
      let totalMinutes = minutesEach;

      // Apply multipliers based on service and material
      // For 5-piece doors, ALWAYS apply finish multipliers
      const shouldApplyMultipliers = doorStyle === "5_piece_hardwood" || selectedFaceMaterial?.material?.needs_finish;
      
      if (shouldApplyMultipliers && globalServices) {
        const service = globalServices.find((s) => s.team_service_id === parseInt(teamServiceId));
        if (service) {
          if (service.service_id === 2 && selectedFaceMaterial.shopMultiplier) {
            // Shop multiplier for service ID 2
            totalMinutes *= selectedFaceMaterial.shopMultiplier;
          } else if (service.service_id === 3 && selectedFaceMaterial.finishMultiplier) {
            // Finish multiplier for service ID 3
            totalMinutes *= selectedFaceMaterial.finishMultiplier;
          }
        }
      }

      hoursByService[teamServiceId] += totalMinutes;
    });
  });

  // Convert minutes to hours for final output
  Object.keys(hoursByService).forEach((serviceId) => {
    hoursByService[serviceId] = roundToHundredth(
      hoursByService[serviceId] / 60
    );
  });

  return hoursByService;
};

export const calculateBoardFeetFor5PieceDoor = (
  doorWidth,
  doorHeight,
  thickness = 0.75,
  stileWidth = 3,
  railWidth = 3,
  panelThickness = 0.5,
  panelOverlap = .5
) => {
  // --- Stiles (2 vertical) ---
  const stileVolume = 2 * thickness * stileWidth * doorHeight;

  // --- Rails (2 horizontal) ---
  const railLength = doorWidth - 2 * stileWidth;
  const railVolume = 2 * thickness * railWidth * railLength;

  // --- Panel (center) ---
  const panelHeight = doorHeight - (2 * railWidth) + (panelOverlap * 2);
  const panelWidth = doorWidth - (2 * stileWidth) + (panelOverlap * 2);
  const panelVolume = panelThickness * panelWidth * panelHeight;

  // Total volume in cubic inches
  const totalCubicInches = stileVolume + railVolume + panelVolume;

  // Convert to board feet
  const boardFeet = totalCubicInches / 144;

  return roundToHundredth(boardFeet);
};

export const calculateBoardFeetForSlabHardwoodDoor = (
  doorWidth,
  doorHeight,
  thickness = 0.75
) => {
  // Total volume in cubic inches
  const totalCubicInches = doorWidth * doorHeight * thickness;

  // Convert to board feet
  const boardFeet = totalCubicInches / 144;

  return roundToHundredth(boardFeet);
};

const interpolateRate = (anchors, targetWidth, team_service_id) => {
  const rates = anchors.map((a) => {
    const service = a.services.find(
      (s) => s.team_service_id === team_service_id
    );
    const hours = service ? service.hours : 0;
    // volume is pre-calculated, but let's be safe
    const volume = a.volume || a.width * a.height * a.depth;
    if (volume === 0) return { width: a.width, rate: 0 };
    return {
      width: a.width,
      rate: hours / volume,
    };
  });

  // Ensure anchors are sorted by width
  rates.sort((a, b) => a.width - b.width);

  if (targetWidth <= rates[0].width) return rates[0].rate;
  if (targetWidth >= rates[rates.length - 1].width)
    return rates[rates.length - 1].rate;

  for (let i = 0; i < rates.length - 1; i++) {
    const a = rates[i],
      b = rates[i + 1];
    if (targetWidth >= a.width && targetWidth <= b.width) {
      if (b.width - a.width === 0) return a.rate; // Avoid division by zero
      const t = (targetWidth - a.width) / (b.width - a.width);
      return a.rate + t * (b.rate - a.rate);
    }
  }

  // Fallback for safety, should not be reached with sorted widths
  return rates[rates.length - 1].rate;
};

// export const getCabinetHours = (
//   width,
//   height,
//   depth,
//   finishedInterior = false,
//   anchors
// ) => {
//   if (!anchors || anchors.length === 0) {
//     return {};
//   }

//   const volume = width * height * depth;

//   // Get all unique team_service_ids from the anchors
//   const serviceIds = [
//     ...new Set(
//       anchors.flatMap((a) => a.services.map((s) => s.team_service_id))
//     ),
//   ];

//   const hoursByService = {};

//   serviceIds.forEach((serviceId) => {
//     const rate = interpolateRate(anchors, width, serviceId);
//     let hours = volume * rate;

//     // Optional scaling for big/heavy cases (can be customized if needed)
//     if (height > 80) {
//       // This logic might need to be service-specific in the future
//       hours *= 1.15;
//     }

//     hoursByService[serviceId] = roundToHundredth(hours);
//   });

//   return hoursByService;
// };

export const calculateSlabSheetFacePrice = (faceData, selectedMaterial) => {
  if (!faceData || !selectedMaterial) {
    return 0;
  }

  // Calculate price based on total area and material price
  const pricePerSquareInch =
    selectedMaterial.sq_in_price ||
    selectedMaterial.sheet_price / selectedMaterial.area;

  let totalPrice = 0;

  // Calculate price for each individual face
  faceData.faces?.forEach((face) => {
    const width = parseFloat(face.width);
    const height = parseFloat(face.height);
    const sqInches = width * height;
    const facePrice = roundToHundredth(pricePerSquareInch * sqInches);
    totalPrice += facePrice;
  });

  return totalPrice;
};

export const calculate5PieceDoorPrice = (door, bdFtPrice) => {
  const { width, height } = door;
  const baseWidth = 23;
  const baseHeight = 31;
  const baseArea = baseWidth * baseHeight;
  const doorArea = width * height;

  // --- 1. Base price (power-law fit) ---
  const basePrice = 30 * Math.pow(bdFtPrice, 0.65);

  // --- 2. Oversize rate (dynamic) ---
  const oversizeRate = 0.065 * Math.pow(bdFtPrice / 3.05, 0.95) * 1.15;
  const extra = doorArea > baseArea ? (doorArea - baseArea) * oversizeRate : 0;

  // --- 3. Setup fee & shop multiplier ---
  const setupFee = 10 + bdFtPrice * 1.5; // small per-door prep cost
  // const shopMultiplier = 1 + bdFtPrice / 120; // small multiplier for more expensive wood

  const taxRate = 8;
  const deliveryFee = 2;
  const creditCardFee = 3;
  const markup = 1 + (taxRate / 100) + (deliveryFee / 100) + (creditCardFee / 100);

  const price = (basePrice + extra + setupFee) * markup;

  return Math.round(price * 100) / 100;
}


// Helper function to calculate 5-piece hardwood face price for a specific face type
export const calculate5PieceHardwoodFacePrice = (
  faceData,
  selectedMaterial
) => {
  if (!faceData || !selectedMaterial) {
    return 0;
  }

  // For 5-piece hardwood doors, we use price per board foot
  const pricePerBoardFoot = selectedMaterial.bd_ft_price;
  let totalPrice = 0;

  // Calculate board feet and price for each individual face
  faceData.faces?.forEach((face) => {
    const width = parseFloat(face.width);
    const height = parseFloat(face.height);

    // // Calculate board feet for this specific door/drawer/face
    // const boardFeet = parseFloat(
    //   calculateBoardFeetFor5PieceDoor(
    //     width,
    //     height,
    //     selectedMaterial.thickness || 0.75,
    //     3, // Default stile width of 3"
    //     3, // Default rail width of 3"
    //     0.5 // Default panel thickness of 1/2"
    //   )
    // );

    // // Calculate price for this face
    // const facePrice = roundToHundredth(boardFeet * pricePerBoardFoot);
    totalPrice += calculate5PieceDoorPrice({
      width,
      height,
      thickness: selectedMaterial.thickness || 0.75,
    }, pricePerBoardFoot);
  });

  return totalPrice;
};



// Helper function to calculate slab hardwood face price for a specific face type
export const calculateSlabHardwoodFacePrice = (faceData, selectedMaterial) => {
  if (!faceData || !selectedMaterial) {
    return 0;
  }

  // For slab hardwood, we use price per board foot
  const pricePerBoardFoot = selectedMaterial.bd_ft_price;
  let totalPrice = 0;

  // Calculate board feet and price for each individual face
  faceData.faces?.forEach((face) => {
    const width = parseFloat(face.width);
    const height = parseFloat(face.height);

    // Calculate board feet for this specific door/drawer/face
    const boardFeet = parseFloat(
      calculateBoardFeetForSlabHardwoodDoor(
        width,
        height,
        selectedMaterial.thickness || 0.75
      )
    );

    // Calculate price for this face
    const facePrice = roundToHundredth(boardFeet * pricePerBoardFoot);
    totalPrice += facePrice;
  });

  return totalPrice;
};

// Define the anchor points for interpolation based on door board feet
const doorHourAnchors = {
  shop: [
    { boardFeet: 4, hours: 0.25 },
    { boardFeet: 7.5, hours: 0.35 },
    { boardFeet: 12, hours: 0.5 },
  ],
  install: [
    { boardFeet: 4, hours: 0.1 },
    { boardFeet: 7.5, hours: 0.15 },
    { boardFeet: 12, hours: 0.25 },
  ],
  finish: [
    { boardFeet: 4, hours: 0.5 },
    { boardFeet: 7.5, hours: 0.6 },
    { boardFeet: 12, hours: 0.8 },
  ],
};

/**
 * Interpolates or extrapolates hours based on a set of anchor points and hour type.
 * @param {Array<Object>} anchors - Array of { boardFeet, hours } points.
 * @param {number} targetBoardFeet - The door's board feet to calculate hours for.
 * @param {string} hourType - The type of hour being calculated ('shop', 'install', 'finish').
 * @returns {number} - The calculated hours.
 */
const calculateInterpolated5PieceDoorHours = (
  anchors,
  targetBoardFeet,
  hourType
) => {
  const first = anchors[0];
  const last = anchors[anchors.length - 1];

  // Handle cases outside the anchor range
  if (targetBoardFeet < first.boardFeet) {
    if (hourType === "shop" || hourType === "finish") {
      return roundToHundredth(first.hours * 0.8);
    }
    return first.hours; // Install hours are not reduced
  }

  if (targetBoardFeet > last.boardFeet) {
    // Extrapolate based on the slope of the last two points
    const secondLast = anchors[anchors.length - 2];
    const slope =
      (last.hours - secondLast.hours) / (last.boardFeet - secondLast.boardFeet);
    const extrapolated =
      last.hours + (targetBoardFeet - last.boardFeet) * slope;
    return roundToHundredth(extrapolated);
  }

  // Find the two anchor points the target board feet falls between for interpolation
  const upperIndex = anchors.findIndex(
    (anchor) => anchor.boardFeet >= targetBoardFeet
  );
  const upper = anchors[upperIndex];
  const lower = anchors[upperIndex - 1];

  // If it matches an anchor exactly or lower is not found, return the anchor's hours
  if (!lower || upper.boardFeet === targetBoardFeet) {
    return upper.hours;
  }

  // Perform linear interpolation
  const boardFeetRange = upper.boardFeet - lower.boardFeet;
  const hourRange = upper.hours - lower.hours;
  const boardFeetOffset = targetBoardFeet - lower.boardFeet;

  if (boardFeetRange === 0) return lower.hours; // Avoid division by zero

  const interpolated =
    lower.hours + (boardFeetOffset / boardFeetRange) * hourRange;
  return roundToHundredth(interpolated);
};

/**
 * Calculate hours for a 5-piece door based on board feet.
 * Returns hours by service ID (2=shop, 3=finish, 4=install)
 * @param {number} width - The width of the door.
 * @param {number} height - The height of the door.
 * @param {number} thickness - The thickness of the material.
 * @returns {Object} - { hoursByService: { 2: hours, 3: hours, 4: hours } }
 */
export const calculate5PieceDoorHours = (width, height, thickness = 0.75) => {
  const boardFeet = calculateBoardFeetFor5PieceDoor(width, height, thickness);

  return {
    hoursByService: {
      2: calculateInterpolated5PieceDoorHours(
        doorHourAnchors.shop,
        boardFeet,
        "shop"
      ), // Shop
      4: calculateInterpolated5PieceDoorHours(
        doorHourAnchors.install,
        boardFeet,
        "install"
      ), // Install
      3: calculateInterpolated5PieceDoorHours(
        doorHourAnchors.finish,
        boardFeet,
        "finish"
      ), // Finish
    },
  };
};

// --- Slab Door Hour Calculation ---

const slabDoorHourAnchors = {
  shop: [
    { area: 768, hours: 0.5 },
    { area: 1440, hours: 0.7 },
    { area: 2304, hours: 1.0 },
  ],
  install: [
    { area: 768, hours: 0.1 },
    { area: 1440, hours: 0.15 },
    { area: 2304, hours: 0.25 },
  ],
  finish: [
    { area: 768, hours: 0.5 },
    { area: 1440, hours: 0.6 },
    { area: 2304, hours: 0.8 },
  ],
};

const calculateInterpolatedSlabDoorHours = (anchors, targetArea) => {
  const first = anchors[0];
  const last = anchors[anchors.length - 1];

  if (targetArea <= first.area) return first.hours;
  if (targetArea >= last.area) return last.hours;

  const upperIndex = anchors.findIndex((anchor) => anchor.area >= targetArea);
  const upper = anchors[upperIndex];
  const lower = anchors[upperIndex - 1];

  const areaRange = upper.area - lower.area;
  const hourRange = upper.hours - lower.hours;
  const areaOffset = targetArea - lower.area;

  if (areaRange === 0) return lower.hours;

  const interpolated = lower.hours + (areaOffset / areaRange) * hourRange;
  return roundToHundredth(interpolated);
};

export const calculateSlabDoorHours = (width, height) => {
  const area = width * height;
  return {
    hoursByService: {
      2: calculateInterpolatedSlabDoorHours(slabDoorHourAnchors.shop, area), // Shop
      4: calculateInterpolatedSlabDoorHours(
        slabDoorHourAnchors.install,
        area
      ), // Install
      3: calculateInterpolatedSlabDoorHours(
        slabDoorHourAnchors.finish,
        area
      ), // Finish
    },
  };
};

/**
 * Calculate box sheet costs using maxrects-packer for optimal sheet layout
 * @param {Object} section - The section containing cabinets
 * @param {Array} boxMaterials - Available box materials
 * @param {Array} faceMaterials - Available face materials
 * @param {Object} options - Pricing and configuration options
 * @returns {Object} Cost breakdown with packing efficiency data
 */
export const calculateBoxSheetsCNC = (
  section,
  context,
  {
    cutPricePerFoot = 1.5,
    drillCostPerHingeBore = 0.85,
    drillCostPerSlide = 1.15,
    drillCostPerShelfHole = 0.08,
    edgeBandPricePerFoot = 0.15,
    taxRate = 0.1,
    setupCostPerSheet = 5,
    kerfWidth = 0.125, // Saw blade kerf width in inches
  } = {}
) => {
  if (
    !section ||
    !section.cabinets ||
    section.cabinets.length === 0 ||
    !context.selectedBoxMaterial ||
    !context.selectedFaceMaterial
  ) {
    return {
      sheetCount: 0,
      totalArea: 0,
      totalCost: 0,
      totalCostBeforeTax: 0,
      costPerSqFt: 0,
      packingEfficiency: 0,
      cabinetBreakdown: [],
    };
  }

  const selectedBoxMaterial = context.selectedBoxMaterial.material;
  const selectedFaceMaterial = context.selectedFaceMaterial.material;

  // Group cabinets by material and collect all parts
  const materialGroups = {};

  section.cabinets.forEach((cab) => {
    // Determine material for box parts
    const boxMaterial = cab.finished_interior
      ? selectedFaceMaterial
      : selectedBoxMaterial;

    const boxMaterialKey = cab.finished_interior ? "face" : "box";

    if (!cab.face_config?.boxSummary?.boxPartsList) return;
    // Only process cabinet boxes
    if (![...CABINET_TYPES].includes(cab.type)) return;

    const qty = Number(cab.quantity) || 1;
    const { boxSummary } = cab.face_config;
    const { boxPartsList, bandingLength, boxHardware, shelfDrillHoles } =
      boxSummary;


    if (!materialGroups[boxMaterialKey]) {
      materialGroups[boxMaterialKey] = {
        material: boxMaterial,
        parts: [],
        totals: {
          bandingLength: 0,
          hinges: 0,
          slides: 0,
          shelfDrillHoles: 0,
        },
        cabinets: [],
      };
    }

    // Add parts from this cabinet (multiplied by quantity)
    // Separate oversized parts and finished parts into their own groups
    boxPartsList.forEach((part) => {
      // Determine base material key based on finish boolean
      const baseMaterialKey = part.finish ? "face" : boxMaterialKey;

      // Get the appropriate material for this part
      const partMaterial = part.finish
        ? selectedFaceMaterial
        : selectedBoxMaterial;

      // Check if part is oversized (exceeds standard sheet dimensions)
      const partStandardWidth = partMaterial?.width || 49;
      const partStandardHeight = partMaterial?.height || 97;
      const isOversized =
        part.width > partStandardWidth || part.height > partStandardHeight;

      // Determine the appropriate material key
      const materialKey = isOversized
        ? `${baseMaterialKey}-oversize`
        : baseMaterialKey;

      // Initialize material group if needed (for face material or oversized)
      if (!materialGroups[materialKey]) {
        if (isOversized) {
          // Initialize oversized group
          materialGroups[materialKey] = {
            material: {
              ...partMaterial,
              width: Math.max(part.width, partStandardWidth),
              height: Math.max(part.height, partStandardHeight),
              isOversized: true,
            },
            parts: [],
            totals: {
              bandingLength: 0,
              hinges: 0,
              slides: 0,
              shelfDrillHoles: 0,
            },
            cabinets: [],
          };
        } else if (part.finish) {
          // Initialize face material group
          materialGroups[materialKey] = {
            material: partMaterial,
            parts: [],
            totals: {
              bandingLength: 0,
              hinges: 0,
              slides: 0,
              shelfDrillHoles: 0,
            },
            cabinets: [],
          };
        }
      }

      // Add parts (multiplied by quantity)
      for (let i = 0; i < part.quantity * qty; i++) {
        materialGroups[materialKey].parts.push({
          width: part.width,
          height: part.height,
          area: part.area,
          type: part.type,
          cabinetId: cab.id || cab.temp_id,
        });

        // Update oversized sheet dimensions to accommodate all oversized parts
        if (isOversized) {
          materialGroups[materialKey].material.width = Math.max(
            materialGroups[materialKey].material.width,
            part.width
          );
          materialGroups[materialKey].material.height = Math.max(
            materialGroups[materialKey].material.height,
            part.height
          );
        }
      }
    });

    // Accumulate totals (only to regular group, not oversized)
    // Oversized groups are just for accurate sheet pricing/counts
    materialGroups[boxMaterialKey].totals.bandingLength += bandingLength * qty;
    materialGroups[boxMaterialKey].totals.hinges +=
      (boxHardware?.totalHinges || 0) * qty;
    materialGroups[boxMaterialKey].totals.slides +=
      (boxHardware?.totalSlides || 0) * qty;
    materialGroups[boxMaterialKey].totals.shelfDrillHoles +=
      (shelfDrillHoles || 0) * qty;

    // Add cabinet to all material groups it uses
    materialGroups[boxMaterialKey].cabinets.push(cab);

    // Add cabinet to oversized box group if it exists
    if (
      materialGroups[`${boxMaterialKey}-oversize`] &&
      !materialGroups[`${boxMaterialKey}-oversize`].cabinets.find(
        (c) => (c.id || c.temp_id) === (cab.id || cab.temp_id)
      )
    ) {
      materialGroups[`${boxMaterialKey}-oversize`].cabinets.push(cab);
    }

    // Add cabinet to face material groups if they exist (for finished parts)
    if (
      materialGroups["face"] &&
      !materialGroups["face"].cabinets.find(
        (c) => (c.id || c.temp_id) === (cab.id || cab.temp_id)
      )
    ) {
      materialGroups["face"].cabinets.push(cab);
    }
    if (
      materialGroups["face-oversize"] &&
      !materialGroups["face-oversize"].cabinets.find(
        (c) => (c.id || c.temp_id) === (cab.id || cab.temp_id)
      )
    ) {
      materialGroups["face-oversize"].cabinets.push(cab);
    }
  });

  // Process each material group with packing algorithm
  const materialResults = Object.entries(materialGroups).map(
    ([materialKey, group]) => {
      const { material, parts, totals } = group;

      // Use maxrects-packer to pack parts onto sheets
      const sheetWidth = material.width || 48;
      const sheetHeight = material.height || 96;
      const sheetArea = sheetWidth * sheetHeight;

      // Calculate oversized sheet pricing if this is an oversized material group
      let effectiveSheetPrice = material.sheet_price;
      if (material.isOversized) {
        // Find the base material to get standard pricing
        const baseMaterialKey = materialKey.replace("-oversize", "");
        const baseMaterial =
          baseMaterialKey === "face"
            ? selectedFaceMaterial
            : selectedBoxMaterial;

        if (baseMaterial) {
          const standardSheetWidth = baseMaterial.width || 49;
          const standardSheetHeight = baseMaterial.height || 97;
          const standardSheetArea = standardSheetWidth * standardSheetHeight;

          // Calculate oversized sheet price based on area ratio
          // Price per square inch from standard sheet
          const pricePerSqInch = baseMaterial.sheet_price / standardSheetArea;

          const oversizeHeight = Math.max(sheetHeight, 120);
          const oversizeSheetArea = oversizeHeight * standardSheetWidth;

          // Apply oversized sheet price with area-based calculation
          effectiveSheetPrice = oversizeSheetArea * pricePerSqInch;

          // Add a premium for oversized sheets (e.g., 15% surcharge for special handling)
          const oversizePremium = 1.5;
          effectiveSheetPrice *= oversizePremium;
        }
      }

      // Calculate total area of all parts
      const totalPartsArea = parts.reduce((sum, part) => sum + part.area, 0);

      // Prepare parts for packing (add kerf spacing to each part)
      const packerParts = parts.map((part, index) => ({
        width: part.width + kerfWidth,
        height: part.height + kerfWidth,
        data: {
          originalWidth: part.width,
          originalHeight: part.height,
          area: part.area,
          type: part.type,
          cabinetId: part.cabinetId,
          index,
        },
      }));

      // Initialize packer with sheet dimensions (add kerf to account for parts having kerf added)
      // Options: smart (default), square, or maxarea
      const packer = new MaxRectsPacker(
        sheetWidth + kerfWidth,
        sheetHeight + kerfWidth,
        0, // padding (we're handling kerf manually)
        {
          smart: true,
          pot: false, // power of two sizing
          square: false,
          allowRotation: false, // Allow parts to be rotated for better fit
        }
      );

      // Add all parts to packer
      packer.addArray(packerParts);

      // Get the number of bins (sheets) used
      const sheetsUsed = packer.bins.length;
      const roundedSheets = Math.max(sheetsUsed, 0.5);

      // Calculate actual packing efficiency
      const totalSheetArea = sheetsUsed * sheetArea;
      const packingEfficiency =
        totalSheetArea > 0 ? totalPartsArea / totalSheetArea : 0;

      // Calculate actual kerf waste based on packed parts
      let totalKerfWaste = 0;
      packer.bins.forEach((bin) => {
        bin.rects.forEach((rect) => {
          // Kerf waste is the difference between packed size and original size
          const kerfArea = rect.width * rect.height - rect.data.area;
          totalKerfWaste += kerfArea;
        });
      });

      // Calculate costs
      const sheetCost = roundedSheets * effectiveSheetPrice;
      const setupCost = Math.ceil(roundedSheets) * setupCostPerSheet;

      // Calculate total perimeter for cutting cost
      const totalPerimeter = parts.reduce((sum, part) => {
        return sum + 2 * (part.width + part.height);
      }, 0);
      const cutCost = (totalPerimeter / 12) * cutPricePerFoot;

      const bandingCost = (totals.bandingLength / 12) * edgeBandPricePerFoot;
      const hingeBoreCost = totals.hinges * drillCostPerHingeBore;
      const slideCost = 2 * totals.slides * drillCostPerSlide;
      const shelfDrillHoleCost = totals.shelfDrillHoles * drillCostPerShelfHole;

      const totalCostBeforeTax =
        sheetCost +
        setupCost +
        cutCost +
        bandingCost +
        hingeBoreCost +
        slideCost +
        shelfDrillHoleCost;

      const totalCost = totalCostBeforeTax * (1 + taxRate);

      return {
        materialType: materialKey,
        material: material.name || "Unknown",
        isOversized: material.isOversized || false,
        sheetCount: parseFloat(roundedSheets.toFixed(2)),
        totalArea: parseFloat(totalPartsArea.toFixed(2)),
        totalCost: parseFloat(totalCost.toFixed(2)),
        totalCostBeforeTax: parseFloat(totalCostBeforeTax.toFixed(2)),
        costPerSqFt:
          totalPartsArea > 0
            ? parseFloat((totalCost / (totalPartsArea / 144)).toFixed(2))
            : 0,
        packingEfficiency: parseFloat((packingEfficiency * 100).toFixed(1)),
        kerfWaste: parseFloat(totalKerfWaste.toFixed(2)),
        partCount: parts.length,
        sheetDimensions: {
          width: sheetWidth,
          height: sheetHeight,
        },
        packingDetails: packer.bins.map((bin, index) => ({
          sheetNumber: index + 1,
          partsCount: bin.rects.length,
          efficiency: parseFloat(
            (
              (bin.rects.reduce((sum, rect) => sum + rect.data.area, 0) /
                sheetArea) *
              100
            ).toFixed(1)
          ),
          // Optional: include layout data for visualization
          layout: bin.rects.map((rect) => ({
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
            rotated: rect.rot || false,
            type: rect.data.type,
          })),
        })),
        breakdown: {
          sheetCost: parseFloat(sheetCost.toFixed(2)),
          setupCost: parseFloat(setupCost.toFixed(2)),
          cutCost: parseFloat(cutCost.toFixed(2)),
          bandingCost: parseFloat(bandingCost.toFixed(2)),
          hingeBoreCost: parseFloat(hingeBoreCost.toFixed(2)),
          slideCost: parseFloat(slideCost.toFixed(2)),
          shelfDrillHoleCost: parseFloat(shelfDrillHoleCost.toFixed(2)),
        },
      };
    }
  );

  // Combine results
  const combinedTotalCost = materialResults.reduce(
    (sum, result) => sum + result.totalCost,
    0
  );
  const combinedTotalArea = materialResults.reduce(
    (sum, result) => sum + result.totalArea,
    0
  );

  return {
    totalCost: parseFloat(combinedTotalCost.toFixed(2)),
    totalArea: parseFloat(combinedTotalArea.toFixed(2)),
    costPerSqFt:
      combinedTotalArea > 0
        ? parseFloat((combinedTotalCost / (combinedTotalArea / 144)).toFixed(2))
        : 0,
    materialGroups: materialResults,
  };
};
