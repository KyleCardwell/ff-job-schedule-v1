import { isEqual } from "lodash";
import PropTypes from "prop-types";
import { useEffect, useMemo, useRef } from "react";
import { useSelector } from "react-redux";

import {
  NONE,
  PANEL_MOD_DISPLAY_NAMES,
  PRE_FINISHED,
  PRICE_OVERRIDES_ACTIVE,
} from "../../utils/constants";
import { createSectionContext } from "../../utils/createSectionContext";
import { getSectionCalculations } from "../../utils/getSectionCalculations";
import { formatDoorDrawerStyle } from "../../utils/helpers";

const EstimatePreviewSection = ({
  section,
  sectionNumber,
  taskName,
  estimate,
  onTotalCalculated,
  hasMultipleSections,
  isFirstSection,
  isSelected,
  sectionRef,
}) => {
  // Get all necessary context data from Redux
  const { boxMaterials, faceMaterials, drawerBoxMaterials } = useSelector(
    (state) => state.materials,
  );
  const finishTypes = useSelector((state) => state.finishes.finishes);
  const cabinetStyles = useSelector(
    (state) =>
      state.cabinetStyles?.styles.filter((style) => style.is_active) || [],
  );

  const cabinetTypes = useSelector(
    (state) => state.cabinetTypes?.types.filter((type) => type.is_active) || [],
  );

  const { hardware, accessories, lengths } = useSelector((state) => state);

  const partsListAnchors = useSelector(
    (state) => state.partsListAnchors.itemsByPartsList,
  );
  const cabinetAnchors = useSelector(
    (state) => state.cabinetAnchors.itemsByType,
  );
  const globalServices = useSelector((state) => state.services.allServices);
  const { teamDefaults } = useSelector((state) => state.teamEstimateDefaults);

  // Create context and calculate section totals using extracted utility (only once!)
  const { calculations, context, effectiveSection, hasPriceOverrides } =
    useMemo(() => {
      const catalogData = {
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
        lengthsCatalog: lengths.catalog,
        accessories,
        teamDefaults,
      };

      const { context, effectiveSection, hasPriceOverrides } =
        createSectionContext(section, estimate, catalogData);
      const calculations = getSectionCalculations(effectiveSection, context);

      return { calculations, context, effectiveSection, hasPriceOverrides };
    }, [
      section,
      estimate,
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
      lengths,
      accessories,
      teamDefaults,
    ]);

  // Track previous total to avoid calling callback with same value
  const prevTotalRef = useRef(null);

  // Build complete section data for PDF generation and parent aggregation
  const sectionData = useMemo(() => {
    if (!calculations || !effectiveSection) return null;

    // Use quantity 1 for calculations if quantity is 0, but preserve actual quantity for display
    const actualQuantity = effectiveSection.quantity;
    const calculationQuantity = actualQuantity === 0 ? 1 : actualQuantity;
    const unitPrice = calculations.totalPrice / calculationQuantity;

    // If actual quantity is 0, total should be 0
    const displayTotalPrice =
      actualQuantity === 0 ? 0 : calculations.totalPrice;

    // Get readable names for materials and styles
    const cabinetStyleName =
      cabinetStyles?.find(
        (s) => s.cabinet_style_id === effectiveSection.cabinet_style_id,
      )?.cabinet_style_name || "";

    // Check if there are doors (door + panel)
    const hasDoors =
      (calculations.faceCounts?.door || 0) +
        (calculations.faceCounts?.panel || 0) >
      0;

    // Check if there are drawer fronts (drawer_front + false_front)
    const hasDrawerFronts =
      (calculations.faceCounts?.drawer_front || 0) +
        (calculations.faceCounts?.false_front || 0) >
      0;

    // Check if there are drawer boxes (drawerBoxCount + rollOutCount)
    const hasDrawerBoxes =
      (calculations.drawerBoxCount || 0) + (calculations.rollOutCount || 0) > 0;

    // Check if there are boxes
    const hasBoxes = (calculations.boxCount || 0) > 0;

    // Look up face material to check if it needs finish
    const faceMaterial = faceMaterials?.find(
      (m) => m.id === effectiveSection.face_mat,
    );
    const faceFinishNames =
      faceMaterial?.needs_finish === false
        ? PRE_FINISHED
        : effectiveSection.face_finish
            ?.map((fid) => finishTypes?.find((f) => f.id === fid)?.name)
            .filter(Boolean)
            .join(", ") || NONE;

    // Look up box material to check if it needs finish
    const boxMaterial = boxMaterials?.find(
      (m) => m.id === effectiveSection.box_mat,
    );
    const boxFinishNames =
      boxMaterial?.needs_finish === false
        ? PRE_FINISHED
        : effectiveSection.box_finish
            ?.map((fid) => finishTypes?.find((f) => f.id === fid)?.name)
            .filter(Boolean)
            .join(", ") || NONE;

    const drawerBoxMaterialName = hasDrawerBoxes
      ? `${
          drawerBoxMaterials?.find(
            (m) => m.id === effectiveSection.drawer_box_mat,
          )?.name || ""
        }`
      : NONE;

    // Format display name for PDF: task name + section number if multiple sections
    const displayName = section.section_name
      ? `${taskName} - ${section.section_name}`
      : sectionNumber
        ? `${taskName} - Section ${sectionNumber}`
        : taskName;

    // Determine panel mod note based on door and drawer panel mod settings
    // 0 = none, 15 = reeded, 22 = grooved, etc.
    const doorPanelModId = effectiveSection.door_panel_mod_id;
    const drawerPanelModId = effectiveSection.drawer_panel_mod_id;
    const hasPanelModDoors = doorPanelModId && doorPanelModId > 0;
    const hasPanelModDrawers = drawerPanelModId && drawerPanelModId > 0;

    let reededPanels = "";
    if (hasPanelModDoors && hasPanelModDrawers) {
      // Both have panel mods - check if they're the same
      if (doorPanelModId === drawerPanelModId) {
        const panelModName =
          PANEL_MOD_DISPLAY_NAMES[doorPanelModId] || "Panel Mod";
        reededPanels = `${panelModName} on doors and drawer fronts.`;
      } else {
        const doorPanelName =
          PANEL_MOD_DISPLAY_NAMES[doorPanelModId] || "Panel Mod";
        const drawerPanelName =
          PANEL_MOD_DISPLAY_NAMES[drawerPanelModId] || "Panel Mod";
        reededPanels = `${doorPanelName} on doors, ${drawerPanelName} on drawer fronts.`;
      }
    } else if (hasPanelModDoors) {
      const panelModName =
        PANEL_MOD_DISPLAY_NAMES[doorPanelModId] || "Panel Mod";
      reededPanels = `${panelModName} on doors.`;
    } else if (hasPanelModDrawers) {
      const panelModName =
        PANEL_MOD_DISPLAY_NAMES[drawerPanelModId] || "Panel Mod";
      reededPanels = `${panelModName} on drawer fronts.`;
    }

    // Determine door and drawer front material/finish notes
    // Only include if they differ from the selected face material/finishes
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

    // Only include finish names if the material needs finish
    const doorFinishNames = doorMaterial?.needs_finish
      ? (effectiveSection.door_finish?.length > 0
          ? effectiveSection.door_finish
          : effectiveSection.face_finish
        )
          ?.map((fid) => finishTypes?.find((f) => f.id === fid)?.name)
          .filter(Boolean)
          .join(", ") || ""
      : "";

    const drawerFrontFinishNames = drawerFrontMaterial?.needs_finish
      ? (effectiveSection.drawer_front_finish?.length > 0
          ? effectiveSection.drawer_front_finish
          : effectiveSection.face_finish
        )
          ?.map((fid) => finishTypes?.find((f) => f.id === fid)?.name)
          .filter(Boolean)
          .join(", ") || ""
      : "";

    // Check if door/drawer materials or finishes differ from face material/finishes
    const doorDiffersFromFace =
      effectiveSection.door_mat && effectiveSection.door_mat !== faceMatId;
    const doorFinishDiffersFromFace =
      effectiveSection.door_finish?.length > 0 &&
      !isEqual(effectiveSection.door_finish, effectiveSection.face_finish);
    const drawerFrontDiffersFromFace =
      effectiveSection.drawer_front_mat &&
      effectiveSection.drawer_front_mat !== faceMatId;
    const drawerFrontFinishDiffersFromFace =
      effectiveSection.drawer_front_finish?.length > 0 &&
      !isEqual(
        effectiveSection.drawer_front_finish,
        effectiveSection.face_finish,
      );

    const doorNeedsNote =
      hasDoors && (doorDiffersFromFace || doorFinishDiffersFromFace);
    const drawerFrontNeedsNote =
      hasDrawerFronts &&
      (drawerFrontDiffersFromFace || drawerFrontFinishDiffersFromFace);

    let doorDrawerMaterialNote = "";
    if (doorNeedsNote && drawerFrontNeedsNote) {
      // Both doors and drawer fronts differ from face material/finish
      if (
        doorMatId === drawerFrontMatId &&
        doorFinishNames === drawerFrontFinishNames
      ) {
        // Same material and finish
        const finishPart = doorFinishNames ? ` (${doorFinishNames})` : "";
        doorDrawerMaterialNote = `Doors & Drawer Fronts: ${doorMaterialName}${finishPart}.`;
      } else {
        // Different materials or finishes
        const doorFinishPart = doorFinishNames ? ` (${doorFinishNames})` : "";
        const drawerFinishPart = drawerFrontFinishNames
          ? ` (${drawerFrontFinishNames})`
          : "";
        doorDrawerMaterialNote = `Doors - ${doorMaterialName}${doorFinishPart}. Drawer Fronts - ${drawerFrontMaterialName}${drawerFinishPart}.`;
      }
    } else if (doorNeedsNote) {
      // Only doors differ
      const finishPart = doorFinishNames ? ` (${doorFinishNames})` : "";
      doorDrawerMaterialNote = `Doors - ${doorMaterialName}${finishPart}.`;
    } else if (drawerFrontNeedsNote) {
      // Only drawer fronts differ
      const finishPart = drawerFrontFinishNames
        ? ` (${drawerFrontFinishNames})`
        : "";
      doorDrawerMaterialNote = `Drawer Fronts: ${drawerFrontMaterialName}${finishPart}.`;
    }

    // Determine molding note based on door and drawer molding settings
    const hasDoorMolding =
      effectiveSection.door_inside_molding ||
      effectiveSection.door_outside_molding;
    const hasDrawerMolding =
      effectiveSection.drawer_inside_molding ||
      effectiveSection.drawer_outside_molding;

    let appliedMolding = "";
    if (hasDoorMolding && hasDrawerMolding) {
      appliedMolding = "Applied molding on doors and drawer fronts.";
    } else if (hasDoorMolding) {
      appliedMolding = "Applied molding on doors.";
    } else if (hasDrawerMolding) {
      appliedMolding = "Applied molding on drawer fronts.";
    }

    // Handle notes array structure - preserve array format for PDF
    let processedNotes = null;
    if (section.notes) {
      if (Array.isArray(section.notes)) {
        // Clone the notes array
        processedNotes = [...section.notes];

        // Prepend door/drawer material, reeded panels, and molding to notes[0]
        const additionalNotes = [
          doorDrawerMaterialNote,
          reededPanels,
          appliedMolding,
        ]
          .filter(Boolean)
          .join(" ");
        if (additionalNotes) {
          if (processedNotes[0]) {
            processedNotes[0] = `${additionalNotes} ${processedNotes[0]}`;
          } else {
            processedNotes[0] = additionalNotes;
          }
        }
      } else if (section.notes.trim()) {
        // Backward compatibility for string notes
        const additionalNotes = [
          doorDrawerMaterialNote,
          reededPanels,
          appliedMolding,
        ]
          .filter(Boolean)
          .join(" ");
        processedNotes = additionalNotes
          ? `${additionalNotes} ${section.notes}`
          : section.notes;
      }
    } else {
      // No section notes, but we might have door/drawer material, reeded, or molding notes
      const additionalNotes = [
        doorDrawerMaterialNote,
        reededPanels,
        appliedMolding,
      ]
        .filter(Boolean)
        .join(" ");
      if (additionalNotes) {
        processedNotes = [additionalNotes, "", ""];
      }
    }

    // For display purposes, create array of note lines with labels
    let displayNotesLines = null;
    if (processedNotes) {
      if (Array.isArray(processedNotes)) {
        const notesLabels = ["Notes:", "Includes:", "Does Not Include:"];
        displayNotesLines = processedNotes
          .map((note, index) => {
            if (note && note.trim()) {
              return `${notesLabels[index]} ${note}`;
            }
            return null;
          })
          .filter(Boolean);
      } else {
        displayNotesLines = [processedNotes];
      }
    }

    // Determine section name display
    let sectionNameDisplay = "";
    if (hasMultipleSections) {
      if (section.section_name) {
        sectionNameDisplay = ` - ${section.section_name}`;
      } else if (sectionNumber) {
        sectionNameDisplay = ` - Section ${sectionNumber}`;
      }
    }

    return {
      sectionId: section.est_section_id,
      sectionName: section.section_name || `Section ${sectionNumber || 1}`,
      sectionNameDisplay,
      taskName,
      displayName, // For PDF display
      quantity: actualQuantity,
      unitPrice,
      totalPrice: displayTotalPrice,
      // Description details for PDF
      cabinetStyle: cabinetStyleName,
      faceMaterial: context.selectedFaceMaterial?.material?.name || "",
      boxMaterial: hasBoxes
        ? context.selectedBoxMaterial?.material?.name || ""
        : "None",
      drawerBoxMaterial: drawerBoxMaterialName,
      doorStyle: hasDoors
        ? formatDoorDrawerStyle(effectiveSection.door_style)
        : "None",
      drawerFrontStyle: hasDrawerFronts
        ? formatDoorDrawerStyle(effectiveSection.drawer_front_style)
        : "None",
      faceFinish: faceFinishNames,
      boxFinish: boxFinishNames,
      doorMaterialNote: doorDrawerMaterialNote, // For PDF door/drawer material note
      notes: processedNotes, // Array format for PDF
      displayNotes: displayNotesLines, // Formatted lines for UI display
      // Calculation breakdown data for aggregation
      laborCosts: calculations.laborCosts,
      partsTotalPrice: calculations.partsTotalPrice,
      subTotalPrice: calculations.subTotalPrice,
      profit: calculations.profit,
      commission: calculations.commission,
      discount: calculations.discount,
      // Include full calculations for parts breakdown
      calculations: calculations,
    };
  }, [
    calculations,
    effectiveSection,
    section,
    sectionNumber,
    taskName,
    cabinetStyles,
    boxMaterials,
    faceMaterials,
    finishTypes,
    drawerBoxMaterials,
    context,
    hasMultipleSections,
  ]);

  // Notify parent when section data changes (only if value actually changed)
  useEffect(() => {
    if (onTotalCalculated && sectionData) {
      const currentTotal = sectionData.totalPrice;
      // Only call if the total has actually changed
      if (prevTotalRef.current !== currentTotal) {
        prevTotalRef.current = currentTotal;
        onTotalCalculated(sectionData);
      }
    }
  }, [sectionData, onTotalCalculated]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value || 0);
  };

  const formatNumber = (value) => {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value || 0);
  };

  // Don't render if sectionData is null
  if (!sectionData) {
    return null;
  }

  return (
    <div
      ref={sectionRef}
      data-section-id={section.est_section_id}
      className={`p-6 mb-4 ${
        hasMultipleSections && !isFirstSection
          ? "border-t-2 border-teal-500 pt-6"
          : ""
      } ${!isSelected ? "bg-slate-950 rounded-lg opacity-60" : ""}`}
    >
      {/* Section Header */}
      {hasMultipleSections && (
        <div className="border-b border-slate-600 pb-4 mb-4">
          <h3 className="text-lg font-semibold text-slate-200">
            {taskName}
            {sectionData.sectionNameDisplay}
          </h3>
          {sectionData.displayNotes &&
            Array.isArray(sectionData.displayNotes) && (
              <div className="text-sm text-slate-400 mt-2 space-y-1">
                {sectionData.displayNotes.map((noteLine, index) => (
                  <p key={index}>{noteLine}</p>
                ))}
              </div>
            )}
        </div>
      )}
      {!hasMultipleSections &&
        sectionData.displayNotes &&
        Array.isArray(sectionData.displayNotes) && (
          <div className="border-b border-slate-600 pb-4 mb-4">
            <div className="text-sm text-slate-400 space-y-1">
              {sectionData.displayNotes.map((noteLine, index) => (
                <p key={index}>{noteLine}</p>
              ))}
            </div>
          </div>
        )}

      {/* Section Details */}
      <div className="grid grid-cols-4 gap-4 mb-4 text-sm">
        <div>
          <p className="text-slate-400">Cabinet Style:</p>
          <p className="text-slate-200">{sectionData.cabinetStyle || "—"}</p>
        </div>
        <div>
          <p className="text-slate-400">Face Material:</p>
          <p className="text-slate-200">{sectionData.faceMaterial || "—"}</p>
        </div>
        <div>
          <p className="text-slate-400">Box Material:</p>
          <p className="text-slate-200">{sectionData.boxMaterial || "—"}</p>
        </div>
        <div>
          <p className="text-slate-400">Door Style:</p>
          <p className="text-slate-200 capitalize">
            {sectionData.doorStyle || "—"}
          </p>
        </div>
        <div>
          <p className="text-slate-400">Drawer Boxes:</p>
          <p className="text-slate-200 capitalize">
            {sectionData.drawerBoxMaterial || "—"}
          </p>
        </div>
        <div>
          <p className="text-slate-400">Face Finish:</p>
          <p className="text-slate-200">{sectionData.faceFinish || "—"}</p>
        </div>
        <div>
          <p className="text-slate-400">Box Finish:</p>
          <p className="text-slate-200">{sectionData.boxFinish || "—"}</p>
        </div>
        <div>
          <p className="text-slate-400">Drawer Front Style:</p>
          <p className="text-slate-200 capitalize">
            {sectionData.drawerFrontStyle || "—"}
          </p>
        </div>
      </div>

      {/* Labor Hours Breakdown */}
      {calculations.laborCosts?.costsByService &&
        Object.keys(calculations.laborCosts.costsByService).length > 0 && (
          <div className="mb-4 mx-auto max-w-2xl flex flex-col items-center">
            <h4 className="text-sm font-semibold text-slate-300 mb-2">
              Labor Hours
            </h4>
            <div className="space-y-1 text-sm">
              {Object.entries(calculations.laborCosts.costsByService).map(
                ([serviceId, serviceData]) => (
                  <div
                    key={serviceId}
                    className="grid grid-cols-[2fr,2fr,3fr,2fr,3fr,2fr] text-slate-300"
                  >
                    <span className="text-right">{serviceData.name}:</span>
                    <span>{formatNumber(serviceData.hours)} hrs</span>
                    <span>x</span>
                    <span>{formatCurrency(serviceData.rate)} / hr</span>
                    <span>=</span>
                    <span className="text-right">
                      {formatCurrency(serviceData.cost)}
                    </span>
                  </div>
                ),
              )}
            </div>
          </div>
        )}

      {/* Price Summary */}
      <div className="border-t border-slate-600 pt-4 mt-4">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-slate-300">
            <span>Parts Total:</span>
            <span>{formatCurrency(calculations.partsTotalPrice)}</span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span>Labor Total:</span>
            <span>
              {formatCurrency(calculations.laborCosts?.totalLaborCost)}
            </span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span>Subtotal:</span>
            <span>{formatCurrency(calculations.subTotalPrice)}</span>
          </div>
          {calculations.profit > 0 && (
            <div className="flex justify-between text-slate-300">
              <span>Profit ({calculations.profitRate}%):</span>
              <span>{formatCurrency(calculations.profit)}</span>
            </div>
          )}
          {calculations.commission > 0 && (
            <div className="flex justify-between text-slate-300">
              <span>Commission ({calculations.commissionRate}%):</span>
              <span>{formatCurrency(calculations.commission)}</span>
            </div>
          )}
          {calculations.discount > 0 && (
            <div className="flex justify-between text-red-400">
              <span>Discount ({calculations.discountRate}%):</span>
              <span>-{formatCurrency(calculations.discount)}</span>
            </div>
          )}
          {/* {section.quantity > 1 && ( */}
          <div
            className={`flex justify-between ${section.quantity === 0 ? "px-1 bg-amber-400 text-slate-900" : "text-slate-300"}`}
          >
            <span>Quantity:</span>
            <span>× {section.quantity}</span>
          </div>
          {/* )} */}
          <div
            className={`${
              section.quantity === 0
                ? "px-1 bg-amber-400 text-slate-900"
                : "text-teal-400"
            } flex justify-between text-lg font-semibold border-t border-slate-600 pt-2 mt-2`}
          >
            <span>Section Total</span>
            {hasPriceOverrides && (
              <div className="flex items-center bg-purple-600 p-1">
                <span className="block text-xs text-white">
                  {PRICE_OVERRIDES_ACTIVE}
                </span>
              </div>
            )}
            <span>
              {formatCurrency(
                section.quantity === 0
                  ? sectionData.unitPrice
                  : sectionData.totalPrice,
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

EstimatePreviewSection.propTypes = {
  section: PropTypes.object.isRequired,
  sectionNumber: PropTypes.number,
  taskName: PropTypes.string.isRequired,
  estimate: PropTypes.object.isRequired,
  onTotalCalculated: PropTypes.func,
  hasMultipleSections: PropTypes.bool,
  isFirstSection: PropTypes.bool,
  isSelected: PropTypes.bool,
  sectionRef: PropTypes.func,
};

export default EstimatePreviewSection;
