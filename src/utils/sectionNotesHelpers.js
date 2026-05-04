import { isEqual } from "lodash";

import { FACE_NAMES, PANEL_MOD_DISPLAY_NAMES, UNFINISHED } from "./constants";

export const SECTION_NOTES_LABELS = [
  "Notes:",
  "Includes:",
  "Does Not Include:",
];

export const buildPanelModNote = (effectiveSection = {}) => {
  const doorPanelModId = effectiveSection.door_panel_mod_id;
  const drawerPanelModId = effectiveSection.drawer_panel_mod_id;
  const hasPanelModDoors = Number(doorPanelModId) > 0;
  const hasPanelModDrawers = Number(drawerPanelModId) > 0;

  const getPanelModName = (panelModId) =>
    PANEL_MOD_DISPLAY_NAMES[panelModId] || `Panel Mod ${panelModId}`;

  let baseNote = "";

  if (hasPanelModDoors && hasPanelModDrawers) {
    if (doorPanelModId === drawerPanelModId) {
      const panelModName = getPanelModName(doorPanelModId);
      baseNote = `${panelModName} Panels on doors and drawer fronts.`;
    } else {
      const doorPanelName = getPanelModName(doorPanelModId);
      const drawerPanelName = getPanelModName(drawerPanelModId);
      baseNote = `${doorPanelName} Panels on doors, ${drawerPanelName} Panels on drawer fronts.`;
    }
  } else if (hasPanelModDoors) {
    const panelModName = getPanelModName(doorPanelModId);
    baseNote = `${panelModName} Panels on doors.`;
  } else if (hasPanelModDrawers) {
    const panelModName = getPanelModName(drawerPanelModId);
    baseNote = `${panelModName} Panels on drawer fronts.`;
  }

  const panelModCountsByName = {};
  const panelModEligibleTypes = new Set([
    FACE_NAMES.DOOR,
    FACE_NAMES.PAIR_DOOR,
    FACE_NAMES.DRAWER_FRONT,
    FACE_NAMES.FALSE_FRONT,
    FACE_NAMES.PANEL,
  ]);

  const getExpectedPanelModIdForType = (faceType) => {
    if (
      faceType === FACE_NAMES.DOOR ||
      faceType === FACE_NAMES.PAIR_DOOR ||
      faceType === FACE_NAMES.PANEL
    ) {
      return Number(doorPanelModId) || 0;
    }

    if (
      faceType === FACE_NAMES.DRAWER_FRONT ||
      faceType === FACE_NAMES.FALSE_FRONT
    ) {
      return Number(drawerPanelModId) || 0;
    }

    return 0;
  };

  const collectPanelModsFromNode = (node) => {
    if (!node) return;

    if (panelModEligibleTypes.has(node.type) && node.panelMod != null) {
      const panelModId = Number(node.panelMod);
      const expectedPanelModId = getExpectedPanelModIdForType(node.type);

      if (Number.isFinite(panelModId) && panelModId !== expectedPanelModId) {
        const count = node.type === FACE_NAMES.PAIR_DOOR ? 2 : 1;

        let panelModName = "";
        if (panelModId > 0) {
          panelModName = getPanelModName(panelModId);
        } else if (panelModId === 0 && expectedPanelModId > 0) {
          panelModName = `not ${getPanelModName(expectedPanelModId)}`;
        }

        if (!panelModName) return;

        panelModCountsByName[panelModName] =
          (panelModCountsByName[panelModName] || 0) + count;
      }
    }

    if (Array.isArray(node.children)) {
      node.children.forEach(collectPanelModsFromNode);
    }
  };

  if (Array.isArray(effectiveSection.cabinets)) {
    effectiveSection.cabinets.forEach((cabinet) => {
      if (cabinet?.face_config) {
        collectPanelModsFromNode(cabinet.face_config);
      }
    });
  }

  const panelModEntries = Object.entries(panelModCountsByName);
  if (panelModEntries.length > 0) {
    const panelModParts = panelModEntries
      .map(
        ([panelModName, count]) =>
          `${count} ${panelModName} panel${count !== 1 ? "s" : ""}`,
      )
      .join(", ");

    if (baseNote) {
      return `${baseNote} ${panelModParts}.`;
    }

    return `${panelModParts}.`;
  }

  return baseNote;
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

  const effectiveFaceMaterial = faceMaterials.find(
    (m) => m.id === faceMatId,
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
    effectiveFaceMaterial?.needs_finish !== false,
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
      return `Doors & Drawer Fronts - ${doorMaterialName}${finishPart}.`;
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
    return `Drawer Fronts - ${drawerFrontMaterialName}${finishPart}.`;
  }

  return "";
};

const normalizeOptionalId = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : value;
};

const normalizeFinishArray = (value) => {
  if (!Array.isArray(value)) return null;

  return value
    .map((finishId) => {
      const num = Number(finishId);
      return Number.isFinite(num) ? num : finishId;
    })
    .sort((a, b) => String(a).localeCompare(String(b)));
};

const formatFinishNames = (finishIds = [], finishTypes = []) => {
  if (!Array.isArray(finishIds)) return "";
  if (finishIds.length === 0) return UNFINISHED;

  return finishIds
    .map((finishId) => {
      const finish = finishTypes?.find((f) => String(f.id) === String(finishId));
      return finish?.name || `Finish ${finishId}`;
    })
    .join(", ");
};

const F_VES_EXCEPTIONS = new Set([
  "belief",
  "chef",
  "chief",
  "cliff",
  "giraffe",
  "handkerchief",
  "proof",
  "reef",
  "roof",
  "safe",
]);

const pluralizeItemName = (name) => {
  if (!name) return "";
  const trimmed = String(name).trim();
  if (!trimmed) return "";

  const lower = trimmed.toLowerCase();

  if (/(s|x|z|ch|sh)$/i.test(trimmed)) return `${trimmed}es`;
  if (/[^aeiou]y$/i.test(trimmed)) return `${trimmed.slice(0, -1)}ies`;

  if (/fe$/i.test(trimmed) && !F_VES_EXCEPTIONS.has(lower)) {
    return `${trimmed.slice(0, -2)}ves`;
  }

  if (/f$/i.test(trimmed) && !/ff$/i.test(trimmed) && !F_VES_EXCEPTIONS.has(lower)) {
    return `${trimmed.slice(0, -1)}ves`;
  }

  return `${trimmed}s`;
};

const formatGroupedLengthNames = (names = []) => {
  const counts = new Map();
  names.forEach((name) => {
    if (!name) return;
    counts.set(name, (counts.get(name) || 0) + 1);
  });

  return Array.from(counts.entries())
    .map(([name, count]) => (count > 1 ? pluralizeItemName(name) : name))
    .join(", ");
};

export const buildLengthMaterialFinishNote = ({
  effectiveSection,
  faceMaterials,
  finishTypes,
  lengthsCatalog,
}) => {
  const sectionLengths = Array.isArray(effectiveSection?.lengths)
    ? effectiveSection.lengths
    : [];
  if (sectionLengths.length === 0) return "";

  const defaultMaterialId = normalizeOptionalId(effectiveSection?.face_mat);
  const defaultFinishIds = normalizeFinishArray(effectiveSection?.face_finish);

  const lengthNameById = new Map(
    (Array.isArray(lengthsCatalog) ? lengthsCatalog : [])
      .filter((length) => length?.id !== null && length?.id !== undefined)
      .map((length) => [String(length.id), length.name]),
  );

  const groupedOverrides = new Map();

  sectionLengths.forEach((lengthItem, index) => {
    if (!lengthItem) return;

    const materialOverrideId = normalizeOptionalId(lengthItem.length_mat);
    const finishOverrideIds = normalizeFinishArray(lengthItem.length_finish);

    const effectiveMaterialId = materialOverrideId ?? defaultMaterialId;
    const effectiveFinishIds = finishOverrideIds ?? defaultFinishIds;

    const materialDiffers =
      String(effectiveMaterialId ?? "") !== String(defaultMaterialId ?? "");
    const finishDiffers = !isEqual(effectiveFinishIds ?? null, defaultFinishIds ?? null);

    if (!materialDiffers && !finishDiffers) return;

    const detailParts = [];

    if (materialDiffers) {
      const materialName = faceMaterials?.find(
        (material) => String(material.id) === String(effectiveMaterialId),
      )?.name;
      detailParts.push(
        `${materialName || `Material ${effectiveMaterialId}`}`,
      );
    }

    if (finishDiffers) {
      detailParts.push(
        `Finish: ${formatFinishNames(effectiveFinishIds, finishTypes)}`,
      );
    }

    const groupKey = JSON.stringify({
      material: materialDiffers ? effectiveMaterialId : null,
      finish: finishDiffers ? effectiveFinishIds : null,
    });

    const lengthName =
      lengthNameById.get(String(lengthItem.length_catalog_id)) ||
      lengthItem.length_name ||
      `Length ${index + 1}`;

    if (!groupedOverrides.has(groupKey)) {
      groupedOverrides.set(groupKey, {
        names: [],
        detailText: detailParts.join(", "),
      });
    }

    groupedOverrides.get(groupKey).names.push(lengthName);
  });

  if (groupedOverrides.size === 0) return "";

  const groupText = Array.from(groupedOverrides.values())
    .map(({ names, detailText }) => {
      const groupedNames = formatGroupedLengthNames(names);
      return `${groupedNames} (${detailText}).`;
    })
    .join(" ");

  return groupText;
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

const formatOtherItemQuantity = (quantity) => {
  if (quantity === null || quantity === undefined || quantity === "") {
    return "";
  }

  const numeric = Number(quantity);
  if (Number.isFinite(numeric)) {
    if (numeric < 0) return "";
    return Number.isInteger(numeric) ? String(numeric) : String(numeric);
  }

  const trimmed = String(quantity).trim();
  return trimmed || "";
};

export const buildOtherItemsIncludesNote = (effectiveSection = {}) => {
  const otherItems = Array.isArray(effectiveSection?.other)
    ? effectiveSection.other
    : [];

  const includedItemsText = otherItems
    .filter((item) => item?.note_included)
    .map((item) => {
      const rawName = typeof item?.name === "string" ? item.name.trim() : "";
      if (!rawName) return "";

      const name = rawName.endsWith(".") ? rawName.slice(0, -1).trim() : rawName;
      if (!name) return "";

      const quantityText = formatOtherItemQuantity(item?.quantity) || "1";
      return `${quantityText} ${name}.`;
    })
    .filter(Boolean);

  return includedItemsText.join(" ");
};

export const buildAdditionalSectionNotesText = ({
  effectiveSection,
  hasDoors,
  hasDrawerFronts,
  hasDrawerBoxes,
  faceMaterials,
  finishTypes,
  hardware,
  lengthsCatalog,
}) => {
  const horizontalGrainNote = buildHorizontalGrainNote(effectiveSection);
  const doorDrawerMaterialNote = buildDoorDrawerMaterialNote({
    effectiveSection,
    hasDoors,
    hasDrawerFronts,
    faceMaterials,
    finishTypes,
  });
  const lengthMaterialFinishNote = buildLengthMaterialFinishNote({
    effectiveSection,
    faceMaterials,
    finishTypes,
    lengthsCatalog,
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
  const otherItemsIncludesNote = buildOtherItemsIncludesNote(effectiveSection);

  return {
    horizontalGrainNote,
    doorDrawerMaterialNote,
    lengthMaterialFinishNote,
    panelModNote,
    appliedMoldingNote,
    doorPullNote,
    drawerPullNote,
    hingeNote,
    slideNote,
    otherItemsIncludesNote,
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
      lengthMaterialFinishNote,
    ]
      .filter(Boolean)
      .join(" "),
    includesText: [otherItemsIncludesNote].filter(Boolean).join(" "),
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
  includesText = "",
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

      if (includesText) {
        if (processedNotes[1]) {
          processedNotes[1] = `${includesText} ${processedNotes[1]}`;
        } else {
          processedNotes[1] = includesText;
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
      if (includesText || doesNotIncludeText) {
        return [
          additionalNotesText
            ? `${additionalNotesText} ${sectionNotes}`
            : sectionNotes,
          includesText || "",
          doesNotIncludeText || "",
        ];
      }

      return additionalNotesText
        ? `${additionalNotesText} ${sectionNotes}`
        : sectionNotes;
    }

    return null;
  }

  if (additionalNotesText || includesText || doesNotIncludeText) {
    return [
      additionalNotesText || "",
      includesText || "",
      doesNotIncludeText || "",
    ];
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
