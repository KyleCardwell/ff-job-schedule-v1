import {
  getEffectiveDefaults,
  shouldApplyFinish,
} from "./estimateDefaults";

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
    boxMaterials,
    faceMaterials,
    drawerBoxMaterials,
    finishTypes,
    cabinetStyles,
    cabinetTypes,
    hardware,
    partsListAnchors,
    cabinetAnchors,
    globalServices,
    lengthsCatalog,
    accessories,
    teamDefaults,
  } = catalogData;

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
  
  // Merge the effective defaults with the section, preserving cabinet items and other data
  const effectiveSection = {
    ...section,
    // Override with effective defaults
    cabinet_style_id: effectiveDefaults.cabinet_style_id,
    box_mat: effectiveDefaults.box_mat,
    face_mat: effectiveDefaults.face_mat,
    drawer_box_mat: effectiveDefaults.drawer_box_mat,
    hinge_id: effectiveDefaults.hinge_id,
    slide_id: effectiveDefaults.slide_id,
    door_pull_id: effectiveDefaults.door_pull_id,
    drawer_pull_id: effectiveDefaults.drawer_pull_id,
    // Only include finishes if the material needs them
    face_finish: faceFinishNeeded ? effectiveDefaults.face_finish : [],
    box_finish: boxFinishNeeded ? effectiveDefaults.box_finish : [],
    door_inside_molding: effectiveDefaults.door_inside_molding,
    door_outside_molding: effectiveDefaults.door_outside_molding,
    drawer_inside_molding: effectiveDefaults.drawer_inside_molding,
    drawer_outside_molding: effectiveDefaults.drawer_outside_molding,
    door_reeded_panel: effectiveDefaults.door_reeded_panel,
    drawer_reeded_panel: effectiveDefaults.drawer_reeded_panel,
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

  // Build the complete context object
  const context = {
    boxMaterials,
    faceMaterials,
    drawerBoxMaterials,
    selectedFaceMaterial,
    selectedBoxMaterial,
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

  // Return both context and effectiveSection
  return { context, effectiveSection };
};
