import PropTypes from "prop-types";
import { useEffect, useMemo, useRef } from "react";
import { useSelector } from "react-redux";

import { createSectionContext } from "../../utils/createSectionContext";
import { getSectionCalculations } from "../../utils/getSectionCalculations";
import { formatDoorDrawerStyle } from "../../utils/helpers";

const EstimatePreviewSection = ({
  section,
  sectionNumber,
  taskName,
  estimate,
  onTotalCalculated,
}) => {
  // Get all necessary context data from Redux
  const { boxMaterials, faceMaterials, drawerBoxMaterials } = useSelector(
    (state) => state.materials
  );
  const finishTypes = useSelector((state) => state.finishes.finishes);
  const cabinetStyles = useSelector(
    (state) =>
      state.cabinetStyles?.styles.filter((style) => style.is_active) || []
  );

  const cabinetTypes = useSelector(
    (state) => state.cabinetTypes?.types.filter((type) => type.is_active) || []
  );

  const { hardware, accessories, lengths } = useSelector((state) => state);

  const partsListAnchors = useSelector(
    (state) => state.partsListAnchors.itemsByPartsList
  );
  const cabinetAnchors = useSelector(
    (state) => state.cabinetAnchors.itemsByType
  );
  const globalServices = useSelector((state) => state.services.allServices);
  const { teamDefaults } = useSelector((state) => state.teamEstimateDefaults);

  // Create context and calculate section totals using extracted utility (only once!)
  const { calculations, context, effectiveSection } = useMemo(() => {
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

    const { context, effectiveSection } = createSectionContext(
      section,
      estimate,
      catalogData
    );
    const calculations = getSectionCalculations(effectiveSection, context);

    return { calculations, context, effectiveSection };
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
    if (!calculations?.totalPrice || !effectiveSection) return null;

    const quantity = effectiveSection.quantity || 1;
    const unitPrice = calculations.totalPrice / quantity;

    // Get readable names for materials and styles
    const cabinetStyleName =
      cabinetStyles?.find(
        (s) => s.cabinet_style_id === effectiveSection.cabinet_style_id
      )?.cabinet_style_name || "";

    const faceFinishNames =
      effectiveSection.face_finish
        ?.map((fid) => finishTypes?.find((f) => f.id === fid)?.name)
        .filter(Boolean)
        .join(", ") || "None";

    const boxFinishNames =
      effectiveSection.box_finish
        ?.map((fid) => finishTypes?.find((f) => f.id === fid)?.name)
        .filter(Boolean)
        .join(", ") || "None";

    const drawerBoxMaterialName =
      drawerBoxMaterials?.find((m) => m.id === effectiveSection.drawer_box_mat)
        ?.name || "";

    // Format display name for PDF: task name + section number if multiple sections
    const displayName = section.section_name
      ? `${taskName} - ${section.section_name}`
      : sectionNumber
      ? `${taskName} - Section ${sectionNumber}`
      : taskName;

    // Determine reeded note based on door and drawer reeded panel settings
    const hasReededDoors = effectiveSection.door_reeded_panel;
    const hasReededDrawers = effectiveSection.drawer_reeded_panel;

    let reededPanels = "";
    if (hasReededDoors && hasReededDrawers) {
      reededPanels = "Reeded panels on doors and drawer fronts.";
    } else if (hasReededDoors) {
      reededPanels = "Reeded panels on doors.";
    } else if (hasReededDrawers) {
      reededPanels = "Reeded panels on drawer fronts.";
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

    // Combine section notes with molding note
    const combinedNotes = [reededPanels, appliedMolding, section.notes]
      .filter(Boolean)
      .join(" ");

    return {
      sectionId: section.est_section_id,
      sectionName: section.section_name || `Section ${sectionNumber || 1}`,
      taskName,
      displayName, // For PDF display
      quantity,
      unitPrice,
      totalPrice: calculations.totalPrice,
      // Description details for PDF
      cabinetStyle: cabinetStyleName,
      faceMaterial: context.selectedFaceMaterial?.material?.name || "",
      boxMaterial: context.selectedBoxMaterial?.material?.name || "",
      drawerBoxMaterial: drawerBoxMaterialName,
      doorStyle: formatDoorDrawerStyle(effectiveSection.door_style),
      drawerFrontStyle:
        formatDoorDrawerStyle(effectiveSection.drawer_front_style),
      faceFinish: faceFinishNames,
      boxFinish: boxFinishNames,
      notes: combinedNotes,
    };
  }, [
    calculations?.totalPrice,
    effectiveSection,
    section,
    sectionNumber,
    taskName,
    cabinetStyles,
    finishTypes,
    drawerBoxMaterials,
    context,
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

  return (
    <div className="bg-slate-700 rounded-lg p-6 mb-4">
      {/* Section Header */}
      <div className="border-b border-slate-600 pb-4 mb-4">
        <h3 className="text-lg font-semibold text-slate-200">
          {taskName}
          {sectionData.sectionName}
        </h3>
        {sectionData.notes && (
          <p className="text-sm text-slate-400 mt-2">{sectionData.notes}</p>
        )}
      </div>

      {/* Section Details */}
      <div className="grid grid-cols-4 gap-4 mb-4 text-sm">
        <div>
          <p className="text-slate-400">Cabinet Style:</p>
          <p className="text-slate-200">
            {sectionData.cabinetStyle || "—"}
          </p>
        </div>
        <div>
          <p className="text-slate-400">Face Material:</p>
          <p className="text-slate-200">
            {sectionData.faceMaterial || "—"}
          </p>
        </div>
        <div>
          <p className="text-slate-400">Box Material:</p>
          <p className="text-slate-200">
            {sectionData.boxMaterial || "—"}
          </p>
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
          <p className="text-slate-200">
            {sectionData.faceFinish || "—"}
          </p>
        </div>
        <div>
          <p className="text-slate-400">Box Finish:</p>
          <p className="text-slate-200">
            {sectionData.boxFinish || "—"}
          </p>
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
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-slate-300 mb-2">
              Labor Hours:
            </h4>
            <div className="space-y-1 text-sm">
              {Object.entries(calculations.laborCosts.costsByService).map(
                ([serviceId, serviceData]) => (
                  <div
                    key={serviceId}
                    className="flex justify-between text-slate-300"
                  >
                    <span>{serviceData.name}:</span>
                    <span>
                      {formatNumber(serviceData.hours)} hrs @{" "}
                      {formatCurrency(serviceData.rate)}/hr ={" "}
                      {formatCurrency(serviceData.cost)}
                    </span>
                  </div>
                )
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
          {section.quantity > 1 && (
            <div className="flex justify-between text-slate-300">
              <span>Quantity:</span>
              <span>× {section.quantity}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-semibold text-teal-400 border-t border-slate-600 pt-2 mt-2">
            <span>Section Total:</span>
            <span>{formatCurrency(calculations.totalPrice)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

EstimatePreviewSection.propTypes = {
  section: PropTypes.object.isRequired,
  sectionNumber: PropTypes.number.isRequired,
  taskName: PropTypes.string.isRequired,
  estimate: PropTypes.object.isRequired,
  onTotalCalculated: PropTypes.func,
};

export default EstimatePreviewSection;
