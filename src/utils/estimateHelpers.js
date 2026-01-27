import { MaxRectsPacker } from "maxrects-packer";

import {
  CABINET_TYPES,
  FACE_NAMES,
  FACE_STYLE_VALUES,
  FACE_TYPES,
  PARTS_LIST_MAPPING,
} from "./constants";

export const roundToHundredth = (num) => Math.round(num * 100) / 100;

/**
 * Calculate molding cost for a door or drawer front
 * @param {number} width - Width of the face in inches
 * @param {number} height - Height of the face in inches
 * @param {boolean} insideMolding - Whether inside molding is applied
 * @param {boolean} outsideMolding - Whether outside molding is applied
 * @returns {number} Total molding cost in dollars
 */
export const calculateMoldingCost = (
  width,
  height,
  insideMolding = false,
  outsideMolding = false,
  material
) => {
  if (!insideMolding && !outsideMolding) return 0;

  // Determine stile/rail width based on face dimensions
  // If width or height < 8", use 1.5" for that dimension, otherwise use 3"
  const stileWidth = width < 8 ? 1.5 : 3;
  const railWidth = height < 8 ? 1.5 : 3;

  // Calculate perimeter based on stile/rail dimensions (inner perimeter for molding)
  // For a door with stiles and rails, the opening is:
  // openingWidth = width - (2 * stileWidth)
  // openingHeight = height - (2 * railWidth)
  const insideWidth = Math.max(0, width - 2 * stileWidth);
  const insideHeight = Math.max(0, height - 2 * railWidth);
  const insidePerimeterInches = 2 * (insideHeight + insideWidth);
  const insidePerimeterFeet = insidePerimeterInches / 12;

  const outsidePerimeterInches = 2 * (width + height);
  const outsidePerimeterFeet = outsidePerimeterInches / 12;

  // Pricing per foot
  // const insideMoldingPricePerFoot = 7.90;
  // const outsideMoldingPricePerFoot = 8.25;
  const insideMoldingPricePerFoot =
    5 + (material.bd_ft_price ? material.bd_ft_price : 3);
  const outsideMoldingPricePerFoot =
    5 + (material.bd_ft_price ? material.bd_ft_price : 3.5);

  let cost = 0;
  if (insideMolding) {
    cost += Math.max(insidePerimeterFeet * insideMoldingPricePerFoot, 50);
  }
  if (outsideMolding) {
    cost += Math.max(outsidePerimeterFeet * outsideMoldingPricePerFoot, 68);
  }

  return cost;
};

/**
 * Get parts_list_id for a box part based on its type and finish status
 */
const getPartsListId = (partType, isFinished) => {
  const primaryKey = `${partType}_${isFinished ? "finished" : "unfinished"}`;
  const fallbackKey = `${partType}_finished`;

  return (
    PARTS_LIST_MAPPING[primaryKey] ?? PARTS_LIST_MAPPING[fallbackKey] ?? null
  );
};

const getPartAnchors = (part, partNeedsFinish, partsListAnchors) => {
  // Determine base keys
  const primaryKey = `${part.type}_${
    partNeedsFinish ? "finished" : "unfinished"
  }`;
  const fallbackKey = `${part.type}_finished`;

  // Lookup parts list IDs
  const primaryId = PARTS_LIST_MAPPING[primaryKey];
  const fallbackId = PARTS_LIST_MAPPING[fallbackKey];

  // Try primary anchors first
  let anchors = partsListAnchors[primaryId];

  // If no anchors for primary, try fallback (_finished)
  if (!anchors && fallbackId) {
    anchors = partsListAnchors[fallbackId];
  }

  // Return anchors if found, or null if nothing
  return anchors || null;
};

/**
 * Generic interpolation function for calculating time based on area
 * @param {Array} anchors - Array of anchor objects with dimensions and services
 * @param {number} targetArea - The area to interpolate for (width × height)
 * @param {number} teamServiceId - The service ID to get time for
 * @param {number} cabinetStyleId - Optional cabinet style ID for filtering (null = applies to all)
 * @returns {number} - Interpolated time in minutes
 */
export const interpolateTimeByArea = (
  anchors,
  targetArea,
  teamServiceId,
  cabinetStyleId = null
) => {
  if (!anchors || anchors.length === 0) {
    return 0;
  }

  // Filter anchors by cabinet_style_id
  // Include anchors where cabinet_style_id is null (applies to all) OR matches the target style
  const filteredAnchors = anchors.filter((anchor) => {
    return (
      anchor.cabinet_style_id === null ||
      anchor.cabinet_style_id == cabinetStyleId
    );
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
 * Generic interpolation function for calculating time based on volume (3D)
 * Used for hoods where depth is a significant dimension
 * @param {Array} anchors - Array of anchor objects with width, height, depth, and services
 * @param {number} targetVolume - The volume to interpolate for (width × height × depth)
 * @param {number} teamServiceId - The service ID to get time for
 * @param {number} cabinetStyleId - Optional cabinet style ID for filtering (null = applies to all)
 * @returns {number} - Interpolated time in minutes
 */
export const interpolateTimeByVolume = (
  anchors,
  targetVolume,
  teamServiceId,
  cabinetStyleId = null
) => {
  if (!anchors || anchors.length === 0) {
    return 0;
  }

  // Filter anchors by cabinet_style_id
  const filteredAnchors = anchors.filter((anchor) => {
    return (
      anchor.cabinet_style_id === null ||
      anchor.cabinet_style_id == cabinetStyleId
    );
  });

  if (filteredAnchors.length === 0) {
    return 0;
  }

  // Build array of {volume, minutes} for this service
  const dataPoints = filteredAnchors
    .map((anchor) => {
      const service = anchor.services.find(
        (s) => s.team_service_id === teamServiceId
      );
      if (!service) return null;

      const volume = anchor.width * anchor.height * (anchor.depth || 1);
      return {
        volume,
        minutes: service.minutes || 0,
      };
    })
    .filter(Boolean);

  if (dataPoints.length === 0) {
    return 0;
  }

  // Sort by volume for interpolation
  dataPoints.sort((a, b) => a.volume - b.volume);

  // If only one data point, return its value
  if (dataPoints.length === 1) {
    return dataPoints[0].minutes;
  }

  // If target is below minimum, return minimum value
  if (targetVolume <= dataPoints[0].volume) {
    return dataPoints[0].minutes;
  }

  // Find the two points to interpolate between
  for (let i = 0; i < dataPoints.length - 1; i++) {
    const lower = dataPoints[i];
    const upper = dataPoints[i + 1];

    if (targetVolume >= lower.volume && targetVolume <= upper.volume) {
      // Avoid division by zero
      if (upper.volume - lower.volume === 0) {
        return lower.minutes;
      }

      // Linear interpolation
      const ratio = (targetVolume - lower.volume) / (upper.volume - lower.volume);
      const interpolatedMinutes =
        lower.minutes + ratio * (upper.minutes - lower.minutes);

      return roundToHundredth(interpolatedMinutes);
    }
  }

  // Fallback (shouldn't reach here with proper sorting)
  return dataPoints[dataPoints.length - 1].minutes;
};

/**
 * Calculate total hours by service for hood cabinets using 3D volume
 * Hoods are calculated based on width × height × depth since all three dimensions matter
 * @param {Object} cabinet - Cabinet object with width, height, depth, type, quantity, type_specific_options
 * @param {number} cabinetStyleId - Cabinet style ID for filtering style-specific anchors
 * @param {Object} context - Calculation context
 * @param {Object} context.partsListAnchors - Redux state.partsListAnchors.itemsByPartsList
 * @param {Object} context.selectedFaceMaterial - Selected face material with multipliers
 * @param {Array} context.globalServices - Global services array
 * @param {Object} context.itemTypeConfig - Item type configuration with typeSpecificOptions
 * @returns {Object} - { serviceId: hours } (already includes quantity multiplier)
 */
export const calculateHoodPartsTime = (
  cabinet,
  cabinetStyleId,
  context = {}
) => {
  const { partsListAnchors, selectedFaceMaterial, globalServices, itemTypeConfig } = context;

  if (!cabinet || !partsListAnchors) {
    return {};
  }

  // Only process hoods (type 14)
  if (cabinet.type !== 14) {
    return {};
  }

  const partsListId = PARTS_LIST_MAPPING["hood_finished"];
  const anchors = partsListAnchors[partsListId];

  if (!anchors || anchors.length === 0) {
    // No anchors for hoods - skip it
    return {};
  }

  // Use 3D volume for hood calculation (width × height × depth)
  const volume = cabinet.width * cabinet.height * cabinet.depth;
  const quantity = cabinet.quantity != null ? Number(cabinet.quantity) : 1;

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

  // Calculate time for each service using volume interpolation
  allServiceIds.forEach((teamServiceId) => {
    const minutesBase = interpolateTimeByVolume(
      anchors,
      volume,
      teamServiceId,
      cabinetStyleId
    );

    let totalMinutes = minutesBase;

    // Apply multipliers if material needs finish
    const shouldApplyMultipliers = selectedFaceMaterial?.material?.needs_finish;

    if (shouldApplyMultipliers && globalServices) {
      const service = globalServices.find(
        (s) => s.team_service_id === parseInt(teamServiceId)
      );
      if (service) {
        if (service.service_id === 2 && selectedFaceMaterial.shopMultiplier) {
          // Shop multiplier for service ID 2
          totalMinutes *= selectedFaceMaterial.shopMultiplier;
        } else if (
          service.service_id === 3 &&
          selectedFaceMaterial.finishMultiplier
        ) {
          // Finish multiplier for service ID 3
          totalMinutes *= selectedFaceMaterial.finishMultiplier;
        }
      }
    }

    // Apply type-specific option multipliers (e.g., tapered hood = 1.5x shop time)
    if (cabinet.type_specific_options && itemTypeConfig?.typeSpecificOptions && globalServices) {
      const service = globalServices.find(
        (s) => s.team_service_id === parseInt(teamServiceId)
      );
      if (service) {
        itemTypeConfig.typeSpecificOptions.forEach((option) => {
          const optionValue = cabinet.type_specific_options[option.name];
          // If option is enabled/truthy and has service multipliers
          if (optionValue && option.serviceMultipliers) {
            const multiplier = option.serviceMultipliers[service.service_id];
            if (multiplier) {
              totalMinutes *= multiplier;
            }
          }
        });
      }
    }

    hoursByService[teamServiceId] += totalMinutes;
  });

  // Convert minutes to hours and multiply by quantity for final output
  Object.keys(hoursByService).forEach((serviceId) => {
    hoursByService[serviceId] = roundToHundredth(
      (hoursByService[serviceId] / 60) * quantity
    );
  });

  return hoursByService;
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
  const {
    partsListAnchors,
    selectedBoxMaterial,
    selectedFaceMaterial,
    globalServices,
  } = context;

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
    // Determine which material this part uses based on finish boolean
    // - part.finish === true: use selectedFaceMaterial
    // - part.finish === false/null: use selectedBoxMaterial
    const partMaterial = part.finish
      ? selectedFaceMaterial
      : selectedBoxMaterial;

    // Determine if THIS specific part needs finish based on the selected material
    // This is independent of which material was selected
    const partNeedsFinish = partMaterial?.material?.needs_finish === true;

    const anchors = getPartAnchors(part, partNeedsFinish, partsListAnchors);

    if (!anchors || anchors.length === 0) {
      // No anchors for this part type - skip it
      return;
    }

    const area = part.width * part.height;
    const quantity = part.quantity != null ? part.quantity : 1;

    // Calculate time for each service
    allServiceIds.forEach((teamServiceId) => {
      // Box parts don't have style-specific anchors, pass null for cabinetStyleId
      const minutesEach = interpolateTimeByArea(
        anchors,
        area,
        teamServiceId,
        null
      );
      let totalMinutes = minutesEach * quantity;

      // Apply multipliers and filter services based on whether this part needs finish
      if (globalServices) {
        const service = globalServices.find(
          (s) => s.team_service_id === parseInt(teamServiceId)
        );
        if (service) {
          // Skip finish service entirely if this part doesn't need finish
          if (service.service_id === 3 && !partNeedsFinish) {
            return; // Don't add any hours for finish service
          }

          // Shop multiplier for service ID 2
          if (service.service_id === 2 && partMaterial.shopMultiplier) {
            totalMinutes *= partMaterial.shopMultiplier;
          }
          // Finish multiplier for service ID 3
          if (
            partNeedsFinish &&
            service.service_id === 3 &&
            partMaterial.finishMultiplier
          ) {
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
    hoursByService: {}, // Detailed breakdown by service (all parts)
    categoryHours: {
      boxes: {}, // Regular box parts
      fillers: {}, // Filler parts
      nosing: {}, // Nosing parts
    },
  };

  if (!section.cabinets || !Array.isArray(section.cabinets)) {
    return totals;
  }

  if (!partsListAnchors) {
    return totals;
  }

  section.cabinets.forEach((cabinet) => {
    if (!cabinet.face_config?.boxSummary?.boxPartsList) return;

    const quantity = cabinet.quantity != null ? Number(cabinet.quantity) : 1;
    const boxPartsList = cabinet.face_config.boxSummary.boxPartsList;

    // Separate parts by type
    const fillerParts = boxPartsList.filter(p => p.type === 'filler' || (cabinet.type === 5));
    const nosingParts = boxPartsList.filter(p => p.type === 'nosing');
    const regularParts = boxPartsList.filter(p => p.type !== 'filler' && p.type !== 'nosing' && cabinet.type !== 5);

    // Calculate hours for regular box parts
    if (regularParts.length > 0) {
      const regularHours = calculatePartsTimeForCabinet(regularParts, context);
      Object.entries(regularHours).forEach(([teamServiceId, hours]) => {
        const service = globalServices.find(s => s.team_service_id === parseInt(teamServiceId));
        if (!service) return;
        
        const roundedHours = roundToHundredth(hours * quantity);
        if (!totals.hoursByService[service.service_id]) totals.hoursByService[service.service_id] = 0;
        if (!totals.categoryHours.boxes[service.service_id]) totals.categoryHours.boxes[service.service_id] = 0;
        
        totals.hoursByService[service.service_id] += roundedHours;
        totals.categoryHours.boxes[service.service_id] += roundedHours;
      });
    }

    // Calculate hours for filler parts
    if (fillerParts.length > 0) {
      const fillerHours = calculatePartsTimeForCabinet(fillerParts, context);
      Object.entries(fillerHours).forEach(([teamServiceId, hours]) => {
        const service = globalServices.find(s => s.team_service_id === parseInt(teamServiceId));
        if (!service) return;
        
        const roundedHours = roundToHundredth(hours * quantity);
        if (!totals.hoursByService[service.service_id]) totals.hoursByService[service.service_id] = 0;
        if (!totals.categoryHours.fillers[service.service_id]) totals.categoryHours.fillers[service.service_id] = 0;
        
        totals.hoursByService[service.service_id] += roundedHours;
        totals.categoryHours.fillers[service.service_id] += roundedHours;
      });
    }

    // Calculate hours for nosing parts
    // First, calculate material time for the parts (with multipliers)
    // Then add nosing process time based on length (without multipliers)
    if (nosingParts.length > 0) {
      // Calculate material hours (includes multipliers for the material itself)
      const materialHours = calculatePartsTimeForCabinet(nosingParts, context);
      Object.entries(materialHours).forEach(([teamServiceId, hours]) => {
        const service = globalServices.find(s => s.team_service_id === parseInt(teamServiceId));
        if (!service) return;
        
        const roundedHours = roundToHundredth(hours * quantity);
        if (!totals.hoursByService[service.service_id]) totals.hoursByService[service.service_id] = 0;
        if (!totals.categoryHours.nosing[service.service_id]) totals.categoryHours.nosing[service.service_id] = 0;
        
        totals.hoursByService[service.service_id] += roundedHours;
        totals.categoryHours.nosing[service.service_id] += roundedHours;
      });

      // Add nosing process time based on length (height) - NO multipliers
      nosingParts.forEach((part) => {
        const nosingLength = part.height; // Using height as the length for nosing
        const nosingProcessHours = calculateNosingTime(nosingLength, context);
        
        Object.entries(nosingProcessHours).forEach(([teamServiceId, hours]) => {
          const service = globalServices.find(s => s.team_service_id === parseInt(teamServiceId));
          if (!service) return;
          
          const roundedHours = roundToHundredth(hours * quantity);
          if (!totals.hoursByService[service.service_id]) totals.hoursByService[service.service_id] = 0;
          if (!totals.categoryHours.nosing[service.service_id]) totals.categoryHours.nosing[service.service_id] = 0;
          
          totals.hoursByService[service.service_id] += roundedHours;
          totals.categoryHours.nosing[service.service_id] += roundedHours;
        });
      });
    }
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
export const calculateDoorPartsTime = (
  faces,
  doorStyle,
  cabinetStyleId,
  panelModId,
  cabinetTypeId,
  context = {}
) => {
  const { partsListAnchors, selectedFaceMaterial, globalServices, effectiveMaterial } = context;

  if (!faces || faces.length === 0 || !partsListAnchors || !doorStyle) {
    return {};
  }

  // Determine which parts_list_id to use based on door style
  let partsListId;
  if (doorStyle === FACE_STYLE_VALUES.FIVE_PIECE_HARDWOOD) {
    // 5-piece doors always need finish
    partsListId = PARTS_LIST_MAPPING["5_piece_door_finished"];
  } else if (
    doorStyle === FACE_STYLE_VALUES.SLAB_SHEET ||
    doorStyle === FACE_STYLE_VALUES.SLAB_HARDWOOD
  ) {
    // Slab doors may or may not need finish based on material
    // Use effectiveMaterial if provided (door/drawer specific), otherwise fall back to face material
    const materialToCheck = effectiveMaterial?.material   || selectedFaceMaterial?.material;
    const needsFinish = materialToCheck?.needs_finish;
    partsListId = needsFinish
      ? PARTS_LIST_MAPPING.slab_door_finished
      : PARTS_LIST_MAPPING.slab_door_unfinished;
  } else {
    // Unknown style, skip
    return {};
  }

  const anchors = partsListAnchors[partsListId];
  
  // Look up panel mod anchors using the parts_list ID directly
  // 0 = explicit "none" (no panel mod), NULL/undefined = no panel mod
  // Only lookup if panelModId is a positive number (15=reeded, 22=grooved, etc.)
  let panelModAnchors = null;
  if (panelModId && panelModId > 0) {
    panelModAnchors = partsListAnchors[panelModId];
  }

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

  // If panel mod is applied, also collect service IDs from panel mod anchors
  if (panelModAnchors && panelModAnchors.length > 0) {
    panelModAnchors.forEach((anchor) => {
      anchor.services.forEach((service) => {
        allServiceIds.add(service.team_service_id);
      });
    });
  }

  const hoursByService = {};
  const panelModHoursByService = {};

  // Initialize all services to 0
  allServiceIds.forEach((serviceId) => {
    hoursByService[serviceId] = 0;
    panelModHoursByService[serviceId] = 0;
  });

  // Process each face
  faces.forEach((face) => {
    const area = face.width * face.height;

    // Calculate time for each service
    allServiceIds.forEach((teamServiceId) => {
      const minutesEach = interpolateTimeByArea(
        anchors,
        area,
        teamServiceId,
        cabinetStyleId
      );

      let totalMinutes = minutesEach;

      // Apply multipliers based on service and material
      // Use effectiveMaterial if provided (door/drawer specific), otherwise fall back to selectedFaceMaterial
      const materialForMultipliers = effectiveMaterial || selectedFaceMaterial;
      
      // For 5-piece doors, ALWAYS apply finish multipliers
      const shouldApplyMultipliers =
        doorStyle === FACE_STYLE_VALUES.FIVE_PIECE_HARDWOOD ||
        materialForMultipliers?.material?.needs_finish;

      if (shouldApplyMultipliers && globalServices) {
        const service = globalServices.find(
          (s) => s.team_service_id === parseInt(teamServiceId)
        );
        if (service) {
          if (service.service_id === 2 && materialForMultipliers.shopMultiplier) {
            // Shop multiplier for service ID 2
            totalMinutes *= materialForMultipliers.shopMultiplier;
          } else if (
            service.service_id === 3 &&
            materialForMultipliers.finishMultiplier
          ) {
            // Finish multiplier for service ID 3
            totalMinutes *= materialForMultipliers.finishMultiplier;
          }
        }
      }

      let panelModMinutes = 0;

      if (panelModAnchors && panelModAnchors.length > 0) {
        panelModMinutes = interpolateTimeByArea(
          panelModAnchors,
          area,
          teamServiceId,
          cabinetStyleId
        );
        // Track panel mod hours separately
        panelModHoursByService[teamServiceId] += panelModMinutes;
      }

      hoursByService[teamServiceId] += totalMinutes + panelModMinutes;
    });
  });

  // Convert minutes to hours for final output
  Object.keys(hoursByService).forEach((serviceId) => {
    hoursByService[serviceId] = roundToHundredth(
      hoursByService[serviceId] / 60
    );
  });

  Object.keys(panelModHoursByService).forEach((serviceId) => {
    panelModHoursByService[serviceId] = roundToHundredth(
      panelModHoursByService[serviceId] / 60
    );
  });

  return {
    hoursByService,
    panelModHoursByService,
  };
};

/**
 * Calculate total hours by service for end panels and appliance panels
 * Uses root cabinet dimensions with parts list anchors 17 (end panel) or 18 (appliance panel)
 * @param {Object} cabinet - Cabinet object with width, height, type, quantity
 * @param {number} cabinetStyleId - Cabinet style ID for filtering style-specific anchors
 * @param {Object} context - Calculation context
 * @param {Object} context.partsListAnchors - Redux state.partsListAnchors.itemsByPartsList
 * @param {Object} context.selectedFaceMaterial - Selected face material with multipliers
 * @param {Array} context.globalServices - Global services array
 * @returns {Object} - { serviceId: hours } (already includes quantity multiplier)
 */
export const calculatePanelPartsTime = (
  cabinet,
  cabinetStyleId,
  context = {}
) => {
  const { partsListAnchors, selectedFaceMaterial, globalServices } = context;

  if (!cabinet || !partsListAnchors) {
    return {};
  }

  // Only process end panels (type 10) and appliance panels (type 11)
  if (cabinet.type !== 10 && cabinet.type !== 11) {
    return {};
  }

  // Determine which parts_list_id to use
  const partsListId =
    cabinet.type === 10
      ? PARTS_LIST_MAPPING["end_panel_finished"] // 17
      : PARTS_LIST_MAPPING["appliance_panel_finished"]; // 18

  const anchors = partsListAnchors[partsListId];

  if (!anchors || anchors.length === 0) {
    // No anchors for this panel type - skip it
    return {};
  }

  // Use root dimensions for area calculation
  const area = cabinet.width * cabinet.height;
  const quantity = cabinet.quantity != null ? Number(cabinet.quantity) : 1;

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

  // Calculate time for each service
  allServiceIds.forEach((teamServiceId) => {
    const minutesBase = interpolateTimeByArea(
      anchors,
      area,
      teamServiceId,
      cabinetStyleId
    );

    let totalMinutes = minutesBase;

    // Apply multipliers if material needs finish
    const shouldApplyMultipliers = selectedFaceMaterial?.material?.needs_finish;

    if (shouldApplyMultipliers && globalServices) {
      const service = globalServices.find(
        (s) => s.team_service_id === parseInt(teamServiceId)
      );
      if (service) {
        if (service.service_id === 2 && selectedFaceMaterial.shopMultiplier) {
          // Shop multiplier for service ID 2
          totalMinutes *= selectedFaceMaterial.shopMultiplier;
        } else if (
          service.service_id === 3 &&
          selectedFaceMaterial.finishMultiplier
        ) {
          // Finish multiplier for service ID 3
          totalMinutes *= selectedFaceMaterial.finishMultiplier;
        }
      }
    }

    hoursByService[teamServiceId] += totalMinutes;
  });

  // Convert minutes to hours and multiply by quantity for final output
  Object.keys(hoursByService).forEach((serviceId) => {
    hoursByService[serviceId] = roundToHundredth(
      (hoursByService[serviceId] / 60) * quantity
    );
  });

  return hoursByService;
};

/**
 * Linear interpolation based on a single dimension (length/width)
 * Used for nosing where time is per linear inch
 * @param {Array} anchors - Array of anchor objects with dimensions and services
 * @param {number} targetLength - The length to interpolate for
 * @param {number} teamServiceId - The service ID to get time for
 * @returns {number} - Interpolated time in minutes
 */
const interpolateTimeByLength = (anchors, targetLength, teamServiceId) => {
  if (!anchors || anchors.length === 0) {
    return 0;
  }

  // Build array of {length, minutes} for this service, filtering out missing services
  const dataPoints = anchors
    .map((anchor) => {
      const service = anchor.services.find(
        (s) => s.team_service_id === teamServiceId
      );
      if (!service) return null;

      return {
        length: anchor.height, // Use width as the length dimension
        minutes: service.minutes || 0,
      };
    })
    .filter(Boolean);

  if (dataPoints.length === 0) {
    return 0;
  }

  // Sort by length for interpolation
  dataPoints.sort((a, b) => a.length - b.length);

  // If only one data point, return its value
  if (dataPoints.length === 1) {
    return dataPoints[0].minutes;
  }

  // If target is below minimum, return minimum value
  if (targetLength <= dataPoints[0].length) {
    return dataPoints[0].minutes;
  }

  // Find the two points to interpolate between
  for (let i = 0; i < dataPoints.length - 1; i++) {
    const lower = dataPoints[i];
    const upper = dataPoints[i + 1];

    if (targetLength >= lower.length && targetLength <= upper.length) {
      // Avoid division by zero
      if (upper.length - lower.length === 0) {
        return lower.minutes;
      }

      // Linear interpolation: minutes = m1 + (m2 - m1) * (length - l1) / (l2 - l1)
      const ratio = (targetLength - lower.length) / (upper.length - lower.length);
      const interpolatedMinutes =
        lower.minutes + ratio * (upper.minutes - lower.minutes);

      return roundToHundredth(interpolatedMinutes);
    }
  }

  // If target is above maximum, extrapolate using the last two points
  const lastTwo = dataPoints.slice(-2);
  if (lastTwo.length === 2) {
    const lower = lastTwo[0];
    const upper = lastTwo[1];
    const ratio = (targetLength - lower.length) / (upper.length - lower.length);
    const extrapolatedMinutes =
      lower.minutes + ratio * (upper.minutes - lower.minutes);
    return roundToHundredth(extrapolatedMinutes);
  }

  // Fallback
  return dataPoints[dataPoints.length - 1].minutes;
};

/**
 * Calculate nosing time based on length (time per inch of nosing)
 * Nosing is a process that can be applied to various parts (end panels, appliance panels, etc.)
 * Does NOT apply shop or finish multipliers - it's a separate process
 * @param {number} length - Length of the nosing edge in inches (typically height or width)
 * @param {Object} context - Calculation context
 * @param {Object} context.partsListAnchors - Redux state.partsListAnchors.itemsByPartsList
 * @param {Array} context.globalServices - Global services array
 * @returns {Object} - { serviceId: hours }
 */
export const calculateNosingTime = (length, context = {}) => {
  const { partsListAnchors } = context;

  if (!length || !partsListAnchors) {
    return {};
  }

  const partsListId = PARTS_LIST_MAPPING["nosing"];
  const anchors = partsListAnchors[partsListId];

  if (!anchors || anchors.length === 0) {
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

  // Calculate time for each service based on length using linear interpolation
  allServiceIds.forEach((teamServiceId) => {
    const minutesBase = interpolateTimeByLength(
      anchors,
      length,
      teamServiceId
    );

    // NO multipliers for nosing - it's a separate process
    hoursByService[teamServiceId] = minutesBase;
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
  panelOverlap = 0.5
) => {
  // --- Stiles (2 vertical) ---
  const stileVolume = 2 * thickness * stileWidth * doorHeight;

  // --- Rails (2 horizontal) ---
  const railLength = doorWidth - 2 * stileWidth;
  const railVolume = 2 * thickness * railWidth * railLength;

  // --- Panel (center) ---
  const panelHeight = doorHeight - 2 * railWidth + panelOverlap * 2;
  const panelWidth = doorWidth - 2 * stileWidth + panelOverlap * 2;
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

/**
 * Calculate slab sheet face price using MaxRectsPacker for optimal sheet layout
 * This is the preferred method for aggregated faces across multiple cabinets
 * @param {Array} faces - Array of face objects with width, height, area, and cabinetId
 * @param {Object} selectedMaterial - Material object with sheet dimensions and pricing
 * @param {Object} options - Pricing options (cutPricePerFoot, edgeBandPricePerFoot, etc.)
 * @returns {Object} Cost breakdown with packing efficiency data
 */
export const calculateSlabSheetFacePriceBulk = (
  faces,
  selectedMaterial,
  {
    cutPricePerFoot = 1.5,
    edgeBandPricePerFoot = 0.5,
    taxRate = 0.1,
    setupCostPerSheet = 15,
    kerfWidth = 0.25,
    doorInsideMolding = false,
    doorOutsideMolding = false,
    drawerInsideMolding = false,
    drawerOutsideMolding = false,
  } = {}
) => {
  if (!faces || faces.length === 0 || !selectedMaterial) {
    return {
      sheetCount: 0,
      totalArea: 0,
      totalCost: 0,
      totalCostBeforeTax: 0,
      packingEfficiency: 0,
      bandingLength: 0,
    };
  }

  const sheetWidth = selectedMaterial.width || 48;
  const sheetHeight = selectedMaterial.height || 96;
  const sheetArea = sheetWidth * sheetHeight;
  const sheetPrice = selectedMaterial.sheet_price || 0;

  // Calculate total area of all faces
  const totalPartsArea = faces.reduce((sum, face) => sum + face.area, 0);

  // Calculate total banding length (all 4 sides of each face)
  const totalBandingLength = faces.reduce((sum, face) => {
    return sum + 2 * (face.width + face.height);
  }, 0);

  // Prepare faces for packing (add kerf spacing to each face)
  const packerParts = faces.map((face, index) => ({
    width: face.width + kerfWidth,
    height: face.height + kerfWidth,
    data: {
      originalWidth: face.width,
      originalHeight: face.height,
      area: face.area,
      cabinetId: face.cabinetId,
      faceType: face.faceType,
      index,
    },
  }));

  // Initialize packer with sheet dimensions
  const packer = new MaxRectsPacker(
    sheetWidth + kerfWidth,
    sheetHeight + kerfWidth,
    0,
    {
      smart: true,
      pot: false,
      square: false,
      allowRotation: false,
    }
  );

  // Add all faces to packer
  packer.addArray(packerParts);

  // Get the number of bins (sheets) used
  const sheetsUsed = packer.bins.length;
  
  // Calculate actual packing efficiency
  const totalSheetArea = sheetsUsed * sheetArea;
  const packingEfficiency =
    totalSheetArea > 0 ? totalPartsArea / totalSheetArea : 0;
  
  // Calculate rounded sheets based on actual utilization
  // Find the sheet with the most unused space and apply fractional charging to it
  let roundedSheets;
  if (sheetsUsed === 0) {
    roundedSheets = 0;
  } else if (sheetsUsed === 1) {
    // For single sheet, calculate fractional usage based on area (min 0.5 sheets)
    const fractionalUsage = totalPartsArea / sheetArea;
    roundedSheets = Math.max(fractionalUsage, 0.5);
  } else {
    // For multiple sheets, find the one with the most unused space
    let maxFreeArea = 0;
    let partialSheetIndex = -1;
    
    packer.bins.forEach((bin, index) => {
      // Calculate total free area from all free rectangles in this bin
      const totalFreeArea = bin.freeRectangles.reduce((sum, rect) => {
        return sum + (rect.width * rect.height);
      }, 0);
      
      if (totalFreeArea > maxFreeArea) {
        maxFreeArea = totalFreeArea;
        partialSheetIndex = index;
      }
    });
    
    // Calculate area used on the partial sheet
    const partialSheetUsedArea = packer.bins[partialSheetIndex].rects.reduce((sum, rect) => {
      return sum + rect.data.area;
    }, 0);
    
    // Calculate fractional usage for the partial sheet (min 0.5)
    const partialSheetFraction = Math.max(partialSheetUsedArea / sheetArea, 0.5);
    
    // Count all full sheets + fractional partial sheet
    roundedSheets = (sheetsUsed - 1) + partialSheetFraction;
  }

  // Calculate actual kerf waste based on packed parts
  let totalKerfWaste = 0;
  packer.bins.forEach((bin) => {
    bin.rects.forEach((rect) => {
      const kerfArea = rect.width * rect.height - rect.data.area;
      totalKerfWaste += kerfArea;
    });
  });

  // Calculate costs
  const sheetCost = roundedSheets * sheetPrice;
  const setupCost = Math.ceil(roundedSheets) * setupCostPerSheet;

  // Calculate total perimeter for cutting cost
  const totalPerimeter = faces.reduce((sum, face) => {
    return sum + 2 * (face.width + face.height);
  }, 0);
  const cutCost = (totalPerimeter / 12) * cutPricePerFoot;

  // Calculate banding cost (all 4 sides of each face)
  const bandingCost = (totalBandingLength / 12) * edgeBandPricePerFoot;

  // Calculate molding costs for each face based on faceType
  const moldingCost = faces.reduce((sum, face) => {
    const faceType = face.faceType;
    let insideMolding = false;
    let outsideMolding = false;

    // Determine which molding settings apply based on faceType
    if (
      faceType === FACE_NAMES.DOOR ||
      faceType === FACE_NAMES.PAIR_DOOR ||
      faceType === FACE_NAMES.PANEL
    ) {
      insideMolding = doorInsideMolding;
      outsideMolding = doorOutsideMolding;
    } else if (
      faceType === FACE_NAMES.DRAWER_FRONT ||
      faceType === FACE_NAMES.FALSE_FRONT
    ) {
      insideMolding = drawerInsideMolding;
      outsideMolding = drawerOutsideMolding;
    }

    return (
      sum +
      calculateMoldingCost(
        face.width,
        face.height,
        insideMolding,
        outsideMolding,
        selectedMaterial
      )
    );
  }, 0);

  const totalCostBeforeTax =
    sheetCost + setupCost + cutCost + bandingCost + moldingCost;
  const totalCost = totalCostBeforeTax * (1 + taxRate);

  return {
    sheetCount: parseFloat(roundedSheets.toFixed(2)),
    totalArea: parseFloat(totalPartsArea.toFixed(2)),
    totalCost: parseFloat(totalCost.toFixed(2)),
    totalCostBeforeTax: parseFloat(totalCostBeforeTax.toFixed(2)),
    packingEfficiency: parseFloat((packingEfficiency * 100).toFixed(1)),
    kerfWaste: parseFloat(totalKerfWaste.toFixed(2)),
    partCount: faces.length,
    bandingLength: parseFloat(totalBandingLength.toFixed(2)),
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
      layout: bin.rects.map((rect) => ({
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        rotated: rect.rot || false,
        faceType: rect.data.faceType,
      })),
    })),
    breakdown: {
      sheetCost: parseFloat(sheetCost.toFixed(2)),
      setupCost: parseFloat(setupCost.toFixed(2)),
      cutCost: parseFloat(cutCost.toFixed(2)),
      bandingCost: parseFloat(bandingCost.toFixed(2)),
      moldingCost: parseFloat(moldingCost.toFixed(2)),
    },
  };
};

/**
 * Legacy function - kept for backwards compatibility
 * Consider using calculateSlabSheetFacePriceBulk for better efficiency
 */
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
  const markup = 1 + taxRate / 100 + deliveryFee / 100 + creditCardFee / 100;

  const price = (basePrice + extra + setupFee) * markup;

  return Math.round(price * 100) / 100;
};

/**
 * Calculate 5-piece hardwood face price for an aggregated list of faces
 * This accepts a flat array of face objects from multiple cabinets
 * @param {Array} faces - Array of face objects with width and height
 * @param {Object} selectedMaterial - Material object with bd_ft_price and thickness
 * @returns {number} Total price for all faces
 */
export const calculate5PieceHardwoodFacePriceBulk = (
  faces,
  selectedMaterial
) => {
  if (!faces || faces.length === 0 || !selectedMaterial) {
    return 0;
  }

  // For 5-piece hardwood doors, we use price per board foot
  const pricePerBoardFoot = selectedMaterial.bd_ft_price;
  let totalPrice = 0;

  // Calculate price for each individual face
  faces.forEach((face) => {
    const width = parseFloat(face.width);
    const height = parseFloat(face.height);

    totalPrice += calculate5PieceDoorPrice(
      {
        width,
        height,
        thickness: selectedMaterial.thickness || 0.75,
      },
      pricePerBoardFoot
    );
  });

  return totalPrice;
};

/**
 * Legacy function - kept for backwards compatibility
 * Consider using calculate5PieceHardwoodFacePriceBulk for better efficiency
 */
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

    // // Calculate price for this face
    // const facePrice = roundToHundredth(boardFeet * pricePerBoardFoot);
    totalPrice += calculate5PieceDoorPrice(
      {
        width,
        height,
        thickness: selectedMaterial.thickness || 0.75,
      },
      pricePerBoardFoot
    );
  });

  return totalPrice;
};

/**
 * Calculate slab hardwood face price for an aggregated list of faces
 * @param {Array} faces - Array of face objects with width and height
 * @param {Object} selectedMaterial - Material object with bd_ft_price and thickness
 * @returns {number} Total price for all faces
 */
export const calculateSlabHardwoodFacePriceBulk = (faces, selectedMaterial) => {
  if (!faces || faces.length === 0 || !selectedMaterial) {
    return 0;
  }

  // For slab hardwood, we use price per board foot
  const pricePerBoardFoot = selectedMaterial.bd_ft_price;
  let totalPrice = 0;

  // Calculate board feet and price for each individual face
  faces.forEach((face) => {
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

/**
 * Legacy function - kept for backwards compatibility
 * Consider using calculateSlabHardwoodFacePriceBulk for better efficiency
 */
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

// const slabDoorHourAnchors = {
//   shop: [
//     { area: 768, hours: 0.5 },
//     { area: 1440, hours: 0.7 },
//     { area: 2304, hours: 1.0 },
//   ],
//   install: [
//     { area: 768, hours: 0.1 },
//     { area: 1440, hours: 0.15 },
//     { area: 2304, hours: 0.25 },
//   ],
//   finish: [
//     { area: 768, hours: 0.5 },
//     { area: 1440, hours: 0.6 },
//     { area: 2304, hours: 0.8 },
//   ],
// };

// const calculateInterpolatedSlabDoorHours = (anchors, targetArea) => {
//   const first = anchors[0];
//   const last = anchors[anchors.length - 1];

//   if (targetArea <= first.area) return first.hours;
//   if (targetArea >= last.area) return last.hours;

//   const upperIndex = anchors.findIndex((anchor) => anchor.area >= targetArea);
//   const upper = anchors[upperIndex];
//   const lower = anchors[upperIndex - 1];

//   const areaRange = upper.area - lower.area;
//   const hourRange = upper.hours - lower.hours;
//   const areaOffset = targetArea - lower.area;

//   if (areaRange === 0) return lower.hours;

//   const interpolated = lower.hours + (areaOffset / areaRange) * hourRange;
//   return roundToHundredth(interpolated);
// };

// export const calculateSlabDoorHours = (width, height) => {
//   const area = width * height;
//   return {
//     hoursByService: {
//       2: calculateInterpolatedSlabDoorHours(slabDoorHourAnchors.shop, area), // Shop
//       4: calculateInterpolatedSlabDoorHours(slabDoorHourAnchors.install, area), // Install
//       3: calculateInterpolatedSlabDoorHours(slabDoorHourAnchors.finish, area), // Finish
//     },
//   };
// };

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

    const qty = cab.quantity != null ? Number(cab.quantity) : 1;
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

/**
 * Generate a human-readable text summary of a cabinet's face configuration
 * @param {Object} faceConfig - The face_config object from a cabinet
 * @param {Object} typeSpecificOptions - Optional type-specific options (e.g., shop_built flag)
 * @returns {string} - Text summary like "4 doors (2 glass panels), 5 shelves (2 glass)"
 */
export const generateCabinetSummary = (faceConfig, typeSpecificOptions = {}) => {
  if (!faceConfig) return "";

  const parts = [];

  if (typeSpecificOptions.corner_45) {
    parts.push("45° Corner");
  }

  // Helper to recursively collect all nodes
  const collectNodes = (node, collection = []) => {
    if (!node) return collection;

    collection.push(node);

    if (node.children && Array.isArray(node.children)) {
      node.children.forEach((child) => collectNodes(child, collection));
    }

    return collection;
  };

  const allNodes = collectNodes(faceConfig);

  // Count doors and glass panels
  const doorNodes = allNodes.filter(
    (node) => node.type === "door" || node.type === "pair_door"
  );

  let totalDoors = 0;
  let glassDoorsCount = 0;

  doorNodes.forEach((node) => {
    if (node.type === "pair_door") {
      totalDoors += 2; // Pair door counts as 2 doors
    } else {
      totalDoors += 1;
    }

    // Check if this door has glass panels
    if (node.glassPanel) {
      if (node.type === "pair_door") {
        glassDoorsCount += 2; // Both doors in pair have glass
      } else {
        glassDoorsCount += 1;
      }
    }
  });

  if (totalDoors > 0) {
    if (glassDoorsCount > 0) {
      parts.push(
        `${totalDoors} door${
          totalDoors !== 1 ? "s" : ""
        } (${glassDoorsCount} glass panel${glassDoorsCount !== 1 ? "s" : ""})`
      );
    } else {
      parts.push(`${totalDoors} door${totalDoors !== 1 ? "s" : ""}`);
    }
  }

  // Count drawer fronts
  const drawerNodes = allNodes.filter(
    (node) => node.type === FACE_NAMES.DRAWER_FRONT
  );
  if (drawerNodes.length > 0) {
    parts.push(
      `${drawerNodes.length} drawer${drawerNodes.length !== 1 ? "s" : ""}`
    );
  }

  // Count false fronts
  const falseFrontNodes = allNodes.filter(
    (node) => node.type === FACE_NAMES.FALSE_FRONT
  );
  if (falseFrontNodes.length > 0) {
    parts.push(
      `${falseFrontNodes.length} false front${
        falseFrontNodes.length !== 1 ? "s" : ""
      }`
    );
  }

  // Count open faces
  const openNodes = allNodes.filter((node) => node.type === FACE_NAMES.OPEN);
  if (openNodes.length > 0) {
    parts.push(
      `${openNodes.length} opening${openNodes.length !== 1 ? "s" : ""}`
    );
  }

  // Count panels
  const panelNodes = allNodes.filter((node) => node.type === FACE_NAMES.PANEL);
  if (panelNodes.length > 0) {
    const panelText = `${panelNodes.length} panel${panelNodes.length !== 1 ? "s" : ""}`;
    const shopBuiltSuffix = typeSpecificOptions?.shop_built ? " (shop-built)" : "";
    parts.push(panelText + shopBuiltSuffix);
  }

  // Count shelves and glass shelves
  let totalShelves = 0;
  let glassShelves = 0;

  allNodes.forEach((node) => {
    const shelfQty = parseInt(node.shelfQty, 10) || 0;
    if (shelfQty > 0) {
      totalShelves += shelfQty;

      // Check if this node has glass shelves
      if (node.glassShelves) {
        const glassShelfQty = parseInt(node.shelfQty, 10) || 0;
        glassShelves += glassShelfQty;
      }
    }
  });

  if (totalShelves > 0) {
    if (glassShelves > 0) {
      parts.push(
        `${totalShelves} shel${
          totalShelves !== 1 ? "ves" : "f"
        } (${glassShelves} glass)`
      );
    } else {
      parts.push(`${totalShelves} shel${totalShelves !== 1 ? "ves" : "f"}`);
    }
  }

  // Count rollouts
  let totalRollouts = 0;
  allNodes.forEach((node) => {
    const rollOutQty = parseInt(node.rollOutQty, 10) || 0;
    if (rollOutQty > 0) {
      totalRollouts += rollOutQty;
    }
  });

  if (totalRollouts > 0) {
    parts.push(`${totalRollouts} rollout${totalRollouts !== 1 ? "s" : ""}`);
  }

  // Count accessories from face nodes by traversing the tree
  const accessoryGroups = {};
  
  // Recursively collect accessories from all face nodes
  const collectAccessories = (node) => {
    if (!node) return;
    
    // Collect accessories from this node
    if (node.accessories && Array.isArray(node.accessories)) {
      node.accessories.forEach((accessory) => {
        const name = accessory.name || 'Unknown';
        if (!accessoryGroups[name]) {
          accessoryGroups[name] = 0;
        }
        accessoryGroups[name] += (accessory.quantity != null ? accessory.quantity : 1);
      });
    }
    
    // Recurse through children
    if (node.children && Array.isArray(node.children)) {
      node.children.forEach((child) => collectAccessories(child));
    }
  };
  
  collectAccessories(faceConfig);
  
  // Create summary strings for each accessory type
  if (Object.keys(accessoryGroups).length > 0) {
    Object.entries(accessoryGroups).forEach(([name, count]) => {
      parts.push(`${count} ${name}`);
    });
  }

  return parts.join(", ");
};
