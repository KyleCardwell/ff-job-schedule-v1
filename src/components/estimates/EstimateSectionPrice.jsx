import PropTypes from "prop-types";
import { useMemo } from "react";
import { useSelector } from "react-redux";

import { FACE_STYLE_VALUES, FACE_TYPES } from "../../utils/constants";
import { createSectionContext } from "../../utils/createSectionContext";
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

  const { hardware, accessories, lengths } = useSelector((state) => state);

  const partsListAnchors = useSelector(
    (state) => state.partsListAnchors?.itemsByPartsList || []
  );

  const cabinetAnchors = useSelector(
    (state) => state.cabinetAnchors?.itemsByType || []
  );

  // Get estimate and team for defaults fallback
  const currentEstimate = useSelector(
    (state) => state.estimates?.currentEstimate
  );

  // Create context and calculate section totals using extracted utility
  const { context, effectiveSection } = useMemo(() => {
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
      globalServices: services,
      lengthsCatalog: lengths?.catalog || [],
      accessories,
      teamDefaults,
    };

    return createSectionContext(section, currentEstimate, catalogData);
  }, [
    section,
    currentEstimate,
    boxMaterials,
    faceMaterials,
    drawerBoxMaterials,
    finishTypes,
    cabinetStyles,
    cabinetTypes,
    hardware,
    partsListAnchors,
    cabinetAnchors,
    services,
    lengths,
    accessories,
    teamDefaults,
  ]);

  // Calculate the total price and face counts of all items in the section
  const sectionCalculations = useMemo(() => {
    return getSectionCalculations(effectiveSection, context);
  }, [effectiveSection, context]);

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
    <div className="h-full flex flex-col">
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
