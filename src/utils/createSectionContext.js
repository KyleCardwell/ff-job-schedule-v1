import {
  getEffectiveDefaults,
  shouldApplyFinish,
} from "./estimateDefaults";

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
      Object.entries(override).filter(([, v]) => v != null)
    );
    return Object.keys(filtered).length > 0 ? { ...item, ...filtered } : item;
  });
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

  // Apply price overrides from the estimate
  const po = estimate?.price_overrides || {};
  const boxMaterials = applyOverrides(rawBoxMaterials, po.materials);
  const faceMaterials = applyOverrides(rawFaceMaterials, po.materials);
  const drawerBoxMaterials = applyOverrides(rawDrawerBoxMaterials, po.drawerBoxMaterials);
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

  // Get effective defaults and merge with section (three-tier fallback)
  const effectiveDefaults = getEffectiveDefaults(section, estimate, teamDefaults);
  
  // Check if face finish should be applied using three-tier fallback
  const faceFinishNeeded = shouldApplyFinish(
    section.face_mat,
    estimate?.default_face_mat,
    teamDefaults?.default_face_mat,
    faceMaterials || []
  );
  
  // Check if box finish should be applied using three-tier fallback
  const boxFinishNeeded = shouldApplyFinish(
    section.box_mat,
    estimate?.default_box_mat,
    teamDefaults?.default_box_mat,
    boxMaterials || []
  );
  
  // Check if door finish should be applied
  const doorFinishNeeded = shouldApplyFinish(
    section.door_mat || section.face_mat,
    estimate?.default_face_mat,
    teamDefaults?.default_face_mat,
    faceMaterials || []
  );
  
  // Check if drawer front finish should be applied
  const drawerFrontFinishNeeded = shouldApplyFinish(
    section.drawer_front_mat || section.face_mat,
    estimate?.default_face_mat,
    teamDefaults?.default_face_mat,
    faceMaterials || []
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
    // Only include finishes if the material needs them
    face_finish: faceFinishNeeded ? effectiveDefaults.face_finish : [],
    box_finish: boxFinishNeeded ? effectiveDefaults.box_finish : [],
    door_finish: doorFinishNeeded ? effectiveDefaults.door_finish : [],
    drawer_front_finish: drawerFrontFinishNeeded ? effectiveDefaults.drawer_front_finish : [],
    door_inside_molding: effectiveDefaults.door_inside_molding,
    door_outside_molding: effectiveDefaults.door_outside_molding,
    drawer_inside_molding: effectiveDefaults.drawer_inside_molding,
    drawer_outside_molding: effectiveDefaults.drawer_outside_molding,
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
      (mat) => mat.id === effectiveSection.face_mat
    );

    // Check if finish should be applied using three-tier fallback
    const finishNeeded = shouldApplyFinish(
      section.face_mat,
      estimate?.default_face_mat,
      teamDefaults?.default_face_mat,
      faceMaterials || []
    );

    if (finishNeeded) {
      finishMultiplier = 1;
      if (effectiveSection.face_finish?.length > 0) {
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
    }

    return { material, finishMultiplier, shopMultiplier };
  })();

  // Create selectedBoxMaterial with finish multipliers
  const selectedBoxMaterial = (() => {
    let finishMultiplier = 0;
    let shopMultiplier = 1;
    const material = boxMaterials?.find(
      (mat) => mat.id === effectiveSection.box_mat
    );

    // Check if finish should be applied using three-tier fallback
    const finishNeeded = shouldApplyFinish(
      section.box_mat,
      estimate?.default_box_mat,
      teamDefaults?.default_box_mat,
      boxMaterials || []
    );

    if (finishNeeded) {
      finishMultiplier = 1;
      if (effectiveSection.box_finish?.length > 0) {
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
    }

    return { material, finishMultiplier, shopMultiplier };
  })();

  // Create selectedDoorMaterial with finish multipliers (falls back to face material)
  const selectedDoorMaterial = (() => {
    let finishMultiplier = 0;
    let shopMultiplier = 1;
    const effectiveDoorMatId = effectiveSection.door_mat || effectiveSection.face_mat;
    const material = faceMaterials?.find(
      (mat) => mat.id === effectiveDoorMatId
    );

    // Check if finish should be applied
    const finishNeeded = shouldApplyFinish(
      section.door_mat || section.face_mat,
      estimate?.default_face_mat,
      teamDefaults?.default_face_mat,
      faceMaterials || []
    );

    if (finishNeeded) {
      finishMultiplier = 1;
      const finishesToUse = effectiveSection.door_finish?.length > 0 
        ? effectiveSection.door_finish 
        : effectiveSection.face_finish;
      
      if (finishesToUse?.length > 0) {
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
    const effectiveDrawerFrontMatId = effectiveSection.drawer_front_mat || effectiveSection.face_mat;
    const material = faceMaterials?.find(
      (mat) => mat.id === effectiveDrawerFrontMatId
    );

    // Check if finish should be applied
    const finishNeeded = shouldApplyFinish(
      section.drawer_front_mat || section.face_mat,
      estimate?.default_face_mat,
      teamDefaults?.default_face_mat,
      faceMaterials || []
    );

    if (finishNeeded) {
      finishMultiplier = 1;
      const finishesToUse = effectiveSection.drawer_front_finish?.length > 0 
        ? effectiveSection.drawer_front_finish 
        : effectiveSection.face_finish;
      
      if (finishesToUse?.length > 0) {
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
    estimate,
    team: teamDefaults,
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
    if (has(po.drawerBoxMaterials, effectiveSection.drawer_box_mat)) return true;

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
      if (section.accessories?.some((a) => has(po.accessories, a.accessory_catalog_id))) {
        return true;
      }
      // Cabinet-embedded accessories from face configs
      if (section.cabinets?.some((cab) => {
        const checkNode = (node) => {
          if (!node) return false;
          if (node.accessories?.some((a) => has(po.accessories, a.accessory_id))) return true;
          return node.children?.some((child) => checkNode(child)) || false;
        };
        return checkNode(cab.face_config);
      })) {
        return true;
      }
    }

    return false;
  })();

  // Return context, effectiveSection, and whether overrides affect this section
  return { context, effectiveSection, hasPriceOverrides };
};
