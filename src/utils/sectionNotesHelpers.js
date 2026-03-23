import { isEqual } from "lodash";

import { PANEL_MOD_DISPLAY_NAMES, UNFINISHED } from "./constants";

export const SECTION_NOTES_LABELS = ["Notes:", "Includes:", "Does Not Include:"];

export const buildPanelModNote = (effectiveSection = {}) => {
  const doorPanelModId = effectiveSection.door_panel_mod_id;
  const drawerPanelModId = effectiveSection.drawer_panel_mod_id;
  const hasPanelModDoors = doorPanelModId && doorPanelModId > 0;
  const hasPanelModDrawers = drawerPanelModId && drawerPanelModId > 0;

  if (hasPanelModDoors && hasPanelModDrawers) {
    if (doorPanelModId === drawerPanelModId) {
      const panelModName = PANEL_MOD_DISPLAY_NAMES[doorPanelModId] || "Panel Mod";
      return `${panelModName} on doors and drawer fronts.`;
    }

    const doorPanelName = PANEL_MOD_DISPLAY_NAMES[doorPanelModId] || "Panel Mod";
    const drawerPanelName =
      PANEL_MOD_DISPLAY_NAMES[drawerPanelModId] || "Panel Mod";
    return `${doorPanelName} on doors, ${drawerPanelName} on drawer fronts.`;
  }

  if (hasPanelModDoors) {
    const panelModName = PANEL_MOD_DISPLAY_NAMES[doorPanelModId] || "Panel Mod";
    return `${panelModName} on doors.`;
  }

  if (hasPanelModDrawers) {
    const panelModName =
      PANEL_MOD_DISPLAY_NAMES[drawerPanelModId] || "Panel Mod";
    return `${panelModName} on drawer fronts.`;
  }

  return "";
};

export const buildDoorDrawerMaterialNote = ({
  effectiveSection,
  hasDoors,
  hasDrawerFronts,
  faceMaterials,
  finishTypes,
}) => {
  if (!effectiveSection) return "";

  const doorMatId = effectiveSection.door_mat || effectiveSection.face_mat;
  const drawerFrontMatId =
    effectiveSection.drawer_front_mat || effectiveSection.face_mat;
  const faceMatId = effectiveSection.face_mat;

  const doorMaterial = faceMaterials?.find((m) => m.id === doorMatId);
  const drawerFrontMaterial = faceMaterials?.find(
    (m) => m.id === drawerFrontMatId,
  );

  const doorMaterialName = doorMaterial?.name || "";
  const drawerFrontMaterialName = drawerFrontMaterial?.name || "";

  const resolveFinishIds = (finishValue, fallbackFinishValue, needsFinish) => {
    if (!needsFinish) return [];

    if (Array.isArray(finishValue)) {
      return finishValue.length === 0 ? [UNFINISHED] : finishValue;
    }

    if (Array.isArray(fallbackFinishValue)) {
      return fallbackFinishValue.length === 0
        ? [UNFINISHED]
        : fallbackFinishValue;
    }

    return [];
  };

  const finishIdsToNames = (finishIds = []) => {
    return finishIds
      .map((fid) => {
        if (fid === UNFINISHED) return UNFINISHED;
        return finishTypes?.find((f) => f.id === fid)?.name;
      })
      .filter(Boolean)
      .join(", ");
  };

  const faceFinishIds = resolveFinishIds(
    effectiveSection.face_finish,
    null,
    true,
  );

  const doorFinishIds = resolveFinishIds(
    effectiveSection.door_finish,
    effectiveSection.face_finish,
    doorMaterial?.needs_finish,
  );

  const drawerFrontFinishIds = resolveFinishIds(
    effectiveSection.drawer_front_finish,
    effectiveSection.face_finish,
    drawerFrontMaterial?.needs_finish,
  );

  const doorFinishNames = finishIdsToNames(doorFinishIds);
  const drawerFrontFinishNames = finishIdsToNames(drawerFrontFinishIds);

  const doorHasExplicitUnfinished =
    doorMaterial?.needs_finish &&
    Array.isArray(effectiveSection.door_finish) &&
    effectiveSection.door_finish.length === 0;
  const drawerFrontHasExplicitUnfinished =
    drawerFrontMaterial?.needs_finish &&
    Array.isArray(effectiveSection.drawer_front_finish) &&
    effectiveSection.drawer_front_finish.length === 0;

  const doorDiffersFromFace =
    effectiveSection.door_mat && effectiveSection.door_mat !== faceMatId;
  const doorFinishDiffersFromFace =
    Array.isArray(effectiveSection.door_finish) &&
    !isEqual(doorFinishIds, faceFinishIds);
  const drawerFrontDiffersFromFace =
    effectiveSection.drawer_front_mat &&
    effectiveSection.drawer_front_mat !== faceMatId;
  const drawerFrontFinishDiffersFromFace =
    Array.isArray(effectiveSection.drawer_front_finish) &&
    !isEqual(drawerFrontFinishIds, faceFinishIds);

  const doorNeedsNote =
    hasDoors &&
    (doorDiffersFromFace ||
      doorFinishDiffersFromFace ||
      doorHasExplicitUnfinished);
  const drawerFrontNeedsNote =
    hasDrawerFronts &&
    (drawerFrontDiffersFromFace ||
      drawerFrontFinishDiffersFromFace ||
      drawerFrontHasExplicitUnfinished);

  if (doorNeedsNote && drawerFrontNeedsNote) {
    if (
      doorMatId === drawerFrontMatId &&
      doorFinishNames === drawerFrontFinishNames
    ) {
      const finishPart = doorFinishNames ? ` (${doorFinishNames})` : "";
      return `Doors & Drawer Fronts: ${doorMaterialName}${finishPart}.`;
    }

    const doorFinishPart = doorFinishNames ? ` (${doorFinishNames})` : "";
    const drawerFinishPart = drawerFrontFinishNames
      ? ` (${drawerFrontFinishNames})`
      : "";

    return `Doors - ${doorMaterialName}${doorFinishPart}. Drawer Fronts - ${drawerFrontMaterialName}${drawerFinishPart}.`;
  }

  if (doorNeedsNote) {
    const finishPart = doorFinishNames ? ` (${doorFinishNames})` : "";
    return `Doors - ${doorMaterialName}${finishPart}.`;
  }

  if (drawerFrontNeedsNote) {
    const finishPart = drawerFrontFinishNames
      ? ` (${drawerFrontFinishNames})`
      : "";
    return `Drawer Fronts: ${drawerFrontMaterialName}${finishPart}.`;
  }

  return "";
};

export const buildAppliedMoldingNote = (effectiveSection = {}) => {
  const hasDoorMolding =
    effectiveSection.door_inside_molding || effectiveSection.door_outside_molding;
  const hasDrawerMolding =
    effectiveSection.drawer_inside_molding ||
    effectiveSection.drawer_outside_molding;

  if (hasDoorMolding && hasDrawerMolding) {
    return "Applied molding on doors and drawer fronts.";
  }

  if (hasDoorMolding) {
    return "Applied molding on doors.";
  }

  if (hasDrawerMolding) {
    return "Applied molding on drawer fronts.";
  }

  return "";
};

export const buildHorizontalGrainNote = (effectiveSection = {}) => {
  if (effectiveSection.horizontal_grain) {
    return "Horizontal Grain.";
  }
  return "";
};

export const buildAdditionalSectionNotesText = ({
  effectiveSection,
  hasDoors,
  hasDrawerFronts,
  faceMaterials,
  finishTypes,
}) => {
  const horizontalGrainNote = buildHorizontalGrainNote(effectiveSection);
  const doorDrawerMaterialNote = buildDoorDrawerMaterialNote({
    effectiveSection,
    hasDoors,
    hasDrawerFronts,
    faceMaterials,
    finishTypes,
  });

  const panelModNote = buildPanelModNote(effectiveSection);
  const appliedMoldingNote = buildAppliedMoldingNote(effectiveSection);

  return {
    horizontalGrainNote,
    doorDrawerMaterialNote,
    panelModNote,
    appliedMoldingNote,
    additionalNotesText: [horizontalGrainNote, doorDrawerMaterialNote, panelModNote, appliedMoldingNote]
      .filter(Boolean)
      .join(" "),
  };
};

export const buildProcessedSectionNotes = (sectionNotes, additionalNotesText) => {
  if (sectionNotes) {
    if (Array.isArray(sectionNotes)) {
      const processedNotes = [...sectionNotes];

      if (additionalNotesText) {
        if (processedNotes[0]) {
          processedNotes[0] = `${additionalNotesText} ${processedNotes[0]}`;
        } else {
          processedNotes[0] = additionalNotesText;
        }
      }

      return processedNotes;
    }

    if (typeof sectionNotes === "string" && sectionNotes.trim()) {
      return additionalNotesText
        ? `${additionalNotesText} ${sectionNotes}`
        : sectionNotes;
    }

    return null;
  }

  if (additionalNotesText) {
    return [additionalNotesText, "", ""];
  }

  return null;
};

export const buildDisplayNotesLines = (processedNotes) => {
  if (!processedNotes) return null;

  if (Array.isArray(processedNotes)) {
    return processedNotes
      .map((note, index) => {
        if (note && note.trim()) {
          const noteLabel = SECTION_NOTES_LABELS[index] || `Note ${index + 1}:`;
          return `${noteLabel} ${note}`;
        }

        return null;
      })
      .filter(Boolean);
  }

  if (typeof processedNotes === "string" && processedNotes.trim()) {
    return [processedNotes];
  }

  return null;
};
