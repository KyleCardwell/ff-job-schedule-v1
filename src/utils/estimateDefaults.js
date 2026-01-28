/**
 * Utility functions for managing three-tier defaults system
 * Priority: Section → Estimate → Team
 * 
 * When a value is null/undefined at the section level, it falls back to estimate defaults.
 * When a value is null/undefined at the estimate level, it falls back to team defaults.
 * Team defaults are never null (enforced at database level).
 */

/**
 * Get the effective value using three-tier fallback logic
 * @param {*} sectionValue - Value from the section
 * @param {*} estimateValue - Value from the estimate defaults
 * @param {*} teamValue - Value from the team defaults (always non-null)
 * @returns {Object} Object with value and source: { value: *, source: 'section' | 'estimate' | 'team' }
 */
export const getEffectiveValue = (sectionValue, estimateValue, teamValue) => {
  // If section has a value (including 0, false, empty array, or empty string), use it
  if (sectionValue !== null && sectionValue !== undefined) {
    return { value: sectionValue, source: 'section' };
  }
  
  // If estimate has a value, use it
  if (estimateValue !== null && estimateValue !== undefined) {
    return { value: estimateValue, source: 'estimate' };
  }
  
  // Fall back to team default (should never be null)
  return { value: teamValue, source: 'team' };
};

/**
 * Helper to get just the value (without source metadata) for backward compatibility
 * @param {*} sectionValue - Value from the section
 * @param {*} estimateValue - Value from the estimate defaults
 * @param {*} teamValue - Value from the team defaults (always non-null)
 * @returns {*} The effective value after fallback
 */
export const getEffectiveValueOnly = (sectionValue, estimateValue, teamValue) => {
  return getEffectiveValue(sectionValue, estimateValue, teamValue).value;
};


/**
 * Get all effective defaults for a section using the fallback chain
 * @param {Object} section - Section data
 * @param {Object} estimate - Estimate data with defaults
 * @param {Object} team - Team data with defaults
 * @returns {Object} Object with all effective default values (just values, no source metadata)
 */
export const getEffectiveDefaults = (section = {}, estimate = {}, team = {}) => {
  return {
    // Cabinet style (required field)
    cabinet_style_id: getEffectiveValueOnly(
      section.cabinet_style_id,
      estimate.default_cabinet_style_id,
      team.default_cabinet_style_id
    ),
    
    // Materials
    box_mat: getEffectiveValueOnly(
      section.box_mat,
      estimate.default_box_mat,
      team.default_box_mat
    ),
    face_mat: getEffectiveValueOnly(
      section.face_mat,
      estimate.default_face_mat,
      team.default_face_mat
    ),
    drawer_box_mat: getEffectiveValueOnly(
      section.drawer_box_mat,
      estimate.default_drawer_box_mat,
      team.default_drawer_box_mat
    ),
    // Door and drawer front materials (section-level only, fallback to face_mat)
    door_mat: section.door_mat || getEffectiveValueOnly(
      section.face_mat,
      estimate.default_face_mat,
      team.default_face_mat
    ),
    drawer_front_mat: section.drawer_front_mat || getEffectiveValueOnly(
      section.face_mat,
      estimate.default_face_mat,
      team.default_face_mat
    ),
    
    // Hardware
    hinge_id: getEffectiveValueOnly(
      section.hinge_id,
      estimate.default_hinge_id,
      team.default_hinge_id
    ),
    slide_id: getEffectiveValueOnly(
      section.slide_id,
      estimate.default_slide_id,
      team.default_slide_id
    ),
    door_pull_id: getEffectiveValueOnly(
      section.door_pull_id,
      estimate.default_door_pull_id,
      team.default_door_pull_id
    ),
    drawer_pull_id: getEffectiveValueOnly(
      section.drawer_pull_id,
      estimate.default_drawer_pull_id,
      team.default_drawer_pull_id
    ),
    
    // Finishes (arrays)
    face_finish: getEffectiveValueOnly(
      section.face_finish,
      estimate.default_face_finish,
      team.default_face_finish
    ),
    box_finish: getEffectiveValueOnly(
      section.box_finish,
      estimate.default_box_finish,
      team.default_box_finish
    ),
    // Door and drawer front finishes (section-level only, fallback to face_finish)
    door_finish: section.door_finish || getEffectiveValueOnly(
      section.face_finish,
      estimate.default_face_finish,
      team.default_face_finish
    ),
    drawer_front_finish: section.drawer_front_finish || getEffectiveValueOnly(
      section.face_finish,
      estimate.default_face_finish,
      team.default_face_finish
    ),
    
    // Molding options (booleans)
    door_inside_molding: getEffectiveValueOnly(
      section.door_inside_molding,
      estimate.default_door_inside_molding,
      team.default_door_inside_molding
    ),
    door_outside_molding: getEffectiveValueOnly(
      section.door_outside_molding,
      estimate.default_door_outside_molding,
      team.default_door_outside_molding
    ),
    drawer_inside_molding: getEffectiveValueOnly(
      section.drawer_inside_molding,
      estimate.default_drawer_inside_molding,
      team.default_drawer_inside_molding
    ),
    drawer_outside_molding: getEffectiveValueOnly(
      section.drawer_outside_molding,
      estimate.default_drawer_outside_molding,
      team.default_drawer_outside_molding
    ),
    
    // Panel mods (foreign key to parts_list, NULL = none)
    door_panel_mod_id: getEffectiveValueOnly(
      section.door_panel_mod_id,
      estimate.default_door_panel_mod_id,
      team.default_door_panel_mod_id
    ),
    drawer_panel_mod_id: getEffectiveValueOnly(
      section.drawer_panel_mod_id,
      estimate.default_drawer_panel_mod_id,
      team.default_drawer_panel_mod_id
    ),
    
    // Door and drawer styles (text)
    door_style: getEffectiveValueOnly(
      section.door_style,
      estimate.default_door_style,
      team.default_door_style
    ),
    drawer_front_style: getEffectiveValueOnly(
      section.drawer_front_style,
      estimate.default_drawer_front_style,
      team.default_drawer_front_style
    ),

    // Quantity
    quantity: getEffectiveValueOnly(
      section.quantity,
      estimate.default_quantity,
      team.default_quantity
    ),

    // Profit, commission, and discount (numbers)
    profit: getEffectiveValueOnly(
      section.profit,
      estimate.default_profit,
      team.default_profit
    ),
    commission: getEffectiveValueOnly(
      section.commission,
      estimate.default_commission,
      team.default_commission
    ),
    discount: getEffectiveValueOnly(
      section.discount,
      estimate.default_discount,
      team.default_discount
    ),
  };
};

/**
 * Get initial form data for a new section (uses estimate/team defaults)
 * @param {Object} estimate - Estimate data with defaults
 * @param {Object} team - Team data with defaults
 * @returns {Object} Initial form data for a new section
 */
export const getNewSectionDefaults = (estimate = {}, team = {}) => {
  return getEffectiveDefaults({}, estimate, team);
};

/**
 * Field mapping for converting between form field names and database column names
 */
export const DEFAULTS_FIELD_MAPPING = {
  // Form field name → Database column name (for section level)
  style: 'cabinet_style_id',
  boxMaterial: 'box_mat',
  faceMaterial: 'face_mat',
  drawer_box_mat: 'drawer_box_mat',
  door_mat: 'door_mat',
  drawer_front_mat: 'drawer_front_mat',
  hinge_id: 'hinge_id',
  slide_id: 'slide_id',
  door_pull_id: 'door_pull_id',
  drawer_pull_id: 'drawer_pull_id',
  faceFinish: 'face_finish',
  boxFinish: 'box_finish',
  door_finish: 'door_finish',
  drawer_front_finish: 'drawer_front_finish',
  doorInsideMolding: 'door_inside_molding',
  doorOutsideMolding: 'door_outside_molding',
  drawerInsideMolding: 'drawer_inside_molding',
  drawerOutsideMolding: 'drawer_outside_molding',
  doorPanelModId: 'door_panel_mod_id',
  drawerPanelModId: 'drawer_panel_mod_id',
  doorStyle: 'door_style',
  drawerFrontStyle: 'drawer_front_style',
  quantity: 'quantity',
  profit: 'profit',
  commission: 'commission',
  discount: 'discount',
};

/**
 * Get default column name for a specific level (team or estimate)
 * @param {string} fieldName - Database column name (e.g., 'cabinet_style_id')
 * @param {string} level - Level ('team' or 'estimate')
 * @returns {string} The default column name for that level
 */
export const getDefaultColumnName = (fieldName, level) => {
  if (level === 'team') {
    return `default_${fieldName}`;
  } else if (level === 'estimate') {
    return `default_${fieldName}`;
  }
  return fieldName;
};


/**
 * Determine if finish should be applied based on the effective material
 * Uses three-tier fallback to find the material, then checks if it needs finish
 * @param {number|null} sectionMaterialId - Material ID from section level
 * @param {number|null} estimateMaterialId - Material ID from estimate defaults
 * @param {number|null} teamMaterialId - Material ID from team defaults
 * @param {Array} materialOptions - Array of material objects with id and needs_finish properties
 * @returns {boolean} Whether finish should be applied for the effective material
 */
export const shouldApplyFinish = (
  sectionMaterialId,
  estimateMaterialId,
  teamMaterialId,
  materialOptions
) => {
  // Get the effective material ID using three-tier fallback
  const { value: effectiveMaterialId } = getEffectiveValue(
    sectionMaterialId,
    estimateMaterialId,
    teamMaterialId
  );

  // If no material is selected, don't apply finish
  if (!effectiveMaterialId || !materialOptions) {
    return false;
  }

  // Find the material and check if it needs finish
  const material = materialOptions.find((m) => m.id === effectiveMaterialId);
  return material?.needs_finish || false;
};
