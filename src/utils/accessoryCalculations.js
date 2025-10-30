/**
 * Get the display unit label based on calculation type
 * @param {string} calculationType - The calculation type
 * @returns {string} Unit label for display
 */
export const getUnitLabel = (calculationType) => {
  switch (calculationType) {
    case "area":
      return "sq ft";
    case "length":
    case "perimeter":
      return "ft";
    case "unit":
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
    case "area": {
      // Calculate square footage
      if (!dimensions?.width || !dimensions?.height) {
        return userQuantity;
      }
      const sqInches = dimensions.width * dimensions.height;
      const sqFeet = sqInches / 144;
      return parseFloat(sqFeet.toFixed(2));
    }

    case "length": {
      // Linear measurement (typically width for rods)
      if (!dimensions?.width) {
        return userQuantity;
      }
      const feet = dimensions.width / 12;
      return parseFloat(feet.toFixed(2));
    }

    case "perimeter": {
      // Perimeter calculation (for frame molding, edge banding)
      if (!dimensions?.width || !dimensions?.height) {
        return userQuantity;
      }
      const perimeterInches = 2 * (dimensions.width + dimensions.height);
      const perimeterFeet = perimeterInches / 12;
      return parseFloat(perimeterFeet.toFixed(2));
    }

    case "unit":
    default: {
      // Simple count (inserts, trash cans, organizers)
      return userQuantity;
    }
  }
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
  if (type === "glass" && calculation_type === "area") {
    return {
      width: sourceDimensions?.width,
      height: sourceDimensions?.height,
    };
  }

  // For rods, typically uses opening width
  if (type === "rod" && calculation_type === "length") {
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
 * @returns {Object} Object with team_service_id as keys and minutes as values
 */
export const calculateAccessoryLaborTime = (
  accessory,
  quantity,
  timeAnchors
) => {
  const result = {};

  // Filter anchors for this accessory
  const accessoryAnchors = timeAnchors.filter(
    (anchor) => anchor.accessory_catalog_id === accessory.id
  );

  // Calculate minutes per service
  accessoryAnchors.forEach((anchor) => {
    const totalMinutes = anchor.minutes_per_unit * quantity;
    result[anchor.team_service_id] = parseFloat(totalMinutes.toFixed(2));
  });

  return result;
};
