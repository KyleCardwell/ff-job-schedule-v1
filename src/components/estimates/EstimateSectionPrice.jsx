import PropTypes from "prop-types";
import React, { useMemo } from "react";
import { useSelector } from "react-redux";

import { FACE_TYPES } from "../../utils/constants";
import {
  roundToHundredth,
} from "../../utils/estimateHelpers";
import { getSectionCalculations } from "../../utils/getSectionCalculations";

const EstimateSectionPrice = ({ section }) => {
  // Get materials from Redux store
  const { boxMaterials, faceMaterials } = useSelector(
    (state) => state.materials
  );

  // Get employee rates from Redux store
  const employeeTypes = useSelector(
    (state) => state.chartConfig?.employee_type || []
  );

  const finishTypes = useSelector(
    (state) => state.estimates?.currentEstimate?.estimate_data?.finishes || []
  );

  // Calculate the total price and face counts of all items in the section
  const sectionCalculations = useMemo(() => {
    return getSectionCalculations(section, boxMaterials, faceMaterials, finishTypes);
  }, [section, boxMaterials, faceMaterials, finishTypes]);

  // Format number as currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  // Format hours with 2 decimal places
  const formatHours = (hours) => {
    return roundToHundredth(parseFloat(hours || 0));
  };

  // Calculate labor costs based on hours and rates
  const laborCosts = useMemo(() => {
    const shopRate = employeeTypes.find((et) => et.name === "shop")?.rate || 0;
    const finishRate =
      employeeTypes.find((et) => et.name === "finish")?.rate || 0;
    const installRate =
      employeeTypes.find((et) => et.name === "install")?.rate || 0;

    const shopCost = sectionCalculations.shopHours * shopRate;
    const finishCost = sectionCalculations.finishHours * finishRate;
    const installCost = sectionCalculations.installHours * installRate;

    return {
      shopCost,
      finishCost,
      installCost,
      totalLaborCost: shopCost + finishCost + installCost,
    };
  }, [
    sectionCalculations.shopHours,
    sectionCalculations.finishHours,
    sectionCalculations.installHours,
    employeeTypes,
  ]);

  return (
    <div className="h-full flex flex-col border-l border-slate-700 p-4 w-80">
      {/* Section Total Price - Top Section */}
      <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-600">
        <div className="text-slate-300">
          <span className="text-sm font-medium">Section Total Price:</span>
        </div>
        <div className="text-xl font-bold text-teal-400">
          {formatCurrency(
            sectionCalculations.totalPrice + laborCosts.totalLaborCost
          )}
        </div>
      </div>

      {/* Content Section - Scrollable */}
      <div className="flex-1 overflow-auto space-y-4">
        {/* Price Breakdown - Title */}
        <div className="bg-slate-700 py-1 px-2 rounded-t-md">
          <h3 className="text-sm font-medium text-white">Price Breakdown</h3>
        </div>

        {/* Price Breakdown - Content - Grid Layout */}
        <div className="bg-gray-800 rounded-b-md p-3">
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
              ([type]) => !["open", "container", "pair_door"].includes(type)
            )
            .map(([type, count]) => (
              <div
                key={type}
                className="grid grid-cols-[3fr,1fr,2fr] gap-1 py-1 border-b border-gray-700 last:border-0"
              >
                <span className="text-sm text-slate-300 text-left">
                  {FACE_TYPES.find((t) => t.value === type)?.label || type}s:
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
        </div>

        {/* Labor Hours - Title */}
        <div className="bg-slate-700 py-1 px-2 rounded-t-md mt-4">
          <h3 className="text-sm font-medium text-white">Labor Hours</h3>
        </div>

        {/* Labor Hours - Content - Grid Layout */}
        <div className="bg-gray-800 rounded-b-md p-3">
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

          {/* Shop Hours */}
          <div className="grid grid-cols-[3fr,1fr,2fr] gap-1 py-1 border-b border-gray-700">
            <span className="text-sm text-slate-300 text-left">Shop:</span>
            <span className="text-sm font-medium text-white text-center bg-gray-700 px-1 py-0.5 rounded-md justify-self-center">
              {formatHours(sectionCalculations.shopHours)}
            </span>
            <span className="text-sm font-medium text-teal-400 text-right">
              {formatCurrency(laborCosts.shopCost)}
            </span>
          </div>

          {/* Finish Hours */}
          <div className="grid grid-cols-[3fr,1fr,2fr] gap-1 py-1 border-b border-gray-700">
            <span className="text-sm text-slate-300 text-left">Finish:</span>
            <span className="text-sm font-medium text-white text-center bg-gray-700 px-1 py-0.5 rounded-md justify-self-center">
              {formatHours(sectionCalculations.finishHours)}
            </span>
            <span className="text-sm font-medium text-teal-400 text-right">
              {formatCurrency(laborCosts.finishCost)}
            </span>
          </div>

          {/* Install Hours */}
          <div className="grid grid-cols-[3fr,1fr,2fr] gap-1 py-1 border-b border-gray-700">
            <span className="text-sm text-slate-300 text-left">Install:</span>
            <span className="text-sm font-medium text-white text-center bg-gray-700 px-1 py-0.5 rounded-md justify-self-center">
              {formatHours(sectionCalculations.installHours)}
            </span>
            <span className="text-sm font-medium text-teal-400 text-right">
              {formatCurrency(laborCosts.installCost)}
            </span>
          </div>

          {/* Total Labor Cost */}
          <div className="grid grid-cols-[3fr,1fr,2fr] gap-1 py-1 mt-2 pt-2 border-t border-gray-600">
            <span className="text-sm font-medium text-white text-left">
              Total Labor:
            </span>
            <span className="text-sm font-medium"></span>
            <span className="text-sm font-bold text-teal-400 text-right">
              {formatCurrency(laborCosts.totalLaborCost)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

EstimateSectionPrice.propTypes = {
  section: PropTypes.object,
};

export default EstimateSectionPrice;
