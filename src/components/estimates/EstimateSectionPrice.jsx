import PropTypes from "prop-types";
import { useMemo } from "react";
import { useSelector } from "react-redux";

import { FACE_STYLE_VALUES, FACE_TYPES } from "../../utils/constants";
import {
  getEffectiveDefaults,
  shouldApplyFinish,
} from "../../utils/estimateDefaults";
import { roundToHundredth } from "../../utils/estimateHelpers";
import { getSectionCalculations } from "../../utils/getSectionCalculations";

import EstimateSectionPriceGroup from "./EstimateSectionPriceGroup.jsx";

const EstimateSectionPrice = ({ section }) => {
  // Get materials from Redux store
  const { boxMaterials, faceMaterials, drawerBoxMaterials } = useSelector(
    (state) => state.materials
  );
  const { teamDefaults } = useSelector((state) => state.teamEstimateDefaults);

  // Get employee rates from Redux store
  const services = useSelector((state) => state.services?.allServices || []);

  const finishTypes = useSelector((state) => state.finishes?.finishes || []);

  const cabinetStyles = useSelector(
    (state) =>
      state.cabinetStyles?.styles.filter((style) => style.is_active) || []
  );

  const cabinetTypes = useSelector(
    (state) => state.cabinetTypes?.types.filter((type) => type.is_active) || []
  );

  const { hardware, accessories } = useSelector((state) => state);

  const partsListAnchors = useSelector(
    (state) => state.partsListAnchors?.itemsByPartsList || []
  );

  // Get estimate and team for defaults fallback
  const currentEstimate = useSelector(
    (state) => state.estimates?.currentEstimate
  );

  // Create effective section with resolved fallback values (three-tier: section → estimate → team)
  const effectiveSection = useMemo(() => {
    const effectiveDefaults = getEffectiveDefaults(
      section,
      currentEstimate,
      teamDefaults
    );

    // Merge the effective defaults with the section, preserving cabinet items and other data
    return {
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
      face_finish: effectiveDefaults.face_finish,
      box_finish: effectiveDefaults.box_finish,
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
  }, [section, currentEstimate, teamDefaults]);

  const selectedFaceMaterial = useMemo(() => {
    let finishMultiplier = 0;
    let shopMultiplier = 1;
    const material = faceMaterials?.find(
      (mat) => mat.id === effectiveSection.face_mat
    );

    // Check if finish should be applied using three-tier fallback
    const finishNeeded = shouldApplyFinish(
      section.face_mat,
      currentEstimate?.default_face_mat,
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
  }, [
    faceMaterials,
    effectiveSection.face_mat,
    effectiveSection.face_finish,
    finishTypes,
    section.face_mat,
    currentEstimate,
    teamDefaults,
  ]);

  const selectedBoxMaterial = useMemo(() => {
    let finishMultiplier = 0;
    let shopMultiplier = 1;
    const material = boxMaterials?.find(
      (mat) => mat.id === effectiveSection.box_mat
    );

    // Check if finish should be applied using three-tier fallback
    const finishNeeded = shouldApplyFinish(
      section.box_mat,
      currentEstimate?.default_box_mat,
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
  }, [
    boxMaterials,
    effectiveSection.box_mat,
    effectiveSection.box_finish,
    finishTypes,
    section.box_mat,
    currentEstimate,
    teamDefaults,
  ]);

  // Calculate the total price and face counts of all items in the section
  const sectionCalculations = useMemo(() => {
    return getSectionCalculations(effectiveSection, {
      // Materials
      boxMaterials,
      faceMaterials,
      drawerBoxMaterials,
      selectedFaceMaterial,
      selectedBoxMaterial,

      // Styles & Configuration
      cabinetStyles,
      finishTypes,
      cabinetTypes,

      // Hardware
      hardware,

      // Accessories
      accessories,

      // Services & Anchors
      partsListAnchors,
      globalServices: services,

      // Defaults for fallback (three-tier system)
      estimate: currentEstimate,
      team: teamDefaults,
    });
  }, [
    effectiveSection,
    boxMaterials,
    faceMaterials,
    selectedFaceMaterial,
    selectedBoxMaterial,
    drawerBoxMaterials,
    finishTypes,
    cabinetStyles,
    cabinetTypes,
    hardware,
    accessories,
    partsListAnchors,
    services,
    currentEstimate,
    teamDefaults,
  ]);

  // Format number as currency
 const formatCurrency = (amount, { noCents = false } = {}) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: noCents ? 0 : 2,
    maximumFractionDigits: noCents ? 0 : 2,
  }).format(amount);
};

  // Format hours with 2 decimal places
  const formatHours = (hours) => {
    return roundToHundredth(parseFloat(hours || 0));
  };

  return (
    <div className="h-full flex flex-col border-l border-slate-700 px-4 w-80">
      {/* Section Total Price - Top Section */}
      <div className="flex justify-between items-center pb-3">
        <div className="text-slate-300">
          <span className="text-sm font-medium">Section Total Price:</span>
        </div>
        <div className="text-xl font-bold text-teal-400">
          {formatCurrency(sectionCalculations.totalPrice, {
            noCents: true,
          })}
        </div>
      </div>

      {/* Content Section - Scrollable */}
      <div className="flex-1 overflow-auto space-y-4">
        {/* Adjustments */}
        <EstimateSectionPriceGroup title="Adjustments">
          {/* Header row */}
          <div className="grid grid-cols-[3fr,1fr,3fr] gap-1 pb-1 mb-2 border-b border-gray-700">
            <div className="text-sm text-slate-300 text-left">Subtotal</div>
            <div className="text-sm font-medium text-teal-400 text-right"></div>
            <div className="text-sm font-medium text-teal-400 text-right">
              {formatCurrency(sectionCalculations.subTotalPrice)}
            </div>
          </div>
          <div className="grid grid-cols-[3fr,1fr,3fr] gap-1 pb-1 mb-2 border-b border-gray-700">
            <div className="text-sm text-slate-300 text-left">Profit</div>
            <div className="text-sm font-medium text-teal-400 text-right">
              {sectionCalculations.profitRate}%
            </div>
            <div className="text-sm font-medium text-teal-400 text-right">
              {formatCurrency(sectionCalculations.profit)}
            </div>
          </div>
          <div className="grid grid-cols-[3fr,1fr,3fr] gap-1 pb-1 mb-2 border-b border-gray-700">
            <div className="text-sm text-slate-300 text-left">Commission</div>
            <div className="text-sm font-medium text-teal-400 text-right">
              {sectionCalculations.commissionRate}%
            </div>
            <div className="text-sm font-medium text-teal-400 text-right">
              {formatCurrency(sectionCalculations.commission)}
            </div>
          </div>
          <div className="grid grid-cols-[3fr,1fr,3fr] gap-1 pb-1 mb-2 border-b border-gray-700">
            <div className="text-sm text-slate-300 text-left">Discount</div>
            <div className="text-sm font-medium text-teal-400 text-right">
              {sectionCalculations.discountRate}%
            </div>
            <div className="text-sm font-medium text-teal-400 text-right">
              {formatCurrency(sectionCalculations.discount)}
            </div>
          </div>
          <div className="grid grid-cols-[3fr,1fr,3fr] gap-1 pb-1">
            <div className="text-sm text-slate-300 text-left">Quantity</div>
            <div></div>
            <div className="text-sm text-right font-bold text-teal-400">
              {sectionCalculations.quantity}
            </div>
          </div>
        </EstimateSectionPriceGroup>
        {/* Price Breakdown - Title */}
        <EstimateSectionPriceGroup title="Parts Breakdown">
          {/* Header row */}
          <div className="grid grid-cols-[3fr,1fr,2fr] gap-1 pb-1 mb-2 border-b border-gray-700">
            <div className="text-xs font-medium text-slate-400">Type</div>
            <div className="text-xs font-medium text-slate-400 text-center">
              Qty
            </div>
            <div className="text-xs font-medium text-slate-400 text-right">
              Price
            </div>
          </div>
          {/* Price Breakdown - Content - Grid Layout */}
          {/* Box Information */}
          <div className="grid grid-cols-[3fr,1fr,2fr] gap-1 py-1 border-b border-gray-700">
            <span className="text-sm text-slate-300 text-left">
              Cabinet Boxes:
            </span>
            <span className="text-sm font-medium text-white text-center bg-gray-700 px-1 py-0.5 rounded-md justify-self-center">
              {sectionCalculations.boxCount}
            </span>
            <span className="text-sm font-medium text-teal-400 text-right">
              {formatCurrency(sectionCalculations.boxTotal)}
            </span>
          </div>

          {/* Face Types - Filter out "open", "container", "pair_door" */}
          {Object.entries(sectionCalculations.faceCounts)
            .filter(
              ([type]) =>
                ![
                  "open",
                  "container",
                  "pair_door",
                  "glassPanels",
                  "glassShelfFaces",
                ].includes(type)
            )
            .map(([type, count]) => (
              <div
                key={type}
                className="grid grid-cols-[3fr,1fr,2fr] gap-1 py-1 border-b border-gray-700 last:border-0"
              >
                <span className="text-sm text-slate-300 text-left">
                  {FACE_TYPES.find((t) => t.value === type)?.label || type}
                  s:
                </span>
                <span className="text-sm font-medium text-white text-center bg-gray-700 px-1 py-0.5 rounded-md justify-self-center">
                  {count}
                </span>
                <span className="text-sm font-medium text-teal-400 text-right">
                  {formatCurrency(sectionCalculations.facePrices[type])}
                </span>
              </div>
            ))}
          {/* Drawer Box Information */}
          <div className="grid grid-cols-[3fr,1fr,2fr] gap-1 py-1 border-b border-gray-700">
            <span className="text-sm text-slate-300 text-left">
              Drawer Boxes:
            </span>
            <span className="text-sm font-medium text-white text-center bg-gray-700 px-1 py-0.5 rounded-md justify-self-center">
              {sectionCalculations.drawerBoxCount}
            </span>
            <span className="text-sm font-medium text-teal-400 text-right">
              {formatCurrency(sectionCalculations.drawerBoxTotal)}
            </span>
          </div>

          {/* Rollout Information */}
          <div className="grid grid-cols-[3fr,1fr,2fr] gap-1 py-1 border-b border-gray-700">
            <span className="text-sm text-slate-300 text-left">Rollouts:</span>
            <span className="text-sm font-medium text-white text-center bg-gray-700 px-1 py-0.5 rounded-md justify-self-center">
              {sectionCalculations.rollOutCount}
            </span>
            <span className="text-sm font-medium text-teal-400 text-right">
              {formatCurrency(sectionCalculations.rollOutTotal)}
            </span>
          </div>

          {/* Hardware Information */}
          <div className="grid grid-cols-[3fr,1fr,2fr] gap-1 py-1 border-b border-gray-700">
            <span className="text-sm text-slate-300 text-left">Hinges:</span>
            <span className="text-sm font-medium text-white text-center bg-gray-700 px-1 py-0.5 rounded-md justify-self-center">
              {sectionCalculations.hingesCount || 0}
            </span>
            <span className="text-sm font-medium text-teal-400 text-right">
              {formatCurrency(sectionCalculations.hingesTotal || 0)}
            </span>
          </div>
          <div className="grid grid-cols-[3fr,1fr,2fr] gap-1 py-1 border-b border-gray-700">
            <span className="text-sm text-slate-300 text-left">Slides:</span>
            <span className="text-sm font-medium text-white text-center bg-gray-700 px-1 py-0.5 rounded-md justify-self-center">
              {sectionCalculations.slidesCount || 0}
            </span>
            <span className="text-sm font-medium text-teal-400 text-right">
              {formatCurrency(sectionCalculations.slidesTotal || 0)}
            </span>
          </div>
          <div className="grid grid-cols-[3fr,1fr,2fr] gap-1 py-1 border-b border-gray-700">
            <span className="text-sm text-slate-300 text-left">Pulls:</span>
            <span className="text-sm font-medium text-white text-center bg-gray-700 px-1 py-0.5 rounded-md justify-self-center">
              {sectionCalculations.pullsCount || 0}
            </span>
            <span className="text-sm font-medium text-teal-400 text-right">
              {formatCurrency(sectionCalculations.pullsTotal || 0)}
            </span>
          </div>
          <div className="grid grid-cols-[3fr,1fr,2fr] gap-1 py-1 border-b border-gray-700">
            <span className="text-sm text-slate-300 text-left">Wood:</span>
            <span className="text-sm font-medium text-white text-center bg-gray-700 px-1 py-0.5 rounded-md justify-self-center">
              {sectionCalculations.woodCount || 0}
            </span>
            <span className="text-sm font-medium text-teal-400 text-right">
              {formatCurrency(sectionCalculations.woodTotal || 0)}
            </span>
          </div>
          <div className="grid grid-cols-[3fr,1fr,2fr] gap-1 py-1 border-b border-gray-700">
            <span className="text-sm text-slate-300 text-left">Fillers:</span>
            <span className="text-sm font-medium text-white text-center bg-gray-700 px-1 py-0.5 rounded-md justify-self-center">
              {sectionCalculations.fillerCount || 0}
            </span>
            <span className="text-sm font-medium text-teal-400 text-right">
              {sectionCalculations.fillerCount &&
              section.doorStyle === FACE_STYLE_VALUES.SLAB_SHEET
                ? "(Panel)"
                : ""}
            </span>
          </div>
          <div className="grid grid-cols-[3fr,1fr,2fr] gap-1 py-1">
            <span className="text-sm text-slate-300 text-left">
              Glass (sqft):
            </span>
            <span className="text-sm font-medium text-white text-center bg-gray-700 px-1 py-0.5 rounded-md justify-self-center">
              {roundToHundredth(sectionCalculations.glassCount || 0)}
            </span>
            <span className="text-sm font-medium text-teal-400 text-right">
              {formatCurrency(sectionCalculations.glassTotal || 0)}
            </span>
          </div>
        </EstimateSectionPriceGroup>

        {/* Labor Hours - Title */}
        <EstimateSectionPriceGroup title="Labor Breakdown">
          {/* Labor Hours - Content - Grid Layout */}
          {/* Header row */}
          <div className="grid grid-cols-[3fr,1fr,2fr] gap-1 pb-1 mb-2 border-b border-gray-700">
            <div className="text-xs font-medium text-slate-400">Category</div>
            <div className="text-xs font-medium text-slate-400 text-center">
              Hours
            </div>
            <div className="text-xs font-medium text-slate-400 text-right">
              Cost
            </div>
          </div>

          {/* Dynamic Service Hours */}
          {Object.entries(sectionCalculations.laborCosts.costsByService).map(
            ([serviceType, data]) => (
              <div
                key={serviceType}
                className="grid grid-cols-[3fr,1fr,2fr] gap-1 py-1 border-b border-gray-700"
              >
                <span className="text-sm text-slate-300 text-left capitalize">
                  {data.name}:
                </span>
                <span className="text-sm font-medium text-white text-center bg-gray-700 px-1 py-0.5 rounded-md justify-self-center">
                  {formatHours(data.hours)}
                </span>
                <span className="text-sm font-medium text-teal-400 text-right">
                  {formatCurrency(data.cost)}
                </span>
              </div>
            )
          )}

          {/* Total Labor Cost */}
          <div className="grid grid-cols-[3fr,1fr,2fr] gap-1 mt-1 pt-2">
            <span className="text-sm font-medium text-white text-left">
              Total Labor:
            </span>
            <span className="text-sm font-medium"></span>
            <span className="text-sm font-bold text-teal-400 text-right">
              {formatCurrency(sectionCalculations.laborCosts.totalLaborCost)}
            </span>
          </div>
        </EstimateSectionPriceGroup>
      </div>
    </div>
  );
};

EstimateSectionPrice.propTypes = {
  section: PropTypes.object,
};

export default EstimateSectionPrice;
