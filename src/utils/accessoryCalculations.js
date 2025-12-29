import { ACCESSORY_TYPES, ACCESSORY_UNITS } from "./constants";
import { roundToHundredth } from "./estimateHelpers";

/**
 * Get the display unit label based on calculation type
 * @param {string} calculationType - The calculation type
 * @returns {string} Unit label for display
 */
export const getUnitLabel = (calculationType) => {
  switch (calculationType) {
    case ACCESSORY_UNITS.VOLUME:
      return "cu ft";
    case ACCESSORY_UNITS.AREA:
      return "sq ft";
    case ACCESSORY_UNITS.LENGTH:
    case ACCESSORY_UNITS.PERIMETER:
      return "ft";
    case ACCESSORY_UNITS.UNIT:
    default:
      return "unit";
  }
};

/**
 * Calculate accessory quantity based on calculation type and dimensions
 * @param {Object} accessory - The accessory catalog item
 * @param {Object} dimensions - { width, height, depth } in inches
 * @param {number} userQuantity - Manual quantity for unit-based items
 * @returns {number} Calculated quantity
 */
export const calculateAccessoryQuantity = (
  accessory,
  dimensions,
  userQuantity = 1
) => {
  const { calculation_type } = accessory;

  switch (calculation_type) {
    case ACCESSORY_UNITS.VOLUME: {
      // Calculate cubic feet
      if (!dimensions?.width || !dimensions?.height || !dimensions?.depth) {
        return userQuantity;
      }
      const cuInches = dimensions.width * dimensions.height * dimensions.depth;
      const cuFeet = cuInches / 1728;
      return parseFloat(cuFeet.toFixed(2));
    }
    case ACCESSORY_UNITS.AREA: {
      // Calculate square footage
      if (!dimensions?.width || !dimensions?.height) {
        return userQuantity;
      }
      const sqInches = dimensions.width * dimensions.height;
      const sqFeet = sqInches / 144;
      return parseFloat(sqFeet.toFixed(2));
    }

    case ACCESSORY_UNITS.LENGTH: {
      // Linear measurement (typically width for rods)
      if (!dimensions?.width) {
        return userQuantity;
      }
      const feet = dimensions.width / 12;
      return parseFloat(feet.toFixed(2));
    }

    case ACCESSORY_UNITS.PERIMETER: {
      // Perimeter calculation (for frame molding, edge banding)
      if (!dimensions?.width || !dimensions?.height) {
        return userQuantity;
      }
      const perimeterInches = 2 * (dimensions.width + dimensions.height);
      const perimeterFeet = perimeterInches / 12;
      return parseFloat(perimeterFeet.toFixed(2));
    }

    case ACCESSORY_UNITS.UNIT:
    default: {
      // Simple count (inserts, trash cans, organizers)
      return userQuantity;
    }
  }
};

/**
 * Calculate proportional unit quantity and price for an accessory item
 * Compares item dimensions to catalog dimensions and scales price accordingly
 * @param {Object} accessory - The accessory catalog item
 * @param {Object} itemDimensions - { width, height, depth } from the estimate item
 * @returns {Object} { unit, basePrice, unitDifference } - unit quantity, base price, and size difference for labor calculations
 */
export const calculateAccessoryUnitAndPrice = (
  accessory,
  itemDimensions
) => {
  // Get item dimensions, preferring item dimensions over catalog defaults
  const itemDims = {
    width: itemDimensions.width || accessory.width || 0,
    height: itemDimensions.height || accessory.height || 0,
    depth: itemDimensions.depth || accessory.depth || 0,
  };

  // Get catalog dimensions
  const catalogDims = {
    width: accessory.width || 0,
    height: accessory.height || 0,
    depth: accessory.depth || 0,
  };

  // Calculate unit quantities for both item and catalog
  const itemUnit = calculateAccessoryQuantity(accessory, itemDims, 1);
  const catalogUnit = calculateAccessoryQuantity(accessory, catalogDims, 1);

  // Calculate proportional price based on size ratio
  const catalogPrice = accessory.default_price_per_unit || 0;
  
  let basePrice = 0;
  let unitDifference = 0;
  
  if (catalogUnit > 0) {
    // Scale price proportionally: (itemSize / catalogSize) × catalogPrice
    const sizeRatio = itemUnit / catalogUnit;
    basePrice = sizeRatio * catalogPrice;
    
    // Calculate unit difference for labor time adjustments
    // If item is larger than catalog, this will be positive
    // If item is smaller, this will be negative (but we'll use Math.max(0, ...) in labor calc)
    unitDifference = itemUnit - catalogUnit;
  } else if (accessory.calculation_type === ACCESSORY_UNITS.UNIT) {
    // For UNIT type with no catalog dimensions, use catalog price directly
    basePrice = catalogPrice;
    unitDifference = 0;
  }

  return {
    unit: roundToHundredth(itemUnit),
    basePrice: roundToHundredth(basePrice),
    unitDifference: roundToHundredth(unitDifference),
  };
};

/**
 * Calculate total price for accessory
 * @param {Object} accessory - The accessory catalog item
 * @param {number} quantity - Calculated quantity
 * @returns {number} Total price
 */
export const calculateAccessoryPrice = (accessory, quantity) => {
  if (!accessory.default_price_per_unit) return 0;
  return parseFloat((quantity * accessory.default_price_per_unit).toFixed(2));
};

/**
 * Filter accessories by context and optionally by type
 * @param {Array} accessories - Array of accessory catalog items
 * @param {string} context - Context (door, drawer_front, opening, cabinet, standalone)
 * @param {Array|null} types - Optional array of types to filter by
 * @returns {Array} Filtered accessories
 */
export const filterAccessoriesByContext = (
  accessories,
  context,
  types = null
) => {
  let filtered = accessories.filter(
    (acc) =>
      acc.applies_to.includes(context) || acc.applies_to.includes("standalone")
  );

  if (types && types.length > 0) {
    filtered = filtered.filter((acc) => types.includes(acc.type));
  }

  return filtered;
};

/**
 * Get appropriate dimensions for accessory calculation
 * Handles different accessory types and their dimension requirements
 * @param {Object} accessory - The accessory catalog item
 * @param {Object} sourceDimensions - Source dimensions from face or user input
 * @returns {Object} Dimensions object { width, height, depth }
 */
export const getAccessoryDimensions = (accessory, sourceDimensions) => {
  const { type, calculation_type } = accessory;

  // If accessory has fixed dimensions, use those
  if (accessory.width || accessory.height || accessory.depth) {
    return {
      width: accessory.width || sourceDimensions?.width,
      height: accessory.height || sourceDimensions?.height,
      depth: accessory.depth || sourceDimensions?.depth,
    };
  }

  // For glass, typically matches face dimensions
  if (type === ACCESSORY_TYPES.GLASS && calculation_type === ACCESSORY_UNITS.AREA) {
    return {
      width: sourceDimensions?.width,
      height: sourceDimensions?.height,
    };
  }

  // For rods, typically uses opening width
  if (type === ACCESSORY_TYPES.ROD && calculation_type === ACCESSORY_UNITS.LENGTH) {
    return {
      width: sourceDimensions?.width,
    };
  }

  // Default: use source dimensions
  return sourceDimensions;
};

/**
 * Calculate labor time for accessory based on time anchors
 * @param {Object} accessory - The accessory catalog item
 * @param {number} quantity - Calculated quantity
 * @param {Array} timeAnchors - Array of time anchor objects
 * @param {Object} materialContext - Optional material context for shop-built items
 * @param {Object} materialContext.selectedFaceMaterial - Face material with multipliers
 * @param {Array} materialContext.globalServices - Global services array
 * @returns {Object} Object with team_service_id as keys and minutes as values
 */
export const calculateAccessoryLaborTime = (
  accessory,
  quantity,
  timeAnchors,
  materialContext = null
) => {
  const result = {};

  // Filter anchors for this accessory
  const accessoryAnchors = timeAnchors.filter(
    (anchor) => anchor.accessory_catalog_id === accessory.id
  );

  // Calculate minutes per service
  accessoryAnchors.forEach((anchor) => {
    let totalMinutes = anchor.minutes_per_unit * quantity;

    // Apply multipliers for shop-built items that match room material
    if (
      accessory.matches_room_material &&
      materialContext?.selectedFaceMaterial &&
      materialContext?.globalServices
    ) {
      const service = materialContext.globalServices.find(
        (s) => s.team_service_id === anchor.team_service_id
      );

      if (service && materialContext.selectedFaceMaterial.material?.needs_finish) {
        // Apply shop multiplier for service ID 2
        if (service.service_id === 2 && materialContext.selectedFaceMaterial.shopMultiplier) {
          totalMinutes *= materialContext.selectedFaceMaterial.shopMultiplier;
        }
        // Apply finish multiplier for service ID 3
        if (service.service_id === 3 && materialContext.selectedFaceMaterial.finishMultiplier) {
          totalMinutes *= materialContext.selectedFaceMaterial.finishMultiplier;
        }
      }
    }

    result[anchor.team_service_id] = parseFloat(totalMinutes.toFixed(2));
  });

  return result;
};

/**
 * Calculate material cost for shop-built accessories that match room material
 * @param {Object} accessory - The accessory catalog item
 * @param {Object} dimensions - { width, height, depth } in inches
 * @param {number} quantity - Item quantity
 * @param {Object} selectedFaceMaterial - Face material object with material and pricing
 * @returns {number} Total material cost
 */
export const calculateShopBuiltMaterialCost = (
  accessory,
  dimensions,
  quantity,
  selectedFaceMaterial
) => {
  if (!accessory.matches_room_material || !selectedFaceMaterial?.material) {
    return 0;
  }

  const { width = 0, height = 0, depth = 0 } = dimensions;
  const material = selectedFaceMaterial.material;
  const wasteFactor = accessory.material_waste_factor || 1.25;

  // Calculate volume in cubic inches
  const volume = width * height * depth;

  if (volume === 0) {
    return 0;
  }

  let materialCost = 0;

  if (material.bd_ft_price) {
    // Hardwood: calculate board feet
    // Board feet = (width * height * depth) / 144
    const boardFeet = volume / 144;
    const boardFeetWithWaste = boardFeet * wasteFactor;
    materialCost = boardFeetWithWaste * material.bd_ft_price * quantity;
  } else if (material.sheet_price && material.area) {
    // Sheet goods: calculate area/volume ratio
    // For 3D items, we approximate by treating as solid volume
    const volumeWithWaste = volume * wasteFactor;
    const materialThickness = material.thickness || 0.75;
    const sheetVolume = material.width * material.height * materialThickness;
    
    if (sheetVolume > 0) {
      const sheetsNeeded = volumeWithWaste / sheetVolume;
      materialCost = sheetsNeeded * material.sheet_price * quantity;
    }
  }

  return roundToHundredth(materialCost);
};

/**
 * Calculate total price for accessory including material cost for shop-built items
 * @param {Object} accessory - The accessory catalog item
 * @param {number} quantity - Calculated quantity
 * @param {Object} dimensions - Optional dimensions for shop-built items
 * @param {Object} selectedFaceMaterial - Optional face material for shop-built items
 * @returns {number} Total price
 */
export const calculateAccessoryPriceWithMaterial = (
  accessory,
  quantity,
  dimensions = null,
  selectedFaceMaterial = null
) => {
  let totalPrice = 0;

  // Base price from catalog
  if (accessory.default_price_per_unit) {
    totalPrice += quantity * accessory.default_price_per_unit;
  }

  // Add material cost for shop-built items
  if (accessory.matches_room_material && dimensions && selectedFaceMaterial) {
    const materialCost = calculateShopBuiltMaterialCost(
      accessory,
      dimensions,
      quantity,
      selectedFaceMaterial
    );
    totalPrice += materialCost;
  }

  return roundToHundredth(totalPrice);
};
