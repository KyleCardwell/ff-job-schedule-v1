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
 * @returns {*} The effective value after fallback
 */
export const getEffectiveValue = (sectionValue, estimateValue, teamValue) => {
  // If section has a value (including 0, false, empty array, or empty string), use it
  if (sectionValue !== null && sectionValue !== undefined) {
    return sectionValue;
  }
  
  // If estimate has a value, use it
  if (estimateValue !== null && estimateValue !== undefined) {
    return estimateValue;
  }
  
  // Fall back to team default (should never be null)
  return teamValue;
};

/**
 * Get all effective defaults for a section using the fallback chain
 * @param {Object} section - Section data
 * @param {Object} estimate - Estimate data with defaults
 * @param {Object} team - Team data with defaults
 * @returns {Object} Object with all effective default values
 */
export const getEffectiveDefaults = (section = {}, estimate = {}, team = {}) => {
  return {
    // Cabinet style (required field)
    cabinet_style_id: getEffectiveValue(
      section.cabinet_style_id,
      estimate.default_cabinet_style_id,
      team.default_cabinet_style_id
    ),
    
    // Materials
    box_mat: getEffectiveValue(
      section.box_mat,
      estimate.default_box_mat,
      team.default_box_mat
    ),
    face_mat: getEffectiveValue(
      section.face_mat,
      estimate.default_face_mat,
      team.default_face_mat
    ),
    drawer_box_mat: getEffectiveValue(
      section.drawer_box_mat,
      estimate.default_drawer_box_mat,
      team.default_drawer_box_mat
    ),
    
    // Hardware
    hinge_id: getEffectiveValue(
      section.hinge_id,
      estimate.default_hinge_id,
      team.default_hinge_id
    ),
    slide_id: getEffectiveValue(
      section.slide_id,
      estimate.default_slide_id,
      team.default_slide_id
    ),
    door_pull_id: getEffectiveValue(
      section.door_pull_id,
      estimate.default_door_pull_id,
      team.default_door_pull_id
    ),
    drawer_pull_id: getEffectiveValue(
      section.drawer_pull_id,
      estimate.default_drawer_pull_id,
      team.default_drawer_pull_id
    ),
    
    // Finishes (arrays)
    face_finish: getEffectiveValue(
      section.face_finish,
      estimate.default_face_finish,
      team.default_face_finish
    ),
    box_finish: getEffectiveValue(
      section.box_finish,
      estimate.default_box_finish,
      team.default_box_finish
    ),
    
    // Molding options (booleans)
    door_inside_molding: getEffectiveValue(
      section.door_inside_molding,
      estimate.default_door_inside_molding,
      team.default_door_inside_molding
    ),
    door_outside_molding: getEffectiveValue(
      section.door_outside_molding,
      estimate.default_door_outside_molding,
      team.default_door_outside_molding
    ),
    drawer_inside_molding: getEffectiveValue(
      section.drawer_inside_molding,
      estimate.default_drawer_inside_molding,
      team.default_drawer_inside_molding
    ),
    drawer_outside_molding: getEffectiveValue(
      section.drawer_outside_molding,
      estimate.default_drawer_outside_molding,
      team.default_drawer_outside_molding
    ),
    
    // Reeded panels (booleans)
    door_reeded_panel: getEffectiveValue(
      section.door_reeded_panel,
      estimate.default_door_reeded_panel,
      team.default_door_reeded_panel
    ),
    drawer_reeded_panel: getEffectiveValue(
      section.drawer_reeded_panel,
      estimate.default_drawer_reeded_panel,
      team.default_drawer_reeded_panel
    ),
    
    // Door and drawer styles (text)
    door_style: getEffectiveValue(
      section.door_style,
      estimate.default_door_style,
      team.default_door_style
    ),
    drawer_front_style: getEffectiveValue(
      section.drawer_front_style,
      estimate.default_drawer_front_style,
      team.default_drawer_front_style
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
  hinge_id: 'hinge_id',
  slide_id: 'slide_id',
  door_pull_id: 'door_pull_id',
  drawer_pull_id: 'drawer_pull_id',
  faceFinish: 'face_finish',
  boxFinish: 'box_finish',
  doorInsideMolding: 'door_inside_molding',
  doorOutsideMolding: 'door_outside_molding',
  drawerInsideMolding: 'drawer_inside_molding',
  drawerOutsideMolding: 'drawer_outside_molding',
  doorReededPanel: 'door_reeded_panel',
  drawerReededPanel: 'drawer_reeded_panel',
  doorStyle: 'door_style',
  drawerFrontStyle: 'drawer_front_style',
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
