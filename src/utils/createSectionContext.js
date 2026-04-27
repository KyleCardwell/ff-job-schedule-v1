import { getEffectiveDefaults, shouldApplyFinish } from "./estimateDefaults";

/**
 * Apply price overrides to an array of catalog items.
 * Returns a new array with overridden price fields merged onto matching items.
 * @param {Array} items - Array of catalog items (each must have an `id`)
 * @param {Object} overridesMap - { [itemId]: { field: value, ... } }
 * @returns {Array} New array with overridden items
 */
const applyOverrides = (items, overridesMap) => {
  if (!items || !overridesMap || Object.keys(overridesMap).length === 0) {
    return items;
  }
  return items.map((item) => {
    const override = overridesMap[String(item.id)];
    if (!override) return item;
    // Only apply non-null/non-undefined values so defaults are preserved for unset fields
    const filtered = Object.fromEntries(
      Object.entries(override).filter(([, v]) => v != null),
    );
    if (Object.keys(filtered).length === 0) return item;

    const { label_override, ...priceFields } = filtered;
    const renamed =
      typeof label_override === "string" && label_override.trim()
        ? { name: label_override.trim() }
        : {};

    return { ...item, ...priceFields, ...renamed };
  });
};

const optionHasId = (options, value, idKey = "id") => {
  if (!Array.isArray(options) || options.length === 0) return true;
  return options.some((option) => String(option[idKey]) === String(value));
};

const sanitizeOptionId = (value, options, idKey = "id") => {
  if (value === null || value === undefined || value === "") return null;
  return optionHasId(options, value, idKey) ? value : null;
};

const sanitizeFinishArray = (value, finishOptions) => {
  if (value === null || value === undefined) return null;
  if (!Array.isArray(value)) return null;
  if (!Array.isArray(finishOptions) || finishOptions.length === 0) return value;

  if (value.length === 0) return [];

  const allowed = new Set(finishOptions.map((finish) => String(finish.id)));
  const filtered = value.filter((finishId) => allowed.has(String(finishId)));

  return filtered.length > 0 ? filtered : null;
};

/**
 * Creates the context object needed for getSectionCalculations
 * Extracted from EstimateSectionPrice to be reusable across components
 *
 * @param {Object} section - The section object
 * @param {Object} estimate - The current estimate
 * @param {Object} catalogData - All the catalog data from Redux
 * @returns {Object} Object containing context and effectiveSection
 */
export const createSectionContext = (section, estimate, catalogData) => {
  const {
    boxMaterials: rawBoxMaterials,
    faceMaterials: rawFaceMaterials,
    drawerBoxMaterials: rawDrawerBoxMaterials,
    finishTypes: rawFinishTypes,
    cabinetStyles,
    cabinetTypes,
    hardware: rawHardware,
    partsListAnchors,
    cabinetAnchors,
    globalServices,
    lengthsCatalog,
    accessories: rawAccessories,
    teamDefaults,
  } = catalogData;

  // Apply price overrides from the estimate (skip if section opts out)
  const po = section?.use_default_prices ? {} : estimate?.price_overrides || {};
  const boxMaterials = applyOverrides(rawBoxMaterials, po.materials);
  const faceMaterials = applyOverrides(rawFaceMaterials, po.materials);
  const drawerBoxMaterials = applyOverrides(
    rawDrawerBoxMaterials,
    po.drawerBoxMaterials,
  );
  const finishTypes = applyOverrides(rawFinishTypes, po.finishes);
  const hardware = {
    ...rawHardware,
    hinges: applyOverrides(rawHardware?.hinges, po.hardware?.hinges),
    pulls: applyOverrides(rawHardware?.pulls, po.hardware?.pulls),
    slides: applyOverrides(rawHardware?.slides, po.hardware?.slides),
  };
  const accessories = {
    ...rawAccessories,
    catalog: applyOverrides(rawAccessories?.catalog, po.accessories),
  };

  const normalizedSection = {
    ...section,
    cabinet_style_id: sanitizeOptionId(
      section?.cabinet_style_id,
      cabinetStyles,
      "cabinet_style_id",
    ),
    box_mat: sanitizeOptionId(section?.box_mat, boxMaterials),
    face_mat: sanitizeOptionId(section?.face_mat, faceMaterials),
    drawer_box_mat: sanitizeOptionId(section?.drawer_box_mat, drawerBoxMaterials),
    door_mat: sanitizeOptionId(section?.door_mat, faceMaterials),
    drawer_front_mat: sanitizeOptionId(section?.drawer_front_mat, faceMaterials),
    hinge_id: sanitizeOptionId(section?.hinge_id, hardware?.hinges),
    slide_id: sanitizeOptionId(section?.slide_id, hardware?.slides),
    door_pull_id: sanitizeOptionId(section?.door_pull_id, hardware?.pulls),
    drawer_pull_id: sanitizeOptionId(section?.drawer_pull_id, hardware?.pulls),
    face_finish: sanitizeFinishArray(section?.face_finish, finishTypes),
    box_finish: sanitizeFinishArray(section?.box_finish, finishTypes),
    door_finish: sanitizeFinishArray(section?.door_finish, finishTypes),
    drawer_front_finish: sanitizeFinishArray(
      section?.drawer_front_finish,
      finishTypes,
    ),
  };

  const normalizedEstimate = {
    ...estimate,
    default_cabinet_style_id: sanitizeOptionId(
      estimate?.default_cabinet_style_id,
      cabinetStyles,
      "cabinet_style_id",
    ),
    default_box_mat: sanitizeOptionId(estimate?.default_box_mat, boxMaterials),
    default_face_mat: sanitizeOptionId(estimate?.default_face_mat, faceMaterials),
    default_drawer_box_mat: sanitizeOptionId(
      estimate?.default_drawer_box_mat,
      drawerBoxMaterials,
    ),
    default_hinge_id: sanitizeOptionId(estimate?.default_hinge_id, hardware?.hinges),
    default_slide_id: sanitizeOptionId(estimate?.default_slide_id, hardware?.slides),
    default_door_pull_id: sanitizeOptionId(
      estimate?.default_door_pull_id,
      hardware?.pulls,
    ),
    default_drawer_pull_id: sanitizeOptionId(
      estimate?.default_drawer_pull_id,
      hardware?.pulls,
    ),
    default_face_finish: sanitizeFinishArray(
      estimate?.default_face_finish,
      finishTypes,
    ),
    default_box_finish: sanitizeFinishArray(
      estimate?.default_box_finish,
      finishTypes,
    ),
  };

  const normalizedTeamDefaults = {
    ...teamDefaults,
    default_cabinet_style_id: sanitizeOptionId(
      teamDefaults?.default_cabinet_style_id,
      cabinetStyles,
      "cabinet_style_id",
    ),
    default_box_mat: sanitizeOptionId(teamDefaults?.default_box_mat, boxMaterials),
    default_face_mat: sanitizeOptionId(teamDefaults?.default_face_mat, faceMaterials),
    default_drawer_box_mat: sanitizeOptionId(
      teamDefaults?.default_drawer_box_mat,
      drawerBoxMaterials,
    ),
    default_hinge_id: sanitizeOptionId(
      teamDefaults?.default_hinge_id,
      hardware?.hinges,
    ),
    default_slide_id: sanitizeOptionId(
      teamDefaults?.default_slide_id,
      hardware?.slides,
    ),
    default_door_pull_id: sanitizeOptionId(
      teamDefaults?.default_door_pull_id,
      hardware?.pulls,
    ),
    default_drawer_pull_id: sanitizeOptionId(
      teamDefaults?.default_drawer_pull_id,
      hardware?.pulls,
    ),
    default_face_finish: sanitizeFinishArray(
      teamDefaults?.default_face_finish,
      finishTypes,
    ),
    default_box_finish: sanitizeFinishArray(
      teamDefaults?.default_box_finish,
      finishTypes,
    ),
  };

  // Get effective defaults and merge with section (three-tier fallback)
  const effectiveDefaults = getEffectiveDefaults(
    normalizedSection,
    normalizedEstimate,
    normalizedTeamDefaults,
  );

  // Check if face finish should be applied using three-tier fallback
  const faceFinishNeeded =
    (effectiveDefaults?.face_finish === null ||
      (Array.isArray(effectiveDefaults?.face_finish) &&
        effectiveDefaults.face_finish.length > 0)) &&
    shouldApplyFinish(
      normalizedSection.face_mat,
      normalizedEstimate?.default_face_mat,
      normalizedTeamDefaults?.default_face_mat,
      faceMaterials || [],
    );

  // Check if box finish should be applied using three-tier fallback
  const boxFinishNeeded =
    (effectiveDefaults?.box_finish === null ||
      (Array.isArray(effectiveDefaults?.box_finish) &&
        effectiveDefaults.box_finish.length > 0)) &&
    shouldApplyFinish(
      normalizedSection.box_mat,
      normalizedEstimate?.default_box_mat,
      normalizedTeamDefaults?.default_box_mat,
      boxMaterials || [],
    );

  // Check if door finish should be applied
  const doorFinishNeeded =
    (effectiveDefaults?.door_finish === null ||
      (Array.isArray(effectiveDefaults?.door_finish) &&
        effectiveDefaults.door_finish.length > 0)) &&
    shouldApplyFinish(
      normalizedSection.door_mat || normalizedSection.face_mat,
      normalizedEstimate?.default_face_mat,
      normalizedTeamDefaults?.default_face_mat,
      faceMaterials || [],
    );

  // Check if drawer front finish should be applied
  const drawerFrontFinishNeeded =
    (effectiveDefaults?.drawer_front_finish === null ||
      (Array.isArray(effectiveDefaults?.drawer_front_finish) &&
        effectiveDefaults.drawer_front_finish.length > 0)) &&
    shouldApplyFinish(
      normalizedSection.drawer_front_mat || normalizedSection.face_mat,
      normalizedEstimate?.default_face_mat,
      normalizedTeamDefaults?.default_face_mat,
      faceMaterials || [],
    );

  // Merge the effective defaults with the section, preserving cabinet items and other data
  const effectiveSection = {
    ...section,
    // Override with effective defaults
    cabinet_style_id: effectiveDefaults.cabinet_style_id,
    box_mat: effectiveDefaults.box_mat,
    face_mat: effectiveDefaults.face_mat,
    drawer_box_mat: effectiveDefaults.drawer_box_mat,
    door_mat: effectiveDefaults.door_mat,
    drawer_front_mat: effectiveDefaults.drawer_front_mat,
    hinge_id: effectiveDefaults.hinge_id,
    slide_id: effectiveDefaults.slide_id,
    door_pull_id: effectiveDefaults.door_pull_id,
    drawer_pull_id: effectiveDefaults.drawer_pull_id,
    include_door_pulls: effectiveDefaults.include_door_pulls,
    include_drawer_pulls: effectiveDefaults.include_drawer_pulls,
    // Only include finishes if the material needs them
    face_finish: faceFinishNeeded ? effectiveDefaults.face_finish : [],
    box_finish: boxFinishNeeded ? effectiveDefaults.box_finish : [],
    door_finish: doorFinishNeeded ? effectiveDefaults.door_finish : [],
    drawer_front_finish: drawerFrontFinishNeeded
      ? effectiveDefaults.drawer_front_finish
      : [],
    door_inside_molding: effectiveDefaults.door_inside_molding,
    door_outside_molding: effectiveDefaults.door_outside_molding,
    drawer_inside_molding: effectiveDefaults.drawer_inside_molding,
    drawer_outside_molding: effectiveDefaults.drawer_outside_molding,
    horizontal_grain: effectiveDefaults.horizontal_grain,
    door_panel_mod_id: effectiveDefaults.door_panel_mod_id,
    drawer_panel_mod_id: effectiveDefaults.drawer_panel_mod_id,
    door_style: effectiveDefaults.door_style,
    drawer_front_style: effectiveDefaults.drawer_front_style,
    quantity: effectiveDefaults.quantity,
    profit: effectiveDefaults.profit || 0,
    commission: effectiveDefaults.commission || 0,
    discount: effectiveDefaults.discount || 0,
  };

  // Create selectedFaceMaterial with finish multipliers
  const selectedFaceMaterial = (() => {
    let finishMultiplier = 0;
    let shopMultiplier = 1;
    const material = faceMaterials?.find(
      (mat) => mat.id === effectiveSection.face_mat,
    );

      // // Check if finish should be applied using three-tier fallback
      // const finishNeeded = shouldApplyFinish(
      //   section.face_mat,
      //   estimate?.default_face_mat,
      //   teamDefaults?.default_face_mat,
      //   faceMaterials || [],
      // );

    if (faceFinishNeeded) {
      finishMultiplier = 1;
      effectiveSection.face_finish.forEach((finishId) => {
        const finishObj = finishTypes?.find((ft) => ft.id === finishId);
        if (finishObj?.finish_markup) {
          finishMultiplier += finishObj.finish_markup / 100;
        }
        if (finishObj?.shop_markup) {
          shopMultiplier += finishObj.shop_markup / 100;
        }
      });
    }

    return { material, finishMultiplier, shopMultiplier };
  })();

  // Create selectedBoxMaterial with finish multipliers
  const selectedBoxMaterial = (() => {
    let finishMultiplier = 0;
    let shopMultiplier = 1;
    const material = boxMaterials?.find(
      (mat) => mat.id === effectiveSection.box_mat,
    );

    // // Check if finish should be applied using three-tier fallback
    // const finishNeeded = shouldApplyFinish(
    //   section.box_mat,
    //   estimate?.default_box_mat,
    //   teamDefaults?.default_box_mat,
    //   boxMaterials || [],
    // );

    if (boxFinishNeeded) {
      finishMultiplier = 1;
      effectiveSection.box_finish.forEach((finishId) => {
        const finishObj = finishTypes?.find((ft) => ft.id === finishId);
        if (finishObj?.finish_markup) {
          finishMultiplier += finishObj.finish_markup / 100;
        }
        if (finishObj?.shop_markup) {
          shopMultiplier += finishObj.shop_markup / 100;
        }
      });
    }

    return { material, finishMultiplier, shopMultiplier };
  })();

  // Create selectedDoorMaterial with finish multipliers (falls back to face material)
  const selectedDoorMaterial = (() => {
    let finishMultiplier = 0;
    let shopMultiplier = 1;
    const effectiveDoorMatId =
      effectiveSection.door_mat || effectiveSection.face_mat;
    const material = faceMaterials?.find(
      (mat) => mat.id === effectiveDoorMatId,
    );

    // // Check if finish should be applied
    // const finishNeeded = shouldApplyFinish(
    //   section.door_mat || section.face_mat,
    //   estimate?.default_face_mat,
    //   teamDefaults?.default_face_mat,
    //   faceMaterials || [],
    // );

    if (doorFinishNeeded) {
      // door_finish already resolved by getEffectiveDefaults (falls back to face_finish if null)
      // An explicit [] means "None" — skip finish entirely
      const finishesToUse = effectiveSection.door_finish;

      if (finishesToUse?.length > 0) {
        finishMultiplier = 1;
        finishesToUse.forEach((finishId) => {
          const finishObj = finishTypes?.find((ft) => ft.id === finishId);
          if (finishObj?.finish_markup) {
            finishMultiplier += finishObj.finish_markup / 100;
          }
          if (finishObj?.shop_markup) {
            shopMultiplier += finishObj.shop_markup / 100;
          }
        });
      }
    }

    return { material, finishMultiplier, shopMultiplier };
  })();

  // Create selectedDrawerFrontMaterial with finish multipliers (falls back to face material)
  const selectedDrawerFrontMaterial = (() => {
    let finishMultiplier = 0;
    let shopMultiplier = 1;
    const effectiveDrawerFrontMatId =
      effectiveSection.drawer_front_mat || effectiveSection.face_mat;
    const material = faceMaterials?.find(
      (mat) => mat.id === effectiveDrawerFrontMatId,
    );

    // // Check if finish should be applied
    // const finishNeeded = shouldApplyFinish(
    //   section.drawer_front_mat || section.face_mat,
    //   estimate?.default_face_mat,
    //   teamDefaults?.default_face_mat,
    //   faceMaterials || [],
    // );

    if (drawerFrontFinishNeeded) {
      // drawer_front_finish already resolved by getEffectiveDefaults (falls back to face_finish if null)
      // An explicit [] means "None" — skip finish entirely
      const finishesToUse = effectiveSection.drawer_front_finish;

      if (finishesToUse?.length > 0) {
        finishMultiplier = 1;
        finishesToUse.forEach((finishId) => {
          const finishObj = finishTypes?.find((ft) => ft.id === finishId);
          if (finishObj?.finish_markup) {
            finishMultiplier += finishObj.finish_markup / 100;
          }
          if (finishObj?.shop_markup) {
            shopMultiplier += finishObj.shop_markup / 100;
          }
        });
      }
    }

    return { material, finishMultiplier, shopMultiplier };
  })();

  // Build the complete context object
  const context = {
    boxMaterials,
    faceMaterials,
    drawerBoxMaterials,
    selectedFaceMaterial,
    selectedBoxMaterial,
    selectedDoorMaterial,
    selectedDrawerFrontMaterial,
    finishTypes,
    cabinetStyles,
    cabinetTypes,
    hardware,
    partsListAnchors,
    cabinetAnchors,
    globalServices,
    lengthsCatalog,
    accessories,
    estimate: normalizedEstimate,
    team: normalizedTeamDefaults,
    effectiveSection,
  };

  // Check if this section uses any items that have price overrides
  const hasPriceOverrides = (() => {
    if (!po || Object.keys(po).length === 0) return false;

    const has = (overridesMap, id) =>
      overridesMap && id != null && String(id) in overridesMap;

    // Materials (covers box_mat, face_mat, door_mat, drawer_front_mat)
    if (po.materials) {
      const matIds = [
        effectiveSection.box_mat,
        effectiveSection.face_mat,
        effectiveSection.door_mat,
        effectiveSection.drawer_front_mat,
      ];
      if (matIds.some((id) => has(po.materials, id))) return true;
    }

    // Drawer box materials
    if (has(po.drawerBoxMaterials, effectiveSection.drawer_box_mat))
      return true;

    // Finishes
    if (po.finishes) {
      const finishIds = [
        ...(effectiveSection.face_finish || []),
        ...(effectiveSection.box_finish || []),
        ...(effectiveSection.door_finish || []),
        ...(effectiveSection.drawer_front_finish || []),
      ];
      if (finishIds.some((id) => has(po.finishes, id))) return true;
    }

    // Hardware
    if (po.hardware) {
      if (has(po.hardware.hinges, effectiveSection.hinge_id)) return true;
      if (has(po.hardware.pulls, effectiveSection.door_pull_id)) return true;
      if (has(po.hardware.pulls, effectiveSection.drawer_pull_id)) return true;
      if (has(po.hardware.slides, effectiveSection.slide_id)) return true;
    }

    // Accessories (section-level and cabinet-embedded)
    if (po.accessories) {
      // Section-level accessories
      if (
        section.accessories?.some((a) =>
          has(po.accessories, a.accessory_catalog_id),
        )
      ) {
        return true;
      }
      // Cabinet-embedded accessories from face configs
      if (
        section.cabinets?.some((cab) => {
          const checkNode = (node) => {
            if (!node) return false;
            if (
              node.accessories?.some((a) => has(po.accessories, a.accessory_id))
            )
              return true;
            return node.children?.some((child) => checkNode(child)) || false;
          };
          return checkNode(cab.face_config);
        })
      ) {
        return true;
      }
    }

    return false;
  })();

  // Return context, effectiveSection, and whether overrides affect this section
  return { context, effectiveSection, hasPriceOverrides };
};
