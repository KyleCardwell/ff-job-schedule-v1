import PropTypes from "prop-types";
import React, { useMemo } from "react";
import { useSelector } from "react-redux";

import { FACE_TYPES } from "../../utils/constants";
import {
  calculate5PieceHardwoodFacePrice,
  calculateBoxPrice,
  calculateSlabSheetFacePrice,
  roundToHundredth,
} from "../../utils/estimateHelpers";

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
    if (!section)
      return {
        totalPrice: 0,
        faceCounts: {},
        facePrices: {},
        boxTotal: 0,
        boxCount: 0,
        shopHours: 0,
        finishHours: 0,
        installHours: 0,
      };

    let sectionTotal = 0;
    let boxTotal = 0; // Track total box prices
    let boxCount = 0; // Track total box count
    let shopHours = 0; // Track shop hours
    let finishHours = 0; // Track finish hours
    let installHours = 0; // Track install hours
    const faceCounts = {};
    const facePrices = {}; // New object to track prices per face type

    // Initialize faceCounts and facePrices with all face types at 0
    FACE_TYPES.forEach((type) => {
      faceCounts[type.value] = 0;
      facePrices[type.value] = 0;
    });

    // Calculate cabinet prices and face counts
    if (
      section.cabinets &&
      Array.isArray(section.cabinets) &&
      section.cabinets.length > 0
    ) {
      section.cabinets.forEach((cabinet) => {
        if (!cabinet) return;

        const quantity = Number(cabinet.quantity) || 1;
        let cabinetPrice = 0;

        if (cabinet.face_config) {
          // Calculate box material price
          const boxPrice =
            calculateBoxPrice(cabinet, boxMaterials || [])(section) || 0;
          boxTotal += boxPrice * quantity; // Add to boxTotal with quantity
          boxCount += quantity; // Add to boxCount with quantity

          // Add cabinet hours if available
          if (cabinet.cabinetHours) {
            shopHours += (cabinet.cabinetHours.shopHours || 0) * quantity;
            if (cabinet.finished_interior) {
              let addFinishHours = 1;

              if (Array.isArray(section.section_data?.finish)) {
                section.section_data.finish.forEach((finishId) => {
                  const finishObj = finishTypes.find(
                    (ft) => ft.id === finishId
                  );
                  if (finishObj?.adjust) {
                    addFinishHours *= finishObj.adjust;
                  }
                });
              }

              finishHours +=
                (cabinet.cabinetHours.finishHours || 0) *
                quantity *
                addFinishHours;
            }
            installHours += (cabinet.cabinetHours.installHours || 0) * quantity;
          }

          // Calculate face material price using existing functions - now with price breakdown
          let facePrice = 0;
          let facePriceByType = {};

          if (section.section_data && section.face_mat) {
            if (section.section_data.doorStyle === "slab_sheet") {
              const result = calculateSlabSheetFacePrice(
                cabinet,
                faceMaterials || []
              )(section) || { totalPrice: 0, priceByType: {} };
              facePrice = result.totalPrice;
              facePriceByType = result.priceByType;
            } else if (section.section_data.doorStyle === "5_piece_hardwood") {
              const result = calculate5PieceHardwoodFacePrice(
                cabinet,
                faceMaterials || []
              )(section) || { totalPrice: 0, priceByType: {} };
              facePrice = result.totalPrice;
              facePriceByType = result.priceByType;
            }
          }

          cabinetPrice = (boxPrice + facePrice) * quantity;
          sectionTotal += cabinetPrice;

          // Count faces and add face prices
          if (cabinet.face_config.faceSummary) {
            // Count faces and add prices for each type
            Object.entries(cabinet.face_config.faceSummary).forEach(
              ([faceType, faceData]) => {
                if (
                  Object.prototype.hasOwnProperty.call(faceCounts, faceType)
                ) {
                  // Count faces
                  faceCounts[faceType] += (faceData.count || 0) * quantity;

                  // Add prices directly from the breakdown
                  if (facePriceByType[faceType]) {
                    facePrices[faceType] +=
                      facePriceByType[faceType] * quantity;
                  }
                }
              }
            );
          }
        } else {
          // Fallback to direct price if no face configuration
          cabinetPrice = (Number(cabinet.price) || 0) * quantity;
          sectionTotal += cabinetPrice;
        }
      });
    }

    // Calculate length items prices
    if (
      section.lengths &&
      Array.isArray(section.lengths) &&
      section.lengths.length > 0
    ) {
      sectionTotal += section.lengths.reduce((total, item) => {
        if (!item) return total;

        const quantity = Number(item.quantity) || 1;
        const price = Number(item.price) || 0;
        return total + price * quantity;
      }, 0);
    }

    // Calculate accessories prices
    if (
      section.accessories &&
      Array.isArray(section.accessories) &&
      section.accessories.length > 0
    ) {
      sectionTotal += section.accessories.reduce((total, item) => {
        if (!item) return total;

        const quantity = Number(item.quantity) || 1;
        const price = Number(item.price) || 0;
        return total + price * quantity;
      }, 0);
    }

    // Calculate other item prices
    if (
      section.other &&
      Array.isArray(section.other) &&
      section.other.length > 0
    ) {
      sectionTotal += section.other.reduce((total, item) => {
        if (!item) return total;

        const quantity = Number(item.quantity) || 1;
        const price = Number(item.price) || 0;
        return total + price * quantity;
      }, 0);
    }

    if (installHours > 0) {
      // add 1 hour for setup and cleanup
      installHours += 1;
    }

    return {
      totalPrice: sectionTotal,
      faceCounts,
      facePrices,
      boxTotal,
      boxCount,
      shopHours,
      finishHours,
      installHours,
    };
  }, [section, boxMaterials, faceMaterials]);

  // Format number as currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  // Format hours with 1 decimal place
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
