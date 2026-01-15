/**
 * Configuration for different cabinet item types.
 * Defines what features, face types, and calculations apply to each type.
 */

import {
  FACE_TYPES,
  PANEL_FACE_TYPES,
  END_PANEL_FACE_TYPES,
  FILLER_FACE_TYPES,
  FACE_NAMES,
  DOOR_FRONT_FACE_TYPES,
  DRAWER_FRONT_FACE_TYPES,
} from '../utils/constants';

export const CABINET_ITEM_TYPES = {
  cabinet: {
    label: 'Cabinet',
    faceTypesArray: FACE_TYPES, // Use actual face type objects
    defaultFaceType: FACE_NAMES.DOOR,
    usesReveals: true,
    usesRootReveals: true,
    allowsSplitting: true,
    requiresStyleReveals: true,
    isDivisible: true,
    features: {
      sides: true,
      top: true,
      bottom: true,
      back: true,
      shelves: true,
      rollouts: true,
      finishedTop: true,
      finishedBottom: true,
      finishedLeft: true,
      finishedRight: true,
      finishedInterior: true,
      finishedBack: true,
      corner45: true,
    },
  },

  door_front: {
    label: 'Door Front',
    faceTypesArray: DOOR_FRONT_FACE_TYPES,
    defaultFaceType: FACE_NAMES.DOOR,
    usesReveals: false,
    usesRootReveals: false,
    allowsSplitting: false,
    requiresStyleReveals: false,
    isDivisible: false,
    features: {
      sides: false,
      top: false,
      bottom: false,
      back: false,
      shelves: false,
      rollouts: false,
      finishedTop: false,
      finishedBottom: false,
      finishedLeft: false,
      finishedRight: false,
      finishedInterior: false,
      finishedBack: false,
      corner45: false,
    },
  },

  drawer_front: {
    label: 'Drawer Front',
    faceTypesArray: DRAWER_FRONT_FACE_TYPES,
    defaultFaceType: FACE_NAMES.DRAWER_FRONT,
    usesReveals: false,
    usesRootReveals: false,
    allowsSplitting: false,
    requiresStyleReveals: false,
    isDivisible: false,
    features: {
      sides: false,
      top: false,
      bottom: false,
      back: false,
      shelves: false,
      rollouts: false,
      finishedTop: false,
      finishedBottom: false,
      finishedLeft: false,
      finishedRight: false,
      finishedInterior: false,
      finishedBack: false,
      drawerBox: true, // Drawer boxes need width, height, depth
      corner45: false,
    },
  },

  filler: {
    label: 'Filler',
    faceTypesArray: FILLER_FACE_TYPES,
    defaultFaceType: FACE_NAMES.PANEL,
    usesReveals: false,
    usesRootReveals: false,
    allowsSplitting: false,
    requiresStyleReveals: false,
    isDivisible: false,
    features: {
      sides: true, // May need one side
      top: false,
      bottom: false,
      back: false,
      shelves: false,
      rollouts: false,
      finishedTop: false,
      finishedBottom: false,
      finishedLeft: false,
      finishedRight: false,
      finishedInterior: false,
      finishedSide: true, // Can have finished side
      corner45: false,
    },
  },

  end_panel: {
    label: 'End Panel',
    faceTypesArray: END_PANEL_FACE_TYPES,
    defaultFaceType: FACE_NAMES.PANEL,
    // Conditional: use reveals if style is NOT 13 (face frame logic)
    usesReveals: (styleId) => styleId !== 13,
    usesRootReveals: (styleId) => styleId !== 13,
    allowsSplitting: true,
    requiresStyleReveals: true, // Need style to determine reveal usage
    isDivisible: true,
    features: {
      sides: false,
      top: false,
      bottom: false,
      back: false,
      shelves: false,
      rollouts: false,
      finishedTop: true,
      finishedBottom: true,
      finishedLeft: true,
      finishedRight: true,
      finishedInterior: false,
      finishedBack: false,
      corner45: false,
    },
  },

  appliance_panel: {
    label: 'Appliance Panel',
    faceTypesArray: END_PANEL_FACE_TYPES,
    defaultFaceType: FACE_NAMES.PANEL,
    // Conditional: use reveals if style is NOT 13 (face frame logic)
    usesReveals: (styleId) => styleId !== 13,
    usesRootReveals: (styleId) => styleId !== 13,
    allowsSplitting: true,
    requiresStyleReveals: true, // Need style to determine reveal usage
    isDivisible: true,
    features: {
      sides: false,
      top: false,
      bottom: false,
      back: false,
      shelves: false,
      rollouts: false,
      finishedTop: false,
      finishedBottom: false,
      finishedLeft: false,
      finishedRight: false,
      finishedInterior: false,
      finishedBack: false,
      corner45: false,
    },
  },

  drawer_box: {
    label: 'Drawer Box',
    faceTypesArray: [], // Not divisible
    defaultFaceType: FACE_NAMES.drawer_front,
    usesReveals: false,
    usesRootReveals: false,
    allowsSplitting: false,
    requiresStyleReveals: false,
    isDivisible: false,
    features: {
      sides: false,
      top: false,
      bottom: false,
      back: false,
      shelves: false,
      rollouts: false,
      finishedTop: false,
      finishedBottom: false,
      finishedLeft: false,
      finishedRight: false,
      finishedInterior: false,
      finishedBack: false,
      corner45: false,
    },
  },

  rollout: {
    label: 'Rollout',
    faceTypesArray: [], // Not divisible
    defaultFaceType: FACE_NAMES.rollout,
    usesReveals: false,
    usesRootReveals: false,
    allowsSplitting: false,
    requiresStyleReveals: false,
    isDivisible: false,
    features: {
      sides: false,
      top: false,
      bottom: false,
      back: false,
      shelves: false,
      rollouts: false,
      finishedTop: false,
      finishedBottom: false,
      finishedLeft: false,
      finishedRight: false,
      finishedInterior: false,
      finishedBack: false,
    },
  },
  hood: {
    label: 'Hood',
    faceTypesArray: [], // Not divisible
    defaultFaceType: FACE_NAMES.PANEL,
    usesReveals: false,
    usesRootReveals: false,
    allowsSplitting: true,
    requiresStyleReveals: false,
    isDivisible: false,
    features: {
      sides: false,
      top: false,
      bottom: false,
      back: false,
      shelves: false,
      rollouts: false,
      finishedTop: false,
      finishedBottom: false,
      finishedLeft: false,
      finishedRight: false,
      finishedInterior: false,
      finishedBack: false,
      autoScoop: true, // Automatically includes a scoop
      corner45: false,
    },
    typeSpecificOptions: [
      {
        name: 'tapered',
        type: 'checkbox',
        label: 'Tapered Hood',
        defaultValue: false,
        description: 'Hood narrows from bottom to top',
      },
    ],
  },
};

/**
 * Get the configuration for a specific item type
 * @param {string} itemType - The type of cabinet item
 * @returns {object} The configuration object for that type
 */
export const getItemTypeConfig = (itemType = 'cabinet') => {
  return CABINET_ITEM_TYPES[itemType] || CABINET_ITEM_TYPES.cabinet;
};

/**
 * Check if an item type uses reveals (handles conditional logic)
 * @param {string} itemType - The type of cabinet item
 * @param {number} styleId - The cabinet style ID
 * @returns {boolean} Whether reveals should be used
 */
export const shouldUseReveals = (itemType, styleId) => {
  const config = getItemTypeConfig(itemType);
  
  if (typeof config.usesReveals === 'function') {
    return config.usesReveals(styleId);
  }
  
  return config.usesReveals;
};

/**
 * Check if an item type uses root reveals (handles conditional logic)
 * @param {string} itemType - The type of cabinet item
 * @param {number} styleId - The cabinet style ID
 * @returns {boolean} Whether root reveals should be used
 */
export const shouldUseRootReveals = (itemType, styleId) => {
  const config = getItemTypeConfig(itemType);
  
  if (typeof config.usesRootReveals === 'function') {
    return config.usesRootReveals(styleId);
  }
  
  return config.usesRootReveals;
};

/**
 * Get available face types for an item type
 * @param {string} itemType - The type of cabinet item
 * @returns {Array<{value: string, label: string, color: string}>} Array of face type objects
 */
export const getAvailableFaceTypes = (itemType) => {
  const config = getItemTypeConfig(itemType);
  return config.faceTypesArray || [];
};

/**
 * Check if a feature is available for an item type
 * @param {string} itemType - The type of cabinet item
 * @param {string} featureName - The feature to check
 * @returns {boolean} Whether the feature is available
 */
export const hasFeature = (itemType, featureName) => {
  const config = getItemTypeConfig(itemType);
  return config.features[featureName] === true;
};

/**
 * Get all item types as options for a select dropdown
 * @returns {Array<{value: string, label: string}>}
 */
export const getItemTypeOptions = () => {
  return Object.entries(CABINET_ITEM_TYPES).map(([value, config]) => ({
    value,
    label: config.label,
  }));
};
