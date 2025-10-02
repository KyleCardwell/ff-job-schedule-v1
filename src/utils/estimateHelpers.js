import { CABINET_ANCHORS } from "./constants";

export const roundToHundredth = (num) => Math.round(num * 100) / 100;

export const calculateBoardFeetFor5PieceDoor = (
  doorWidth,
  doorHeight,
  thickness = 0.75,
  stileWidth = 3,
  railWidth = 3,
  panelThickness = 0.5
) => {
  // --- Stiles (2 vertical) ---
  const stileVolume = 2 * thickness * stileWidth * doorHeight;

  // --- Rails (2 horizontal) ---
  const railLength = doorWidth - 2 * stileWidth;
  const railVolume = 2 * thickness * railWidth * railLength;

  // --- Panel (center) ---
  const panelHeight = doorHeight - 2 * railWidth;
  const panelWidth = doorWidth - 2 * stileWidth;
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

export const getCabinetHours = (
  width,
  height,
  depth,
  finishedInterior = false,
  anchors
) => {
  if (!anchors || anchors.length === 0) {
    return {};
  }

  const volume = width * height * depth;

  // Get all unique team_service_ids from the anchors
  const serviceIds = [
    ...new Set(
      anchors.flatMap((a) => a.services.map((s) => s.team_service_id))
    ),
  ];

  const hoursByService = {};

  serviceIds.forEach((serviceId) => {
    const rate = interpolateRate(anchors, width, serviceId);
    let hours = volume * rate;

    // Optional scaling for big/heavy cases (can be customized if needed)
    if (height > 80) {
      // This logic might need to be service-specific in the future
      hours *= 1.15;
    }

    hoursByService[serviceId] = roundToHundredth(hours);
  });

  return hoursByService;
};

// // Helper function to calculate box material price
// export const calculateBoxPrice = (cabinet, selectedMaterial) => (section) => {
//   if (
//     !cabinet.face_config?.boxSummary ||
//     !section.box_mat ||
//     !selectedMaterial
//   ) {
//     return 0;
//   }

//   // Calculate price based on area and material price
//   const pricePerSquareInch =
//     selectedMaterial.sheet_price / selectedMaterial.area;
//   return roundToHundredth(
//     pricePerSquareInch * cabinet.face_config.boxSummary.areaPerCabinet
//   );
// };

// export const calculateOutsourceCabinetCost = (
//   cabinet,
//   material,
//   laborPricePerSheet,
//   roundingIncrement = 0.2,
//   edgeBandPricePerFoot = .15,
//   taxRate = 0.10
// ) => {
//   // const sheetSqft = (material.width * material.height) / 144;

//   const area = cabinet.face_config.boxSummary.areaPerCabinet;

//   // const sqft = area / 144;
//   const rawSheets = roundToHundredth(area / material.area);
//   const roundedSheets =
//     roundToHundredth(Math.ceil(rawSheets / roundingIncrement) * roundingIncrement);

//   const sheetCost = roundedSheets * ((material.sheet_price * 1.5) + laborPricePerSheet);

//   const bandingCost = (cabinet.face_config.boxSummary.bandingLength / 12) * (0 + edgeBandPricePerFoot);

//   // ----- TOTAL COST -----
//   const totalCost = (sheetCost + bandingCost) * (1 + taxRate);

//   return {
//     // sqft,
//     rawSheets,
//     roundedSheets,
//     sheetCost: parseFloat(sheetCost.toFixed(2)),
//     bandingLength: cabinet.face_config.boxSummary.bandingLength / 12,
//     bandingCost: parseFloat(bandingCost.toFixed(2)),
//     totalCost: parseFloat(totalCost.toFixed(2)),
//   };
// };

// export const calculateOutsourceCabinetCostCNC = (
//   cabinet,
//   material,
//   setupCost = 5,
//   cutPricePerFoot,
//   drillCostPerHingeBore = 1,
//   drillCostPerSlide = 1,
//   roundingIncrement = 0.2,
//   edgeBandPricePerFoot = .15,
//   taxRate = 0.10
// ) => {
//   // const sheetSqft = (material.width * material.height) / 144;

//   const area = cabinet.face_config.boxSummary.areaPerCabinet;
//   const perimeter = cabinet.face_config.boxSummary.singleBoxPerimeterLength;
//   const parts = cabinet.face_config.boxSummary.singleBoxPartsCount;
//   const { totalHinges, totalSlides } = cabinet.face_config.boxSummary?.boxHardware || {};

//   // const sqft = area / 144;
//   const rawSheets = roundToHundredth(area / material.area);
//   const roundedSheets =
//     roundToHundredth(Math.ceil(rawSheets / roundingIncrement) * roundingIncrement);

//   const sheetCost = roundedSheets * (material.sheet_price * 1);

//   const bandingCost = (cabinet.face_config.boxSummary.bandingLength / 12) * (0 + edgeBandPricePerFoot);

//   const cutCost = (perimeter / 12) * cutPricePerFoot;

//   // drill 2 holes per part on average
//   const hingeBoreCost = totalHinges * drillCostPerHingeBore;

//   const slideCost = (2 * totalSlides) * drillCostPerSlide;

//   // ----- TOTAL COST -----
//   const totalCost = (sheetCost + bandingCost + cutCost + hingeBoreCost + slideCost + setupCost) * (1 + taxRate);

//   return {
//     // sqft,
//     rawSheets,
//     roundedSheets,
//     sheetCost: parseFloat(sheetCost.toFixed(2)),
//     bandingLength: cabinet.face_config.boxSummary.bandingLength / 12,
//     bandingCost: parseFloat(bandingCost.toFixed(2)),
//     totalCost: parseFloat(totalCost.toFixed(2)),
//   };
// };

export const calculateOutsourceBatchCostCNC = (
  section,
  boxMaterials,
  faceMaterials,
  cutPricePerFoot,
  drillCostPerHingeBore = 1,
  drillCostPerSlide = 1,
  roundingIncrement = 0.2,
  edgeBandPricePerFoot = 0.15,
  taxRate = 0.10,
  setupCostPerSheet = 5,
  wasteFactor = 0.10 // 10% waste factor for cuts, defects, and layout inefficiency
) => {
  if (!section || !section.cabinets || section.cabinets.length === 0 || !boxMaterials || !faceMaterials) {
    return {
      sheetCount: 0,
      totalArea: 0,
      totalCost: 0,
      totalCostBeforeTax: 0,
      costPerSqFt: 0,
      cabinetBreakdown: [],
    };
  }
  
  // --- Group cabinets by material (box vs face for finished interiors/sides) ---
  const groupedByMaterial = section.cabinets.reduce((acc, cab) => {
    if (!cab.face_config?.boxSummary) return acc;
    
    const qty = Number(cab.quantity) || 1;
    const { boxSummary } = cab.face_config;
    const { areaPerCabinet, singleBoxPerimeterLength, bandingLength, boxHardware, finishedSidesArea } = boxSummary;
    
    // --- Process box material (interior) ---
    const selectedBoxMaterial = cab.finished_interior
      ? faceMaterials.find((mat) => mat.id === section.face_mat)
      : boxMaterials.find((mat) => mat.id === section.box_mat);
    
    const boxMaterialKey = cab.finished_interior ? 'face' : 'box';
    if (!acc[boxMaterialKey]) {
      acc[boxMaterialKey] = {
        material: selectedBoxMaterial,
        cabinets: [],
        totals: { area: 0, perimeter: 0, bandingLength: 0, hinges: 0, slides: 0 }
      };
    }

    acc[boxMaterialKey].totals.area += areaPerCabinet * qty;
    acc[boxMaterialKey].totals.perimeter += singleBoxPerimeterLength * qty;
    acc[boxMaterialKey].totals.bandingLength += bandingLength * qty;
    acc[boxMaterialKey].totals.hinges += (boxHardware?.totalHinges || 0) * qty;
    acc[boxMaterialKey].totals.slides += (boxHardware?.totalSlides || 0) * qty;
    acc[boxMaterialKey].cabinets.push(cab);

    return acc;
  }, {});

  // --- Calculate costs for each material group ---
  const materialResults = Object.entries(groupedByMaterial).map(([materialKey, group]) => {
    const { material, totals, cabinets: groupCabinets } = group;

    // --- Core cost calculations ---
    // Dynamic waste factor: higher for small jobs, lower for large jobs
    // Small jobs have more setup cuts and less efficient layouts
    const sheetsEstimate = totals.area / material.area;
    let adjustedWasteFactor = wasteFactor;
    
    if (sheetsEstimate < 1) {
      // Very small jobs: 35-40% waste
      adjustedWasteFactor = wasteFactor * 4;
    } else if (sheetsEstimate < 3) {
      // Small jobs: 12-15% waste
      adjustedWasteFactor = wasteFactor * 1.5;
    } else if (sheetsEstimate > 10) {
      // Large jobs: 5-7% waste (better utilization)
      adjustedWasteFactor = wasteFactor;
    }
    
    const areaWithWaste = totals.area * (1 + adjustedWasteFactor);
    const rawSheets = areaWithWaste / material.area;
    // Ensure minimum 1 sheet per material group to avoid unrealistic zero-cost scenarios
    const roundedSheets = Math.max(
      Math.ceil(rawSheets / roundingIncrement) * roundingIncrement,
      1
    );

    const sheetCost = roundedSheets * material.sheet_price;
    // Setup cost per whole sheet (can't have fractional sheet setups)
    const setupCost = Math.ceil(roundedSheets) * setupCostPerSheet;
    const cutCost = (totals.perimeter / 12) * cutPricePerFoot;
    const bandingCost = (totals.bandingLength / 12) * edgeBandPricePerFoot;
    const hingeBoreCost = totals.hinges * drillCostPerHingeBore;
    // totals.slides counts one slide pair, so multiply by to include each slide
    const slideCost = (2 * totals.slides) * drillCostPerSlide;

    const totalCostBeforeTax =
      sheetCost + setupCost + cutCost + bandingCost + hingeBoreCost + slideCost;

    const totalCost = totalCostBeforeTax * (1 + taxRate);

    // --- Distribute cost proportionally by cabinet area ---
    const totalArea = totals.area;
    const cabinetBreakdown = groupCabinets.map((cab) => {
      const qty = Number(cab.quantity) || 1;
      const { boxSummary } = cab.face_config;
      const cabArea = boxSummary.areaPerCabinet * qty;
      
      const share = totalArea > 0 ? cabArea / totalArea : 0;
      let cabCost = totalCost * share;
      
      // Add finished sides cost inline (proportional to actual material usage)
      const finishedSidesArea = boxSummary.finishedSidesArea || 0;
      if (finishedSidesArea > 0) {
        const faceMaterial = faceMaterials.find(mat => mat.id === section.face_mat);
        if (faceMaterial) {
          // Calculate cost based on actual material usage with overhead
          // Add 30% markup for: waste factor, edge banding, handling, and setup
          const finishedSidesMarkup = 1.50;
          const baseMaterialCost = (finishedSidesArea * qty / faceMaterial.area) * faceMaterial.sheet_price;
          const finishedSidesCost = baseMaterialCost * finishedSidesMarkup;
          cabCost += finishedSidesCost;
        }
      }

      return {
        id: cab.id || cab.temp_id,
        type: cab.type,
        quantity: qty,
        area: parseFloat(cabArea.toFixed(2)),
        costShare: parseFloat(share.toFixed(4)),
        cost: parseFloat(cabCost.toFixed(2)),
        finishedInterior: cab.finished_interior || false,
        finishedLeft: cab.finished_left || false,
        finishedRight: cab.finished_right || false,
        finishedSidesArea: finishedSidesArea > 0 ? parseFloat((finishedSidesArea * qty).toFixed(2)) : 0,
      };
    });

    return {
      materialType: materialKey,
      material: material.name || 'Unknown',
      sheetCount: parseFloat(roundedSheets.toFixed(2)),
      totalArea: parseFloat(totals.area.toFixed(2)),
      totalCost: parseFloat(totalCost.toFixed(2)),
      totalCostBeforeTax: parseFloat(totalCostBeforeTax.toFixed(2)),
      costPerSqFt: totals.area > 0 ? parseFloat((totalCost / (totals.area / 144)).toFixed(2)) : 0,
      breakdown: {
        sheetCost: parseFloat(sheetCost.toFixed(2)),
        setupCost: parseFloat(setupCost.toFixed(2)),
        cutCost: parseFloat(cutCost.toFixed(2)),
        bandingCost: parseFloat(bandingCost.toFixed(2)),
        hingeBoreCost: parseFloat(hingeBoreCost.toFixed(2)),
        slideCost: parseFloat(slideCost.toFixed(2)),
      },
      cabinetBreakdown,
    };
  });

  // --- Combine results ---
  const combinedTotalCost = materialResults.reduce((sum, result) => sum + result.totalCost, 0);
  const combinedTotalArea = materialResults.reduce((sum, result) => sum + result.totalArea, 0);
  const allCabinetBreakdown = materialResults.flatMap(result => result.cabinetBreakdown);

  // Calculate total cost from cabinet breakdown (includes finished sides costs already)
  const finalTotalCost = allCabinetBreakdown.reduce((sum, cab) => sum + cab.cost, 0);

  return {
    totalCost: parseFloat(finalTotalCost.toFixed(2)),
    totalArea: parseFloat(combinedTotalArea.toFixed(2)),
    costPerSqFt: combinedTotalArea > 0 ? parseFloat((finalTotalCost / (combinedTotalArea / 144)).toFixed(2)) : 0,
    materialGroups: materialResults,
    cabinetBreakdown: allCabinetBreakdown,
  };
};

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

    // Calculate board feet for this specific door/drawer/face
    const boardFeet = parseFloat(
      calculateBoardFeetFor5PieceDoor(
        width,
        height,
        selectedMaterial.thickness || 0.75,
        3, // Default stile width of 3"
        3, // Default rail width of 3"
        0.5 // Default panel thickness of 1/2"
      )
    );

    // Calculate price for this face
    const facePrice = roundToHundredth(boardFeet * pricePerBoardFoot);
    totalPrice += facePrice;
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
 * Calculates the shop, install, and finish hours for a door of a given size.
 * @param {number} width - The width of the door.
 * @param {number} height - The height of the door.
 * @param {number} thickness - The thickness of the material.
 * @returns {Object} - An object containing shopHours, installHours, and finishHours.
 */
export const calculate5PieceDoorHours = (width, height, thickness = 0.75) => {
  const boardFeet = calculateBoardFeetFor5PieceDoor(width, height, thickness);

  return {
    shopHours: calculateInterpolated5PieceDoorHours(
      doorHourAnchors.shop,
      boardFeet,
      "shop"
    ),
    installHours: calculateInterpolated5PieceDoorHours(
      doorHourAnchors.install,
      boardFeet,
      "install"
    ),
    finishHours: calculateInterpolated5PieceDoorHours(
      doorHourAnchors.finish,
      boardFeet,
      "finish"
    ),
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
    shopHours: calculateInterpolatedSlabDoorHours(
      slabDoorHourAnchors.shop,
      area
    ),
    installHours: calculateInterpolatedSlabDoorHours(
      slabDoorHourAnchors.install,
      area
    ),
    finishHours: calculateInterpolatedSlabDoorHours(
      slabDoorHourAnchors.finish,
      area
    ),
  };
};
