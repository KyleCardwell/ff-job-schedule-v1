import { calculateNosingTime, roundToHundredth } from "./estimateHelpers";

/**
 * Registry of available length rule keys with metadata for UI display.
 * Each entry defines the rule's label, description, and default params.
 */
export const LENGTH_RULE_REGISTRY = {
  nosing: {
    label: "Nosing",
    description:
      "Adds nosing material area and labor time. Uses parts list anchor interpolation for labor.",
    defaultParams: {
      material_extra_area: true,
    },
  },
  cleating: {
    label: "Cleating",
    description:
      "Adds shop labor time for attaching cleats to the item (e.g., shelves).",
    defaultParams: {
      time_per_foot_minutes: 3,
      // service_id: 2,
    },
  },
  seam_if_long: {
    label: "Seam If Long",
    description:
      "Adds extra shop labor when the item length exceeds a threshold (requires seaming before processing).",
    defaultParams: {
      threshold_inches: 96,
      time_per_seam_minutes: 15,
      // service_id: 2,
    },
  },
  full_depth_return: {
    label: "Full-Depth Return",
    description:
      "Doubles material width for full-depth items (e.g., floating shelves) and adds extra shop labor.",
    defaultParams: {
      width_multiplier: 2.0,
      extra_time_per_foot_minutes: 2,
      // service_id: 2,
    },
  },
};

// ─── Rule handler functions ────────────────────────────────────────────
// Each handler receives (itemContext, params) and returns:
// {
//   materialAddon: number,           // added to material total (dollars)
//   materialWidthMultiplier: number,  // multiplied into width BEFORE base material calc
//   hoursByService: { [serviceId]: hours }
// }
// All fields are optional; missing fields are treated as zero / 1.0.

/**
 * Resolve teamServiceId → service_id using globalServices.
 * Returns null if the service can't be found.
 */
const resolveServiceId = (teamServiceId, globalServices) => {
  const service = globalServices?.find(
    (s) => s.team_service_id === parseInt(teamServiceId)
  );
  return service?.service_id ?? null;
};

/**
 * Nosing rule handler.
 *
 * Material effect: adds nosing strip area (lengthInches × thickness) converted
 *   to cost using the same sheet-goods pricing as the base calc.
 * Labor effect: delegates to calculateNosingTime (parts list anchor interpolation).
 */
const handleNosing = (itemContext, params) => {
  const {
    lengthInches,
    thickness,
    quantity,
    material,
    context,
  } = itemContext;

  const result = {
    materialAddon: 0,
    hoursByService: {},
  };

  // Material: add nosing area when material_extra_area is enabled and thickness > 0.75
  if (params.material_extra_area && thickness > 0.75 && material) {
    const nosingArea = lengthInches * thickness; // square inches
    if (material.sheet_price && material.area) {
      const pricePerSqIn = material.sheet_price / material.area;
      const nosingAreaWithWaste = nosingArea * 1.1;
      result.materialAddon = nosingAreaWithWaste * pricePerSqIn * quantity;
    }
    // For board-feet materials the nosing volume is negligible (already in waste factor)
  }

  // Labor: use calculateNosingTime which returns { [teamServiceId]: hours }
  const nosingHours = calculateNosingTime(lengthInches, {
    partsListAnchors: context.partsListAnchors,
    globalServices: context.globalServices,
  });

  const { globalServices } = context;

  Object.entries(nosingHours).forEach(([teamServiceId, hours]) => {
    const serviceId = resolveServiceId(teamServiceId, globalServices);
    if (serviceId == null) return;

    // Skip finish service if material doesn't need finishing
    if (serviceId === 3 && !material?.needs_finish) return;

    const totalHours = roundToHundredth(hours * quantity);
    if (!result.hoursByService[serviceId]) {
      result.hoursByService[serviceId] = 0;
    }
    result.hoursByService[serviceId] += totalHours;
  });

  return result;
};

/**
 * Cleating rule handler.
 *
 * Material effect: none.
 * Labor effect: adds flat time per linear foot to the configured service.
 */
const handleCleating = (itemContext, params) => {
  const { lengthFeet, quantity } = itemContext;
  const serviceId = params.service_id || 2;
  const timePerFoot = params.time_per_foot_minutes || 0;

  const hours = roundToHundredth((timePerFoot / 60) * lengthFeet * quantity);

  return {
    materialAddon: 0,
    hoursByService: hours > 0 ? { [serviceId]: hours } : {},
  };
};

/**
 * Seam-if-long rule handler.
 *
 * Condition: only applies when lengthInches > threshold.
 * Material effect: none.
 * Labor effect: adds time per seam × number of seams.
 */
const handleSeamIfLong = (itemContext, params) => {
  const { lengthInches, quantity } = itemContext;
  const threshold = params.threshold_inches || 96;
  const timePerSeam = params.time_per_seam_minutes || 15;
  const serviceId = params.service_id || 2;

  const result = {
    materialAddon: 0,
    hoursByService: {},
  };

  if (lengthInches > threshold) {
    const seamCount = Math.ceil(lengthInches / threshold) - 1;
    const hours = roundToHundredth(
      (timePerSeam / 60) * seamCount * quantity
    );
    if (hours > 0) {
      result.hoursByService[serviceId] = hours;
    }
  }

  return result;
};

/**
 * Full-depth return rule handler.
 *
 * Material effect: returns a width multiplier (e.g., 2.0) applied BEFORE
 *   the base material calculation.
 * Labor effect: adds extra time per linear foot.
 */
const handleFullDepthReturn = (itemContext, params) => {
  const { lengthFeet, quantity } = itemContext;
  const widthMultiplier = params.width_multiplier || 2.0;
  const extraTimePerFoot = params.extra_time_per_foot_minutes || 0;
  const serviceId = params.service_id || 2;

  const hours = roundToHundredth(
    (extraTimePerFoot / 60) * lengthFeet * quantity
  );

  return {
    materialAddon: 0,
    materialWidthMultiplier: widthMultiplier,
    hoursByService: hours > 0 ? { [serviceId]: hours } : {},
  };
};

// ─── Handler dispatch map ──────────────────────────────────────────────

const RULE_HANDLERS = {
  nosing: handleNosing,
  cleating: handleCleating,
  seam_if_long: handleSeamIfLong,
  full_depth_return: handleFullDepthReturn,
};

// ─── Public API ────────────────────────────────────────────────────────

/**
 * Apply all rules for a length catalog item and return aggregated effects.
 *
 * @param {Array} rules - Sorted array of { rule_key, params } from the catalog item
 * @param {Object} itemContext - Context for the current line item:
 *   { lengthInches, lengthFeet, width, thickness, quantity, material, miterCount, cutoutCount, context }
 * @returns {Object} {
 *   materialAddon: number,
 *   materialWidthMultiplier: number,
 *   hoursByService: { [serviceId]: hours }
 * }
 */
export const applyLengthRules = (rules, itemContext) => {
  const aggregated = {
    materialAddon: 0,
    materialWidthMultiplier: 1.0,
    hoursByService: {},
  };

  if (!rules || !Array.isArray(rules) || rules.length === 0) {
    return aggregated;
  }

  // Sort by sort_order ascending (should already be sorted from DB, but be safe)
  const sorted = [...rules].sort(
    (a, b) => (a.sort_order || 0) - (b.sort_order || 0)
  );

  sorted.forEach((rule) => {
    const handler = RULE_HANDLERS[rule.rule_key];
    if (!handler) {
      console.warn(`Unknown length rule: ${rule.rule_key}`);
      return;
    }

    const result = handler(itemContext, rule.params || {});

    // Merge materialAddon
    aggregated.materialAddon += result.materialAddon || 0;

    // Merge materialWidthMultiplier (multiply, don't add)
    if (result.materialWidthMultiplier && result.materialWidthMultiplier !== 1.0) {
      aggregated.materialWidthMultiplier *= result.materialWidthMultiplier;
    }

    // Merge hoursByService
    Object.entries(result.hoursByService || {}).forEach(
      ([serviceId, hours]) => {
        if (!aggregated.hoursByService[serviceId]) {
          aggregated.hoursByService[serviceId] = 0;
        }
        aggregated.hoursByService[serviceId] += hours;
      }
    );
  });

  return aggregated;
};
