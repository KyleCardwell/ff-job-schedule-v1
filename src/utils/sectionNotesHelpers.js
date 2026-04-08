import { isEqual } from "lodash";

import { PANEL_MOD_DISPLAY_NAMES, UNFINISHED } from "./constants";

export const SECTION_NOTES_LABELS = [
  "Notes:",
  "Includes:",
  "Does Not Include:",
];

export const buildPanelModNote = (effectiveSection = {}) => {
  const doorPanelModId = effectiveSection.door_panel_mod_id;
  const drawerPanelModId = effectiveSection.drawer_panel_mod_id;
  const hasPanelModDoors = doorPanelModId && doorPanelModId > 0;
  const hasPanelModDrawers = drawerPanelModId && drawerPanelModId > 0;

  if (hasPanelModDoors && hasPanelModDrawers) {
    if (doorPanelModId === drawerPanelModId) {
      const panelModName =
        PANEL_MOD_DISPLAY_NAMES[doorPanelModId] || "Panel Mod";
      return `${panelModName} on doors and drawer fronts.`;
    }

    const doorPanelName =
      PANEL_MOD_DISPLAY_NAMES[doorPanelModId] || "Panel Mod";
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
    effectiveSection.door_inside_molding ||
    effectiveSection.door_outside_molding;
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

export const buildExcludedPullsNote = (
  effectiveSection = {},
  hasDoors = false,
  hasDrawerFronts = false
) => {
  const noDoorPulls = hasDoors && effectiveSection.include_door_pulls === false;
  const noDrawerPulls =
    hasDrawerFronts && effectiveSection.include_drawer_pulls === false;

  if (noDoorPulls && noDrawerPulls) {
    return "Door & Drawer Front Pulls.";
  }
  if (noDoorPulls) {
    return "Door Pulls.";
  }
  if (noDrawerPulls) {
    return "Drawer Front Pulls.";
  }
  return "";
};

const findHardwareById = (options = [], id) => {
  if (!Array.isArray(options) || id === null || id === undefined || id === "") {
    return null;
  }

  return options.find((option) => String(option.id) === String(id)) || null;
};

export const buildHardwareAutoNotes = ({
  effectiveSection = {},
  hardware = {},
  hasDoors = false,
  hasDrawerFronts = false,
  hasDrawerBoxes = false,
}) => {
  if (!effectiveSection) {
    return {
      doorPullNote: "",
      drawerPullNote: "",
      hingeNote: "",
      slideNote: "",
    };
  }

  const pulls = hardware?.pulls || [];
  const hinges = hardware?.hinges || [];
  const slides = hardware?.slides || [];

  const includeDoorPulls = effectiveSection.include_door_pulls !== false;
  const includeDrawerPulls = effectiveSection.include_drawer_pulls !== false;

  const doorPull = findHardwareById(pulls, effectiveSection.door_pull_id);
  const drawerPull = findHardwareById(pulls, effectiveSection.drawer_pull_id);
  const hinge = findHardwareById(hinges, effectiveSection.hinge_id);
  const slide = findHardwareById(slides, effectiveSection.slide_id);

  const shouldAddDoorPullNote =
    hasDoors &&
    includeDoorPulls &&
    doorPull?.auto_add_note &&
    doorPull?.name;

  const shouldAddDrawerPullNote =
    hasDrawerFronts &&
    includeDrawerPulls &&
    drawerPull?.auto_add_note &&
    drawerPull?.name;

  const sameDoorAndDrawerPull =
    shouldAddDoorPullNote &&
    shouldAddDrawerPullNote &&
    String(effectiveSection.door_pull_id) ===
      String(effectiveSection.drawer_pull_id);

  const doorPullNote = sameDoorAndDrawerPull
    ? `Door & Drawer Pulls - ${doorPull.name}.`
    : shouldAddDoorPullNote
      ? `Door Pulls - ${doorPull.name}.`
      : "";

  const drawerPullNote = sameDoorAndDrawerPull
    ? ""
    : shouldAddDrawerPullNote
      ? `Drawer Pulls - ${drawerPull.name}.`
      : "";

  const hingeNote =
    hasDoors && hinge?.auto_add_note && hinge?.name ? `Hinges - ${hinge.name}.` : "";

  const slideNote =
    hasDrawerBoxes && slide?.auto_add_note && slide?.name
      ? `Slides - ${slide.name}.`
      : "";

  return {
    doorPullNote,
    drawerPullNote,
    hingeNote,
    slideNote,
  };
};

export const buildAdditionalSectionNotesText = ({
  effectiveSection,
  hasDoors,
  hasDrawerFronts,
  hasDrawerBoxes,
  faceMaterials,
  finishTypes,
  hardware,
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
  const excludedPullsNote = buildExcludedPullsNote(
    effectiveSection,
    hasDoors,
    hasDrawerFronts,
  );
  const { doorPullNote, drawerPullNote, hingeNote, slideNote } =
    buildHardwareAutoNotes({
      effectiveSection,
      hardware,
      hasDoors,
      hasDrawerFronts,
      hasDrawerBoxes,
    });

  return {
    horizontalGrainNote,
    doorDrawerMaterialNote,
    panelModNote,
    appliedMoldingNote,
    doorPullNote,
    drawerPullNote,
    hingeNote,
    slideNote,
    excludedPullsNote,
    additionalNotesText: [
      horizontalGrainNote,
      doorDrawerMaterialNote,
      panelModNote,
      appliedMoldingNote,
      doorPullNote,
      drawerPullNote,
      hingeNote,
      slideNote,
    ]
      .filter(Boolean)
      .join(" "),
    doesNotIncludeText: [excludedPullsNote].filter(Boolean).join(" "),
  };
};

/**
 * Data-driven registry for section note options.
 * To add a new option, append an entry here — the UI, save logic, and
 * PDF/preview formatting all derive from this array automatically.
 *
 * Option types:
 *   "boolean"      – simple checkbox, saved as `true` when checked
 *   "text-boolean" – checkbox + text input, saved as the text string when checked
 *
 * Fields:
 *   key           – unique identifier stored in `options` on the note entry
 *   noteIndex     – which of the 3 note slots (0 = Notes, 1 = Includes, 2 = Does Not Include)
 *   type          – "boolean" | "text-boolean"
 *   label         – checkbox label shown in the UI
 *   suffix        – (text-boolean only) label text after the text input
 *   placeholder   – (text-boolean only) placeholder for the text input
 *   estimateText  – fn(savedValue) → string shown on estimate / PDF when the option is active
 */
export const SECTION_NOTES_OPTIONS = [
  {
    key: "cabinetHeight",
    noteIndex: 0,
    type: "text-boolean",
    label: "Cabinets Assumed",
    suffix: "ft Tall",
    placeholder: "8",
    estimateText: (value) => {
      const text = typeof value === "string" ? value.trim() : "";
      return text
        ? `Cabinets Assumed ${text}ft Tall.`
        : "Cabinets Assumed __ft Tall.";
    },
  },
  {
    key: "lighting",
    noteIndex: 2,
    type: "boolean",
    label: "Lighting (By Others)",
    estimateText: () => "Lighting (By Others).",
  },
];

export const getOptionsForNoteIndex = (noteIndex) =>
  SECTION_NOTES_OPTIONS.filter((opt) => opt.noteIndex === noteIndex);

const buildNoteEntryText = (entry, index) => {
  if (typeof entry === "string") {
    return entry.trim();
  }

  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    return "";
  }

  const noteText = typeof entry.note === "string" ? entry.note.trim() : "";
  const options =
    entry.options &&
    typeof entry.options === "object" &&
    !Array.isArray(entry.options)
      ? entry.options
      : {};

  const optionLines = getOptionsForNoteIndex(index)
    .filter((opt) => {
      const val = options[opt.key];
      return opt.type === "text-boolean" ? val != null : Boolean(val);
    })
    .map((opt) => opt.estimateText(options[opt.key]))
    .filter(Boolean);

  return [...optionLines, noteText].filter(Boolean).join(" ");
};

export const buildProcessedSectionNotes = (
  sectionNotes,
  additionalNotesText,
  doesNotIncludeText = "",
) => {
  if (sectionNotes) {
    if (Array.isArray(sectionNotes)) {
      const processedNotes = [0, 1, 2].map((index) =>
        buildNoteEntryText(sectionNotes[index], index),
      );

      if (additionalNotesText) {
        if (processedNotes[0]) {
          processedNotes[0] = `${additionalNotesText} ${processedNotes[0]}`;
        } else {
          processedNotes[0] = additionalNotesText;
        }
      }

      if (doesNotIncludeText) {
        if (processedNotes[2]) {
          processedNotes[2] = `${doesNotIncludeText} ${processedNotes[2]}`;
        } else {
          processedNotes[2] = doesNotIncludeText;
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

  if (additionalNotesText || doesNotIncludeText) {
    return [additionalNotesText || "", "", doesNotIncludeText || ""];
  }

  return null;
};

export const buildDisplayNotesLines = (processedNotes) => {
  if (!processedNotes) return null;

  if (Array.isArray(processedNotes)) {
    return processedNotes
      .map((note, index) => {
        const noteText = buildNoteEntryText(note, index);

        if (noteText) {
          const noteLabel = SECTION_NOTES_LABELS[index] || `Note ${index + 1}:`;
          return `${noteLabel} ${noteText}`;
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
